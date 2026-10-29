import { collection, getDocs, limit, query } from 'firebase/firestore';
import { db } from '../firebase';
import { CHAT_API_URL, CHAT_CATALOG_MAX_ITEMS } from '../config/chat';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

const GENERIC_ERROR = "Sorry, I couldn't answer that. Please try again.";
const UNAVAILABLE_ERROR =
  "The assistant isn't available right now. Please try again later or visit Help & Support.";
const BUSY_ERROR = "I'm a bit busy right now. Please try again in a minute.";

export class ChatError extends Error {}

// Raw server/network errors are never shown — they're mapped to one of the
// three friendly messages here.
function friendlyMessage(status: number | null, serverText: string): string {
  if (status === 403 || /api key|permission_denied|disabled/i.test(serverText)) {
    return UNAVAILABLE_ERROR;
  }
  if (
    status === 429 ||
    status === 503 ||
    /quota|resource_exhausted|unavailable|too many requests/i.test(serverText)
  ) {
    return BUSY_ERROR;
  }
  return GENERIC_ERROR;
}

// One line per product: `productId | name | category | price`. Fetched once
// per app session and cached; a failed fetch sends "" and is retried next time.
let catalogPromise: Promise<string> | null = null;

const clean = (v: unknown) => String(v ?? '').replace(/[\r\n|]+/g, ' ').trim();

export function getCatalog(): Promise<string> {
  if (!catalogPromise) {
    catalogPromise = getDocs(query(collection(db, 'products'), limit(CHAT_CATALOG_MAX_ITEMS)))
      .then((snap) =>
        snap.docs
          .filter((d) => d.data().status !== 'inactive')
          .map((d) => {
            const p = d.data();
            return `${d.id} | ${clean(p.name)} | ${clean(p.category)} | ${clean(p.price)}`;
          })
          .join('\n'),
      )
      .catch(() => {
        catalogPromise = null;
        return '';
      });
  }
  return catalogPromise;
}

// Sends only the messages and the catalog — no user data.
export async function sendChat(messages: ChatMessage[], catalog: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(CHAT_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, catalog }),
    });
  } catch {
    throw new ChatError(GENERIC_ERROR);
  }

  let data: { reply?: unknown; error?: unknown } = {};
  try {
    data = await res.json();
  } catch {
    // non-JSON body — fall through to status-based mapping
  }

  if (!res.ok) {
    throw new ChatError(friendlyMessage(res.status, typeof data.error === 'string' ? data.error : ''));
  }
  if (typeof data.reply !== 'string' || !data.reply.trim()) {
    throw new ChatError(GENERIC_ERROR);
  }
  return data.reply;
}
