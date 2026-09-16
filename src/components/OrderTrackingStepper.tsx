// src/components/OrderTrackingStepper.tsx
// KalingaCare — order status progress stepper, ported from the web app's
// profile.js renderTrackerStepper().
import {
  receiptOutline,
  cubeOutline,
  carOutline,
  homeOutline,
  closeCircleOutline,
} from "ionicons/icons";
import { IonIcon } from "@ionic/react";
import "./OrderTrackingStepper.css";

const STATUS_STEPS = ["Pending", "Processing", "Shipped", "Delivered"];
const STEP_ICONS = [receiptOutline, cubeOutline, carOutline, homeOutline];

interface OrderTrackingStepperProps {
  status: string;
}

const OrderTrackingStepper: React.FC<OrderTrackingStepperProps> = ({ status }) => {
  if (status === "Cancelled") {
    return (
      <div className="tracker-cancelled">
        <IonIcon icon={closeCircleOutline} /> This order was cancelled.
      </div>
    );
  }

  // "New" vs "Pending" is an internal staff-viewed/unviewed distinction —
  // the customer doesn't need to see that difference, so it's treated as
  // Pending here, same as web's profile.js.
  const displayStatus = status === "New" ? "Pending" : status;
  const currentIndex = STATUS_STEPS.indexOf(displayStatus);

  return (
    <div className="tracker-steps">
      {STATUS_STEPS.map((step, i) => {
        const state =
          i < currentIndex ? "done" : i === currentIndex ? "done current" : "";
        return (
          <div className={`tracker-step ${state}`} key={step}>
            <div className="tracker-dot">
              <IonIcon icon={STEP_ICONS[i]} />
            </div>
            <div className="tracker-label">{step}</div>
          </div>
        );
      })}
    </div>
  );
};

export default OrderTrackingStepper;
