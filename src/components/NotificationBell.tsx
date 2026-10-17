// Bell button for the screen headers. Shows a dot while there are order
// updates the customer hasn't opened yet (src/utils/orderNotifications.ts),
// unless they turned the dot off in Profile.
import { useNavigate } from 'react-router-dom';
import { IonIcon } from '@ionic/react';
import { notificationsOutline } from 'ionicons/icons';
import { useOrderNotifications } from '../utils/orderNotifications';
import './NotificationBell.css';

const NotificationBell: React.FC<{ className: string }> = ({ className }) => {
  const navigate = useNavigate();
  const { showDot, unreadCount } = useOrderNotifications();
  return (
    <button
      className={`${className} notif-bell`}
      aria-label={showDot ? `Notifications, ${unreadCount} new` : 'Notifications'}
      onClick={() => navigate('/notifications')}
    >
      <IonIcon icon={notificationsOutline} />
      {showDot && <span className="notif-bell-dot" aria-hidden="true" />}
    </button>
  );
};

export default NotificationBell;
