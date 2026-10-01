import { useLocation } from 'react-router-dom';
import { useChat } from '../context/ChatContext';
import './KaliFab.css';

// Pages with their own bottom action bar (or no shop context) — the button
// would sit on top of those controls, so it's hidden there.
const HIDDEN_ON = ['/cart', '/checkout', '/order-confirmation', '/login', '/register', '/product/', '/review/'];

// Speech bubble with a heart — same icon as the web app's Kali button.
const KaliIcon = () => (
  <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
    <path
      fill="#ffffff"
      d="M12 3C6.5 3 2.5 6.6 2.5 11c0 2.3 1.1 4.3 2.9 5.7L4.3 21l4.6-2c1 .3 2 .5 3.100.5 5.500 0 9.500-3.600 9.500-8S17.500 3 12 3z"
    />
    <path
      fill="#1778ad"
      d="M12 14.800l-3.200-3.100c-1.200-1.200-.8-2.900.6-3.300 1-.3 2 .1 2.600 1 .6-.9 1.600-1.300 2.600-1 1.400.4 1.800 2.100.6 3.300z"
    />
  </svg>
);

const KaliFab: React.FC = () => {
  const { pathname } = useLocation();
  const { isOpen, openChat } = useChat();

  if (isOpen || HIDDEN_ON.some((p) => pathname.startsWith(p))) return null;

  return (
    <button className="kali-fab" onClick={openChat} aria-label="Chat with Kali">
      <KaliIcon />
    </button>
  );
};

export default KaliFab;
