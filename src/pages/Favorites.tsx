import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IonPage, IonContent, IonIcon, IonSpinner } from "@ionic/react";
import { arrowBackOutline, heart } from "ionicons/icons";
import { doc, getDoc, updateDoc, arrayRemove } from "firebase/firestore";
import { auth, db } from "../firebase";
import { getCategoryColor } from "../utils/categoryColor";
import "./Favorites.css";

// Same "shape" of product data used in ProductDetail.tsx — keeping it
// consistent so both files expect the same fields from Firestore.
interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  img?: string;
  imgBase64?: string;
}

// Turns a number into peso text, e.g. 1500 -> "₱1,500"
function peso(amount: number) {
  return "₱" + amount.toLocaleString("en-PH");
}

// Gray placeholder box, shown only if a product has no photo saved.
function placeholderImg() {
  return (
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="373" height="230"><rect width="373" height="230" fill="#f1f5f9"/><text x="186" y="119" font-size="13" fill="#94a3b8" text-anchor="middle" font-family="sans-serif">No image</text></svg>`,
    )
  );
}

const Favorites: React.FC = () => {
  const navigate = useNavigate();

  // The favorited products we'll show. Starts empty while we load.
  const [products, setProducts] = useState<Product[]>([]);
  // True while we're still fetching data — shows a spinner during this time.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;

    // No one logged in? Nothing to load — just stop the spinner.
    if (!user) {
      setLoading(false);
      return;
    }

    (async () => {
      // Step 1: read the user's profile to get their list of favorited
      // product IDs (this is the same "favorites" array ProductDetail.tsx
      // writes to when you tap the heart button).
      const userSnap = await getDoc(doc(db, "users", user.uid));
      const favoriteIds: string[] = userSnap.exists()
        ? userSnap.data().favorites || []
        : [];

      // Step 2: fetch the actual product info for each favorited ID.
      // Promise.all fetches them all at once instead of one at a time,
      // so the screen loads faster.
      const productDocs = await Promise.all(
        favoriteIds.map((id) => getDoc(doc(db, "products", id))),
      );

      // Step 3: keep only products that still exist — a product might have
      // been deleted from the catalog after someone favorited it.
      const loaded: Product[] = productDocs
        .filter((snap) => snap.exists())
        .map((snap) => ({
          id: snap.id,
          ...(snap.data() as Omit<Product, "id">),
        }));

      setProducts(loaded);
      setLoading(false);
    })();
  }, []);

  // Un-favorites a product: updates Firestore, then removes it from the
  // screen right away without needing to reload the whole page.
  const handleRemove = async (productId: string) => {
    const user = auth.currentUser;
    if (!user) return;

    await updateDoc(doc(db, "users", user.uid), {
      favorites: arrayRemove(productId),
    });

    setProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  return (
    <IonPage>
      <IonContent fullscreen className="fav-content">
        <div className="fav-topbar">
          <button
            className="fav-icon-btn"
            onClick={() => navigate(-1)}
            aria-label="Back"
          >
            <IonIcon icon={arrowBackOutline} />
          </button>
          <span className="fav-title">My Favorites</span>
          {/* Empty spacer so the title stays centered, balancing the back button */}
          <div className="fav-icon-spacer" />
        </div>

        {loading ? (
          <div className="fav-loading">
            <IonSpinner name="crescent" />
          </div>
        ) : products.length === 0 ? (
          <div className="fav-empty">
            <p>You haven't favorited anything yet.</p>
            <p className="fav-empty-sub">
              Tap the heart icon on any product to save it here.
            </p>
          </div>
        ) : (
          <div className="fav-grid">
            {products.map((product) => (
              <div
                className="fav-card"
                key={product.id}
                style={{ background: getCategoryColor(product.category) }}
              >
                <div
                  className="fav-image-wrap"
                  onClick={() => navigate(`/product/${product.id}`)}
                >
                  <img
                    src={product.imgBase64 || product.img || placeholderImg()}
                    alt={product.name}
                    className="fav-image"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = placeholderImg();
                    }}
                  />
                </div>
                <div className="fav-info-pill">
                  <p className="fav-name">{product.name}</p>
                  <p className="fav-price">{peso(product.price)}</p>
                  <button
                    className="fav-remove-btn"
                    onClick={() => handleRemove(product.id)}
                    aria-label="Remove from favorites"
                  >
                    <IonIcon icon={heart} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default Favorites;
