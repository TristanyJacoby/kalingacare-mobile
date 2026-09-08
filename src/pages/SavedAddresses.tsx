import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  IonPage,
  IonContent,
  IonIcon,
  IonSpinner,
  useIonToast,
} from "@ionic/react";
import {
  arrowBackOutline,
  addOutline,
  createOutline,
  trashOutline,
  checkmarkCircle,
  ellipseOutline,
  personOutline,
  locationOutline,
  callOutline,
} from "ionicons/icons";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import "./Auth.css";
import "./SavedAddresses.css";

// One saved address. "id" is just a random string we generate ourselves —
// Firestore array items don't have their own IDs like documents do, so we
// make one up to tell entries apart (for editing/deleting the right one).
interface Address {
  id: string;
  label: string; // e.g. "Home", "Mom's House" — just a nickname, optional
  recipient: string;
  address: string;
  phone: string;
  isDefault: boolean;
}

// Quick way to make a random-enough ID without needing an extra library.
function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const SavedAddresses: React.FC = () => {
  const navigate = useNavigate();
  const [presentToast] = useIonToast();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 'list' = normal view, 'form' = adding or editing an address
  const [mode, setMode] = useState<"list" | "form">("list");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form field state — shared by both "Add" and "Edit"
  const [label, setLabel] = useState("");
  const [recipient, setRecipient] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      navigate("/login");
      return;
    }

    (async () => {
      const snap = await getDoc(doc(db, "users", user.uid));
      const data = snap.exists() ? snap.data() : null;

      if (data?.savedAddresses) {
        // Normal case — the new array field already exists.
        setAddresses(data.savedAddresses);
      } else if (data?.savedAddress) {
        // Backward-compatibility: some accounts may still have the old
        // single-address field from before. We convert it into the new
        // list shape so nothing looks broken, and save it in the new
        // format right away so this conversion only ever happens once.
        const legacy = data.savedAddress;
        const converted: Address[] = [
          {
            id: makeId(),
            label: "Saved Address",
            recipient: legacy.recipient || "",
            address: legacy.address || "",
            phone: legacy.phone || "",
            isDefault: true,
          },
        ];
        setAddresses(converted);
        await updateDoc(doc(db, "users", user.uid), {
          savedAddresses: converted,
        });
      }

      setLoading(false);
    })();
  }, [navigate]);

  // Saves the whole updated list back to Firestore in one go. Firestore
  // doesn't have a clean way to edit "one item inside an array" — so the
  // simplest, safest approach is: change the list in memory, then write
  // the entire list back.
  const persist = async (updated: Address[]) => {
    const user = auth.currentUser;
    if (!user) return;
    await updateDoc(doc(db, "users", user.uid), { savedAddresses: updated });
    setAddresses(updated);
  };

  const resetForm = () => {
    setLabel("");
    setRecipient("");
    setAddress("");
    setPhone("");
    setEditingId(null);
  };

  const openAddForm = () => {
    resetForm();
    setMode("form");
  };

  const openEditForm = (item: Address) => {
    setLabel(item.label);
    setRecipient(item.recipient);
    setAddress(item.address);
    setPhone(item.phone);
    setEditingId(item.id);
    setMode("form");
  };

  const handleSave = async () => {
    if (!recipient || !address || !phone) {
      presentToast({
        message: "Please fill out all fields.",
        duration: 2200,
        color: "warning",
      });
      return;
    }

    setSaving(true);
    try {
      let updated: Address[];

      if (editingId) {
        // Editing an existing one — replace just that entry, keep the rest.
        updated = addresses.map((a) =>
          a.id === editingId
            ? { ...a, label: label || "Address", recipient, address, phone }
            : a,
        );
      } else {
        // Adding a new one. If this is the very first address ever, make
        // it the default automatically so Checkout always has something
        // to pre-fill from.
        const newAddress: Address = {
          id: makeId(),
          label: label || `Address ${addresses.length + 1}`,
          recipient,
          address,
          phone,
          isDefault: addresses.length === 0,
        };
        updated = [...addresses, newAddress];
      }

      await persist(updated);
      setMode("list");
      resetForm();
    } catch {
      presentToast({
        message: "Something went wrong. Please try again.",
        duration: 2200,
        color: "danger",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const wasDefault = addresses.find((a) => a.id === id)?.isDefault;
    let updated = addresses.filter((a) => a.id !== id);

    // If we just deleted the default address and others still exist,
    // automatically promote the first remaining one to default — so
    // Checkout never ends up with zero default address while addresses
    // still exist.
    if (wasDefault && updated.length > 0) {
      updated = updated.map((a, i) => ({ ...a, isDefault: i === 0 }));
    }

    await persist(updated);
  };

  const handleSetDefault = async (id: string) => {
    const updated = addresses.map((a) => ({ ...a, isDefault: a.id === id }));
    await persist(updated);
  };

  if (loading) {
    return (
      <IonPage>
        <IonContent fullscreen className="addr-content">
          <div className="addr-loading">
            <IonSpinner name="crescent" />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonContent fullscreen className="addr-content">
        <div className="addr-topbar">
          <button
            className="addr-icon-btn"
            onClick={() => (mode === "form" ? setMode("list") : navigate(-1))}
            aria-label="Back"
          >
            <IonIcon icon={arrowBackOutline} />
          </button>
          <span className="addr-title">
            {mode === "form"
              ? editingId
                ? "Edit Address"
                : "Add Address"
              : "Saved Addresses"}
          </span>
          <div className="addr-icon-spacer" />
        </div>

        {mode === "list" ? (
          <>
            {addresses.length === 0 ? (
              <div className="addr-empty">
                <p>No saved addresses yet.</p>
                <p className="addr-empty-sub">
                  Add one so checkout can fill it in automatically.
                </p>
              </div>
            ) : (
              <div className="addr-list">
                {addresses.map((item) => (
                  <div className="addr-card" key={item.id}>
                    <div className="addr-card-header">
                      <span className="addr-card-label">{item.label}</span>
                      {item.isDefault && (
                        <span className="addr-default-badge">Default</span>
                      )}
                    </div>
                    <p className="addr-card-line">{item.recipient}</p>
                    <p className="addr-card-line">{item.address}</p>
                    <p className="addr-card-line">{item.phone}</p>

                    <div className="addr-card-actions">
                      {!item.isDefault && (
                        <button
                          className="addr-action-btn"
                          onClick={() => handleSetDefault(item.id)}
                        >
                          <IonIcon icon={ellipseOutline} /> Set Default
                        </button>
                      )}
                      {item.isDefault && (
                        <span className="addr-action-btn addr-action-disabled">
                          <IonIcon icon={checkmarkCircle} /> Default
                        </span>
                      )}
                      <button
                        className="addr-action-btn"
                        onClick={() => openEditForm(item)}
                      >
                        <IonIcon icon={createOutline} /> Edit
                      </button>
                      <button
                        className="addr-action-btn addr-action-danger"
                        onClick={() => handleDelete(item.id)}
                      >
                        <IonIcon icon={trashOutline} /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button className="addr-add-btn" onClick={openAddForm}>
              <IonIcon icon={addOutline} /> Add New Address
            </button>
          </>
        ) : (
          <div className="checkout-form">
            <label className="auth-label">Label (optional)</label>
            <div className="auth-input-wrap">
              <input
                type="text"
                placeholder="Home, Mom's House, etc."
                className="auth-input"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>

            <label className="auth-label">Recipient&apos;s Full Name</label>
            <div className="auth-input-wrap">
              <IonIcon icon={personOutline} className="auth-input-icon" />
              <input
                type="text"
                placeholder="Maria Dela Cruz"
                className="auth-input"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
              />
            </div>

            <label className="auth-label">Delivery Address</label>
            <div className="auth-input-wrap">
              <IonIcon icon={locationOutline} className="auth-input-icon" />
              <input
                type="text"
                placeholder="House no., Street, City"
                className="auth-input"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <label className="auth-label">Contact Number</label>
            <div className="auth-input-wrap">
              <IonIcon icon={callOutline} className="auth-input-icon" />
              <input
                type="tel"
                placeholder="09xx xxx xxxx"
                className="auth-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <button
              className="addr-save-btn"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save Address"}
            </button>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default SavedAddresses;
