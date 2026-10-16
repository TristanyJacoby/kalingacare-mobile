// Sends a "Contact Us" message through the web app's /api/contact function,
// which emails it to the support inbox with Reply-To set to the customer.
// Signed-in users also send their ID token so support can see the account.

import { auth } from '../firebase';

const CONTACT_API_URL = 'https://kalingacare-drab.vercel.app/api/contact';

export const SUPPORT_EMAIL = 'kalingacaresupport@gmail.com';
export const SUPPORT_ADDRESS = '938 Aurora Blvd, Cubao, Quezon City, Metro Manila, Philippines';
export const SUPPORT_HOURS = 'Mon–Sat, 9:00 AM – 6:00 PM (PH Time)';

export interface ContactMessage {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export async function sendContactMessage(msg: ContactMessage): Promise<void> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth.currentUser) headers.Authorization = `Bearer ${await auth.currentUser.getIdToken()}`;

  let res: Response;
  try {
    res = await fetch(CONTACT_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...msg, source: 'app' }),
    });
  } catch {
    throw new Error(`We couldn't send your message right now. Please email us at ${SUPPORT_EMAIL}.`);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `We couldn't send your message right now. Please email us at ${SUPPORT_EMAIL}.`);
  }
}
