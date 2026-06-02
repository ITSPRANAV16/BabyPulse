import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, enableMultiTabIndexedDbPersistence, enableIndexedDbPersistence } from 'firebase/firestore';
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

// Activate Firestore offline IndexedDB data client persistence and queue syncing
if (typeof window !== 'undefined') {
  enableMultiTabIndexedDbPersistence(db)
    .catch((err) => {
      if (err.code === 'failed-precondition') {
        // Multi-tab persistence failed, fallback to single tab
        enableIndexedDbPersistence(db).catch((singleErr) => {
          console.warn("Firestore native single-tab persistence aborted:", singleErr.message);
        });
      } else if (err.code === 'unimplemented') {
        console.warn("Firestore offline persistence unimplemented on your browser runtime environment");
      } else {
        console.warn("Could not enable offline database caching:", err.message);
      }
    });
}

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export { signInWithPopup, signOut };
