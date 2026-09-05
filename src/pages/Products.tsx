import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { IonContent, IonPage, IonIcon, IonSpinner } from "@ionic/react";
import { searchOutline, notificationsOutline, cartOutline } from "ionicons/icons";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useCart } from "../context/CartContext";
import { getCategoryColor } from "../utils/categoryColor";
import logo from "../assets/kalingacare-logo.png";
import "./Shop.css";

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

const Products: React.FC = () => {
  const navigate = useNavigate();
  const { totalItems } = useCart();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState(searchParams.get("q") ?? "");
  const [activeCategory, setActiveCategory] = useState<string>(searchParams.get("category") ?? "All");

  useEffect(() => {
    // Live subscription — same idea as the web app's products.js onSnapshot.
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
        )}

        <h3 className="shop-section-title">{sectionTitle}</h3>

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
            <div
              className="shop-card"
              key={product.id}
              style={{ background: getCategoryColor(product.category) }}
              onClick={() => navigate(`/product/${product.id}`)}
            >
              <div className="shop-card-image-wrap">
                <img
                  src={product.imgBase64 || product.img || placeholderImg()}
                  alt={product.name}
                  className="shop-card-image"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = placeholderImg();
                  }}
                />
              </div>
              <div className="shop-card-info-pill">
                <p className="shop-card-name">{product.name}</p>
                <p className="shop-card-price">{peso(product.price)}</p>
              </div>
            </div>
          ))}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Products;
