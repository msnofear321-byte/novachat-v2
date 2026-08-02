import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const authDomain = (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'novachat-bb437.firebaseapp.com').replace(/\s+/g, '').trim();

const requiredEnv: Record<string, string | undefined> = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const missingEnv = Object.entries(requiredEnv)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingEnv.length > 0) {
  throw new Error(
    `Firebase config is missing env values: ${missingEnv.join(', ')}. ` +
      'Set them in your .env file (see .env.example) before building.',
  );
}

const firebaseConfig = {
  apiKey: requiredEnv.apiKey,
  authDomain,
  projectId: requiredEnv.projectId,
  storageBucket: requiredEnv.storageBucket,
  messagingSenderId: requiredEnv.messagingSenderId,
  appId: requiredEnv.appId,
};

let app: FirebaseApp;
try {
  app = initializeApp(firebaseConfig);
} catch (err) {
  console.error('Firebase initialization failed:', err);
  throw err;
}

export { app };

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
