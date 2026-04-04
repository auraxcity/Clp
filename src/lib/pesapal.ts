import { PESAPAL_CONFIG } from '@/types';

const PESAPAL_BASE_URL = PESAPAL_CONFIG.environment === 'live' 
  ? 'https://pay.pesapal.com/v3'
  : 'https://cybqa.pesapal.com/pesapalv3';

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getPesapalToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const response = await fetch(`${PESAPAL_BASE_URL}/api/Auth/RequestToken`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      consumer_key: PESAPAL_CONFIG.consumerKey,
      consumer_secret: PESAPAL_CONFIG.consumerSecret,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`PesaPal auth failed: ${error}`);
  }

  const data = await response.json();
  cachedToken = {
    token: data.token,
    expiresAt: Date.now() + (data.expiryDate ? new Date(data.expiryDate).getTime() - Date.now() : 300000),
  };

  return cachedToken.token;
}

export interface PesapalOrderRequest {
  id: string;
  currency: string;
  amount: number;
  description: string;
  callback_url: string;
  notification_id: string;
  billing_address: {
    email_address?: string;
    phone_number?: string;
    first_name?: string;
    last_name?: string;
  };
}

export interface PesapalOrderResponse {
  order_tracking_id: string;
  merchant_reference: string;
  redirect_url: string;
  error?: { code: string; message: string };
  status: string;
}

export async function submitPesapalOrder(order: PesapalOrderRequest): Promise<PesapalOrderResponse> {
  const token = await getPesapalToken();

  const response = await fetch(`${PESAPAL_BASE_URL}/api/Transactions/SubmitOrderRequest`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(order),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`PesaPal order submission failed: ${error}`);
  }

  return response.json();
}

export interface PesapalTransactionStatus {
  payment_method: string;
  amount: number;
  created_date: string;
  confirmation_code: string;
  payment_status_description: string;
  description: string;
  message: string;
  payment_account: string;
  call_back_url: string;
  status_code: number;
  merchant_reference: string;
  payment_status_code: string;
  currency: string;
  error?: { code: string; message: string };
  status: string;
}

export async function getTransactionStatus(orderTrackingId: string): Promise<PesapalTransactionStatus> {
  const token = await getPesapalToken();

  const response = await fetch(
    `${PESAPAL_BASE_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`,
    {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`PesaPal status check failed: ${error}`);
  }

  return response.json();
}

export interface IPNRegistration {
  url: string;
  ipn_notification_type: 'GET' | 'POST';
}

export interface IPNRegistrationResponse {
  ipn_id: string;
  url: string;
  created_date: string;
  ipn_notification_type: string;
  ipn_status: string;
  error?: { code: string; message: string };
  status: string;
}

export async function registerIPN(ipn: IPNRegistration): Promise<IPNRegistrationResponse> {
  const token = await getPesapalToken();

  const response = await fetch(`${PESAPAL_BASE_URL}/api/URLSetup/RegisterIPN`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(ipn),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`PesaPal IPN registration failed: ${error}`);
  }

  return response.json();
}

export async function getRegisteredIPNs(): Promise<IPNRegistrationResponse[]> {
  const token = await getPesapalToken();

  const response = await fetch(`${PESAPAL_BASE_URL}/api/URLSetup/GetIpnList`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`PesaPal IPN list failed: ${error}`);
  }

  return response.json();
}

export function generateOrderId(prefix: string = 'CLP'): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`.toUpperCase();
}

export function isPesapalPaymentComplete(statusCode: number | string): boolean {
  return statusCode === 1 || statusCode === '1';
}

export function isPesapalPaymentFailed(statusCode: number | string): boolean {
  return statusCode === 2 || statusCode === '2' || statusCode === 3 || statusCode === '3';
}
