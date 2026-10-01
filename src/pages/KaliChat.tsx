import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IonModal, IonContent, IonFooter, IonToolbar, IonIcon } from '@ionic/react';
import { closeOutline, sendOutline } from 'ionicons/icons';
import {
  CHAT_HISTORY_WINDOW,
  CHAT_INPUT_MAX_LENGTH,
  CHAT_MAX_USER_MESSAGES,
  CHAT_MIN_SEND_INTERVAL_MS,
} from '../config/chat';
import { ChatError, getCatalog, sendChat, type ChatMessage } from '../utils/chatApi';
import { useChat } from '../context/ChatContext';
import './KaliChat.css';

const GREETING =
  "Hi! I'm Kali, KalingaCare's shopping assistant. I can help you find products for your loved ones, or explain how ordering, shipping and reviews work. What do you need?";

const STARTERS = [
  'What products do you have for mobility?',
  'How does ordering work?',
  'Can I cancel an order?',
];

const LIMIT_MESSAGE = "You've reached the message limit for this session. Please come back later.";

// Matches **bold** or a web product link (optionally with a host in front).
const TOKEN_RE = /(\*\*[^*\n]+\*\*|(?:https?:\/\/[^\s)]*?\/)?product\.html\?id=[A-Za-z0-9_-]+)/g;
const PRODUCT_ID_RE = /product\.html\?id=([A-Za-z0-9_-]+)/;

// Renders bot text as React elements (no innerHTML): line breaks kept,
// **bold** → <strong>, product.html?id=X → in-app link to /product/X.
function renderBotText(text: string, openProduct: (id: string) => void) {
  return text.split('\n').map((line, li) => (
    <span key={li}>
      {li > 0 && <br />}
      {line.split(TOKEN_RE).map((part, pi) => {
        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
          return <strong key={pi}>{part.slice(2, -2)}</strong>;
        }
        const m = part.match(PRODUCT_ID_RE);
        if (m) {
          return (
            <button key={pi} type="button" className="kali-link" onClick={() => openProduct(m[1])}>
              view product
            </button>
          );
        }
        return part;
      })}
    </span>
  ));
}

const KaliChat: React.FC = () => {
  const navigate = useNavigate();
  const { isOpen, closeChat } = useChat();
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contentRef = useRef<HTMLIonContentElement>(null);
  const busyRef = useRef(false);
  const lastSendRef = useRef(0);
  const userCountRef = useRef(0);

  // Warm the catalog cache so the first send isn't slowed by Firestore.
  useEffect(() => {
    getCatalog();
  }, []);

  useEffect(() => {
    contentRef.current?.scrollToBottom(200);
  }, [history, busy, error]);

  const send = async (raw: string) => {
    const text = raw.trim().slice(0, CHAT_INPUT_MAX_LENGTH);
    if (!text || busyRef.current) return;
    if (userCountRef.current >= CHAT_MAX_USER_MESSAGES) {
      setError(LIMIT_MESSAGE);
      return;
    }
    const now = Date.now();
    if (now - lastSendRef.current < CHAT_MIN_SEND_INTERVAL_MS) return;
    lastSendRef.current = now;

    busyRef.current = true;
    userCountRef.current += 1;
    setBusy(true);
    setError(null);
    setInput('');

    const next: ChatMessage[] = [...history, { role: 'user', text }];
    setHistory(next);

    try {
      const catalog = await getCatalog();
      const reply = await sendChat(next.slice(-CHAT_HISTORY_WINDOW), catalog);
      setHistory([...next, { role: 'model', text: reply }]);
    } catch (e) {
      // Pop the user message back off and give the text back to the input.
      setHistory(history);
      setInput(text);
      userCountRef.current -= 1;
      setError(e instanceof ChatError ? e.message : "Sorry, I couldn't answer that. Please try again.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={closeChat} className="kali-modal">
      <IonContent ref={contentRef} fullscreen className="kali-content">
        <div className="kali-topbar">
          <button className="kali-icon-btn" onClick={closeChat} aria-label="Close chat">
            <IonIcon icon={closeOutline} />
          </button>
          <span className="kali-title">Chat with Kali</span>
          <div className="kali-icon-spacer" />
        </div>

        <div className="kali-messages">
          <div className="kali-bubble kali-bot">{GREETING}</div>

          {history.length === 0 && (
            <div className="kali-chips">
              {STARTERS.map((s) => (
                <button key={s} className="kali-chip" onClick={() => send(s)} disabled={busy}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {history.map((m, i) =>
            m.role === 'user' ? (
              <div key={i} className="kali-bubble kali-user">
                {m.text}
              </div>
            ) : (
              <div key={i} className="kali-bubble kali-bot">
                {renderBotText(m.text, (id) => {
                  closeChat();
                  navigate(`/product/${id}`);
                })}
              </div>
            ),
          )}

          {busy && <div className="kali-bubble kali-bot kali-typing">…</div>}
          {error && <div className="kali-bubble kali-error">{error}</div>}
        </div>
      </IonContent>

      <IonFooter className="kali-footer-outer ion-no-border">
        <IonToolbar className="kali-footer">
          <form
            className="kali-input-row"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <input
              className="kali-input"
              type="text"
              placeholder="Ask Kali…"
              value={input}
              maxLength={CHAT_INPUT_MAX_LENGTH}
              onChange={(e) => setInput(e.target.value)}
            />
            <button
              type="submit"
              className="kali-send-btn"
              disabled={busy || !input.trim()}
              aria-label="Send"
            >
              <IonIcon icon={sendOutline} />
            </button>
          </form>
          <p className="kali-note">AI assistant — may make mistakes. Not medical advice.</p>
        </IonToolbar>
      </IonFooter>
    </IonModal>
  );
};

export default KaliChat;
