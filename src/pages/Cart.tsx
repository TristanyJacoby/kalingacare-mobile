import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IonPage, IonContent, IonFooter, IonToolbar, IonIcon, useIonToast } from '@ionic/react';
import { arrowBackOutline, checkmarkCircle, ellipseOutline } from 'ionicons/icons';
import { useCart } from '../context/CartContext';
import './Cart.css';

// Mirrors js/site.js exactly — same flat shipping fee the web app uses.
const SHIPPING_FEE = 150;

function peso(amount: number) {
  return '₱' + amount.toLocaleString('en-PH');
}

function placeholderImg() {
  return (
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#f1f5f9"/><text x="32" y="36" font-size="8" fill="#94a3b8" text-anchor="middle" font-family="sans-serif">No image</text></svg>`,
    )
  );
}

const Cart: React.FC = () => {
  const navigate = useNavigate();
  const [presentToast] = useIonToast();
  const { items, updateQuantity, toggleSelected, selectAll, deselectAll, selectedCount, selectedSubtotal } =
    useCart();
  const [promoCode, setPromoCode] = useState('');

  const handleApplyPromo = () => {
    presentToast({ message: "Promo codes aren't available yet.", duration: 2200, color: 'medium' });
  };

  const allSelected = items.length > 0 && items.every((i) => i.selected);

  const handleCheckout = () => {
    if (selectedCount === 0) {
      presentToast({ message: 'Select at least one item to check out.', duration: 2200, color: 'warning' });
      return;
    }
    navigate('/checkout');
  };

  if (items.length === 0) {
    return (
      <IonPage>
        <IonContent fullscreen className="cart-content">
          <div className="cart-topbar">
            <button className="cart-icon-btn" onClick={() => navigate(-1)} aria-label="Back">
              <IonIcon icon={arrowBackOutline} />
            </button>
            <span className="cart-title">My Cart</span>
            <span className="cart-icon-btn" />
          </div>
          <div className="cart-empty">
            <p>Your cart is empty.</p>
            <button className="cart-browse-btn" onClick={() => navigate('/products')}>
              Browse Products
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
          <span className="cart-title">My Cart</span>
          <span className="cart-icon-btn" />
        </div>

        <button
          className="cart-select-all-row"
          onClick={() => (allSelected ? deselectAll() : selectAll())}
        >
          <IonIcon
            icon={allSelected ? checkmarkCircle : ellipseOutline}
            className={`cart-checkbox ${allSelected ? 'checked' : ''}`}
          />
          <span>Select All</span>
        </button>

        <div className="cart-items">
          {items.map((item) => (
            <div className={`cart-item-card ${item.selected ? '' : 'unselected'}`} key={item.id}>
              <button
                className="cart-item-checkbox-btn"
                onClick={() => toggleSelected(item.id)}
                aria-label={item.selected ? 'Deselect item' : 'Select item'}
              >
                <IonIcon
                  icon={item.selected ? checkmarkCircle : ellipseOutline}
                  className={`cart-checkbox ${item.selected ? 'checked' : ''}`}
                />
              </button>
              <img
                src={item.img || placeholderImg()}
                alt={item.name}
                className="cart-item-image"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = placeholderImg();
                }}
              />
              <div className="cart-item-info">
                <p className="cart-item-name">{item.name}</p>
                <p className="cart-item-price">{peso(item.price)}</p>
                <div className="cart-qty-wrap">
                  <button
                    className="cart-qty-btn"
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span className="cart-qty-value">{item.quantity}</span>
                  <button
                    className="cart-qty-btn"
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <h3 className="cart-section-title">Promo Code</h3>
        <div className="cart-promo-row">
          <input
            type="text"
            placeholder="Enter code"
            className="cart-promo-input"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
          />
          <button className="cart-promo-btn" onClick={handleApplyPromo}>
            Apply
          </button>
        </div>

        <div className="cart-summary-card">
          <div className="cart-summary-row">
            <span>Subtotal ({selectedCount} item{selectedCount === 1 ? '' : 's'} selected)</span>
            <span className="cart-summary-value">{peso(selectedSubtotal)}</span>
          </div>
          <div className="cart-summary-row">
            <span>Shipping</span>
            <span className="cart-summary-value">{peso(SHIPPING_FEE)}</span>
          </div>
          <div className="cart-summary-divider" />
          <div className="cart-summary-row cart-summary-total">
            <span>Total</span>
            <span className="cart-summary-value cart-summary-total-value">
              {peso(selectedSubtotal + SHIPPING_FEE)}
            </span>
          </div>
        </div>
      </IonContent>

      <IonFooter>
        <IonToolbar className="cart-footer">
          <button className="cart-checkout-btn" onClick={handleCheckout}>
            Proceed to Checkout
          </button>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  );
};

export default Cart;
