import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { IonPage, IonContent, IonIcon, useIonToast } from "@ionic/react";
import { mailOutline, lockClosedOutline } from "ionicons/icons";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { friendlyAuthError } from "../utils/authErrors";
import { signInWithGoogle } from "../utils/googleSignIn";
import logo from "../assets/kalingacare-logo.png";
import "./Auth.css";

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [presentToast] = useIonToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) {
      presentToast({
        message: "Please enter your email and password.",
        duration: 2500,
        color: "warning",
      });
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
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
      if (err?.code !== "auth/popup-closed-by-user" && err?.message !== "canceled") {
        presentToast({
          message: "Couldn't sign in with Google. Please try again.",
          duration: 2500,
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

          <h1 className="auth-title">Welcome Back!</h1>
          <p className="auth-subtitle">
            Log in to keep caring for your loved ones, wherever you are.
          </p>

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

          <div className="auth-forgot-wrap">
            <span className="auth-forgot-link">Forgot Password?</span>
          </div>

          <button
            className="auth-primary-btn"
            onClick={handleSignIn}
            disabled={loading}
          >
            {loading ? "Signing in…" : "Sign In"}
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
            Don&apos;t have an account?{" "}
            <span
              className="auth-switch-link"
              onClick={() => navigate("/register")}
            >
              Create Account
            </span>
          </p>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Login;
