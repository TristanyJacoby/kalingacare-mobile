import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  IonPage,
  IonContent,
  IonIcon,
  IonSpinner,
  useIonToast,
  useIonAlert,
  IonRefresher,
  IonRefresherContent,
} from "@ionic/react";
import { arrowBackOutline, carOutline, chevronUpOutline } from "ionicons/icons";
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { payOnline, cancelOrder, PAYMENT_CHANNEL_LABELS } from "../utils/payments";
import OrderTrackingStepper from "../components/OrderTrackingStepper";
import TrackingMap from "../components/TrackingMap";
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
  shippingInfo?: { lat?: number | null; lng?: number | null; paymentMethod?: string };
  paymentStatus?: string;
  payment?: { channel?: string | null };
}

// Same color-badge pattern already used for role badges in Profile.tsx —
// keeping the same visual language across the app.
const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  Pending: { bg: "#fff2cc", color: "#916f00" },
  Processing: { bg: "#e2f2fb", color: "#1778ad" },
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
  const [presentAlert] = useIonAlert();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  // Tracks which specific order is mid-cancel, so only that one card shows
  // a "Cancelling…" state instead of disabling every button on the page.
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

  const handlePay = async (orderId: string) => {
    setPayingId(orderId);
    try {
      const status = await payOnline(orderId);
      if (status === "paid") {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, paymentStatus: "paid" } : o)),
        );
        presentToast({ message: "Payment received.", duration: 2500, color: "success" });
      } else {
        presentToast({
          message: "Payment not completed. You can try again anytime.",
          duration: 3000,
          color: "warning",
        });
      }
    } catch (err: any) {
      presentToast({
        message: err?.message || "Couldn't open the payment page. Please try again.",
        duration: 3000,
        color: "danger",
      });
    } finally {
      setPayingId(null);
    }
  };
  // Set of "orderId:productId" strings this user has already reviewed —
  // used to show "Reviewed" instead of a Leave a Review button, since
  // Firestore's reviews rule doesn't allow editing/deleting one once
  // created (so preventing a duplicate submission has to happen here).
  const [reviewedKeys, setReviewedKeys] = useState<Set<string>>(new Set());
  // Which order cards currently have their tracking panel open.
  const [trackingOpenIds, setTrackingOpenIds] = useState<Set<string>>(new Set());

  const toggleTracking = (orderId: string) => {
    setTrackingOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  // Live: a status change made by staff on the website shows up here on
  // its own. Pull-to-refresh re-subscribes (a fresh fetch from the
  // server) and re-checks which items were already reviewed.
  const [refreshKey, setRefreshKey] = useState(0);
  const refresherRef = useRef<HTMLIonRefresherElement | null>(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      navigate("/login");
      return;
    }

    const q = query(collection(db, "orders"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const fetchedOrders = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Order, "id">),
        }));
        // Newest first, sorted here (not by Firestore): orders without a
        // createdAt yet (right after placing one) go to the end.
        fetchedOrders.sort((a, b) => {
          const aTime = a.createdAt?.toDate().getTime() ?? 0;
          const bTime = b.createdAt?.toDate().getTime() ?? 0;
          return bTime - aTime;
        });
        setOrders(fetchedOrders);
        setLoading(false);
        refresherRef.current?.complete();
      },
      (err) => {
        console.error("MyOrders fetch failed:", err);
        setLoading(false);
        refresherRef.current?.complete();
        presentToast({
          message: "Could not load your orders. Pull down to try again.",
          duration: 2500,
          color: "danger",
        });
      },
    );

    // Which order+product combos this user already reviewed.
    getDocs(query(collection(db, "reviews"), where("userId", "==", user.uid)))
      .then((reviewsSnap) =>
        setReviewedKeys(
          new Set(
            reviewsSnap.docs.map((d) => {
              const data = d.data();
              return `${data.orderId}:${data.productId}`;
            }),
          ),
        ),
      )
      .catch((err) => console.error("Couldn't load your reviews:", err));

    return () => unsubscribe();
    // presentToast is stable enough; re-running on it would resubscribe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, refreshKey]);

  const confirmCancel = (orderId: string) => {
    presentAlert({
      header: "Cancel this order?",
      message: "This can't be undone. The order won't be delivered.",
      buttons: [
        { text: "Keep Order", role: "cancel" },
        { text: "Cancel Order", role: "destructive", handler: () => handleCancel(orderId) },
      ],
    });
  };

  const handleCancel = async (orderId: string) => {
    setCancellingId(orderId);
    try {
      await cancelOrder(orderId);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: "Cancelled" } : o)),
      );
      presentToast({
        message: "Order cancelled.",
        duration: 2000,
        color: "success",
      });
    } catch (err) {
      presentToast({
        message: err instanceof Error ? err.message : "Could not cancel this order. Please try again.",
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
        <IonRefresher slot="fixed" ref={refresherRef} onIonRefresh={() => setRefreshKey((k) => k + 1)}>
          <IonRefresherContent />
        </IonRefresher>
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
              // Online orders: unpaid ones can be paid here; paid ones can't
              // be self-cancelled, since refunds go through the store.
              const isOnline = order.shippingInfo?.paymentMethod === "online";
              const isPaid = isOnline && order.paymentStatus === "paid";
              const canCancel =
                CANCELLABLE_STATUSES.includes(order.status) && !isPaid;
              const canPay = isOnline && !isPaid && order.status !== "Cancelled";
              const channel = PAYMENT_CHANNEL_LABELS[order.payment?.channel ?? ""];
              const paymentLabel = !isOnline
                ? "Cash on Delivery"
                : isPaid
                  ? `Paid${channel ? ` · ${channel}` : ""}`
                  : order.status === "Cancelled"
                    ? "Not paid"
                    : "Payment pending";
              const paymentClass = !isOnline || order.status === "Cancelled"
                ? "cod"
                : isPaid
                  ? "paid"
                  : "pending";
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

                  <div className="orders-payment-row">
                    <span>Payment</span>
                    <span className={`orders-payment-pill ${paymentClass}`}>
                      {paymentLabel}
                    </span>
                  </div>

                  {canPay && (
                    <button
                      className="orders-pay-btn"
                      onClick={() => handlePay(order.id)}
                      disabled={payingId !== null}
                    >
                      {payingId === order.id ? "Waiting for payment…" : "Pay now"}
                    </button>
                  )}

                  {canCancel && (
                    <button
                      className="orders-cancel-btn"
                      onClick={() => confirmCancel(order.id)}
                      disabled={isCancelling}
                    >
                      {isCancelling ? "Cancelling…" : "Cancel Order"}
                    </button>
                  )}

                  {displayStatus !== "Cancelled" && (
                    <>
                      <button
                        className="orders-track-btn"
                        onClick={() => toggleTracking(order.id)}
                      >
                        <IonIcon
                          icon={
                            trackingOpenIds.has(order.id)
                              ? chevronUpOutline
                              : carOutline
                          }
                        />{" "}
                        {trackingOpenIds.has(order.id)
                          ? "Hide Tracking"
                          : "Track Order"}
                      </button>
                      {trackingOpenIds.has(order.id) && (
                        <div className="orders-tracking-panel">
                          <OrderTrackingStepper status={order.status} />
                          <TrackingMap
                            destLat={order.shippingInfo?.lat}
                            destLng={order.shippingInfo?.lng}
                          />
                        </div>
                      )}
                    </>
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
