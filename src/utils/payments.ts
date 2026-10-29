// Online payment (PayMongo, test mode). Same backend as the web app: the
// Vercel functions in the web repo (api/create-checkout.js,
// api/verify-payment.js, api/paymongo-webhook.js) hold the PayMongo secret
// key and are the only thing that can mark an order paid. The app just asks
// them to act on one of the signed-in customer's own orders.

import { Browser } from '@capacitor/browser';
import { auth } from '../firebase';

const API_BASE = 'https://kalingacare-drab.vercel.app/api';

export type PaymentStatus = 'paid' | 'pending';

export const PAYMENT_CHANNEL_LABELS: Record<string, string> = {
  card: 'Card',
  gcash: 'GCash',
  paymaya: 'Maya',
  grab_pay: 'GrabPay',
  qrph: 'QR Ph',
};

async function callPaymentApi(endpoint: string, orderId: string) {
  const user = auth.currentUser;
  if (!user) throw new Error('Please log in again.');
  const token = await user.getIdToken();
  const res = await fetch(`${API_BASE}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ orderId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Payment service is unavailable. Please try again.');
  return data;
}

// Cancels one of the signed-in customer's orders through the server, which
// also puts the stock back (customers can't edit orders directly any more).
export async function cancelOrder(orderId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Please log in again.');
  const res = await fetch(`${API_BASE}/update-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` },
    body: JSON.stringify({ orderId, action: 'cancel' }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Could not cancel this order. Please try again.');
}

export async function verifyPayment(orderId: string): Promise<PaymentStatus> {
  const { paymentStatus } = await callPaymentApi('verify-payment', orderId);
  return paymentStatus === 'paid' ? 'paid' : 'pending';
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Opens PayMongo's payment page in the in-app browser. Resolves once the
// customer closes it, with the payment status the server confirmed.
export async function payOnline(orderId: string): Promise<PaymentStatus> {
  const { checkoutUrl } = await callPaymentApi('create-checkout', orderId);

  await new Promise<void>((resolve) => {
    Browser.addListener('browserFinished', () => {
      Browser.removeAllListeners();
      resolve();
    }).then(() => Browser.open({ url: checkoutUrl }));
  });

  // The server asks PayMongo directly, so this is usually instant; retry
  // briefly in case the customer closed the page the moment they paid.
  for (let i = 0; i < 3; i++) {
    try {
      if ((await verifyPayment(orderId)) === 'paid') return 'paid';
    } catch (err) {
      console.error('verify-payment failed', err);
    }
    if (i < 2) await wait(2000);
  }
  return 'pending';
}
