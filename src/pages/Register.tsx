import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { IonPage, IonContent, IonIcon, useIonToast } from "@ionic/react";
import { personOutline, mailOutline, lockClosedOutline } from "ionicons/icons";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";
import { friendlyAuthError } from "../utils/authErrors";
import { COUNTRY_CURRENCY, getOrderedCountries } from "../utils/currency";
import {
  signInWithGoogle,
  isGoogleSignInCancel,
  googleSignInErrorMessage,
} from "../utils/googleSignIn";
import logo from "../assets/kalingacare-logo.png";
import "./Auth.css";

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [presentToast] = useIonToast();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  // Country drives the buyer's default display currency at checkout —
  // see src/utils/currency.ts. Defaults to the first entry in the
  // ordered list so the select never starts blank.
  const [country, setCountry] = useState(getOrderedCountries()[0]);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSignUp = async () => {
    if (!fullName || !email || !password || !confirmPassword) {
      presentToast({
        message: "Please fill out all fields.",
        duration: 2500,
        color: "warning",
      });
      return;
    }
    if (password !== confirmPassword) {
      presentToast({
        message: "Passwords don't match.",
        duration: 2500,
        color: "warning",
      });
      return;
    }

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: fullName });

      // Mirrors js/auth.js: every new signup starts as a plain "user". The
      // other tiers (staff/admin/superadmin) are granted manually later from
      // the web admin dashboard's User Management table, never at signup.
      await setDoc(doc(db, "users", cred.user.uid), {
        fullName,
        email,
        role: "user",
        country,
        currency: COUNTRY_CURRENCY[country] || "PHP",
        createdAt: serverTimestamp(),
      });

      navigate("/home");
    } catch (err: any) {
      presentToast({
        message: friendlyAuthError(err?.code),
        duration: 2500,
        color: "danger",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      navigate("/home");
    } catch (err: any) {
      // User backing out of the account picker isn't a real error.
      if (!isGoogleSignInCancel(err)) {
        presentToast({
          message: googleSignInErrorMessage(err),
          duration: 4000,
          color: "danger",
        });
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <IonPage>
      <IonContent fullscreen className="auth-content">
        <div className="auth-container">
          <div className="auth-logo-wrap">
            <div className="auth-logo-bg">
              <img src={logo} alt="KalingaCare" className="auth-logo" />
            </div>
          </div>

          <h1 className="auth-title">Join KalingaCare!</h1>
          <p className="auth-subtitle">
            Create an account and start sending care that truly gets there.
          </p>

          <label className="auth-label">Full Name</label>
          <div className="auth-input-wrap">
            <IonIcon icon={personOutline} className="auth-input-icon" />
            <input
              type="text"
              placeholder="Juan Dela Cruz"
              className="auth-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <label className="auth-label">Email</label>
          <div className="auth-input-wrap">
            <IonIcon icon={mailOutline} className="auth-input-icon" />
            <input
              type="email"
              inputMode="email"
              placeholder="you@email.com"
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <label className="auth-label">Password</label>
          <div className="auth-input-wrap">
            <IonIcon icon={lockClosedOutline} className="auth-input-icon" />
            <input
              type="password"
              placeholder="••••••••"
              className="auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <label className="auth-label">Confirm Password</label>
          <div className="auth-input-wrap">
            <IonIcon icon={lockClosedOutline} className="auth-input-icon" />
            <input
              type="password"
              placeholder="••••••••"
              className="auth-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <label className="auth-label">Country You're Working In</label>
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
            className="auth-primary-btn"
            style={{ marginTop: 4 }}
            onClick={handleSignUp}
            disabled={loading}
          >
            {loading ? "Creating account…" : "Sign Up"}
          </button>

          <div className="auth-divider-wrap">
            <span className="auth-divider-line" />
            <span className="auth-divider-text">or</span>
            <span className="auth-divider-line" />
          </div>

          {/* Native Google Sign-In — needs one-time Android setup before it
              works on a device, see src/utils/googleSignIn.ts. */}
          <button
            className="auth-google-btn"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
          >
            <span className="auth-google-g">G</span>
            {googleLoading ? "Connecting…" : "Continue with Google"}
          </button>

          <p className="auth-switch-text">
            Already have an account?{" "}
            <span
              className="auth-switch-link"
              onClick={() => navigate("/login")}
            >
              Sign In
            </span>
          </p>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Register;
