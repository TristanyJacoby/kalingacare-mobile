import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IonPage, IonContent, IonFooter, IonToolbar, IonIcon, IonSpinner, useIonToast } from '@ionic/react';
import {
  arrowBackOutline,
  personOutline,
  mailOutline,
  locationOutline,
  callOutline,
  cardOutline,
} from 'ionicons/icons';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useCart } from '../context/CartContext';
import './Auth.css';
import './Cart.css';
import './Checkout.css';

// Mirrors js/site.js exactly — same flat shipping fee the web app uses.
const SHIPPING_FEE = 150;

function peso(amount: number) {
  return '₱' + amount.toLocaleString('en-PH');
}

const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const [presentToast] = useIonToast();
  const { selectedItems, selectedSubtotal, removeItems, appliedPromo, discountAmount, clearPromo } = useCart();

  const [checkingAccess, setCheckingAccess] = useState(true);
  const [blocked, setBlocked] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [address, setAddress] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [savedCoords, setSavedCoords] = useState<{ lat: number | null; lng: number | null }>({
    lat: null,
    lng: null,
  });
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      navigate('/login');
      return;
    }

    setFullName(user.displayName || '');
    setEmail(user.email || '');

    (async () => {
      const snap = await getDoc(doc(db, 'users', user.uid));
      const data = snap.exists() ? snap.data() : null;
      const role = data?.role || 'user';

      // Mirrors js/checkout.js — internal accounts don't place real
      // orders, so mobile has to enforce this too or mobile-created test
      // orders would pollute real customer sales data.
      if (['staff', 'admin', 'superadmin'].includes(role)) {
        setBlocked(true);
        setCheckingAccess(false);
        return;
      }

      const savedAddress = data?.savedAddress;
      if (savedAddress) {
        setRecipientName(savedAddress.recipient || '');
        setAddress(savedAddress.address || '');
        setContactNumber(savedAddress.phone || '');
        setSavedCoords({ lat: savedAddress.lat ?? null, lng: savedAddress.lng ?? null });
      }

      setCheckingAccess(false);
    })();
  }, [navigate]);

  const handlePlaceOrder = async () => {
    const user = auth.currentUser;
    if (!user) return;
    if (!recipientName || !address || !contactNumber) {
      presentToast({ message: 'Please fill out all required fields.', duration: 2200, color: 'warning' });
      return;
    }

    setPlacing(true);
    try {
      // Mirrors js/checkout.js's addDoc call field-for-field, including the
      // "qty" key (web's CartItem shape), so orders created on mobile look
      // identical to web-created ones in Admin Orders / Admin Dashboard.
      // Only the items the user checked in Cart are included here.
      await addDoc(collection(db, 'orders'), {
        userId: user.uid,
        items: selectedItems.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          qty: item.quantity,
        })),
        subtotal: selectedSubtotal,
        shippingFee: SHIPPING_FEE,
        promoCode: appliedPromo?.code ?? null,
        discount: discountAmount,
        total: selectedSubtotal + SHIPPING_FEE - discountAmount,
        status: 'Pending',
        shippingInfo: {
          fullName,
          email,
          recipient: recipientName,
          address,
          phone: contactNumber,
          paymentMethod: 'Cash on Delivery',
          lat: savedCoords.lat,
          lng: savedCoords.lng,
        },
        createdAt: serverTimestamp(),
      });

      // Only remove the items that were actually ordered — anything left
      // unselected in the cart should still be there afterward.
      removeItems(selectedItems.map((item) => item.id));
      clearPromo();
      navigate('/order-confirmation');
    } catch (err) {
      presentToast({
        message: "Something went wrong placing your order. Please try again.",
        duration: 2500,
        color: 'danger',
      });
    } finally {
      setPlacing(false);
    }
  };

  if (checkingAccess) {
    return (
      <IonPage>
        <IonContent fullscreen className="cart-content">
          <div className="cart-topbar">
            <button className="cart-icon-btn" onClick={() => navigate(-1)} aria-label="Back">
              <IonIcon icon={arrowBackOutline} />
            </button>
            <span className="cart-title">Checkout</span>
            <span className="cart-icon-btn" />
          </div>
          <div className="cart-empty">
            <IonSpinner name="crescent" />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (blocked) {
    return (
      <IonPage>
        <IonContent fullscreen className="cart-content">
          <div className="cart-topbar">
            <button className="cart-icon-btn" onClick={() => navigate(-1)} aria-label="Back">
              <IonIcon icon={arrowBackOutline} />
            </button>
            <span className="cart-title">Checkout</span>
            <span className="cart-icon-btn" />
          </div>
          <div className="cart-empty">
            <p>Staff and admin accounts can&apos;t place customer orders.</p>
            <button className="cart-browse-btn" onClick={() => navigate('/home')}>
              Back to Home
            </button>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (selectedItems.length === 0) {
    return (
      <IonPage>
        <IonContent fullscreen className="cart-content">
          <div className="cart-topbar">
            <button className="cart-icon-btn" onClick={() => navigate(-1)} aria-label="Back">
              <IonIcon icon={arrowBackOutline} />
            </button>
            <span className="cart-title">Checkout</span>
            <span className="cart-icon-btn" />
          </div>
          <div className="cart-empty">
            <p>No items selected. Go back to your cart and check off what you'd like to order.</p>
            <button className="cart-browse-btn" onClick={() => navigate('/cart')}>
              Back to Cart
            </button>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonContent fullscreen className="cart-content">
        <div className="cart-topbar">
          <button className="cart-icon-btn" onClick={() => navigate(-1)} aria-label="Back">
            <IonIcon icon={arrowBackOutline} />
          </button>
          <span className="cart-title">Checkout</span>
          <span className="cart-icon-btn" />
        </div>

        <div className="checkout-form">
          <label className="auth-label">Full Name</label>
          <div className="auth-input-wrap">
            <IonIcon icon={personOutline} className="auth-input-icon" />
            <input type="text" className="auth-input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>

          <label className="auth-label">Email</label>
          <div className="auth-input-wrap">
            <IonIcon icon={mailOutline} className="auth-input-icon" />
            <input type="email" className="auth-input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <label className="auth-label">Recipient&apos;s Full Name (in the Philippines)</label>
          <div className="auth-input-wrap">
            <IonIcon icon={personOutline} className="auth-input-icon" />
            <input
              type="text"
              placeholder="Maria Dela Cruz"
              className="auth-input"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
            />
          </div>

          <label className="auth-label">Delivery Address</label>
          <div className="auth-input-wrap">
            <IonIcon icon={locationOutline} className="auth-input-icon" />
            <input
              type="text"
              placeholder="House no., Street, City"
              className="auth-input"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <label className="auth-label">Contact Number</label>
          <div className="auth-input-wrap">
            <IonIcon icon={callOutline} className="auth-input-icon" />
            <input
              type="tel"
              placeholder="09xx xxx xxxx"
              className="auth-input"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
            />
          </div>

          <label className="auth-label">Payment Method</label>
          {/* Only option — matches the web app, which doesn't have PayMongo
              (or any other payment method) wired up yet either. */}
          <div className="checkout-payment-row">
            <IonIcon icon={cardOutline} className="auth-input-icon" />
            <span className="checkout-payment-label">Cash on Delivery</span>
          </div>
        </div>

        <div className="cart-summary-card">
          <div className="cart-summary-row">
            <span>Subtotal</span>
            <span className="cart-summary-value">{peso(selectedSubtotal)}</span>
          </div>
          <div className="cart-summary-row">
            <span>Shipping</span>
            <span className="cart-summary-value">{peso(SHIPPING_FEE)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="cart-summary-row cart-summary-discount">
              <span>Discount {appliedPromo ? `(${appliedPromo.code})` : ''}</span>
              <span className="cart-summary-value">-{peso(discountAmount)}</span>
            </div>
          )}
          <div className="cart-summary-divider" />
          <div className="cart-summary-row cart-summary-total">
            <span>Total</span>
            <span className="cart-summary-value cart-summary-total-value">
              {peso(selectedSubtotal + SHIPPING_FEE - discountAmount)}
            </span>
          </div>
        </div>
      </IonContent>

      <IonFooter className="cart-footer-outer">
        <IonToolbar className="cart-footer">
          <button className="cart-checkout-btn" onClick={handlePlaceOrder} disabled={placing}>
            {placing ? 'Placing Order…' : 'Place Order'}
          </button>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  );
};

export default Checkout;
