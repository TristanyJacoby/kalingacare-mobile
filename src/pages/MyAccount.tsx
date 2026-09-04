import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/react';

const MyAccount: React.FC = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>My Account</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <p>My Account — coming soon</p>
      </IonContent>
    </IonPage>
  );
};

export default MyAccount;
