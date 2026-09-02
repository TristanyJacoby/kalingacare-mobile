import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { IonPage, IonContent, IonIcon, useIonToast } from "@ionic/react";
import { personOutline, mailOutline, lockClosedOutline } from "ionicons/icons";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";
import { friendlyAuthError } from "../utils/authErrors";
import logo from "../assets/kalingacare-logo.png";
import "./Auth.css";

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [presentToast] = useIonToast();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

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

          {/* Same Capacitor caveat as Login — see comment there. */}
          <button className="auth-google-btn" disabled>
            <span className="auth-google-g">G</span>
            Continue with Google
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
