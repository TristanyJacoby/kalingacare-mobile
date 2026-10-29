import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IonPage, IonContent, IonIcon, IonSpinner } from "@ionic/react";
import { arrowBackOutline } from "ionicons/icons";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import { getRates, type RatesResult } from "../utils/currency";
import ProductCard, { type CardProduct } from "../components/ProductCard";
import "./Favorites.css";

const Favorites: React.FC = () => {
  const navigate = useNavigate();

  // The favorited products we'll show. Starts empty while we load.
  const [products, setProducts] = useState<CardProduct[]>([]);
  // True while we're still fetching data — shows a spinner during this time.
  const [loading, setLoading] = useState(true);

  // Same display-currency conversion used on Home and Products, so a
  // product's price looks the same no matter which screen it's on.
  const [displayCurrency, setDisplayCurrency] = useState("PHP");
  const [rates, setRates] = useState<RatesResult | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    getRates().then(setRates);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // No one logged in? Nothing to load — just stop the spinner.
      if (!user) {
        setProducts([]);
        setFavoriteIds(new Set());
        setLoading(false);
        return;
      }

      // Step 1: read the user's profile to get their list of favorited
      // product IDs (this is the same "favorites" array ProductCard
      // writes to when you tap the heart button).
      const userSnap = await getDoc(doc(db, "users", user.uid));
      const data = userSnap.exists() ? (userSnap.data() as any) : {};
      if (data.currency) setDisplayCurrency(data.currency);
      const ids: string[] = data.favorites || [];
      setFavoriteIds(new Set(ids));

      // Step 2: fetch the actual product info for each favorited ID.
      // Promise.all fetches them all at once instead of one at a time,
      // so the screen loads faster.
      const productDocs = await Promise.all(
        ids.map((id) => getDoc(doc(db, "products", id))),
      );

      // Step 3: keep only products that still exist — a product might have
      // been deleted from the catalog after someone favorited it.
      const loaded: CardProduct[] = productDocs
        .filter((snap) => snap.exists() && snap.data()?.status !== "inactive")
        .map((snap) => ({
          id: snap.id,
          ...(snap.data() as Omit<CardProduct, "id">),
        }));

      setProducts(loaded);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Keeps favoriteIds in sync, same as every other page that shows this
  // card. On this page specifically, un-hearting a product should also
  // drop it from view right away since it's the whole point of the list.
  const handleFavoriteChange = (id: string, isFavorited: boolean) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (isFavorited) next.add(id);
      else next.delete(id);
      return next;
    });
    if (!isFavorited) {
      setProducts((prev) => prev.filter((p) => p.id !== id));
    }
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
              <ProductCard
                key={product.id}
                product={product}
                onOpen={(id) => navigate(`/product/${id}`)}
                displayCurrency={displayCurrency}
                rates={rates}
                favoriteIds={favoriteIds}
                onFavoriteChange={handleFavoriteChange}
              />
            ))}
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default Favorites;
