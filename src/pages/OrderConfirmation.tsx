import { useLocation, useNavigate } from 'react-router-dom';
import { IonPage, IonContent } from '@ionic/react';
import logo from '../assets/kalingacare-logo.png';
import './OrderConfirmation.css';

const OrderConfirmation: React.FC = () => {
  const navigate = useNavigate();
  // Set by Checkout after an online payment the server confirmed.
  const paid = Boolean((useLocation().state as { paid?: boolean } | null)?.paid);

  return (
    <IonPage>
      <IonContent fullscreen className="oc-content">
        <div className="oc-header">
          <img src={logo} alt="KalingaCare" className="oc-logo" />
          <span className="oc-appname">KalingaCare</span>
        </div>

        <div className="oc-center">
          <p className="oc-message">Thank you for your purchase!</p>
          {paid && <p className="oc-paid">Payment received (PayMongo test mode)</p>}
          <button className="oc-home-btn" onClick={() => navigate('/home')}>
            Home
          </button>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default OrderConfirmation;
