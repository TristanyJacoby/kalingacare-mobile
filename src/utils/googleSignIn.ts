// src/utils/googleSignIn.ts
// KalingaCare — Google Sign-In, ported from the web app's auth.js
// handleGoogleSignIn(). Web uses Firebase JS SDK's signInWithPopup, which
// doesn't work reliably inside a Capacitor WebView, so mobile uses the
// native @capacitor-firebase/authentication plugin instead: it does the
// actual Google sign-in natively, then we hand its ID token to the
// Firebase JS SDK so `auth.currentUser`/Firestore rules work exactly the
// same as email/password sign-in everywhere else in this app.
//
// IMPORTANT — one-time native setup needed before this works on a device
// (can't be done from source code alone, needs your own Firebase/Google
// Cloud account access):
//   1. `npx cap add android` (this project doesn't have a native android/
//      folder yet)
//   2. Download google-services.json from Firebase console (Project
//      settings > your Android app) and place it in android/app/
//   3. Add your app's SHA-1 fingerprint in Firebase console under that
//      same Android app's settings
//   4. `npx cap sync`
// Until those are done, this will fail with a native "no such module"
// or credential error — that's expected, not a code bug.

import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";

export async function signInWithGoogle(): Promise<void> {
  // Triggers the native Google account picker.
  const result = await FirebaseAuthentication.signInWithGoogle();

  const idToken = result.credential?.idToken;
  if (!idToken) {
    throw new Error("No ID token returned from Google Sign-In.");
  }

  // Hand the native result to the JS SDK so auth.currentUser and every
  // Firestore call elsewhere in the app sees the same signed-in user.
  const credential = GoogleAuthProvider.credential(idToken);
  const cred = await signInWithCredential(auth, credential);
  const user = cred.user;

  const userDocRef = doc(db, "users", user.uid);
  const existing = await getDoc(userDocRef);

  if (!existing.exists()) {
    // First time this Google account has signed in — create the same
    // Firestore profile the email/password signup flow creates. There's
    // no form here to ask for a country, so it starts unset — My Account
    // lets them fill it in afterward, which also (re)derives `currency`.
    await setDoc(userDocRef, {
      fullName: user.displayName || "",
      email: user.email || "",
      country: "",
      currency: "PHP",
      role: "user",
      createdAt: serverTimestamp(),
    });
  }
}

// True when the user just backed out of the Google account picker.
export function isGoogleSignInCancel(err: any): boolean {
  return (
    err?.code === "auth/popup-closed-by-user" ||
    /cancel/i.test(err?.message ?? "")
  );
}

// Toast text for a failed Google sign-in. Includes the real error code so
// a failure on a device says what actually went wrong instead of a generic
// message (same lesson as web's Google Sign-In debugging).
export function googleSignInErrorMessage(err: any): string {
  console.error("Google Sign-In failed:", err);
  if (err?.code === "auth/user-disabled") {
    return "This account has been suspended. Please contact kalingacaresupport@gmail.com.";
  }
  const detail = err?.code || err?.message || "unknown error";
  return `Couldn't sign in with Google (${detail}).`;
}
