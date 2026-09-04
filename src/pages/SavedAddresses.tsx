import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/react';

const SavedAddresses: React.FC = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Saved Addresses</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <p>Saved Addresses — coming soon</p>
      </IonContent>
    </IonPage>
  );
};

export default SavedAddresses;
