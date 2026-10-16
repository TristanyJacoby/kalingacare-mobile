// src/pages/CompanyHistory.tsx
// KalingaCare — "Company History" page, opened from the side menu. Same
// story and milestones as the "Our Story" section on the website's home
// page; keep the two in sync if either changes.
import { useNavigate } from "react-router-dom";
import { IonPage, IonContent, IonIcon } from "@ionic/react";
import { arrowBackOutline } from "ionicons/icons";
import "./AboutKalingaCare.css";

const MILESTONES = [
  {
    year: "2022",
    title: "The Idea",
    text: "A small group of children of OFWs in Quezon City kept hearing the same story: remittances meant for checkups and medicine were spent elsewhere, and parents went without. They asked a simple question: what if OFWs could buy the care itself?",
  },
  {
    year: "2023",
    title: "The First Deliveries",
    text: "KalingaCare began as a social media page taking orders from OFWs in the Middle East, packing walkers and blood pressure monitors from a small stockroom in Cubao and delivering them across Metro Manila.",
  },
  {
    year: "2024",
    title: "Reaching Every Province",
    text: "Courier partnerships took deliveries beyond Metro Manila to families anywhere in the Philippines, with Cash on Delivery so loved ones could see the item before paying.",
  },
  {
    year: "2025",
    title: "The Online Store",
    text: "The KalingaCare website opened, letting OFWs browse, order and track deliveries in one place, with prices shown in the currency of the country they work in.",
  },
  {
    year: "2026",
    title: "The App and Online Payments",
    text: "The KalingaCare Android app launched alongside card, GCash and Maya payments and Kali, our chat assistant. Today we serve 500+ OFW families, and we're still guided by the same idea: care beyond borders.",
  },
];

const CompanyHistory: React.FC = () => {
  const navigate = useNavigate();

  return (
    <IonPage>
      <IonContent fullscreen className="about-content">
        <div className="about-topbar">
          <button className="about-icon-btn" onClick={() => navigate(-1)} aria-label="Back">
            <IonIcon icon={arrowBackOutline} />
          </button>
          <span className="about-title">Company History</span>
          <div className="about-icon-spacer" />
        </div>

        <div className="about-section">
          <span className="about-section-badge">Our Story</span>
          <h3 className="about-section-title">From a Stockroom in Cubao to Families Nationwide</h3>
          <p className="about-section-subtitle">
            KalingaCare started with a problem many OFW families know well: money sent home for a
            parent's medicine doesn't always reach its purpose.
          </p>

          <ol className="history-list">
            {MILESTONES.map((m) => (
              <li className="history-item" key={m.year}>
                <span className="history-year">{m.year}</span>
                <div className="history-card">
                  <p className="history-title">{m.title}</p>
                  <p className="history-text">{m.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default CompanyHistory;
