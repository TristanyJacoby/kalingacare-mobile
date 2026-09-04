import { useNavigate } from 'react-router-dom';
import { IonPage, IonContent, IonIcon } from '@ionic/react';
import { arrowBackOutline, notificationsOffOutline } from 'ionicons/icons';
import './Notifications.css';

const Notifications: React.FC = () => {
  const navigate = useNavigate();

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

        <div className="notif-empty">
          <IonIcon icon={notificationsOffOutline} className="notif-empty-icon" />
          <p className="notif-empty-title">You're all caught up</p>
          <p className="notif-empty-text">
            No notifications yet. We'll let you know here when there's an update on your orders.
          </p>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Notifications;
