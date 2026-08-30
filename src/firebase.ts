// src/firebase.ts
// Same Firebase project as the KalingaCare web app — same Auth, same
// Firestore data. Copy the REAL values from your web app's js/firebase.js
// over the placeholders below. I don't have your actual API keys.

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBlllS1Me8vFN1Og7bdE9VuT-c2ZKCkt0s",
  authDomain: "kalingacare-e9873.firebaseapp.com",
  projectId: "kalingacare-e9873",
  storageBucket: "kalingacare-e9873.appspot.com",
  messagingSenderId: "668022432666",
  appId: "1:668022432666:web:27c2ed7d121fff8f6e5023",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
