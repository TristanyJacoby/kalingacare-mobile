// src/components/ProductCard.tsx
// KalingaCare — product card, redesigned to match the web app's card
// layout: favorite heart button, category badge, name, subcategory,
// converted price with the real PHP price struck through underneath, and
// a full-width Add to Cart button. Shared by Home and Products so both
// stay visually identical.
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { IonIcon, useIonToast } from "@ionic/react";
import { heart, heartOutline, cartOutline } from "ionicons/icons";
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useCart } from "../context/CartContext";
import { canAddToCart } from "../utils/cartGuard";
import { convertAndFormat, type RatesResult } from "../utils/currency";
import "./ProductCard.css";

export interface CardProduct {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  price: number;
  stock?: number;
  img?: string;
  imgBase64?: string;
}

interface ProductCardProps {
  product: CardProduct;
  onOpen: (id: string) => void;
  // Passed down from the parent page so every card on screen shares one
  // fetch instead of each card calling the rates API itself.
  displayCurrency: string;
  rates: RatesResult | null;
  // The set of the signed-in user's favorited product IDs, and a setter
  // so toggling one card's heart updates the whole page's copy at once —
  // keeps this in sync if the same product also appears elsewhere (e.g.
  // Home's featured row and the full catalog).
  favoriteIds: Set<string>;
  onFavoriteChange: (id: string, isFavorited: boolean) => void;
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

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onOpen,
  displayCurrency,
  rates,
  favoriteIds,
  onFavoriteChange,
}) => {
  const [presentToast] = useIonToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { addItem } = useCart();
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [addLoading, setAddLoading] = useState(false);

  const isFavorited = favoriteIds.has(product.id);

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const user = auth.currentUser;
    if (!user) {
      presentToast({ message: "Please log in to save favorites.", duration: 2200, color: "warning" });
      return;
    }
    setFavoriteLoading(true);
    const userRef = doc(db, "users", user.uid);
    try {
      if (isFavorited) {
        await updateDoc(userRef, { favorites: arrayRemove(product.id) });
        onFavoriteChange(product.id, false);
      } else {
        await updateDoc(userRef, { favorites: arrayUnion(product.id) });
        onFavoriteChange(product.id, true);
      }
    } catch {
      presentToast({ message: "Something went wrong. Please try again.", duration: 2200, color: "danger" });
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setAddLoading(true);
    try {
      const access = await canAddToCart();
      if (access === "guest") {
        presentToast({ message: "Please sign in to add items to your cart.", duration: 2500, color: "warning" });
        navigate("/login", { state: { from: location.pathname + location.search } });
        return;
      }
      if (access === "staff") {
        presentToast({ message: "Staff accounts can't place orders.", duration: 2200, color: "warning" });
        return;
      }
      if ((product.stock ?? 0) <= 0) {
        presentToast({ message: "This item is out of stock.", duration: 2200, color: "warning" });
        return;
      }
      addItem({
        id: product.id,
        name: product.name,
        price: product.price,
        img: product.imgBase64 || product.img,
      });
      presentToast({ message: `${product.name} added to cart.`, duration: 1800, color: "success" });
    } finally {
      setAddLoading(false);
    }
  };

  return (
    <div className="pcard" onClick={() => onOpen(product.id)}>
      <button
        className={`pcard-fav-btn ${isFavorited ? "active" : ""}`}
        onClick={handleToggleFavorite}
        disabled={favoriteLoading}
        aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
      >
        <IonIcon icon={isFavorited ? heart : heartOutline} />
      </button>

      <div className="pcard-image-wrap">
        <img
          src={product.imgBase64 || product.img || placeholderImg()}
          alt={product.name}
          className="pcard-image"
          onError={(e) => {
            (e.target as HTMLImageElement).src = placeholderImg();
          }}
        />
      </div>

      <div className="pcard-body">
        {product.category && <span className="pcard-badge">{product.category}</span>}
        <p className="pcard-name">{product.name}</p>
        {product.subcategory && <p className="pcard-subcategory">{product.subcategory}</p>}

        {displayCurrency !== "PHP" && rates ? (
          <>
            <p className="pcard-price">{convertAndFormat(product.price, displayCurrency, rates.rates)}</p>
            <p className="pcard-price-php">{peso(product.price)}</p>
          </>
        ) : (
          <p className="pcard-price">{peso(product.price)}</p>
        )}

        <button className="pcard-add-btn" onClick={handleAddToCart} disabled={addLoading}>
          <IonIcon icon={cartOutline} /> Add to Cart
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
