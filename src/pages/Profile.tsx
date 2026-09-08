import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IonPage, IonContent, IonIcon } from "@ionic/react";
import {
  notificationsOutline,
  personOutline,
  cubeOutline,
  locationOutline,
  helpCircleOutline,
  logOutOutline,
  chevronForwardOutline,
  heartOutline,
  cameraOutline,
} from "ionicons/icons";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import "./Profile.css";

import { useRef } from "react";
import AvatarCropModal from "../components/AvatarCropModal";

const ROLE_LABELS: Record<string, string> = {
  user: "User",
  staff: "Staff",
  admin: "Admin",
  superadmin: "Superadmin",
};

const ROLE_STYLES: Record<string, { bg: string; color: string }> = {
  user: { bg: "#e2f2fb", color: "#3fa8e0" },
  staff: { bg: "#dcefe3", color: "#2f8f5b" },
  admin: { bg: "#e6dffb", color: "#6a3fd6" },
  superadmin: { bg: "#fff2cc", color: "#916f00" },
};

function initials(name: string) {
  return (name || "?")
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  // The raw photo the user just picked, shown in the crop step before it
  // is saved. null means the crop screen isn't open.
  const [pendingImageSrc, setPendingImageSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/login");
        return;
      }
      const snap = await getDoc(doc(db, "users", user.uid));
      const data = snap.exists() ? snap.data() : ({} as any);
      setFullName(user.displayName || data.fullName || "");
      setEmail(user.email || "");
      setRole(data.role || "user");
      setPhotoBase64(data.photoBase64 || null);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const handleAvatarClick = () => {
    // Just triggers the hidden file input below — clicking the pencil icon
    // is really just clicking this invisible input for the user.
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Don't save right away — read the picture and open the crop step so
    // the user can reposition or zoom before it becomes their avatar.
    const reader = new FileReader();
    reader.onload = () => {
      setPendingImageSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCropCancel = () => {
    setPendingImageSrc(null);
    // Reset the input so picking the *same* file again still triggers
    // onChange (browsers otherwise ignore a "repeat" selection).
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCropConfirm = async (croppedDataUrl: string) => {
    const user = auth.currentUser;
    if (!user) return;

    setPendingImageSrc(null);
    setUploading(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        photoBase64: croppedDataUrl,
      });

      // Update what's shown right away, without needing to reload the page.
      setPhotoBase64(croppedDataUrl);
    } catch {
      // Keep this simple — a failed avatar upload isn't critical enough to
      // need a fancy error screen, just quietly stop the loading spinner.
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (loading) return null;

  const roleStyle = ROLE_STYLES[role] || ROLE_STYLES.user;

  return (
    <IonPage>
      <IonContent fullscreen className="profile-content">
        <div className="profile-header">
          <span className="profile-title">Profile</span>
          <button
            className="profile-icon-btn"
            aria-label="Notifications"
            onClick={() => navigate("/notifications")}
          >
            <IonIcon icon={notificationsOutline} />
          </button>
        </div>

        <div className="profile-card">
          <div className="profile-avatar" onClick={handleAvatarClick}>
            {photoBase64 ? (
              <img
                src={photoBase64}
                alt={fullName}
                className="profile-avatar-img"
              />
            ) : (
              <span className="profile-avatar-initials">
                {initials(fullName)}
              </span>
            )}

            <div className="profile-avatar-edit-badge">
              <IonIcon icon={uploading ? undefined : cameraOutline} />
              {uploading && <span className="profile-avatar-spinner" />}
            </div>

            {/* Hidden native input — this is what actually opens the photo picker.
              capture="environment" hints mobile browsers to offer the camera
             directly as an option, alongside the gallery. */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
          </div>
          <div className="profile-card-info">
            <p className="profile-name">{fullName || "—"}</p>
            <p className="profile-email">{email}</p>
            <span
              className="profile-role-badge"
              style={{ background: roleStyle.bg, color: roleStyle.color }}
            >
              {ROLE_LABELS[role] || "User"}
            </span>
          </div>
        </div>

        <div className="profile-menu">
          <button
            className="profile-menu-row"
            onClick={() => navigate("/account")}
          >
            <IonIcon icon={personOutline} className="profile-menu-icon" />
            <span className="profile-menu-label">My Account</span>
            <IonIcon
              icon={chevronForwardOutline}
              className="profile-menu-chevron"
            />
          </button>
          <button
            className="profile-menu-row"
            onClick={() => navigate("/orders")}
          >
            <IonIcon icon={cubeOutline} className="profile-menu-icon" />
            <span className="profile-menu-label">My Orders</span>
            <IonIcon
              icon={chevronForwardOutline}
              className="profile-menu-chevron"
            />
          </button>
          <button
            className="profile-menu-row"
            onClick={() => navigate("/favorites")}
          >
            <IonIcon icon={heartOutline} className="profile-menu-icon" />
            <span className="profile-menu-label">My Favorites</span>
            <IonIcon
              icon={chevronForwardOutline}
              className="profile-menu-chevron"
            />
          </button>
          <button
            className="profile-menu-row"
            onClick={() => navigate("/addresses")}
          >
            <IonIcon icon={locationOutline} className="profile-menu-icon" />
            <span className="profile-menu-label">Saved Addresses</span>
            <IonIcon
              icon={chevronForwardOutline}
              className="profile-menu-chevron"
            />
          </button>

          {/* Visual only — doesn't control real notification delivery, since
              that feature doesn't exist anywhere in the app yet (same honest
              caveat as Home's bell icon). */}
          <div className="profile-menu-row profile-menu-row-toggle">
            <IonIcon
              icon={notificationsOutline}
              className="profile-menu-icon"
            />
            <span className="profile-menu-label">Notifications</span>
            <button
              className={`profile-toggle ${notificationsOn ? "on" : ""}`}
              onClick={() => setNotificationsOn((v) => !v)}
              aria-label="Toggle notifications"
            >
              <span className="profile-toggle-knob" />
            </button>
          </div>

          <button
            className="profile-menu-row"
            onClick={() => navigate("/help")}
          >
            <IonIcon icon={helpCircleOutline} className="profile-menu-icon" />
            <span className="profile-menu-label">Help &amp; Support</span>
            <IonIcon
              icon={chevronForwardOutline}
              className="profile-menu-chevron"
            />
          </button>

          <button
            className="profile-menu-row profile-menu-row-danger"
            onClick={handleLogout}
          >
            <IonIcon
              icon={logOutOutline}
              className="profile-menu-icon profile-menu-icon-danger"
            />
            <span className="profile-menu-label profile-menu-label-danger">
              Log Out
            </span>
          </button>
        </div>
      </IonContent>

      {pendingImageSrc && (
        <AvatarCropModal
          imageSrc={pendingImageSrc}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}
    </IonPage>
  );
};

export default Profile;
