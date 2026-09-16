import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { IonContent, IonPage, IonIcon, IonSpinner, IonMenuButton } from "@ionic/react";
import { searchOutline, notificationsOutline, cartOutline, menuOutline } from "ionicons/icons";
import { collection, query, orderBy, onSnapshot, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import { useCart } from "../context/CartContext";
import { getRates, type RatesResult } from "../utils/currency";
import ProductCard, { type CardProduct } from "../components/ProductCard";
import logo from "../assets/kalingacare-logo.png";
import "./Shop.css";

const Products: React.FC = () => {
  const navigate = useNavigate();
  const { totalItems } = useCart();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<CardProduct[]>([]);
  const [loading, setLoading] = useState(true);
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
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: CardProduct[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<CardProduct, "id">),
      }));
      setProducts(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

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
        <div className="shop-header">
          <IonMenuButton className="shop-menu-btn" aria-label="Menu">
            <IonIcon icon={menuOutline} />
          </IonMenuButton>
          <img src={logo} alt="KalingaCare" className="shop-logo" />
          <span className="shop-appname">KalingaCare</span>
          <div className="shop-header-icons">
            <button className="shop-icon-btn" aria-label="Notifications" onClick={() => navigate("/notifications")}>
              <IonIcon icon={notificationsOutline} />
            </button>
            <button className="shop-icon-btn" aria-label="Cart" onClick={() => navigate("/cart")}>
              <IonIcon icon={cartOutline} />
              {totalItems > 0 && <span className="shop-cart-badge">{totalItems}</span>}
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

        {!loading && visibleProducts.length === 0 && (
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
