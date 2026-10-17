// Shows a small banner while the phone has no internet connection, so
// screens that can't load don't just spin with no explanation.
import { useEffect, useState } from 'react';
import { IonIcon } from '@ionic/react';
import { cloudOfflineOutline } from 'ionicons/icons';
import './OfflineBanner.css';

const OfflineBanner: React.FC = () => {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  if (online) return null;
  return (
    <div className="offline-banner" role="status">
      <IonIcon icon={cloudOfflineOutline} aria-hidden="true" />
      You&apos;re offline. Some things won&apos;t load until you reconnect.
    </div>
  );
};

export default OfflineBanner;
