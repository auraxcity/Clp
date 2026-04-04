import { NextRequest, NextResponse } from 'next/server';
import { getTransactionStatus, isPesapalPaymentComplete } from '@/lib/pesapal';
import { getAdminDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const orderTrackingId = searchParams.get('OrderTrackingId');

    if (!orderTrackingId) {
      return NextResponse.redirect(new URL('/payment-failed?error=missing_tracking_id', request.url));
    }

    const status = await getTransactionStatus(orderTrackingId);
    const db = getAdminDb();

    const txSnapshot = await db
      .collection('pesapalTransactions')
      .where('trackingId', '==', orderTrackingId)
      .limit(1)
      .get();

    let redirectUrl = '/user/dashboard';
    let entityType = 'payment';

    if (!txSnapshot.empty) {
      const txDoc = txSnapshot.docs[0];
      const txData = txDoc.data();
      entityType = txData.relatedEntityType;

      const isComplete = isPesapalPaymentComplete(status.status_code);

      await txDoc.ref.update({
        status: isComplete ? 'completed' : 'pending',
        statusCode: status.status_code,
        paymentMethod: status.payment_method,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      if (isComplete) {
        if (txData.relatedEntityType === 'payment') {
          const paymentRef = db.collection('payments').doc(txData.relatedEntityId);
          const paymentDoc = await paymentRef.get();

          if (paymentDoc.exists) {
            const paymentData = paymentDoc.data()!;

            await paymentRef.update({
              status: 'approved',
              approvedAt: admin.firestore.Timestamp.now(),
              approvedBy: 'pesapal_auto',
              pesapalTransactionId: status.confirmation_code,
            });

            const loanRef = db.collection('loans').doc(paymentData.loanId);
            const loanDoc = await loanRef.get();

            if (loanDoc.exists) {
              const loanData = loanDoc.data()!;
              const newBalance = Math.max(0, loanData.outstandingBalance - paymentData.amount);

              const loanUpdate: Record<string, unknown> = {
                outstandingBalance: newBalance,
                updatedAt: admin.firestore.Timestamp.now(),
              };

              if (newBalance <= 0) {
                loanUpdate.status = 'closed';
                loanUpdate.closedAt = admin.firestore.Timestamp.now();
              }

              await loanRef.update(loanUpdate);
            }
          }
          redirectUrl = '/user/dashboard?payment=success';
        } else if (txData.relatedEntityType === 'investment') {
          const investmentRef = db.collection('investments').doc(txData.relatedEntityId);

          await investmentRef.update({
            status: 'active',
            pesapalTransactionId: status.confirmation_code,
            updatedAt: admin.firestore.Timestamp.now(),
          });

          const investmentDoc = await investmentRef.get();
          if (investmentDoc.exists) {
            const investmentData = investmentDoc.data()!;
            const investorRef = db.collection('investors').doc(investmentData.investorId);
            const investorDoc = await investorRef.get();

            if (investorDoc.exists) {
              const investorData = investorDoc.data()!;
              await investorRef.update({
                capitalCommitted: (investorData.capitalCommitted || 0) + investmentData.amount,
                capitalAvailable: (investorData.capitalAvailable || 0) + investmentData.amount,
                updatedAt: admin.firestore.Timestamp.now(),
              });
            }
          }
          redirectUrl = '/investor/dashboard?investment=success';
        }
      } else {
        redirectUrl =
          entityType === 'investment'
            ? '/investor/dashboard?payment=pending'
            : '/user/dashboard?payment=pending';
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    return NextResponse.redirect(new URL(redirectUrl, baseUrl));
  } catch (error) {
    console.error('PesaPal callback error:', error);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    return NextResponse.redirect(new URL('/user/dashboard?payment=error', baseUrl));
  }
}
