import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IonContent, IonPage, IonIcon, IonSpinner } from "@ionic/react";
import { searchOutline, notificationsOutline } from "ionicons/icons";
import { collection, query, orderBy, onSnapshot, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import { initials } from "../utils/avatar";
import { getCategoryColor } from "../utils/categoryColor";
import logo from "../assets/kalingacare-logo.png";
import "./Shop.css";
import "./Home.css";

interface Product {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  price: number;
  stock?: number;
  img?: string;
  imgBase64?: string;
}

function peso(amount: number) {
  return "₱" + amount.toLocaleString("en-PH");
}

function placeholderImg() {
  return (
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="136" height="136"><rect width="136" height="136" fill="#f1f5f9"/><text x="68" y="72" font-size="11" fill="#94a3b8" text-anchor="middle" font-family="sans-serif">No image</text></svg>`,
    )
  );
}

// No "featured"/"popular" flag exists in Firestore yet, so this just takes
// the first few products from the live catalog rather than a real
// popularity ranking. Swap this out if an admin-settable "featured" field
// gets added later.
const FEATURED_COUNT = 4;

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  const [userName, setUserName] = useState("");
  const [userPhoto, setUserPhoto] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "products"), orderBy("name"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Product[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Product, "id">),
      }));
      setProducts(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      const snap = await getDoc(doc(db, "users", user.uid));
      const data = snap.exists() ? (snap.data() as any) : {};
      setUserName(user.displayName || data.fullName || "");
      setUserPhoto(data.photoBase64 || null);
    });
    return () => unsubscribe();
  }, []);

  const featuredProducts = useMemo(() => products.slice(0, FEATURED_COUNT), [products]);

  const categories = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
  }, [products]);

  const goToProducts = (params?: { q?: string; category?: string }) => {
    const search = new URLSearchParams();
    if (params?.q) search.set("q", params.q);
    if (params?.category) search.set("category", params.category);
    const qs = search.toString();
    navigate(qs ? `/products?${qs}` : "/products");
  };

  return (
    <IonPage>
      <IonContent fullscreen className="home-content">
        <div className="shop-header">
          <img src={logo} alt="KalingaCare" className="shop-logo" />
          <span className="shop-appname">KalingaCare</span>
          <div className="shop-header-icons">
            <button className="shop-icon-btn" aria-label="Notifications" onClick={() => navigate("/notifications")}>
              <IonIcon icon={notificationsOutline} />
            </button>
            <button className="shop-avatar-btn" aria-label="Profile" onClick={() => navigate("/profile")}>
              {userPhoto ? (
                <img src={userPhoto} alt={userName} className="shop-avatar-img" />
              ) : (
                <span className="shop-avatar-initials">{initials(userName)}</span>
              )}
            </button>
          </div>
        </div>

        {userName && (
          <div className="home-greeting">
            <p className="home-greeting-subtitle">Welcome back,</p>
            <p className="home-greeting-name">{userName}</p>
          </div>
        )}

        {/* Typing here is a shortcut, not an in-place filter — Home only
            shows a handful of featured items, so search hands off to the
            full catalog on the Categories tab. */}
        <div className="shop-search-wrap">
          <IonIcon icon={searchOutline} className="shop-search-icon" />
          <input
            type="text"
            placeholder="Search walkers, vitamins, monitors..."
            className="shop-search-input"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") goToProducts({ q: searchText });
            }}
          />
        </div>

        <div className="home-banner">
          <h2 className="home-banner-title">Care Beyond Borders</h2>
          <p className="home-banner-subtitle">
            Wellness essentials for the family you love, delivered anywhere in the Philippines.
          </p>
          <button className="home-banner-btn" onClick={() => goToProducts()}>
            Shop Now
          </button>
        </div>

        {categories.length > 0 && (
          <>
            <h3 className="shop-section-title">Categories</h3>
            <div className="shop-categories">
              {categories.map((cat) => (
                <button
                  key={cat}
                  className="shop-category-pill"
                  onClick={() => goToProducts({ category: cat })}
                >
                  {cat}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="home-section-header">
          <h3 className="home-section-title-inline">Featured Products</h3>
          <span className="home-view-all" onClick={() => goToProducts()}>
            View All
          </span>
        </div>

        {loading && (
          <div className="shop-loading">
            <IonSpinner name="crescent" />
          </div>
        )}

        {!loading && featuredProducts.length === 0 && (
          <div className="shop-empty">No products yet.</div>
        )}

        <div className="shop-grid">
          {featuredProducts.map((product) => (
            <div className="shop-card" key={product.id} onClick={() => navigate(`/product/${product.id}`)}>
              <div
                className="shop-card-image-wrap"
                style={{ background: getCategoryColor(product.category) }}
              >
                <img
                  src={product.imgBase64 || product.img || placeholderImg()}
                  alt={product.name}
                  className="shop-card-image"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = placeholderImg();
                  }}
                />
              </div>
              <p className="shop-card-name">{product.name}</p>
              <p className="shop-card-price">{peso(product.price)}</p>
            </div>
          ))}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Home;
