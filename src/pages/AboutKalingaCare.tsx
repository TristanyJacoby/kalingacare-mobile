// src/pages/AboutKalingaCare.tsx
// KalingaCare — "About KalingaCare" page, opened from the side menu.
// Mirrors two sections from the web app's landing page: the trust
// stats strip and the "Meet the Team" section. Team members don't have
// photos here (this is a mobile app, not the marketing site), so each
// one gets an initials avatar in the same style used for user profile
// photos elsewhere in the app.
import { useNavigate } from "react-router-dom";
import { IonPage, IonContent, IonIcon } from "@ionic/react";
import { arrowBackOutline } from "ionicons/icons";
import { initials } from "../utils/avatar";
import "./AboutKalingaCare.css";

const STATS = [
  { value: "500+", label: "Families Served" },
  { value: "9+", label: "Trusted Products" },
  { value: "100%", label: "Delivered in PH" },
];

const TEAM = [
  {
    name: "Tristan Jacob Dela Pena",
    role: "Project Lead & Developer",
    blurb: "Led systems integration and architecture, and full-stack development of the platform.",
  },
  {
    name: "Cliff Jefferson Bautista",
    role: "Developer",
    blurb: "Contributed to requirements analysis and platform development.",
  },
  {
    name: "Adrian Carlo Quiambao",
    role: "Developer",
    blurb: "Contributed to system planning and platform development.",
  },
  {
    name: "Trisha Anne Trinidad",
    role: "Developer",
    blurb: "Contributed to business goal planning and platform development.",
  },
  {
    name: "Robert Gabriel Villar",
    role: "Developer",
    blurb: "Contributed to project planning and platform development.",
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
          <span className="about-section-badge">Meet the Team</span>
          <h3 className="about-section-title">The People Behind KalingaCare</h3>
          <p className="about-section-subtitle">
            NexCode &middot; IT31S4 &middot; IT 009 Systems Integration and Architecture 1
          </p>

          <div className="about-team-list">
            {TEAM.map((member) => (
              <div className="about-team-card" key={member.name}>
                <div className="about-team-avatar">{initials(member.name)}</div>
                <div className="about-team-info">
                  <p className="about-team-name">{member.name}</p>
                  <p className="about-team-role">{member.role}</p>
                  <p className="about-team-blurb">{member.blurb}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default AboutKalingaCare;
