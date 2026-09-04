import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/react';

const AdminDashboard: React.FC = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Admin Dashboard</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <p>Admin Dashboard — coming soon</p>
      </IonContent>
    </IonPage>
  );
};

export default AdminDashboard;
