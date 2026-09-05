import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { IonPage, IonContent, IonFooter, IonToolbar, IonIcon, IonSpinner, useIonToast } from '@ionic/react';
import { arrowBackOutline, cartOutline, star, starOutline, starHalf, heart, heartOutline } from 'ionicons/icons';
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useCart } from '../context/CartContext';
import { canAddToCart } from '../utils/cartGuard';
import { getCategoryColor } from '../utils/categoryColor';
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
  // Not in the current Firestore schema yet — this is forward-compatible:
  // if a product ever gets a real `images` array (e.g. once the web admin
  // uploader supports multiple images), the gallery below picks it up
  // automatically. Until then it just falls back to the single image.
  images?: string[];
}

interface Review {
  id: string;
  userName: string;
  rating: number;
  text: string;
  createdAt?: { toDate: () => Date };
}

interface RelatedProduct {
  id: string;
  name: string;
  price: number;
  category: string;
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

function StarRow({ value }: { value: number }) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    const icon = value >= i ? star : value >= i - 0.5 ? starHalf : starOutline;
    stars.push(<IonIcon key={i} icon={icon} className="pd-star" />);
  }
  return <div className="pd-star-row">{stars}</div>;
}

const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem, totalItems } = useCart();
  const [presentToast] = useIonToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdded, setShowAdded] = useState(false);

  const [activeImage, setActiveImage] = useState(0);
  const galleryRef = useRef<HTMLDivElement>(null);
  const autoAdvanceRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  const [related, setRelated] = useState<RelatedProduct[]>([]);

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

  useEffect(() => {
    if (!id) return;
    const user = auth.currentUser;
    if (!user) return;
    (async () => {
      const snap = await getDoc(doc(db, 'users', user.uid));
      const favorites: string[] = snap.exists() ? snap.data().favorites || [] : [];
      setIsFavorited(favorites.includes(id));
    })();
  }, [id]);

  const handleToggleFavorite = async () => {
    const user = auth.currentUser;
    if (!user || !product) {
      presentToast({ message: 'Please log in to save favorites.', duration: 2200, color: 'warning' });
      return;
    }
    setFavoriteLoading(true);
    const userRef = doc(db, 'users', user.uid);
    try {
      if (isFavorited) {
        await updateDoc(userRef, { favorites: arrayRemove(product.id) });
        setIsFavorited(false);
      } else {
        await updateDoc(userRef, { favorites: arrayUnion(product.id) });
        setIsFavorited(true);
      }
    } catch {
      presentToast({ message: 'Something went wrong. Please try again.', duration: 2200, color: 'danger' });
    } finally {
      setFavoriteLoading(false);
    }
  };

  // Reviews for this product, newest first.
  useEffect(() => {
    if (!id) return;
    (async () => {
      setReviewsLoading(true);
      try {
        const q = query(collection(db, 'reviews'), where('productId', '==', id), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        setReviews(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Review, 'id'>) })));
      } catch {
        // If the composite index for this query hasn't been created yet in
        // Firestore, this fails silently rather than crashing the page —
        // the reviews section just shows "No reviews yet."
        setReviews([]);
      }
      setReviewsLoading(false);
    })();
  }, [id]);

  // Related products — same category, excluding this one.
  useEffect(() => {
    if (!product) return;
    (async () => {
      try {
        const q = query(
          collection(db, 'products'),
          where('category', '==', product.category),
          orderBy('name'),
          limit(7),
        );
        const snap = await getDocs(q);
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<RelatedProduct, 'id'>) }))
          .filter((p) => p.id !== product.id)
          .slice(0, 6);
        setRelated(list);
      } catch {
        // Same defensive fallback as the reviews query — if the composite
        // index (category + name) hasn't been created in Firestore yet,
        // this section just doesn't render instead of crashing the page.
        setRelated([]);
      }
    })();
  }, [product]);

  const galleryImages = useMemo(() => {
    if (product?.images && product.images.length > 0) return product.images;
    const single = product?.imgBase64 || product?.img;
    return single ? [single] : [placeholderImg()];
  }, [product]);

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  }, [reviews]);

  // Auto-advance the gallery every 5s if there's more than one image.
  useEffect(() => {
    if (galleryImages.length <= 1) return;
    autoAdvanceRef.current = setInterval(() => {
      setActiveImage((i) => (i + 1) % galleryImages.length);
    }, 5000);
    return () => {
      if (autoAdvanceRef.current) clearInterval(autoAdvanceRef.current);
    };
  }, [galleryImages.length]);

  // Keep the scroll position in sync when auto-advance changes the index.
  useEffect(() => {
    const el = galleryRef.current;
    if (!el) return;
    el.scrollTo({ left: activeImage * el.clientWidth, behavior: 'smooth' });
  }, [activeImage]);

  const handleManualScroll = () => {
    const el = galleryRef.current;
    if (!el) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    setActiveImage(index);
    // Restart the auto-advance timer so it doesn't jump right after a swipe.
    if (autoAdvanceRef.current) clearInterval(autoAdvanceRef.current);
    if (galleryImages.length > 1) {
      autoAdvanceRef.current = setInterval(() => {
        setActiveImage((i) => (i + 1) % galleryImages.length);
      }, 5000);
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;

    // Mirrors js/checkout.js and the web app's cart-blocking rule — internal
    // accounts (staff/admin/superadmin) don't place real customer orders, so
    // they shouldn't be able to add to cart either.
    const allowed = await canAddToCart();
    if (!allowed) {
      presentToast({
        message: "Staff and admin accounts can't add items to cart.",
        duration: 2500,
        color: 'warning',
      });
      return;
    }

    // Quantity is edited in Cart now, not here — always add 1 unit.
    addItem({ id: product.id, name: product.name, price: product.price, img: product.imgBase64 || product.img });
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

        <div className="pd-gallery-wrap">
          <div
            className="pd-gallery"
            ref={galleryRef}
            onScroll={handleManualScroll}
            style={{ background: getCategoryColor(product.category) }}
          >
            {galleryImages.map((src, i) => (
              <div className="pd-gallery-slide" key={i}>
                <img
                  src={src}
                  alt={`${product.name} photo ${i + 1}`}
                  className="pd-image"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = placeholderImg();
                  }}
                />
              </div>
            ))}
          </div>
          {galleryImages.length > 1 && (
            <div className="pd-gallery-dots">
              {galleryImages.map((_, i) => (
                <span key={i} className={`pd-gallery-dot ${i === activeImage ? 'active' : ''}`} />
              ))}
            </div>
          )}
        </div>

        <div className="pd-body">
          <p className="pd-category">{product.category}</p>
          <h1 className="pd-name">{product.name}</h1>
          <p className="pd-price">{peso(product.price)}</p>

          {reviews.length > 0 && (
            <div className="pd-rating-summary">
              <StarRow value={averageRating} />
              <span className="pd-rating-value">{averageRating.toFixed(1)}</span>
              <span className="pd-rating-count">
                ({reviews.length} review{reviews.length === 1 ? '' : 's'})
              </span>
            </div>
          )}

          {product.description && (
            <>
              <h3 className="pd-section-title">Description</h3>
              <p className="pd-description">{product.description}</p>
            </>
          )}

          <h3 className="pd-section-title">Reviews &amp; Ratings</h3>
          {reviewsLoading ? (
            <div className="pd-reviews-loading">
              <IonSpinner name="crescent" />
            </div>
          ) : reviews.length === 0 ? (
            <p className="pd-no-reviews">
              No reviews yet. Reviews can be left from My Orders once an item has been delivered.
            </p>
          ) : (
            <div className="pd-reviews-list">
              {reviews.map((review) => (
                <div className="pd-review-card" key={review.id}>
                  <div className="pd-review-header">
                    <span className="pd-review-name">{review.userName}</span>
                    <StarRow value={review.rating} />
                  </div>
                  {review.text && <p className="pd-review-text">{review.text}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {related.length > 0 && (
          <div className="pd-related">
            <h3 className="pd-section-title pd-related-title">More Products</h3>
            <div className="pd-related-row">
              {related.map((item) => (
                <div
                  className="pd-related-card"
                  key={item.id}
                  style={{ background: getCategoryColor(item.category) }}
                  onClick={() => navigate(`/product/${item.id}`)}
                >
                  <div className="pd-related-image-wrap">
                    <img
                      src={item.imgBase64 || item.img || placeholderImg()}
                      alt={item.name}
                      className="pd-related-image"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = placeholderImg();
                      }}
                    />
                  </div>
                  <div className="pd-related-info-pill">
                    <p className="pd-related-name">{item.name}</p>
                    <p className="pd-related-price">{peso(item.price)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={`pd-toast ${showAdded ? 'show' : ''}`}>Added to cart</div>
      </IonContent>

      <IonFooter className="pd-footer-outer">
        <IonToolbar className="pd-footer">
          <div className="pd-footer-row">
            <button
              className={`pd-favorite-btn ${isFavorited ? 'active' : ''}`}
              onClick={handleToggleFavorite}
              disabled={favoriteLoading}
              aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
            >
              <IonIcon icon={isFavorited ? heart : heartOutline} />
            </button>
            <button className="pd-add-btn" onClick={handleAddToCart}>
              Add to Cart
            </button>
          </div>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  );
};

export default ProductDetail;
