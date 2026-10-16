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
  linkWithCredential,
  sendPasswordResetEmail,
  EmailAuthProvider,
  GoogleAuthProvider,
  type User,
} from "firebase/auth";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { friendlyAuthError } from "../utils/authErrors";
import { COUNTRY_CURRENCY, getOrderedCountries } from "../utils/currency";
import "./Auth.css";
import "./MyAccount.css";

const MyAccount: React.FC = () => {
  const navigate = useNavigate();
  const [presentToast] = useIonToast();

  // --- Name section ---
  const [fullName, setFullName] = useState("");
  const [savingName, setSavingName] = useState(false);

  // --- Country section (drives checkout's display currency, see
  // src/utils/currency.ts) ---
  const [country, setCountry] = useState("");
  const [savingCountry, setSavingCountry] = useState(false);

  // --- Password section ---
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  // Accounts created with Google have no password: the section becomes
  // "Set a Password" and links one to the same account, so they can sign
  // in with Google OR email + password afterwards.
  const [hasPassword, setHasPassword] = useState(true);
  const [sendingReset, setSendingReset] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      navigate("/login");
      return;
    }
    setFullName(user.displayName || "");
    (async () => {
      const snap = await getDoc(doc(db, "users", user.uid));
      const data = snap.exists() ? snap.data() : {};
      setCountry(data.country || getOrderedCountries()[0]);
    })();
  }, [navigate]);

  const handleSaveCountry = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setSavingCountry(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        country,
        currency: COUNTRY_CURRENCY[country] || "PHP",
      });
      presentToast({
        message: "Country updated.",
        duration: 2000,
        color: "success",
      });
    } catch {
      presentToast({
        message: "Could not update country. Please try again.",
        duration: 2500,
        color: "danger",
      });
    } finally {
      setSavingCountry(false);
    }
  };

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

  const userHasPassword = (user: User) =>
    user.providerData.some((p) => p.providerId === "password");

  useEffect(() => {
    if (auth.currentUser) setHasPassword(userHasPassword(auth.currentUser));
  }, []);

  // Firebase wants a recent sign-in before adding a password; Google-only
  // accounts confirm through the native Google account picker.
  const reauthWithGoogle = async (user: User) => {
    const result = await FirebaseAuthentication.signInWithGoogle();
    const idToken = result.credential?.idToken;
    if (!idToken) throw new Error("No ID token returned from Google Sign-In.");
    await reauthenticateWithCredential(
      user,
      GoogleAuthProvider.credential(idToken)
    );
  };

  const handleSetPassword = async () => {
    const user = auth.currentUser;
    if (!user || !user.email) return;
    if (!newPassword || !confirmPassword) {
      presentToast({
        message: "Please fill out both password fields.",
        duration: 2200,
        color: "warning",
      });
      return;
    }
    if (newPassword.length < 6) {
      presentToast({
        message: "Password must be at least 6 characters.",
        duration: 2500,
        color: "warning",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      presentToast({
        message: "Passwords do not match.",
        duration: 2500,
        color: "warning",
      });
      return;
    }

    setSavingPassword(true);
    const credential = EmailAuthProvider.credential(user.email, newPassword);
    try {
      try {
        await linkWithCredential(user, credential);
      } catch (err: any) {
        if (err?.code !== "auth/requires-recent-login") throw err;
        await reauthWithGoogle(user);
        await linkWithCredential(user, credential);
      }
      setHasPassword(true);
      setNewPassword("");
      setConfirmPassword("");
      presentToast({
        message:
          "Password set. You can now sign in with your email and this password, or with Google.",
        duration: 3500,
        color: "success",
      });
    } catch (err: any) {
      if (
        err?.code === "auth/provider-already-linked" ||
        err?.code === "auth/credential-already-in-use"
      ) {
        setHasPassword(true);
        presentToast({
          message: "This account already has a password.",
          duration: 2800,
          color: "warning",
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

  // Forgot the current password while signed in: email a reset link.
  const handleSendReset = async () => {
    const user = auth.currentUser;
    if (!user?.email) return;
    setSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, user.email);
      presentToast({
        message: `Reset link sent to ${user.email}.`,
        duration: 3000,
        color: "success",
      });
    } catch (err: any) {
      presentToast({
        message:
          err?.code === "auth/too-many-requests"
            ? "Too many attempts. Please wait a few minutes and try again."
            : "Couldn't send the reset link. Please try again.",
        duration: 3000,
        color: "danger",
      });
    } finally {
      setSendingReset(false);
    }
  };

  const handleChangePassword = async () => {
    const user = auth.currentUser;
    if (!user || !user.email) return;
    if (!userHasPassword(user)) return handleSetPassword();

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
        currentPassword
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
          <h3 className="acct-section-title">Country You're Working In</h3>
          <p className="acct-section-hint">
            Used to show order totals in your own currency at checkout.
          </p>
          <div className="auth-input-wrap">
            <select
              className="auth-input"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            >
              {getOrderedCountries().map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <button
            className="acct-save-btn"
            onClick={handleSaveCountry}
            disabled={savingCountry}
          >
            {savingCountry ? "Saving…" : "Save Country"}
          </button>
        </div>

        <div className="acct-divider" />

        <div className="acct-section">
          <h3 className="acct-section-title">
            {hasPassword ? "Change Password" : "Set a Password"}
          </h3>

          {hasPassword ? (
            <>
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
            </>
          ) : (
            <p className="acct-section-hint">
              You signed up with Google, so your account has no password yet.
              Set one to also sign in with your email and password. Google
              sign-in keeps working.
            </p>
          )}

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
            {savingPassword
              ? "Saving…"
              : hasPassword
              ? "Update Password"
              : "Set Password"}
          </button>

          {hasPassword && (
            <p className="acct-forgot">
              Forgot your current password?{" "}
              <button
                type="button"
                className="acct-forgot-link"
                onClick={handleSendReset}
                disabled={sendingReset}
              >
                {sendingReset ? "Sending…" : "Email me a reset link"}
              </button>
            </p>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default MyAccount;
