import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IonContent, IonPage, IonIcon, IonSpinner, useIonToast, IonMenuButton } from "@ionic/react";
import { searchOutline, notificationsOutline, copyOutline, menuOutline, cardOutline, cubeOutline } from "ionicons/icons";
import { collection, query, orderBy, onSnapshot, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import { initials } from "../utils/avatar";
import { getRates, type RatesResult } from "../utils/currency";
import ProductCard, { type CardProduct } from "../components/ProductCard";
import logo from "../assets/kalingacare-logo.png";
import "./Shop.css";
import "./Home.css";

interface BannerSlide {
  key: string;
  title: string;
  subtitle: string;
  cta: { label: string; onClick: () => void };
  code?: string;
}

// No "featured"/"popular" flag exists in Firestore yet, so this just takes
// the first few products from the live catalog rather than a real
// popularity ranking. Swap this out if an admin-settable "featured" field
// gets added later.
const FEATURED_COUNT = 4;

// "How It Works" — shortened to a compact strip so products lead the page.
const HOW_IT_WORKS = [
  { icon: searchOutline, title: "Browse", desc: "Find care essentials" },
  { icon: cardOutline, title: "Order & Pay", desc: "Cash on Delivery" },
  { icon: cubeOutline, title: "We Deliver", desc: "Anywhere in the PH" },
];

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [presentToast] = useIonToast();
  const [products, setProducts] = useState<CardProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  const [userName, setUserName] = useState("");
  const [userPhoto, setUserPhoto] = useState<string | null>(null);

  const [displayCurrency, setDisplayCurrency] = useState("PHP");
  const [rates, setRates] = useState<RatesResult | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  const handleFavoriteChange = (id: string, isFavorited: boolean) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (isFavorited) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  useEffect(() => {
    getRates().then(setRates);
  }, []);

  const [activeSlide, setActiveSlide] = useState(0);
  const bannerRef = useRef<HTMLDivElement>(null);
  const autoAdvanceRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollAnimRef = useRef<number | null>(null);

  useEffect(() => {
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setFavoriteIds(new Set());
        return;
      }
      const snap = await getDoc(doc(db, "users", user.uid));
      const data = snap.exists() ? (snap.data() as any) : {};
      setUserName(user.displayName || data.fullName || "");
      setUserPhoto(data.photoBase64 || null);
      if (data.currency) setDisplayCurrency(data.currency);
      setFavoriteIds(new Set(data.favorites || []));
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
      presentToast({ message: `Copied "${code}" — paste it in Cart to apply.`, duration: 2200, color: "success" });
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

  // Tracks whether the *next* activeSlide change should trigger our own
  // eased scroll animation. Only set right before we change the slide
  // ourselves (auto-advance). Left false for changes that come from the
  // user's own finger — see the note on handleManualScroll below for why.
  const isProgrammaticSlideChange = useRef(false);
  const manualScrollSettleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleAutoAdvance = () => {
    if (autoAdvanceRef.current) clearInterval(autoAdvanceRef.current);
    autoAdvanceRef.current = setInterval(() => {
      isProgrammaticSlideChange.current = true;
      setActiveSlide((i) => (i + 1) % slides.length);
    }, 5000);
  };

  // Auto-advance the banner carousel every 5s.
  useEffect(() => {
    scheduleAutoAdvance();
    return () => {
      if (autoAdvanceRef.current) clearInterval(autoAdvanceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides.length]);

  // Each slide's true width includes the 12px gap between slides (see
  // .home-banner-carousel's `gap` in Home.css) — using el.clientWidth alone
  // here used to drift out of sync with the actual scroll-snap positions
  // after the first slide, which is what made the carousel look messy.
  const slideStep = () => {
    const el = bannerRef.current;
    if (!el) return 0;
    const firstSlide = el.firstElementChild as HTMLElement | null;
    if (!firstSlide) return el.clientWidth;
    const gap = parseFloat(getComputedStyle(el).columnGap || "0");
    return firstSlide.getBoundingClientRect().width + gap;
  };

  // Eases the carousel over to a slide by hand instead of relying on the
  // browser's built-in smooth scrollTo. With scroll-snap turned on,
  // smooth scrollTo tends to just jump straight to the snap point on a
  // lot of phone browsers/webviews instead of gliding there, which is
  // what made auto-advance look like an instant cut. Animating
  // scrollLeft ourselves, frame by frame, always glides.
  const animateScrollTo = (target: number, duration = 420) => {
    const el = bannerRef.current;
    if (!el) return;
    if (scrollAnimRef.current !== null) cancelAnimationFrame(scrollAnimRef.current);

    const start = el.scrollLeft;
    const distance = target - start;
    const startTime = performance.now();
    // Ease in, then ease out — starts and ends gently instead of a hard
    // linear slide.
    const easeInOutQuad = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      el.scrollLeft = start + distance * easeInOutQuad(progress);
      if (progress < 1) {
        scrollAnimRef.current = requestAnimationFrame(step);
      } else {
        scrollAnimRef.current = null;
      }
    };

    scrollAnimRef.current = requestAnimationFrame(step);
  };

  useEffect(() => {
    // Only animate here for changes WE made (auto-advance). If this
    // change came from the user dragging the carousel themselves, the
    // browser already scrolled it there natively — animating scrollLeft
    // on top of that would fight the user's own finger/momentum and is
    // exactly what caused the carousel to jitter when swiped by hand.
    if (isProgrammaticSlideChange.current) {
      isProgrammaticSlideChange.current = false;
      animateScrollTo(activeSlide * slideStep());
    }
  }, [activeSlide]);

  useEffect(() => {
    return () => {
      if (scrollAnimRef.current !== null) cancelAnimationFrame(scrollAnimRef.current);
      if (manualScrollSettleRef.current) clearTimeout(manualScrollSettleRef.current);
    };
  }, []);

  // Fires continuously while the user drags/flicks the carousel — once
  // per frame, not once per swipe. We only want to react once the
  // scrolling has actually settled, so this just resets a short timer on
  // every event and does the real work when the timer finally fires
  // uninterrupted. This also avoids re-triggering the eased animation
  // above mid-swipe, which was the root cause of the jittery feeling.
  const handleManualScroll = () => {
    if (manualScrollSettleRef.current) clearTimeout(manualScrollSettleRef.current);
    manualScrollSettleRef.current = setTimeout(() => {
      const el = bannerRef.current;
      if (!el) return;
      const step = slideStep();
      const index = step ? Math.round(el.scrollLeft / step) : 0;
      // Not flagged as programmatic — the browser's own scroll-snap
      // already landed exactly on this slide, so this just updates the
      // dots to match, nothing more.
      setActiveSlide(index);
      scheduleAutoAdvance();
    }, 120);
  };

  return (
    <IonPage>
      <IonContent fullscreen className="home-content">
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

        <button className="home-view-all-btn" onClick={() => goToProducts()}>
          View All Products
        </button>

        <div className="home-how">
          {HOW_IT_WORKS.map((step) => (
            <div className="home-how-item" key={step.title}>
              <div className="home-step-icon">
                <IonIcon icon={step.icon} />
              </div>
              <p className="home-step-title">{step.title}</p>
              <p className="home-step-desc">{step.desc}</p>
            </div>
          ))}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Home;
