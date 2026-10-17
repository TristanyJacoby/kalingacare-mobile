// In-app notifications built from the customer's own orders: one entry per
// order describing its latest status (and one when an online payment goes
// through). Nothing extra is stored in Firestore; "seen" state lives on the
// phone, so the bell's unread dot clears once the Notifications screen is
// opened. Staff status changes on the website stamp `statusUpdatedAt`,
// which is used as the time when present (older orders fall back to the
// order date).

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { auth, db } from '../firebase';

export interface OrderNotification {
  /** Stable per order + status, so a new status is a new notification. */
  key: string;
  orderId: string;
  kind: 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled' | 'Paid';
  title: string;
  message: string;
  at: Date | null;
  unread: boolean;
}

const SEEN_KEY = 'kalingacare_seen_notifications';
const DOT_KEY = 'kalingacare_notification_dot';
const CHANGE_EVENT = 'kalingacare-notifications-changed';

function readSeen(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function writeSeen(keys: Set<string>) {
  try {
    // Keep the list small: only the most recent few hundred keys matter.
    localStorage.setItem(SEEN_KEY, JSON.stringify([...keys].slice(-300)));
  } catch {
    // Storage unavailable: notifications just show as unread again.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Profile's "Notifications" switch: whether the bell shows an unread dot. */
export function getDotEnabled(): boolean {
  try {
    return localStorage.getItem(DOT_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setDotEnabled(on: boolean) {
  try {
    localStorage.setItem(DOT_KEY, on ? 'on' : 'off');
  } catch {
    // Ignore: the setting just won't stick.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function markAllSeen(items: OrderNotification[]) {
  const seen = readSeen();
  items.forEach((n) => seen.add(n.key));
  writeSeen(seen);
}

// Same short order number customers see on the website (#JVCYZ8P8).
function orderNumber(id: string) {
  return `#${id.slice(0, 8).toUpperCase()}`;
}

function toDate(value: unknown): Date | null {
  const v = value as { toDate?: () => Date } | undefined;
  return v?.toDate ? v.toDate() : null;
}

function peso(n: number) {
  return `₱${Number(n || 0).toLocaleString('en-PH')}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromOrder(id: string, o: any, seen: Set<string>): OrderNotification[] {
  // Customers never see "New": it's an internal "staff hasn't opened it".
  const status = o.status === 'New' || !o.status ? 'Pending' : o.status;
  const num = orderNumber(id);
  const items = Array.isArray(o.items) ? o.items.length : 0;
  const what = items === 1 ? '1 item' : `${items} items`;

  const copy: Record<string, [string, string]> = {
    Pending: ['Order placed', `We received order ${num} (${what}, ${peso(o.total)}).`],
    Processing: ['Order being prepared', `Order ${num} is being packed for delivery.`],
    Shipped: ['Order on the way', `Order ${num} has shipped to your family.`],
    Delivered: ['Order delivered', `Order ${num} was delivered. You can now review the items in My Orders.`],
    Cancelled: ['Order cancelled', `Order ${num} was cancelled.`],
  };
  const [title, message] = copy[status] || ['Order update', `Order ${num} is now ${status}.`];
  const statusAt = toDate(o.statusUpdatedAt) || toDate(o.createdAt);

  const list: OrderNotification[] = [
    {
      key: `${id}:${status}`,
      orderId: id,
      kind: status,
      title,
      message,
      at: status === 'Pending' ? toDate(o.createdAt) : statusAt,
      unread: !seen.has(`${id}:${status}`),
    },
  ];

  if (o.paymentStatus === 'paid') {
    list.push({
      key: `${id}:Paid`,
      orderId: id,
      kind: 'Paid',
      title: 'Payment received',
      message: `Your online payment for order ${num} went through.`,
      at: toDate(o.payment?.paidAt) || toDate(o.createdAt),
      unread: !seen.has(`${id}:Paid`),
    });
  }
  return list;
}

/**
 * Live list of the signed-in customer's order notifications, newest first.
 * `showDot` already respects the Profile switch.
 */
export function useOrderNotifications() {
  const [items, setItems] = useState<OrderNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(!!auth.currentUser);
  const [dotEnabled, setDotEnabledState] = useState(getDotEnabled());

  useEffect(() => {
    let unsubOrders: (() => void) | null = null;
    let raw: { id: string; data: unknown }[] = [];

    const rebuild = () => {
      const seen = readSeen();
      const all = raw.flatMap((d) => fromOrder(d.id, d.data, seen));
      all.sort((a, b) => (b.at?.getTime() ?? 0) - (a.at?.getTime() ?? 0));
      setItems(all);
    };

    const onLocalChange = () => {
      setDotEnabledState(getDotEnabled());
      rebuild();
    };
    window.addEventListener(CHANGE_EVENT, onLocalChange);

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      unsubOrders?.();
      unsubOrders = null;
      setSignedIn(!!user);
      if (!user) {
        raw = [];
        setItems([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      // where() only, sorted on the phone: no composite index needed.
      const q = query(collection(db, 'orders'), where('userId', '==', user.uid));
      unsubOrders = onSnapshot(
        q,
        (snap) => {
          raw = snap.docs.map((d) => ({ id: d.id, data: d.data() }));
          rebuild();
          setLoading(false);
        },
        () => setLoading(false),
      );
    });

    return () => {
      window.removeEventListener(CHANGE_EVENT, onLocalChange);
      unsubAuth();
      unsubOrders?.();
    };
  }, []);

  const unreadCount = items.filter((n) => n.unread).length;
  return { items, loading, signedIn, unreadCount, showDot: dotEnabled && unreadCount > 0 };
}
