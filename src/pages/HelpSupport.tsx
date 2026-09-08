import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IonPage, IonContent, IonIcon } from '@ionic/react';
import {
  arrowBackOutline,
  chevronDownOutline,
  mailOutline,
  callOutline,
  timeOutline,
} from 'ionicons/icons';
import './HelpSupport.css';

// Each FAQ item is just a question + answer pair — easy to add more later
// by just adding another object to this list, no other code changes needed.
const FAQS = [
  {
    question: 'How do I place an order for my family member?',
    answer:
      'Browse products from the Categories tab, add items to your cart, then check out with Cash on Delivery. You can save a delivery address once so it auto-fills every time.',
  },
  {
    question: 'What payment methods are supported?',
    answer: 'Currently, KalingaCare only supports Cash on Delivery (COD) for all orders.',
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

  // Tracks which FAQ item is currently expanded. null = all collapsed.
  // Using the index as the identifier since the list above doesn't have IDs.
  const [openIndex, setOpenIndex] = useState<number | null>(null);

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

          {/* TODO: swap these placeholders for KalingaCare's real support
              contact details once available. */}
          <div className="help-contact-row">
            <IonIcon icon={mailOutline} className="help-contact-icon" />
            <div>
              <p className="help-contact-label">Email</p>
              <p className="help-contact-value">support@kalingacare.example.com</p>
            </div>
          </div>

          <div className="help-contact-row">
            <IonIcon icon={callOutline} className="help-contact-icon" />
            <div>
              <p className="help-contact-label">Phone</p>
              <p className="help-contact-value">+63 900 000 0000</p>
            </div>
          </div>

          <div className="help-contact-row">
            <IonIcon icon={timeOutline} className="help-contact-icon" />
            <div>
              <p className="help-contact-label">Support Hours</p>
              <p className="help-contact-value">Mon–Sat, 9:00 AM – 6:00 PM (PH Time)</p>
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default HelpSupport;