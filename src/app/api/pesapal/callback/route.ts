import { NextRequest, NextResponse } from 'next/server';
import { getTransactionStatus, isPesapalPaymentComplete } from '@/lib/pesapal';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  Timestamp 
} from 'firebase/firestore';
import { getDb } from '@/lib/firebase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const orderTrackingId = searchParams.get('OrderTrackingId');
    const orderMerchantReference = searchParams.get('OrderMerchantReference');

    if (!orderTrackingId) {
      return NextResponse.redirect(new URL('/payment-failed?error=missing_tracking_id', request.url));
    }

    const status = await getTransactionStatus(orderTrackingId);
    const db = getDb();

    const txQuery = query(
      collection(db, 'pesapalTransactions'),
      where('trackingId', '==', orderTrackingId)
    );
    const txSnapshot = await getDocs(txQuery);

    let redirectUrl = '/user/dashboard';
    let entityType = 'payment';

    if (!txSnapshot.empty) {
      const txDoc = txSnapshot.docs[0];
      const txData = txDoc.data();
      entityType = txData.relatedEntityType;

      const isComplete = isPesapalPaymentComplete(status.status_code);

      await updateDoc(doc(db, 'pesapalTransactions', txDoc.id), {
        status: isComplete ? 'completed' : 'pending',
        statusCode: status.status_code,
        paymentMethod: status.payment_method,
        updatedAt: Timestamp.now(),
      });

      if (isComplete) {
        if (txData.relatedEntityType === 'payment') {
          const paymentRef = doc(db, 'payments', txData.relatedEntityId);
          const paymentDoc = await getDoc(paymentRef);
          
          if (paymentDoc.exists()) {
            const paymentData = paymentDoc.data();
            
            await updateDoc(paymentRef, {
              status: 'approved',
              approvedAt: Timestamp.now(),
              approvedBy: 'pesapal_auto',
              pesapalTransactionId: status.confirmation_code,
            });

            const loanRef = doc(db, 'loans', paymentData.loanId);
            const loanDoc = await getDoc(loanRef);
            
            if (loanDoc.exists()) {
              const loanData = loanDoc.data();
              const newBalance = Math.max(0, loanData.outstandingBalance - paymentData.amount);
              
              const loanUpdate: Record<string, unknown> = {
                outstandingBalance: newBalance,
                updatedAt: Timestamp.now(),
              };
              
              if (newBalance <= 0) {
                loanUpdate.status = 'closed';
                loanUpdate.closedAt = Timestamp.now();
              }
              
              await updateDoc(loanRef, loanUpdate);
            }
          }
          redirectUrl = '/user/dashboard?payment=success';
        } else if (txData.relatedEntityType === 'investment') {
          const investmentRef = doc(db, 'investments', txData.relatedEntityId);
          
          await updateDoc(investmentRef, {
            status: 'active',
            pesapalTransactionId: status.confirmation_code,
            updatedAt: Timestamp.now(),
          });

          const investmentDoc = await getDoc(investmentRef);
          if (investmentDoc.exists()) {
            const investmentData = investmentDoc.data();
            const investorRef = doc(db, 'investors', investmentData.investorId);
            const investorDoc = await getDoc(investorRef);
            
            if (investorDoc.exists()) {
              const investorData = investorDoc.data();
              await updateDoc(investorRef, {
                capitalCommitted: (investorData.capitalCommitted || 0) + investmentData.amount,
                capitalAvailable: (investorData.capitalAvailable || 0) + investmentData.amount,
                updatedAt: Timestamp.now(),
              });
            }
          }
          redirectUrl = '/investor/dashboard?investment=success';
        }
      } else {
        redirectUrl = entityType === 'investment' 
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
