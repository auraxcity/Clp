import { NextRequest, NextResponse } from 'next/server';
import { submitPesapalOrder, generateOrderId, getRegisteredIPNs, registerIPN } from '@/lib/pesapal';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { getDb } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      amount, 
      description, 
      email, 
      phone, 
      firstName, 
      lastName,
      relatedEntityType,
      relatedEntityId,
    } = body;

    if (!amount || !description || !relatedEntityType || !relatedEntityId) {
      return NextResponse.json({ 
        error: 'Missing required fields: amount, description, relatedEntityType, relatedEntityId' 
      }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const callbackUrl = `${baseUrl}/api/pesapal/callback`;
    const ipnUrl = `${baseUrl}/api/pesapal/ipn`;

    let ipnList = await getRegisteredIPNs();
    let notificationId = ipnList.find(ipn => ipn.url === ipnUrl)?.ipn_id;

    if (!notificationId) {
      const ipnResponse = await registerIPN({
        url: ipnUrl,
        ipn_notification_type: 'GET',
      });
      notificationId = ipnResponse.ipn_id;
    }

    const orderId = generateOrderId(relatedEntityType === 'payment' ? 'PAY' : 'INV');

    const orderRequest = {
      id: orderId,
      currency: 'UGX',
      amount: Number(amount),
      description: description,
      callback_url: callbackUrl,
      notification_id: notificationId,
      billing_address: {
        email_address: email || undefined,
        phone_number: phone || undefined,
        first_name: firstName || undefined,
        last_name: lastName || undefined,
      },
    };

    const orderResponse = await submitPesapalOrder(orderRequest);

    if (orderResponse.error) {
      return NextResponse.json({ 
        error: orderResponse.error.message 
      }, { status: 400 });
    }

    const db = getDb();
    await addDoc(collection(db, 'pesapalTransactions'), {
      orderId: orderId,
      trackingId: orderResponse.order_tracking_id,
      merchantReference: orderResponse.merchant_reference,
      amount: Number(amount),
      currency: 'UGX',
      description: description,
      status: 'pending',
      relatedEntityType: relatedEntityType,
      relatedEntityId: relatedEntityId,
      callbackReceived: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    return NextResponse.json({
      success: true,
      orderId: orderId,
      trackingId: orderResponse.order_tracking_id,
      redirectUrl: orderResponse.redirect_url,
    });
  } catch (error) {
    console.error('PesaPal submit order error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to submit order' 
    }, { status: 500 });
  }
}
