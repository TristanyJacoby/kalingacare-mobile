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
  cashOutline,
  shieldCheckmarkOutline,
} from 'ionicons/icons';
import { doc, getDoc } from 'firebase/firestore';
import { sendVerificationEmail, TooSoonError } from '../utils/verification';
import { auth, db } from '../firebase';
import { useCart } from '../context/CartContext';
import { payOnline } from '../utils/payments';
import {
  getRates,
  convertAndFormat,
  getOrderedCurrencyCodes,
  type RatesResult,
} from '../utils/currency';
import './Auth.css';
import './Cart.css';
import AddressMapPicker from '../components/AddressMapPicker';

// Orders are created by the website's server for both apps.
const PLACE_ORDER_URL = 'https://kalingacare-drab.vercel.app/api/place-order';
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
  const [needsVerify, setNeedsVerify] = useState(false);
  const [verifyBusy, setVerifyBusy] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [address, setAddress] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [driverNote, setDriverNote] = useState('');
  // Saved addresses to pick from; 'other' = someone not saved (map only).
  const [savedList, setSavedList] = useState<any[]>([]);
  const [addressChoice, setAddressChoice] = useState('');
  const [savedCoords, setSavedCoords] = useState<{ lat: number | null; lng: number | null }>({
    lat: null,
    lng: null,
  });
  // Where the checkout map starts (the saved default address). Kept apart
  // from savedCoords, which follows the pin for this order: the map
  // rebuilds when its starting point changes, so it must not change on
  // every drag.
  const [mapStart, setMapStart] = useState<{ lat: number | null; lng: number | null }>({
    lat: null,
    lng: null,
  });
  const [placing, setPlacing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'online'>('cod');
  const [placingLabel, setPlacingLabel] = useState('Placing Order…');

  // Display-only currency conversion — the real charge is always PHP
  // (Cash on Delivery). See src/utils/currency.ts.
  const [displayCurrency, setDisplayCurrency] = useState('PHP');
  const [rates, setRates] = useState<RatesResult | null>(null);

  useEffect(() => {
    getRates().then(setRates);
  }, []);

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

      // Orders need a verified email (Firestore rules check it). Refresh
      // first, in case the link was opened since the app started.
      if (!user.emailVerified) {
        await user.reload().catch(() => {});
        if (auth.currentUser?.emailVerified) {
          await auth.currentUser.getIdToken(true).catch(() => {});
        } else {
          setNeedsVerify(true);
        }
      }

      if (data?.currency) {
        setDisplayCurrency(data.currency);
      }

      const addressList = data?.savedAddresses;
      const defaultAddress = addressList?.find((a: any) => a.isDefault) || addressList?.[0];

      if (Array.isArray(addressList) && addressList.length > 0) {
        setSavedList(addressList);
        setAddressChoice(defaultAddress.id);
      }

      if (defaultAddress) {
        setRecipientName(defaultAddress.recipient || '');
        setAddress(defaultAddress.address || '');
        setContactNumber(defaultAddress.phone || '');
        const start = { lat: defaultAddress.lat ?? null, lng: defaultAddress.lng ?? null };
        setSavedCoords(start);
        setMapStart(start);
      } else if (data?.savedAddress) {
        const legacy = data.savedAddress;
        setRecipientName(legacy.recipient || '');
        setAddress(legacy.address || '');
        setContactNumber(legacy.phone || '');
        const start = { lat: legacy.lat ?? null, lng: legacy.lng ?? null };
        setSavedCoords(start);
        setMapStart(start);
      }

      setCheckingAccess(false);
    })();
  }, [navigate]);

  const chooseAddress = (id: string) => {
    setAddressChoice(id);
    if (id === 'other') {
      setRecipientName('');
      setAddress('');
      setContactNumber('');
      setSavedCoords({ lat: null, lng: null });
      return;
    }
    const a = savedList.find((x) => x.id === id);
    if (!a) return;
    setRecipientName(a.recipient || '');
    setAddress(a.address || '');
    setContactNumber(a.phone || '');
    const start = { lat: a.lat ?? null, lng: a.lng ?? null };
    setSavedCoords(start);
    setMapStart(start);
  };

  const handlePlaceOrder = async () => {
    const user = auth.currentUser;
    if (!user) return;
    if (!recipientName || !address || !contactNumber) {
      presentToast({ message: 'Please fill out all required fields.', duration: 2200, color: 'warning' });
      return;
    }

    setPlacing(true);
    setPlacingLabel('Placing Order…');
    const payOnlineNow = paymentMethod === 'online';
    let orderId: string | null = null;
    try {
      // The website's server creates the order (api/place-order.js) and
      // works out names, prices, the promo discount and the total from the
      // product records, so they can't be tampered with in the app. Only
      // the items checked in Cart are sent.
      const res = await fetch(PLACE_ORDER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({
          items: selectedItems.map((item) => ({ id: item.id, qty: item.quantity })),
          promoCode: appliedPromo?.code ?? null,
          paymentMethod,
          displayCurrency,
          shippingInfo: {
            fullName,
            email,
            recipient: recipientName,
            address,
            phone: contactNumber,
            note: driverNote.trim(),
            lat: savedCoords.lat,
            lng: savedCoords.lng,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not place your order. Please try again.');
      orderId = data.orderId as string;
      const orderRef = { id: orderId };

      // Only remove the items that were actually ordered — anything left
      // unselected in the cart should still be there afterward.
      removeItems(selectedItems.map((item) => item.id));
      clearPromo();

      if (payOnlineNow) {
        setPlacingLabel('Waiting for payment…');
        const status = await payOnline(orderRef.id);
        if (status === 'paid') {
          navigate('/order-confirmation', { state: { paid: true } });
        } else {
          presentToast({
            message: 'Payment not completed. Your order is saved; you can pay from My Orders.',
            duration: 3500,
            color: 'warning',
          });
          navigate('/orders');
        }
        return;
      }

      navigate('/order-confirmation');
    } catch (err) {
      if (orderId && payOnlineNow) {
        // The order was saved but the payment page couldn't open.
        presentToast({
          message: "Couldn't open the payment page. Your order is saved; you can pay from My Orders.",
          duration: 3500,
          color: 'warning',
        });
        navigate('/orders');
        return;
      }
      // Server messages (e.g. an invalid promo code) are shown as-is;
      // network failures get the generic message.
      const serverMessage = err instanceof Error && !(err instanceof TypeError) ? err.message : '';
      presentToast({
        message: serverMessage || "Something went wrong placing your order. Please try again.",
        duration: 3000,
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

  const handleCheckVerified = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setVerifyBusy(true);
    try {
      await user.reload();
      if (user.emailVerified) {
        // New ID token, so Firestore rules see email_verified = true.
        await user.getIdToken(true);
        setNeedsVerify(false);
        presentToast({ message: 'Email verified. You can place your order now.', duration: 2500, color: 'success' });
      } else {
        presentToast({
          message: "Not verified yet. Open the link in the email we sent, then try again.",
          duration: 3000,
          color: 'warning',
        });
      }
    } catch {
      presentToast({ message: "Couldn't check right now. Please try again.", duration: 2500, color: 'danger' });
    } finally {
      setVerifyBusy(false);
    }
  };

  const handleResendVerification = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setVerifyBusy(true);
    try {
      await sendVerificationEmail(user);
      presentToast({ message: `New link sent to ${user.email}.`, duration: 2500, color: 'success' });
    } catch (err: any) {
      presentToast({
        message:
          err instanceof TooSoonError || err?.code === 'auth/too-many-requests'
            ? 'A link was sent recently. Please wait a minute before asking for another.'
            : "Couldn't send the email right now. Please try again.",
        duration: 3000,
        color: 'danger',
      });
    } finally {
      setVerifyBusy(false);
    }
  };

  if (needsVerify) {
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
            <p className="checkout-verify-title">Verify your email to place an order</p>
            <p>
              We sent a verification link to <strong>{auth.currentUser?.email}</strong>. Open it,
              then come back and tap the button below. Can&apos;t find it? Check your spam folder or
              send a new link.
            </p>
            <button className="cart-browse-btn" onClick={handleCheckVerified} disabled={verifyBusy}>
              I&apos;ve verified my email
            </button>
            <br />
            <button className="checkout-resend-btn" onClick={handleResendVerification} disabled={verifyBusy}>
              Resend link
            </button>
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

          {savedList.length > 0 && (
            <>
              <label className="auth-label" htmlFor="deliverTo">Deliver to</label>
              <select
                id="deliverTo"
                className="checkout-currency-select"
                value={addressChoice}
                onChange={(e) => chooseAddress(e.target.value)}
              >
                {savedList.map((a) => (
                  <option key={a.id} value={a.id}>
                    {(a.label || 'Address') + ': ' + (a.recipient || '')}
                  </option>
                ))}
                <option value="other">Someone else (pick on the map)</option>
              </select>
            </>
          )}

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
          {/* Same idea as the website's checkout: search, drag the pin or
              tap the map to set where this order goes; the address below
              fills in from the map. Changes apply to this order only,
              not to Saved Addresses. */}
          <p className="checkout-map-hint">
            Search, drag the pin, or tap the map to set the exact spot. The address below fills in
            from the map.
          </p>
          <AddressMapPicker
            savedLat={mapStart.lat}
            savedLng={mapStart.lng}
            onLocationChange={({ address: foundAddress, lat, lng }) => {
              setSavedCoords({ lat, lng });
              if (foundAddress) setAddress(foundAddress);
            }}
          />
          <div className="auth-input-wrap">
            <IonIcon icon={locationOutline} className="auth-input-icon" />
            <input
              type="text"
              placeholder="Pick a location on the map"
              className="auth-input checkout-address-display"
              value={address}
              readOnly
              tabIndex={-1}
            />
          </div>

          <label className="auth-label" htmlFor="driverNote">Note for the driver (optional)</label>
          <textarea
            id="driverNote"
            className="checkout-note"
            rows={2}
            maxLength={300}
            value={driverNote}
            onChange={(e) => setDriverNote(e.target.value)}
          />

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

          <label className="auth-label" id="paymentMethodLabel">Payment Method</label>
          {/* Same two choices as web checkout. Online goes through PayMongo's
              hosted page, which is in test mode: keep the note until real
              payments are activated. */}
          <div role="radiogroup" aria-labelledby="paymentMethodLabel">
            <button
              type="button"
              role="radio"
              aria-checked={paymentMethod === 'cod'}
              className={`checkout-payment-row checkout-payment-option${paymentMethod === 'cod' ? ' selected' : ''}`}
              onClick={() => setPaymentMethod('cod')}
            >
              <IonIcon icon={cashOutline} className="auth-input-icon" />
              <span className="checkout-payment-label">Cash on Delivery</span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={paymentMethod === 'online'}
              className={`checkout-payment-row checkout-payment-option${paymentMethod === 'online' ? ' selected' : ''}`}
              onClick={() => setPaymentMethod('online')}
            >
              <IonIcon icon={cardOutline} className="auth-input-icon" />
              <span className="checkout-payment-label">Pay online: card, GCash or Maya</span>
            </button>
          </div>
          {paymentMethod === 'online' && (
            <p className="checkout-payment-note">
              <IonIcon icon={shieldCheckmarkOutline} aria-hidden="true" />
              <span>
                You'll pay on PayMongo's secure page, then come back to the app.{' '}
                <strong>Test mode:</strong> no real money is charged. Use a PayMongo
                test card such as 4343 4343 4343 4345.
              </span>
            </p>
          )}
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

          {/* Display-only conversion. The order is always charged in PHP —
              this just helps an OFW abroad see roughly what they're
              spending in their own currency. */}
          <div className="checkout-currency-row">
            <select
              className="checkout-currency-select"
              value={displayCurrency}
              onChange={(e) => setDisplayCurrency(e.target.value)}
            >
              {getOrderedCurrencyCodes().map((code) => (
                <option key={code} value={code}>
                  Show total in {code}
                </option>
              ))}
            </select>
            {displayCurrency !== 'PHP' && rates && (
              <p className="checkout-currency-note">
                ≈{' '}
                {convertAndFormat(
                  selectedSubtotal + SHIPPING_FEE - discountAmount,
                  displayCurrency,
                  rates.rates,
                )}{' '}
                {rates.liveCodes.includes(displayCurrency)
                  ? '(live rate)'
                  : '(estimated rate — live data isn\'t available for this currency)'}
              </p>
            )}
          </div>
        </div>
      </IonContent>

      <IonFooter className="cart-footer-outer ion-no-border">
        <IonToolbar className="cart-footer">
          <button className="cart-checkout-btn" onClick={handlePlaceOrder} disabled={placing}>
            {placing ? placingLabel : 'Place Order'}
          </button>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  );
};

export default Checkout;
