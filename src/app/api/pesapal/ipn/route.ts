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

    if (!orderTrackingId || !orderMerchantReference) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const status = await getTransactionStatus(orderTrackingId);
    const db = getDb();

    const txQuery = query(
      collection(db, 'pesapalTransactions'),
      where('trackingId', '==', orderTrackingId)
    );
    const txSnapshot = await getDocs(txQuery);

    if (!txSnapshot.empty) {
      const txDoc = txSnapshot.docs[0];
      const txData = txDoc.data();

      await updateDoc(doc(db, 'pesapalTransactions', txDoc.id), {
        status: isPesapalPaymentComplete(status.status_code) ? 'completed' : 'failed',
        statusCode: status.status_code,
        paymentMethod: status.payment_method,
        callbackReceived: true,
        callbackData: status,
        updatedAt: Timestamp.now(),
      });

      if (isPesapalPaymentComplete(status.status_code)) {
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
        } else if (txData.relatedEntityType === 'investment') {
          const investmentRef = doc(db, 'investments', txData.relatedEntityId);
          const investmentDoc = await getDoc(investmentRef);
          
          if (investmentDoc.exists()) {
            await updateDoc(investmentRef, {
              status: 'active',
              pesapalTransactionId: status.confirmation_code,
              updatedAt: Timestamp.now(),
            });

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
        }
      }
    }

    return NextResponse.json({ 
      orderTrackingId,
      orderMerchantReference,
      status: 'processed' 
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

    const status = await getTransactionStatus(OrderTrackingId);
    const db = getDb();

    const txQuery = query(
      collection(db, 'pesapalTransactions'),
      where('trackingId', '==', OrderTrackingId)
    );
    const txSnapshot = await getDocs(txQuery);

    if (!txSnapshot.empty) {
      const txDoc = txSnapshot.docs[0];
      const txData = txDoc.data();

      await updateDoc(doc(db, 'pesapalTransactions', txDoc.id), {
        status: isPesapalPaymentComplete(status.status_code) ? 'completed' : 'failed',
        statusCode: status.status_code,
        paymentMethod: status.payment_method,
        callbackReceived: true,
        callbackData: status,
        updatedAt: Timestamp.now(),
      });

      if (isPesapalPaymentComplete(status.status_code)) {
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
        }
      }
    }

    return NextResponse.json({ 
      orderTrackingId: OrderTrackingId,
      orderMerchantReference: OrderMerchantReference,
      status: 'processed' 
    });
  } catch (error) {
    console.error('PesaPal IPN POST error:', error);
    return NextResponse.json({ error: 'IPN processing failed' }, { status: 500 });
  }
}
