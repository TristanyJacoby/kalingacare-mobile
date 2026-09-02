import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { IonPage, IonContent, IonIcon, IonSpinner } from '@ionic/react';
import { arrowBackOutline, cartOutline } from 'ionicons/icons';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useCart } from '../context/CartContext';
import './ProductDetail.css';

interface Product {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  price: number;
  stock?: number;
  description?: string;
  img?: string;
  imgBase64?: string;
}

function peso(amount: number) {
  return '₱' + amount.toLocaleString('en-PH');
}

function placeholderImg() {
  return (
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="373" height="230"><rect width="373" height="230" fill="#f1f5f9"/><text x="186" y="119" font-size="13" fill="#94a3b8" text-anchor="middle" font-family="sans-serif">No image</text></svg>`,
    )
  );
}

const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem, totalItems } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [showAdded, setShowAdded] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const snap = await getDoc(doc(db, 'products', id));
      if (snap.exists()) {
        setProduct({ id: snap.id, ...(snap.data() as Omit<Product, 'id'>) });
      }
      setLoading(false);
    })();
  }, [id]);

  const handleAddToCart = () => {
    if (!product) return;
    addItem(
      { id: product.id, name: product.name, price: product.price, img: product.imgBase64 || product.img },
      quantity,
    );
    setShowAdded(true);
    setTimeout(() => setShowAdded(false), 1800);
  };

  if (loading) {
    return (
      <IonPage>
        <IonContent fullscreen className="pd-content">
          <div className="pd-loading">
            <IonSpinner name="crescent" />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (!product) {
    return (
      <IonPage>
        <IonContent fullscreen className="pd-content">
          <div className="pd-empty">Product not found.</div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonContent fullscreen className="pd-content">
        <div className="pd-topbar">
          <button className="pd-icon-btn" onClick={() => navigate(-1)} aria-label="Back">
            <IonIcon icon={arrowBackOutline} />
          </button>
          <button className="pd-icon-btn" onClick={() => navigate('/cart')} aria-label="Cart">
            <IonIcon icon={cartOutline} />
            {totalItems > 0 && <span className="pd-cart-badge">{totalItems}</span>}
          </button>
        </div>

        <div className="pd-image-wrap">
          <img
            src={product.imgBase64 || product.img || placeholderImg()}
            alt={product.name}
            className="pd-image"
            onError={(e) => {
              (e.target as HTMLImageElement).src = placeholderImg();
            }}
          />
        </div>

        <div className="pd-body">
          <p className="pd-category">{product.category}</p>
          <h1 className="pd-name">{product.name}</h1>
          <p className="pd-price">{peso(product.price)}</p>

          {product.description && (
            <>
              <h3 className="pd-section-title">Description</h3>
              <p className="pd-description">{product.description}</p>
            </>
          )}

          <h3 className="pd-section-title">Quantity</h3>
          <div className="pd-qty-wrap">
            <button
              className="pd-qty-btn"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="pd-qty-value">{quantity}</span>
            <button
              className="pd-qty-btn"
              onClick={() => setQuantity((q) => Math.min(product.stock ?? 99, q + 1))}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
        </div>

        <div className={`pd-toast ${showAdded ? 'show' : ''}`}>Added to cart</div>
      </IonContent>

      <div className="pd-footer">
        <button className="pd-add-btn" onClick={handleAddToCart}>
          Add to Cart
        </button>
      </div>
    </IonPage>
  );
};

export default ProductDetail;
