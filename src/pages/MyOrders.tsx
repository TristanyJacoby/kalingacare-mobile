import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/react';

const MyOrders: React.FC = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>My Orders</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <p>My Orders — coming soon</p>
      </IonContent>
    </IonPage>
  );
};

export default MyOrders;
