// src/pages/AboutKalingaCare.tsx
// KalingaCare — "About KalingaCare" page, opened from the side menu.
// The trust stats strip (same as the website's landing page) followed by
// "About the App": what the app does and what customers can do in it.
// Meet the Team has its own page (MeetTheTeam.tsx).
import { useNavigate } from "react-router-dom";
import { IonPage, IonContent, IonIcon } from "@ionic/react";
import {
  arrowBackOutline,
  bagHandleOutline,
  cashOutline,
  cardOutline,
  mapOutline,
  chatbubblesOutline,
  syncOutline,
  shieldCheckmarkOutline,
} from "ionicons/icons";
import "./AboutKalingaCare.css";

const STATS = [
  { value: "500+", label: "Families Served" },
  { value: "9+", label: "Trusted Products" },
  { value: "100%", label: "Delivered in PH" },
];

const FEATURES = [
  {
    icon: bagHandleOutline,
    title: "Shop senior care products",
    text: "Mobility aids, wellness essentials and digital health devices, with photos, reviews from real buyers and a favorites list.",
  },
  {
    icon: cashOutline,
    title: "Prices in your currency",
    text: "See prices in the currency of the country you work in. Orders are charged in Philippine pesos.",
  },
  {
    icon: cardOutline,
    title: "Pay your way",
    text: "Cash on Delivery, or pay online with a card, GCash or Maya. Online payments are in test mode for now.",
  },
  {
    icon: mapOutline,
    title: "Track every order",
    text: "Follow each order from Pending to Delivered in My Orders, with a map of the delivery route.",
  },
  {
    icon: chatbubblesOutline,
    title: "Ask Kali",
    text: "Our chat assistant answers questions about products, ordering and shipping, in English or Filipino.",
  },
  {
    icon: syncOutline,
    title: "One account, web and app",
    text: "Sign in with the same account on the KalingaCare website. Your orders and favorites are the same on both.",
  },
  {
    icon: shieldCheckmarkOutline,
    title: "Safe ordering",
    text: "Accounts confirm their email before ordering, and online payments go through PayMongo's secure page.",
  },
];

const AboutKalingaCare: React.FC = () => {
  const navigate = useNavigate();

  return (
    <IonPage>
      <IonContent fullscreen className="about-content">
        <div className="about-topbar">
          <button className="about-icon-btn" onClick={() => navigate(-1)} aria-label="Back">
            <IonIcon icon={arrowBackOutline} />
          </button>
          <span className="about-title">About KalingaCare</span>
          <div className="about-icon-spacer" />
        </div>

        <div className="about-stats-row">
          {STATS.map((stat) => (
            <div className="about-stat-card" key={stat.label}>
              <p className="about-stat-value">{stat.value}</p>
              <p className="about-stat-label">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="about-section">
          <span className="about-section-badge">About the App</span>
          <h3 className="about-section-title">Care for Family Back Home, From Anywhere</h3>
          <p className="about-section-subtitle">
            The KalingaCare app lets Overseas Filipino Workers buy healthcare and wellness products
            for their loved ones in the Philippines and have them delivered to their door.
          </p>

          <div className="about-feature-list">
            {FEATURES.map((feature) => (
              <div className="about-feature-card" key={feature.title}>
                <div className="about-feature-icon">
                  <IonIcon icon={feature.icon} />
                </div>
                <div className="about-team-info">
                  <p className="about-team-name">{feature.title}</p>
                  <p className="about-team-blurb">{feature.text}</p>
                </div>
              </div>
            ))}
          </div>

          <button className="about-team-link" onClick={() => navigate("/team")}>
            Meet the team behind KalingaCare
          </button>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default AboutKalingaCare;
