import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IonPage, IonContent, IonIcon } from '@ionic/react';
import {
  arrowBackOutline,
  chevronDownOutline,
  mailOutline,
  locationOutline,
  timeOutline,
  chatbubbleEllipsesOutline,
  sendOutline,
} from 'ionicons/icons';
import { useChat } from '../context/ChatContext';
import { auth } from '../firebase';
import {
  sendContactMessage,
  SUPPORT_EMAIL,
  SUPPORT_ADDRESS,
  SUPPORT_HOURS,
} from '../utils/contactApi';
import './HelpSupport.css';

// Each FAQ item is just a question + answer pair — easy to add more later
// by just adding another object to this list, no other code changes needed.
const FAQS = [
  {
    question: 'How do I place an order for my family member?',
    answer:
      'Browse products from the Categories tab, add items to your cart, then check out with Cash on Delivery or pay online. You can save a delivery address once so it auto-fills every time.',
  },
  {
    question: 'What payment methods are supported?',
    answer:
      'Cash on Delivery, or Pay online with a card, GCash or Maya through PayMongo. Online payments are in test mode for now, so no real money is charged. If you don\'t finish paying, the order shows "Payment pending" in My Orders, where you can pay later.',
  },
  {
    question: 'Can I cancel an order after placing it?',
    answer:
      'Order cancellation is only available while your order is still Pending or Processing. Once it has shipped, it can no longer be cancelled from the app.',
  },
  {
    question: 'How do promo codes work?',
    answer:
      'Enter a valid promo code in your Cart before checking out. Some codes are limited to your first order, others can be used anytime — the discount is shown before you confirm your order.',
  },
  {
    question: 'How do I save multiple delivery addresses?',
    answer:
      "Go to Profile > Saved Addresses to add as many as you need, and mark one as your default. Checkout will automatically use whichever address is set as default.",
  },
];

const HelpSupport: React.FC = () => {
  const navigate = useNavigate();
  const { openChat } = useChat();

  // Tracks which FAQ item is currently expanded. null = all collapsed.
  // Using the index as the identifier since the list above doesn't have IDs.
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // Contact form. Name and email start from the signed-in account.
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    setName((prev) => prev || user.displayName || '');
    setEmail((prev) => prev || user.email || '');
  }, []);

  const handleSend = async () => {
    const trimmed = { name: name.trim(), email: email.trim(), subject: subject.trim(), message: message.trim() };
    if (!trimmed.name) return setStatus({ kind: 'error', text: 'Please enter your name.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed.email)) {
      return setStatus({ kind: 'error', text: 'Please enter a valid email address.' });
    }
    if (trimmed.message.length < 10) {
      return setStatus({ kind: 'error', text: 'Please write a message of at least 10 characters.' });
    }
    setSending(true);
    setStatus(null);
    try {
      await sendContactMessage(trimmed);
      setSubject('');
      setMessage('');
      setStatus({
        kind: 'success',
        text: `Thanks, ${trimmed.name.split(' ')[0]}! Your message was sent. We'll reply to ${trimmed.email}.`,
      });
    } catch (err) {
      setStatus({ kind: 'error', text: (err as Error).message });
    } finally {
      setSending(false);
    }
  };

  const toggleFaq = (index: number) => {
    // Clicking an already-open question closes it; clicking a closed one
    // opens it (and closes whichever other one was open, since only one
    // question is shown expanded at a time — keeps the page tidy).
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <IonPage>
      <IonContent fullscreen className="help-content">
        <div className="help-topbar">
          <button className="help-icon-btn" onClick={() => navigate(-1)} aria-label="Back">
            <IonIcon icon={arrowBackOutline} />
          </button>
          <span className="help-title">Help &amp; Support</span>
          <div className="help-icon-spacer" />
        </div>

        <div className="help-section">
          <button className="help-chat-card" onClick={openChat}>
            <IonIcon icon={chatbubbleEllipsesOutline} className="help-chat-icon" />
            <div>
              <p className="help-chat-title">Chat with Kali</p>
              <p className="help-chat-sub">Our AI shopping assistant — ask about products, ordering or shipping.</p>
            </div>
          </button>
        </div>

        <div className="help-section">
          <h3 className="help-section-title">Frequently Asked Questions</h3>

          <div className="help-faq-list">
            {FAQS.map((item, index) => {
              const isOpen = openIndex === index;
              return (
                <div className="help-faq-item" key={index}>
                  <button className="help-faq-question" onClick={() => toggleFaq(index)}>
                    <span>{item.question}</span>
                    <IonIcon
                      icon={chevronDownOutline}
                      className={`help-faq-chevron ${isOpen ? 'open' : ''}`}
                    />
                  </button>
                  {isOpen && <p className="help-faq-answer">{item.answer}</p>}
                </div>
              );
            })}
          </div>
        </div>

        <div className="help-divider" />

        <div className="help-section">
          <h3 className="help-section-title">Contact Us</h3>

          <div className="help-contact-row">
            <IonIcon icon={mailOutline} className="help-contact-icon" />
            <div>
              <p className="help-contact-label">Email</p>
              <a className="help-contact-value help-contact-link" href={`mailto:${SUPPORT_EMAIL}`}>
                {SUPPORT_EMAIL}
              </a>
            </div>
          </div>

          <div className="help-contact-row">
            <IonIcon icon={locationOutline} className="help-contact-icon" />
            <div>
              <p className="help-contact-label">Office</p>
              <p className="help-contact-value">{SUPPORT_ADDRESS}</p>
            </div>
          </div>

          <div className="help-contact-row">
            <IonIcon icon={timeOutline} className="help-contact-icon" />
            <div>
              <p className="help-contact-label">Support Hours</p>
              <p className="help-contact-value">{SUPPORT_HOURS}</p>
            </div>
          </div>
        </div>

        <div className="help-section">
          <h3 className="help-section-title">Send Us a Message</h3>
          <div className="help-form">
            <label className="help-form-label" htmlFor="contact-name">Your name</label>
            <input
              id="contact-name"
              className="help-form-input"
              value={name}
              maxLength={80}
              autoComplete="name"
              onChange={(e) => setName(e.target.value)}
            />

            <label className="help-form-label" htmlFor="contact-email">Your email</label>
            <input
              id="contact-email"
              className="help-form-input"
              type="email"
              inputMode="email"
              value={email}
              maxLength={254}
              autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
            />

            <label className="help-form-label" htmlFor="contact-subject">
              Subject <span className="help-form-optional">(optional)</span>
            </label>
            <input
              id="contact-subject"
              className="help-form-input"
              value={subject}
              maxLength={120}
              onChange={(e) => setSubject(e.target.value)}
            />

            <label className="help-form-label" htmlFor="contact-message">Message</label>
            <textarea
              id="contact-message"
              className="help-form-input help-form-textarea"
              value={message}
              maxLength={2000}
              rows={5}
              onChange={(e) => setMessage(e.target.value)}
            />

            {status && (
              <p className={`help-form-status ${status.kind}`} role="status">
                {status.text}
              </p>
            )}

            <button className="help-form-send" onClick={handleSend} disabled={sending}>
              <IonIcon icon={sendOutline} />
              {sending ? 'Sending...' : 'Send message'}
            </button>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default HelpSupport;