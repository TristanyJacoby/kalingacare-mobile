import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  IonPage,
  IonContent,
  IonIcon,
  IonSpinner,
  useIonToast,
} from "@ionic/react";
import { arrowBackOutline } from "ionicons/icons";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import "./MyOrders.css";

interface OrderItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

interface Order {
  id: string;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  status: string;
  createdAt?: { toDate: () => Date };
}

// Same color-badge pattern already used for role badges in Profile.tsx —
// keeping the same visual language across the app.
const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  Pending: { bg: "#fff2cc", color: "#916f00" },
  Processing: { bg: "#e2f2fb", color: "#3fa8e0" },
  Shipped: { bg: "#e6dffb", color: "#6a3fd6" },
  Delivered: { bg: "#dcefe3", color: "#2f8f5b" },
  Cancelled: { bg: "#fde8ea", color: "#e0475f" },
};

// Only these statuses allow cancelling — matches web's business rule
// (mentioned in the project doc) that an order can't be cancelled once
// it's already shipped.
const CANCELLABLE_STATUSES = ["New", "Pending", "Processing"];

function peso(amount: number) {
  return "₱" + amount.toLocaleString("en-PH");
}

function formatDate(order: Order) {
  if (!order.createdAt) return "";
  return order.createdAt.toDate().toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const MyOrders: React.FC = () => {
  const navigate = useNavigate();
  const [presentToast] = useIonToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  // Tracks which specific order is mid-cancel, so only that one card shows
  // a "Cancelling…" state instead of disabling every button on the page.
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  // Set of "orderId:productId" strings this user has already reviewed —
  // used to show "Reviewed" instead of a Leave a Review button, since
  // Firestore's reviews rule doesn't allow editing/deleting one once
  // created (so preventing a duplicate submission has to happen here).
  const [reviewedKeys, setReviewedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      navigate("/login");
      return;
    }

    (async () => {
      try {
        const q = query(
          collection(db, "orders"),
          where("userId", "==", user.uid),
        );
        const snap = await getDocs(q);
        const fetchedOrders = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Order, "id">),
        }));
        // Sort newest first in app code instead of asking Firestore to do
        // it, since orders without a createdAt yet (rare, but possible
        // right after placing one) are pushed to the end instead of
        // breaking the sort.
        fetchedOrders.sort((a, b) => {
          const aTime = a.createdAt?.toDate().getTime() ?? 0;
          const bTime = b.createdAt?.toDate().getTime() ?? 0;
          return bTime - aTime;
        });
        setOrders(fetchedOrders);

        // Find which order+product combos already have a review from this
        // user, so the buttons below can reflect that correctly.
        const reviewsQ = query(
          collection(db, "reviews"),
          where("userId", "==", user.uid),
        );
        const reviewsSnap = await getDocs(reviewsQ);
        const keys = new Set(
          reviewsSnap.docs.map((d) => {
            const data = d.data();
            return `${data.orderId}:${data.productId}`;
          }),
        );
        setReviewedKeys(keys);
      } catch (err) {
        console.error("MyOrders fetch failed:", err);
        setOrders([]);
        presentToast({
          message: "Could not load your orders. Please try again.",
          duration: 2500,
          color: "danger",
        });
      }
      setLoading(false);
    })();
  }, [navigate]);

  const handleCancel = async (orderId: string) => {
    setCancellingId(orderId);
    try {
      await updateDoc(doc(db, "orders", orderId), { status: "Cancelled" });
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: "Cancelled" } : o)),
      );
      presentToast({
        message: "Order cancelled.",
        duration: 2000,
        color: "success",
      });
    } catch {
      presentToast({
        message: "Could not cancel this order. Please try again.",
        duration: 2500,
        color: "danger",
      });
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <IonPage>
      <IonContent fullscreen className="orders-content">
        <div className="orders-topbar">
          <button
            className="orders-icon-btn"
            onClick={() => navigate(-1)}
            aria-label="Back"
          >
            <IonIcon icon={arrowBackOutline} />
          </button>
          <span className="orders-title">My Orders</span>
          <div className="orders-icon-spacer" />
        </div>

        {loading ? (
          <div className="orders-loading">
            <IonSpinner name="crescent" />
          </div>
        ) : orders.length === 0 ? (
          <div className="orders-empty">
            <p>You haven't placed any orders yet.</p>
            <button
              className="orders-browse-btn"
              onClick={() => navigate("/products")}
            >
              Browse Products
            </button>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map((order) => {
              // Customers see "Pending" even when the real status is "New" —
              // that's purely about whether staff has opened the order yet.
              // Matches the same normalization on web's profile.js.
              const displayStatus =
                order.status === "New" ? "Pending" : order.status;
              const statusStyle =
                STATUS_STYLES[displayStatus] || STATUS_STYLES.Pending;
              const canCancel = CANCELLABLE_STATUSES.includes(order.status);
              const isCancelling = cancellingId === order.id;

              return (
                <div className="orders-card" key={order.id}>
                  <div className="orders-card-header">
                    <span className="orders-card-date">
                      {formatDate(order)}
                    </span>
                    <span
                      className="orders-status-badge"
                      style={{
                        background: statusStyle.bg,
                        color: statusStyle.color,
                      }}
                    >
                      {displayStatus}
                    </span>
                  </div>

                  <div className="orders-items">
                    {order.items.map((item, i) => {
                      const reviewKey = `${order.id}:${item.id}`;
                      const alreadyReviewed = reviewedKeys.has(reviewKey);
                      return (
                        <div className="orders-item-row" key={i}>
                          <div className="orders-item-main">
                            <span className="orders-item-name">
                              {item.name}{" "}
                              <span className="orders-item-qty">x{item.qty}</span>
                            </span>
                            <span className="orders-item-price">
                              {peso(item.price * item.qty)}
                            </span>
                          </div>
                          {displayStatus === "Delivered" && (
                            alreadyReviewed ? (
                              <span className="orders-reviewed-label">Reviewed</span>
                            ) : (
                              <button
                                className="orders-review-btn"
                                onClick={() => navigate(`/review/${order.id}/${item.id}`)}
                              >
                                Leave a Review
                              </button>
                            )
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="orders-total-row">
                    <span>Total</span>
                    <span className="orders-total-value">
                      {peso(order.total)}
                    </span>
                  </div>

                  {canCancel && (
                    <button
                      className="orders-cancel-btn"
                      onClick={() => handleCancel(order.id)}
                      disabled={isCancelling}
                    >
                      {isCancelling ? "Cancelling…" : "Cancel Order"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default MyOrders;
