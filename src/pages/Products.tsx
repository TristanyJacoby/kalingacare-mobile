import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { IonContent, IonPage, IonIcon, IonSpinner, IonMenuButton, IonRefresher, IonRefresherContent } from "@ionic/react";
import { searchOutline, cartOutline, menuOutline } from "ionicons/icons";
import { collection, query, orderBy, onSnapshot, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import { useCart } from "../context/CartContext";
import { getRates, type RatesResult } from "../utils/currency";
import ProductCard, { type CardProduct } from "../components/ProductCard";
import logo from "../assets/kalingacare-logo.png";
import NotificationBell from "../components/NotificationBell";
import "./Shop.css";

const Products: React.FC = () => {
  const navigate = useNavigate();
  const { productCount } = useCart();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<CardProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  // Pull-to-refresh re-subscribes to the product list (a fresh fetch from
  // the server); the list also updates live on its own.
  const [refreshKey, setRefreshKey] = useState(0);
  const refresherRef = useRef<HTMLIonRefresherElement | null>(null);
  const finishRefresh = () => refresherRef.current?.complete();
  const [searchText, setSearchText] = useState(searchParams.get("q") ?? "");
  const [activeCategory, setActiveCategory] = useState<string>(searchParams.get("category") ?? "All");

  // Display-only currency conversion, same as Checkout — see
  // src/utils/currency.ts.
  const [displayCurrency, setDisplayCurrency] = useState("PHP");
  const [rates, setRates] = useState<RatesResult | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    getRates().then(setRates);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setFavoriteIds(new Set());
        return;
      }
      const snap = await getDoc(doc(db, "users", user.uid));
      const data = snap.exists() ? (snap.data() as any) : {};
      if (data.currency) setDisplayCurrency(data.currency);
      setFavoriteIds(new Set(data.favorites || []));
    });
    return () => unsubscribe();
  }, []);

  const handleFavoriteChange = (id: string, isFavorited: boolean) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (isFavorited) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  useEffect(() => {
    // Live subscription — same idea as the web app's products.js onSnapshot.
    const q = query(collection(db, "products"), orderBy("name"));
    setLoadError(false);
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        // Products staff marked inactive are hidden from the store.
        const list: CardProduct[] = snapshot.docs
          .filter((doc) => doc.data().status !== "inactive")
          .map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<CardProduct, "id">),
          }));
        setProducts(list);
        setLoading(false);
        finishRefresh();
      },
      (err) => {
        console.error("Products failed to load:", err);
        setLoading(false);
        setLoadError(true);
        finishRefresh();
      },
    );
    return () => unsubscribe();
  }, [refreshKey]);

  // Reflects new ?q= / ?category= params if Home links here again while
  // this tab is already mounted (e.g. tapping a different category pill).
  useEffect(() => {
    const q = searchParams.get("q");
    const category = searchParams.get("category");
    if (q !== null) setSearchText(q);
    if (category !== null) setActiveCategory(category);
  }, [searchParams]);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
    return ["All", ...unique];
  }, [products]);

  const visibleProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchText.toLowerCase());
    const matchesCategory = activeCategory === "All" || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const sectionTitle = searchText
    ? "Search Results"
    : activeCategory !== "All"
    ? activeCategory
    : "All Products";

  return (
    <IonPage>
      <IonContent fullscreen className="shop-content">
        <IonRefresher
          slot="fixed"
          ref={refresherRef}
          onIonRefresh={() => setRefreshKey((k) => k + 1)}
        >
          <IonRefresherContent />
        </IonRefresher>
        <div className="shop-header">
          <IonMenuButton className="shop-menu-btn" aria-label="Menu">
            <IonIcon icon={menuOutline} />
          </IonMenuButton>
          <img src={logo} alt="KalingaCare" className="shop-logo" />
          <span className="shop-appname">KalingaCare</span>
          <div className="shop-header-icons">
            <NotificationBell className="shop-icon-btn" />
            <button className="shop-icon-btn" aria-label="Cart" onClick={() => navigate("/cart")}>
              <IonIcon icon={cartOutline} />
              {productCount > 0 && <span className="shop-cart-badge">{productCount}</span>}
            </button>
          </div>
        </div>

        <div className="shop-search-wrap">
          <IonIcon icon={searchOutline} className="shop-search-icon" />
          <input
            type="text"
            placeholder="Search walkers, vitamins, monitors..."
            className="shop-search-input"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>

        {categories.length > 1 && (
          <div className="shop-filter-bar">
            <div className="shop-categories">
              {categories.map((cat) => (
                <button
                  key={cat}
                  className={`shop-category-pill ${activeCategory === cat ? "active" : ""}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="shop-section-title-row">
          <h3 className="shop-section-title">{sectionTitle}</h3>
          <span className="shop-result-count">{visibleProducts.length} items</span>
        </div>

        {loading && (
          <div className="shop-loading">
            <IonSpinner name="crescent" />
          </div>
        )}

        {!loading && loadError && (
          <div className="shop-empty shop-load-error">
            Couldn&apos;t load products. Check your connection, then pull down to try again.
            <button className="shop-retry-btn" onClick={() => setRefreshKey((k) => k + 1)}>
              Try again
            </button>
          </div>
        )}

        {!loading && !loadError && visibleProducts.length === 0 && (
          <div className="shop-empty">No products found.</div>
        )}

        <div className="shop-grid">
          {visibleProducts.map((product) => (
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
      </IonContent>
    </IonPage>
  );
};

export default Products;
