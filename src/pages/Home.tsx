import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IonContent, IonPage, IonIcon, IonSpinner, useIonToast } from "@ionic/react";
import { searchOutline, notificationsOutline, copyOutline } from "ionicons/icons";
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

interface BannerSlide {
  key: string;
  title: string;
  subtitle: string;
  cta: { label: string; onClick: () => void };
  code?: string;
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
  const [presentToast] = useIonToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  const [userName, setUserName] = useState("");
  const [userPhoto, setUserPhoto] = useState<string | null>(null);

  const [activeSlide, setActiveSlide] = useState(0);
  const bannerRef = useRef<HTMLDivElement>(null);
  const autoAdvanceRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const goToProducts = (params?: { q?: string; category?: string }) => {
    const search = new URLSearchParams();
    if (params?.q) search.set("q", params.q);
    if (params?.category) search.set("category", params.category);
    const qs = search.toString();
    navigate(qs ? `/products?${qs}` : "/products");
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      presentToast({ message: `Copied "${code}" — paste it in Cart to appllly.`, duration: 2200, color: "success" });
    } catch {
      presentToast({ message: `Your code: ${code}`, duration: 3000, color: "medium" });
    }
  };

  const slides: BannerSlide[] = useMemo(
    () => [
      {
        key: "brand",
        title: "Care Beyond Borders",
        subtitle: "Wellness essentials for the family you love, delivered anywhere in the Philippines.",
        cta: { label: "Shop Now", onClick: () => goToProducts() },
      },
      {
        key: "welcome10",
        title: "10% Off Your First Order",
        subtitle: "New here? Use this code at checkout — real discount, applied at Cart.",
        cta: { label: "Copy Code", onClick: () => handleCopyCode("WELCOME10") },
        code: "WELCOME10",
      },
      {
        key: "care50",
        title: "₱50 Off Your Order",
        subtitle: "Use this code anytime at checkout — no minimum spend.",
        cta: { label: "Copy Code", onClick: () => handleCopyCode("CARE50") },
        code: "CARE50",
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Auto-advance the banner carousel every 5s.
  useEffect(() => {
    autoAdvanceRef.current = setInterval(() => {
      setActiveSlide((i) => (i + 1) % slides.length);
    }, 5000);
    return () => {
      if (autoAdvanceRef.current) clearInterval(autoAdvanceRef.current);
    };
  }, [slides.length]);

  useEffect(() => {
    const el = bannerRef.current;
    if (!el) return;
    el.scrollTo({ left: activeSlide * el.clientWidth, behavior: "smooth" });
  }, [activeSlide]);

  const handleManualScroll = () => {
    const el = bannerRef.current;
    if (!el) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    setActiveSlide(index);
    if (autoAdvanceRef.current) clearInterval(autoAdvanceRef.current);
    autoAdvanceRef.current = setInterval(() => {
      setActiveSlide((i) => (i + 1) % slides.length);
    }, 5000);
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
            <p className="home-greeting-name">Hi, {userName.trim().split(/\s+/)[0]}</p>
            <p className="home-greeting-subtitle">Welcome back!</p>
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

        <div className="home-banner-wrap">
          <div className="home-banner-carousel" ref={bannerRef} onScroll={handleManualScroll}>
            {slides.map((slide) => (
              <div className="home-banner" key={slide.key}>
                <h2 className="home-banner-title">{slide.title}</h2>
                <p className="home-banner-subtitle">{slide.subtitle}</p>
                {slide.code && (
                  <div className="home-banner-code-chip">
                    <span>{slide.code}</span>
                    <IonIcon icon={copyOutline} />
                  </div>
                )}
                <button className="home-banner-btn" onClick={slide.cta.onClick}>
                  {slide.cta.label}
                </button>
              </div>
            ))}
          </div>
          <div className="home-banner-dots">
            {slides.map((slide, i) => (
              <span key={slide.key} className={`home-banner-dot ${i === activeSlide ? "active" : ""}`} />
            ))}
          </div>
        </div>

        <h3 className="home-section-title-inline home-featured-title">Featured Products</h3>

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

        <button className="home-view-all-btn" onClick={() => goToProducts()}>
          View All Products
        </button>
      </IonContent>
    </IonPage>
  );
};

export default Home;
