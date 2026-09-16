import React, { useEffect, useState } from 'react';
import logo from '../assets/kalingacare-logo.png';
import './SplashScreen.css';

interface SplashScreenProps {
  /** How long the splash stays fully visible, in milliseconds, before it fades out. */
  holdMs?: number;
  /** Called once the fade-out finishes, so the app can stop rendering the splash. */
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ holdMs = 1800, onFinish }) => {
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    const leaveTimer = setTimeout(() => setIsLeaving(true), holdMs);
    return () => clearTimeout(leaveTimer);
  }, [holdMs]);

  useEffect(() => {
    if (!isLeaving) return;
    const finishTimer = setTimeout(onFinish, 400);
    return () => clearTimeout(finishTimer);
  }, [isLeaving, onFinish]);

  return (
    <div className={`splash-screen ${isLeaving ? 'splash-screen-leaving' : ''}`}>
      <div className="splash-content">
        <img src={logo} alt="KalingaCare logo" className="splash-logo" />
        <h1 className="splash-wordmark">KalingaCare</h1>
        <p className="splash-tagline">Care Beyond Borders</p>
      </div>
    </div>
  );
};

export default SplashScreen;
