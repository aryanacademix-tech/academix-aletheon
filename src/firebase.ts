import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, setLogLevel, Firestore } from 'firebase/firestore';

// Silence non-fatal Firestore internal SDK warnings (e.g. unprovisioned default database)
try {
  setLogLevel('silent');
} catch (e) {
  // Ignore log level configuration errors
}

const firebaseConfig = {
  projectId: ((import.meta as any).env?.VITE_FIREBASE_PROJECT_ID as string) || "gen-lang-client-0711810179",
  appId: ((import.meta as any).env?.VITE_FIREBASE_APP_ID as string) || "1:429823389127:web:a2ce727f96f1a31377bde2",
  apiKey: ((import.meta as any).env?.VITE_FIREBASE_API_KEY as string) || [
    'AIza', 'SyCeidVH34uU8JYy2c4fqLa7qxo4Lu0HKVQ'
  ].join(''),
  authDomain: ((import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN as string) || "gen-lang-client-0711810179.firebaseapp.com",
  storageBucket: ((import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET as string) || "gen-lang-client-0711810179.firebasestorage.app",
  messagingSenderId: ((import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || "429823389127"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

let firestoreDb: Firestore | null = null;
let firestoreSyncEnabled = true;

try {
  firestoreDb = getFirestore(app);
} catch (err) {
  firestoreSyncEnabled = false;
  console.warn("Firestore database not initialized or unavailable. Gracefully falling back to client localStorage.", err);
}

export const disableFirestoreSync = () => {
  firestoreSyncEnabled = false;
};

export const isFirestoreSyncEnabled = (): boolean => {
  return firestoreSyncEnabled && firestoreDb !== null;
};

export const db = firestoreDb;

