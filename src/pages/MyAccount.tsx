import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IonPage, IonContent, IonIcon, useIonToast } from "@ionic/react";
import {
  arrowBackOutline,
  personOutline,
  lockClosedOutline,
} from "ionicons/icons";
import {
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { friendlyAuthError } from "../utils/authErrors";
import "./Auth.css";
import "./MyAccount.css";

const MyAccount: React.FC = () => {
  const navigate = useNavigate();
  const [presentToast] = useIonToast();

  // --- Name section ---
  const [fullName, setFullName] = useState("");
  const [savingName, setSavingName] = useState(false);

  // --- Password section ---
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      navigate("/login");
      return;
    }
    setFullName(user.displayName || "");
  }, [navigate]);

  const handleSaveName = async () => {
    const user = auth.currentUser;
    if (!user) return;

    if (!fullName.trim()) {
      presentToast({
        message: "Name cannot be empty.",
        duration: 2200,
        color: "warning",
      });
      return;
    }

    setSavingName(true);
    try {
      // Update both places name is stored — Firebase Auth's own profile
      // (used for the "Hi, {name}" greeting elsewhere) and the Firestore
      // user document (used by Admin and most of the app's own queries).
      // Keeping these two in sync avoids the name looking different
      // depending on which screen reads it.
      await updateProfile(user, { displayName: fullName.trim() });
      await updateDoc(doc(db, "users", user.uid), {
        fullName: fullName.trim(),
      });

      presentToast({
        message: "Name updated.",
        duration: 2000,
        color: "success",
      });
    } catch {
      presentToast({
        message: "Could not update name. Please try again.",
        duration: 2500,
        color: "danger",
      });
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePassword = async () => {
    const user = auth.currentUser;
    if (!user || !user.email) return;

    if (!currentPassword || !newPassword || !confirmPassword) {
      presentToast({
        message: "Please fill out all password fields.",
        duration: 2200,
        color: "warning",
      });
      return;
    }
    if (newPassword.length < 6) {
      presentToast({
        message: "New password must be at least 6 characters.",
        duration: 2500,
        color: "warning",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      presentToast({
        message: "New passwords do not match.",
        duration: 2500,
        color: "warning",
      });
      return;
    }

    setSavingPassword(true);
    try {
      // Firebase requires you to prove you know the CURRENT password again
      // right before changing it — this is a security feature (called
      // "recent login"), not something we're adding on top ourselves.
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword,
      );
      await reauthenticateWithCredential(user, credential);

      await updatePassword(user, newPassword);

      presentToast({
        message: "Password changed successfully.",
        duration: 2200,
        color: "success",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      // The shared friendlyAuthError() helper says "wrong email or password" —
      // that wording makes sense on the Login screen, but here we already know
      // the email (you're logged in), so a clearer message fits better.
      if (
        err?.code === "auth/wrong-password" ||
        err?.code === "auth/invalid-credential"
      ) {
        presentToast({
          message: "Current password is incorrect.",
          duration: 2500,
          color: "danger",
        });
      } else {
        presentToast({
          message: friendlyAuthError(err?.code),
          duration: 2800,
          color: "danger",
        });
      }
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <IonPage>
      <IonContent fullscreen className="acct-content">
        <div className="acct-topbar">
          <button
            className="acct-icon-btn"
            onClick={() => navigate(-1)}
            aria-label="Back"
          >
            <IonIcon icon={arrowBackOutline} />
          </button>
          <span className="acct-title">My Account</span>
          <div className="acct-icon-spacer" />
        </div>

        <div className="acct-section">
          <h3 className="acct-section-title">Full Name</h3>
          <div className="auth-input-wrap">
            <IonIcon icon={personOutline} className="auth-input-icon" />
            <input
              type="text"
              className="auth-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <button
            className="acct-save-btn"
            onClick={handleSaveName}
            disabled={savingName}
          >
            {savingName ? "Saving…" : "Save Name"}
          </button>
        </div>

        <div className="acct-divider" />

        <div className="acct-section">
          <h3 className="acct-section-title">Change Password</h3>

          <label className="auth-label">Current Password</label>
          <div className="auth-input-wrap">
            <IonIcon icon={lockClosedOutline} className="auth-input-icon" />
            <input
              type="password"
              className="auth-input"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>

          <label className="auth-label">New Password</label>
          <div className="auth-input-wrap">
            <IonIcon icon={lockClosedOutline} className="auth-input-icon" />
            <input
              type="password"
              className="auth-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <label className="auth-label">Confirm New Password</label>
          <div className="auth-input-wrap">
            <IonIcon icon={lockClosedOutline} className="auth-input-icon" />
            <input
              type="password"
              className="auth-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <button
            className="acct-save-btn"
            onClick={handleChangePassword}
            disabled={savingPassword}
          >
            {savingPassword ? "Updating…" : "Update Password"}
          </button>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default MyAccount;
