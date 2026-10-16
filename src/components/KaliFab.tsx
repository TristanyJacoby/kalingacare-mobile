import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useChat } from '../context/ChatContext';
import './KaliFab.css';

// Pages with their own bottom action bar (or no shop context) — the button
// would sit on top of those controls, so it's hidden there.
const HIDDEN_ON = ['/cart', '/checkout', '/order-confirmation', '/login', '/register', '/product/', '/review/'];

// Shown once per install so people know the button is an AI helper.
const HINT_KEY = 'kalingacare_kali_hint_seen';

function hintSeen(): boolean {
  try {
    return localStorage.getItem(HINT_KEY) === '1';
  } catch {
    return false;
  }
}

function markHintSeen() {
  try {
    localStorage.setItem(HINT_KEY, '1');
  } catch {
    // Storage unavailable: the hint may show again next time, that's all.
  }
}

// Speech bubble with a heart — same icon as the web app's Kali button.
// Navy on the sky-blue button, matching the website.
const KaliIcon = () => (
  <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
    <path
      fill="#12283a"
      d="M12 3C6.5 3 2.5 6.6 2.5 11c0 2.3 1.1 4.3 2.9 5.7L4.3 21l4.6-2c1 .3 2 .5 3.100.5 5.500 0 9.500-3.600 9.500-8S17.500 3 12 3z"
    />
    <path
      fill="#67c8f7"
      d="M12 14.800l-3.200-3.100c-1.200-1.200-.8-2.900.6-3.300 1-.3 2 .1 2.600 1 .6-.9 1.600-1.300 2.600-1 1.400.4 1.800 2.100.6 3.300z"
    />
  </svg>
);

const KaliFab: React.FC = () => {
  const { pathname } = useLocation();
  const { isOpen, openChat } = useChat();
  const [showHint, setShowHint] = useState(false);
  const hidden = isOpen || HIDDEN_ON.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (hidden || hintSeen()) return;
    const show = setTimeout(() => setShowHint(true), 2000);
    const hide = setTimeout(() => {
      setShowHint(false);
      markHintSeen();
    }, 11000);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [hidden]);

  if (hidden) return null;

  const dismissHint = () => {
    setShowHint(false);
    markHintSeen();
  };

  const open = () => {
    dismissHint();
    openChat();
  };

  return (
    <>
      {showHint && (
        <div className="kali-hint" role="status">
          <button className="kali-hint-body" onClick={open}>
            <strong>Hi! I'm Kali.</strong>
            Ask me about products, ordering or delivery.
          </button>
          <button className="kali-hint-close" onClick={dismissHint} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}
      <button className="kali-fab" onClick={open} aria-label="Ask Kali, the AI shopping assistant">
        <KaliIcon />
      </button>
    </>
  );
};

export default KaliFab;
