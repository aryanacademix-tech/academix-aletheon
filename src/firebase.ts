import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "gen-lang-client-0711810179",
  appId: "1:429823389127:web:a2ce727f96f1a31377bde2",
  apiKey: "AIzaSyCeidVH34uU8JYy2c4fqLa7qxo4Lu0HKVQ",
  authDomain: "gen-lang-client-0711810179.firebaseapp.com",
  storageBucket: "gen-lang-client-0711810179.firebasestorage.app",
  messagingSenderId: "429823389127"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
export const db = getFirestore(app);
