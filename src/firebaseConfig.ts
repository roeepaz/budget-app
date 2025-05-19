// firebaseConfig.ts
import { initializeApp, FirebaseApp }         from 'firebase/app';
import { getFirestore, Firestore }            from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import dotenv from 'dotenv';
dotenv.config();
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// initialize
const app: FirebaseApp = initializeApp(firebaseConfig);

// export typed Firestore instance
export const db: Firestore = getFirestore(app);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
