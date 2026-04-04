import { NextRequest, NextResponse } from 'next/server';
import { getTransactionStatus, isPesapalPaymentComplete } from '@/lib/pesapal';
import { getAdminDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';

export const runtime = 'nodejs';

async function processPesapalIpn(orderTrackingId: string) {
  const status = await getTransactionStatus(orderTrackingId);
  const db = getAdminDb();

  const txSnapshot = await db
    .collection('pesapalTransactions')
    .where('trackingId', '==', orderTrackingId)
    .limit(1)
    .get();

  if (txSnapshot.empty) {
    return { processed: false as const };
  }

  const txDoc = txSnapshot.docs[0];
  const txData = txDoc.data();

  await txDoc.ref.update({
    status: isPesapalPaymentComplete(status.status_code) ? 'completed' : 'failed',
    statusCode: status.status_code,
    paymentMethod: status.payment_method,
    callbackReceived: true,
    callbackData: status,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  if (isPesapalPaymentComplete(status.status_code)) {
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
    } else if (txData.relatedEntityType === 'investment') {
      const investmentRef = db.collection('investments').doc(txData.relatedEntityId);
      const investmentDoc = await investmentRef.get();

      if (investmentDoc.exists) {
        await investmentRef.update({
          status: 'active',
          pesapalTransactionId: status.confirmation_code,
          updatedAt: admin.firestore.Timestamp.now(),
        });

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
    }
  }

  return { processed: true as const };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const orderTrackingId = searchParams.get('OrderTrackingId');
    const orderMerchantReference = searchParams.get('OrderMerchantReference');

    if (!orderTrackingId || !orderMerchantReference) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    await processPesapalIpn(orderTrackingId);

    return NextResponse.json({
      orderTrackingId,
      orderMerchantReference,
      status: 'processed',
    });
  } catch (error) {
    console.error('PesaPal IPN error:', error);
    return NextResponse.json({ error: 'IPN processing failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { OrderTrackingId, OrderMerchantReference } = body;

    if (!OrderTrackingId) {
      return NextResponse.json({ error: 'Missing OrderTrackingId' }, { status: 400 });
    }

    await processPesapalIpn(OrderTrackingId);

    return NextResponse.json({
      orderTrackingId: OrderTrackingId,
      orderMerchantReference: OrderMerchantReference,
      status: 'processed',
    });
  } catch (error) {
    console.error('PesaPal IPN POST error:', error);
    return NextResponse.json({ error: 'IPN processing failed' }, { status: 500 });
  }
}
