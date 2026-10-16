import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { IonPage, IonContent, IonIcon, useIonToast } from "@ionic/react";
import { mailOutline, lockClosedOutline } from "ionicons/icons";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "../firebase";
import { friendlyAuthError } from "../utils/authErrors";
import {
  signInWithGoogle,
  isGoogleSignInCancel,
  googleSignInErrorMessage,
} from "../utils/googleSignIn";
import logo from "../assets/kalingacare-logo.png";
import "./Auth.css";

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [presentToast] = useIonToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  // "Forgot Password?" swaps the sign-in form for a reset form.
  const [resetMode, setResetMode] = useState(false);
  const [resetSentTo, setResetSentTo] = useState("");
  const [sendingReset, setSendingReset] = useState(false);

  // Firebase emails a link to its own reset page; after choosing a new
  // password the user comes back to the app and signs in. For a
  // Google-only account this adds a password. Same message whether or not
  // the email has an account, so it can't reveal who is registered.
  const handleSendReset = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      presentToast({
        message: "Please enter your email.",
        duration: 2500,
        color: "warning",
      });
      return;
    }
    setSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, trimmed);
      setResetSentTo(trimmed);
    } catch (err: any) {
      if (err?.code === "auth/user-not-found") {
        setResetSentTo(trimmed);
      } else {
        presentToast({
          message:
            err?.code === "auth/too-many-requests"
              ? "Too many attempts. Please wait a few minutes and try again."
              : friendlyAuthError(err?.code),
          duration: 3000,
          color: "danger",
        });
      }
    } finally {
      setSendingReset(false);
    }
  };

  const leaveReset = () => {
    setResetMode(false);
    setResetSentTo("");
  };

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

          {resetMode ? (
            <>
              <h1 className="auth-title">Reset Password</h1>
              <p className="auth-subtitle">
                Enter the email you use for KalingaCare and we&apos;ll send a
                link to set a new password. This also works if you signed up
                with Google.
              </p>

              {resetSentTo ? (
                <p className="auth-reset-sent" role="status">
                  If an account exists for <strong>{resetSentTo}</strong>, a
                  reset link is on its way. Open it, choose a new password, then
                  come back here to sign in.
                </p>
              ) : (
                <>
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
                  <button
                    className="auth-primary-btn"
                    onClick={handleSendReset}
                    disabled={sendingReset}
                  >
                    {sendingReset ? "Sending…" : "Send Reset Link"}
                  </button>
                </>
              )}

              <p className="auth-switch-text">
                <button
                  type="button"
                  className="auth-switch-link auth-link-btn"
                  onClick={leaveReset}
                >
                  Back to Sign In
                </button>
              </p>
            </>
          ) : (
            <>
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
                <button
                  type="button"
                  className="auth-forgot-link"
                  onClick={() => setResetMode(true)}
                >
                  Forgot Password?
                </button>
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
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Login;
