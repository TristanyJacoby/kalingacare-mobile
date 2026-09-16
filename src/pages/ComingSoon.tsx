// src/pages/ComingSoon.tsx
// KalingaCare — generic placeholder page. Used by side-menu items that
// don't have real content yet (Company History), so tapping them goes
// somewhere real instead of doing nothing.
import { useParams, useNavigate } from "react-router-dom";
import { IonPage, IonContent, IonIcon } from "@ionic/react";
import { arrowBackOutline, hourglassOutline } from "ionicons/icons";
import "./ComingSoon.css";

const TITLES: Record<string, string> = {
  "company-history": "Company History",
};

const ComingSoon: React.FC = () => {
  const { section } = useParams<{ section: string }>();
  const navigate = useNavigate();
  const title = (section && TITLES[section]) || "Coming Soon";

  return (
    <IonPage>
      <IonContent fullscreen className="coming-soon-content">
        <div className="coming-soon-header">
          <button className="coming-soon-back-btn" onClick={() => navigate(-1)} aria-label="Back">
            <IonIcon icon={arrowBackOutline} />
          </button>
          <span className="coming-soon-header-title">{title}</span>
          <div className="coming-soon-header-spacer" />
        </div>
        <div className="coming-soon-body">
          <IonIcon icon={hourglassOutline} className="coming-soon-icon" />
          <h2 className="coming-soon-heading">{title}</h2>
          <p className="coming-soon-text">This page is still being put together. Check back soon.</p>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ComingSoon;
