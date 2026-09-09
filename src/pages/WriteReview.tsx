import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { IonPage, IonContent, IonIcon, useIonToast } from '@ionic/react';
import { arrowBackOutline, star, starOutline, cameraOutline, closeCircle } from 'ionicons/icons';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { resizeImageToDataUrl } from '../utils/imageResize';
import './WriteReview.css';

interface Product {
  id: string;
  name: string;
  img?: string;
  imgBase64?: string;
}

function placeholderImg() {
  return (
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#f1f5f9"/><text x="32" y="36" font-size="8" fill="#94a3b8" text-anchor="middle" font-family="sans-serif">No image</text></svg>`,
    )
  );
}

const WriteReview: React.FC = () => {
  const { orderId, productId } = useParams<{ orderId: string; productId: string }>();
  const navigate = useNavigate();
  const [presentToast] = useIonToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [text, setText] = useState('');
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) {
      navigate('/login');
      return;
    }
    if (!productId) return;
    (async () => {
      const snap = await getDoc(doc(db, 'products', productId));
      if (snap.exists()) {
        setProduct({ id: snap.id, ...(snap.data() as Omit<Product, 'id'>) });
      }
      setLoading(false);
    })();
  }, [productId, navigate]);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessingPhoto(true);
    try {
      const resized = await resizeImageToDataUrl(file);
      setPhotoBase64(resized);
    } catch {
      presentToast({ message: "Couldn't process that photo. Please try another.", duration: 2200, color: 'warning' });
    } finally {
      setProcessingPhoto(false);
      // Reset the input so selecting the same file again still fires onChange.
      e.target.value = '';
    }
  };

  const handleSubmit = async () => {
    const user = auth.currentUser;
    if (!user || !orderId || !productId) return;

    if (rating === 0) {
      presentToast({ message: 'Please select a star rating.', duration: 2200, color: 'warning' });
      return;
    }

    setSubmitting(true);
    try {
      // Matches the Firestore rule for /reviews/{reviewId} exactly — userId
      // must equal the caller's own uid, or the write is rejected.
      await addDoc(collection(db, 'reviews'), {
        productId,
        orderId,
        userId: user.uid,
        userName: user.displayName || 'KalingaCare Customer',
        rating,
        text: text.trim(),
        ...(photoBase64 ? { photoBase64 } : {}),
        createdAt: serverTimestamp(),
      });

      presentToast({ message: 'Thanks for your review!', duration: 2200, color: 'success' });
      navigate('/orders');
    } catch (err) {
      presentToast({
        message: 'Something went wrong submitting your review. Please try again.',
        duration: 2500,
        color: 'danger',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <IonPage>
        <IonContent fullscreen className="wr-content" />
      </IonPage>
    );
  }

  const displayRating = hoverRating || rating;

  return (
    <IonPage>
      <IonContent fullscreen className="wr-content">
        <div className="wr-topbar">
          <button className="wr-icon-btn" onClick={() => navigate(-1)} aria-label="Back">
            <IonIcon icon={arrowBackOutline} />
          </button>
          <span className="wr-title">Write a Review</span>
          <div className="wr-icon-spacer" />
        </div>

        {product && (
          <div className="wr-product-row">
            <img
              src={product.imgBase64 || product.img || placeholderImg()}
              alt={product.name}
              className="wr-product-image"
              onError={(e) => {
                (e.target as HTMLImageElement).src = placeholderImg();
              }}
            />
            <span className="wr-product-name">{product.name}</span>
          </div>
        )}

        <div className="wr-section">
          <p className="wr-label">How was it?</p>
          <div className="wr-star-row">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                className="wr-star-btn"
                onClick={() => setRating(n)}
                onMouseEnter={() => setHoverRating(n)}
                onMouseLeave={() => setHoverRating(0)}
                aria-label={`${n} star${n === 1 ? '' : 's'}`}
              >
                <IonIcon icon={displayRating >= n ? star : starOutline} className="wr-star-icon" />
              </button>
            ))}
          </div>
        </div>

        <div className="wr-section">
          <p className="wr-label">Add a Photo (optional)</p>
          <p className="wr-sublabel">Show proof of the delivered item — helps other buyers.</p>

          {photoBase64 ? (
            <div className="wr-photo-preview-wrap">
              <img src={photoBase64} alt="Review attachment" className="wr-photo-preview" />
              <button
                className="wr-photo-remove-btn"
                onClick={() => setPhotoBase64(null)}
                aria-label="Remove photo"
              >
                <IonIcon icon={closeCircle} />
              </button>
            </div>
          ) : (
            <label className="wr-photo-upload-btn">
              <IonIcon icon={cameraOutline} />
              <span>{processingPhoto ? 'Processing…' : 'Add Photo'}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                disabled={processingPhoto}
                hidden
              />
            </label>
          )}
        </div>

        <div className="wr-section">
          <p className="wr-label">Tell us more (optional)</p>
          <textarea
            className="wr-textarea"
            placeholder="What did you like or dislike about this product?"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
          />
        </div>

        <button className="wr-submit-btn" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit Review'}
        </button>
      </IonContent>
    </IonPage>
  );
};

export default WriteReview;
