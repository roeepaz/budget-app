// firebaseConfig.ts
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

// 👇 TypeScript: הוספת property חדש ל־window
declare global {
  interface Window {
    __appCheckInitialized?: boolean;
  }
}

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// 1. Initialize the Firebase app
const app: FirebaseApp = initializeApp(firebaseConfig);

// 2. 🔐 Initialize App Check with reCAPTCHA v3 (once, in browser only)

// 3. Exports
export const db: Firestore = getFirestore(app);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
