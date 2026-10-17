// Notifications — real order updates (src/utils/orderNotifications.ts):
// one entry per order's latest status, plus "Payment received" for paid
// online orders. New ones are highlighted and marked as seen when the
// customer leaves this screen.
import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { IonPage, IonContent, IonIcon, IonSpinner, useIonViewWillLeave } from '@ionic/react';
import {
  arrowBackOutline,
  notificationsOffOutline,
  receiptOutline,
  cubeOutline,
  carOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  cardOutline,
  chevronForwardOutline,
} from 'ionicons/icons';
import { useOrderNotifications, markAllSeen, type OrderNotification } from '../utils/orderNotifications';
import './Notifications.css';

const ICONS: Record<OrderNotification['kind'], string> = {
  Pending: receiptOutline,
  Processing: cubeOutline,
  Shipped: carOutline,
  Delivered: checkmarkCircleOutline,
  Cancelled: closeCircleOutline,
  Paid: cardOutline,
};

function timeAgo(date: Date | null) {
  if (!date) return '';
  const mins = Math.round((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const { items, loading, signedIn } = useOrderNotifications();
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useIonViewWillLeave(() => markAllSeen(itemsRef.current));

  return (
    <IonPage>
      <IonContent fullscreen className="notif-content">
        <div className="notif-topbar">
          <button className="notif-icon-btn" onClick={() => navigate(-1)} aria-label="Back">
            <IonIcon icon={arrowBackOutline} />
          </button>
          <span className="notif-title">Notifications</span>
          <span className="notif-icon-btn" />
        </div>

        {loading ? (
          <div className="notif-loading">
            <IonSpinner name="crescent" />
          </div>
        ) : !signedIn ? (
          <div className="notif-empty">
            <IonIcon icon={notificationsOffOutline} className="notif-empty-icon" />
            <p className="notif-empty-title">Sign in to see order updates</p>
            <p className="notif-empty-text">
              Updates about your orders, like when they ship or arrive, show up here.
            </p>
            <button className="notif-signin-btn" onClick={() => navigate('/login')}>
              Sign In
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="notif-empty">
            <IonIcon icon={notificationsOffOutline} className="notif-empty-icon" />
            <p className="notif-empty-title">No updates yet</p>
            <p className="notif-empty-text">
              When you place an order, its progress (prepared, shipped, delivered) shows up here.
            </p>
          </div>
        ) : (
          <div className="notif-list">
            {items.map((n) => (
              <button
                key={n.key}
                className={`notif-item ${n.unread ? 'unread' : ''} kind-${n.kind.toLowerCase()}`}
                onClick={() => navigate('/orders')}
              >
                <span className="notif-item-icon">
                  <IonIcon icon={ICONS[n.kind]} />
                </span>
                <span className="notif-item-body">
                  <span className="notif-item-title">
                    {n.title}
                    {n.unread && <span className="notif-new">New</span>}
                  </span>
                  <span className="notif-item-text">{n.message}</span>
                  <span className="notif-item-time">{timeAgo(n.at)}</span>
                </span>
                <IonIcon icon={chevronForwardOutline} className="notif-item-chevron" />
              </button>
            ))}
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default Notifications;
