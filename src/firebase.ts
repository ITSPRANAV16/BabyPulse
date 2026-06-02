import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Support custom user-provided Firebase configuration for deployments on Vercel
const getActiveConfig = () => {
  try {
    const customConfigStr = typeof window !== 'undefined' ? localStorage.getItem('babypulse_custom_firebase_config') : null;
    if (customConfigStr) {
      const parsed = JSON.parse(customConfigStr);
      if (parsed && parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Failed to parse custom firebase config from localStorage:", e);
  }
  return firebaseConfig;
};

const activeConfig = getActiveConfig();
const app = getApps().length === 0 ? initializeApp(activeConfig) : getApp();
export const db = getFirestore(app, activeConfig.firestoreDatabaseId || "(default)"); /* CRITICAL: The app will break without this line */
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export { signInWithPopup, signOut };
