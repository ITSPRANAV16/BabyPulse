import { 
  signInWithPopup, 
  signInWithRedirect,
  signOut,
  User
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  getDocs, 
  collection, 
  writeBatch 
} from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { 
  safeGetDoc, 
  safeSetDoc, 
  safeGetDocs, 
  handleFirestoreError, 
  OperationType 
} from './firestoreHelpers';
import { 
  BabyEvent, 
  FoodDiaryEntry, 
  SpecialInstruction, 
  ScheduledReminder, 
  WeightLog, 
  DailyGoal 
} from '../types';

/**
 * Handles Google login popup in top window or falls back to redirect for mobile/sandboxed browsers
 */
export async function loginWithGoogle(): Promise<User | null> {
  try {
    // Try browser popup first
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.warn("Google signInWithPopup failed, verifying fallback mechanisms...", error);
    const errCode = error?.code || "";
    const errMsg = error?.message || "";

    // If popup was blocked, closed, or iframe restricts popups, automatically use redirect!
    const isPopupBlockedOrRestricted = 
      errCode === "auth/popup-blocked" || 
      errCode === "auth/popup-closed-by-user" || 
      errCode === "auth/cancelled-popup-request" ||
      errMsg.includes("popup") ||
      errMsg.includes("blocked") ||
      window.self !== window.top;

    if (isPopupBlockedOrRestricted) {
      console.log("Popup blocked or inside restricted frame. Launching Google redirect-based sign-in standard...");
      try {
        await signInWithRedirect(auth, googleProvider);
        // Page is redirecting, so return null for now. Reload returns onAuthStateChanged.
        return null;
      } catch (redirectError: any) {
        console.error("signInWithRedirect failed:", redirectError);
        throw redirectError;
      }
    }
    throw error;
  }
}

/**
 * Handles logout
 */
export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

interface CloudDataSet {
  babyName: string;
  babyDob: string;
  isSleeping: boolean;
  sleepStartTime: number | null;
  events: BabyEvent[];
  foods: FoodDiaryEntry[];
  instructions: SpecialInstruction[];
  schedules: ScheduledReminder[];
  weightLogs: WeightLog[];
  goals: DailyGoal[];
}

/**
 * Uploads (merges) all local guest data into the user's Google Cloud Firestore account
 */
export async function uploadLocalDataToCloud(
  userId: string,
  localData: Omit<CloudDataSet, 'babyName' | 'babyDob' | 'isSleeping' | 'sleepStartTime'>,
  babyName: string,
  babyDob: string,
  isSleeping: boolean,
  sleepStartTime: number | null
): Promise<void> {
  try {
    const batch = writeBatch(db);

    // Save user profile state
    const userDocRef = doc(db, 'users', userId);
    batch.set(userDocRef, {
      userId,
      babyName,
      babyDob,
      isSleeping,
      sleepStartTime
    });

    // Write events
    localData.events.forEach(evt => {
      const docRef = doc(db, `users/${userId}/events`, evt.id);
      batch.set(docRef, { ...evt, userId });
    });

    // Write foods
    localData.foods.forEach(f => {
      const docRef = doc(db, `users/${userId}/foods`, f.id);
      batch.set(docRef, { ...f, userId });
    });

    // Write instructions
    localData.instructions.forEach(inst => {
      const docRef = doc(db, `users/${userId}/instructions`, inst.id);
      batch.set(docRef, { ...inst, userId });
    });

    // Write schedules
    localData.schedules.forEach(sched => {
      const docRef = doc(db, `users/${userId}/schedules`, sched.id);
      batch.set(docRef, { ...sched, userId });
    });

    // Write weight logs
    localData.weightLogs.forEach(w => {
      const docRef = doc(db, `users/${userId}/weightLogs`, w.id);
      batch.set(docRef, { ...w, userId });
    });

    // Write goals
    localData.goals.forEach(g => {
      const docRef = doc(db, `users/${userId}/goals`, g.id);
      batch.set(docRef, { ...g, userId });
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/[batch_upload]`);
  }
}

/**
 * Downloads all user profile data and subcollection logs from Firestore
 */
export async function loadUserDataFromCloud(userId: string): Promise<Partial<CloudDataSet>> {
  try {
    const dataSet: Partial<CloudDataSet> = {};

    // Load profile
    const userProfile = await safeGetDoc('users', userId);
    if (userProfile) {
      dataSet.babyName = userProfile.babyName || 'Alex';
      dataSet.babyDob = userProfile.babyDob || '2023-04-12';
      dataSet.isSleeping = !!userProfile.isSleeping;
      dataSet.sleepStartTime = userProfile.sleepStartTime || null;
    }

    // Load subcollections
    dataSet.events = await safeGetDocs(`users/${userId}/events`);
    dataSet.foods = await safeGetDocs(`users/${userId}/foods`);
    dataSet.instructions = await safeGetDocs(`users/${userId}/instructions`);
    dataSet.schedules = await safeGetDocs(`users/${userId}/schedules`);
    dataSet.weightLogs = await safeGetDocs(`users/${userId}/weightLogs`);
    dataSet.goals = await safeGetDocs(`users/${userId}/goals`);

    return dataSet;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${userId}`);
  }
}
