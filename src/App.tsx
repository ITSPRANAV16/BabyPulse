/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Settings, 
  Heart, 
  Calendar, 
  TrendingUp, 
  Sparkles, 
  Download, 
  Bed, 
  Baby, 
  Trash2, 
  Printer,
  PlusCircle, 
  Target,
  Check, 
  X,
  Clock,
  Briefcase,
  Layers,
  FileText,
  BadgeAlert,
  UtensilsCrossed,
  GlassWater,
  Smile,
  ShieldQuestion,
  Moon,
  Sun,
  Activity,
  Bell,
  BellOff,
  HelpCircle,
  Smartphone
} from 'lucide-react';

import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  BarChart,
  Bar,
  Cell
} from 'recharts';

import { BabyEvent, FoodDiaryEntry, SpecialInstruction, SmartInsight, EventType, ScheduledReminder, WeightLog, DailyGoal, GoalCategory } from './types';
import { 
  INITIAL_EVENTS, 
  INITIAL_FOODS, 
  INITIAL_SPECIAL_INSTRUCTIONS, 
  INITIAL_INSIGHTS, 
  AVATAR_URLS,
  WEEKLY_CHART_DATA,
  INITIAL_SCHEDULES,
  INITIAL_WEIGHT_LOGS,
  INITIAL_GOALS
} from './data';

import { AddEventModal } from './components/AddEventModal';
import { AddFoodModal } from './components/AddFoodModal';
import { ExportModal } from './components/ExportModal';
import { FeedingTimer } from './components/FeedingTimer';
import { AppTutorial } from './components/AppTutorial';
import { DownloadAppModal } from './components/DownloadAppModal';
import { printPediatricianReport } from './utils/printReport';
import { CloudAuthGateway } from './components/CloudAuthGateway';

// Google Sign-In & Security integrations
import { auth } from './firebase';
import { onAuthStateChanged, User, getRedirectResult } from 'firebase/auth';
import { safeSetDoc, safeDeleteDoc } from './utils/firestoreHelpers';
import { loginWithGoogle, logoutUser, loadUserDataFromCloud, uploadLocalDataToCloud } from './utils/firebaseSync';
import { isBiometricsSupportedOnDevice, registerDeviceBiometrics, verifyDeviceBiometrics } from './utils/biometrics';

export default function App() {
  // Check if loaded as an OAuth delegated popup authentication window
  const urlParams = new URLSearchParams(window.location.search);
  const action = urlParams.get('action');
  const parentOrigin = urlParams.get('parentOrigin');

  if (action === 'oauth-delegate-login') {
    return <CloudAuthGateway parentOrigin={parentOrigin || ''} />;
  }

  // --- Walkthrough Onboarding Tutorial State ---
  const [showTutorial, setShowTutorial] = useState<boolean>(() => {
    return localStorage.getItem('babypulse_tutorial_completed') !== 'true';
  });

  // --- Download Android Native Experience ---
  const [showDownloadModal, setShowDownloadModal] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleTriggerPwaInstall = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          showToast("App shell downloaded and added to your device!", "success");
        } else {
          showToast("Installation postponed. You can download anytime in Settings.", "info");
        }
        setDeferredPrompt(null);
      });
    }
  };

  // --- Firebase & Sync states ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [isSyncingCloud, setIsSyncingCloud] = useState<boolean>(false);
  const [showEventsSyncIndicator, setShowEventsSyncIndicator] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // --- Beautiful Promise-based Confirm Modal state ---
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel: string;
    resolve: (value: boolean) => void;
  } | null>(null);

  const customConfirm = (title: string, message: string, confirmLabel = "Continue", cancelLabel = "Cancel"): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        title,
        message,
        confirmLabel,
        cancelLabel,
        resolve: (val: boolean) => {
          resolve(val);
          setConfirmState(null);
        }
      });
    });
  };

  // --- Biometric Lock states ---
  const [isBiometricsSupported, setIsBiometricsSupported] = useState<boolean>(false);
  const [isBiometricLockEnabled, setIsBiometricLockEnabled] = useState<boolean>(() => {
    return localStorage.getItem('babypulse_biometric_lock_enabled') === 'true';
  });
  const [biometricCredentialId, setBiometricCredentialId] = useState<string | null>(() => {
    return localStorage.getItem('babypulse_biometric_credential_id');
  });
  const [isAppLocked, setIsAppLocked] = useState<boolean>(() => {
    const isLockEnabled = localStorage.getItem('babypulse_biometric_lock_enabled') === 'true';
    const hasCred = !!localStorage.getItem('babypulse_biometric_credential_id');
    return isLockEnabled && hasCred;
  });
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [passcode, setPasscode] = useState<string>('');
  const [passcodeError, setPasscodeError] = useState<string | null>(null);

  // Helper to calculate the user's active current local date
  const getTodayDateString = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // --- Persistent State ---
  const [events, setEvents] = useState<BabyEvent[]>(() => {
    const saved = localStorage.getItem('babypulse_events');
    if (saved) return JSON.parse(saved);
    const today = getTodayDateString();
    return INITIAL_EVENTS.map(ev => ({
      ...ev,
      date: ev.date === '2023-10-24' ? today : ev.date,
      timestamp: ev.date === '2023-10-24'
        ? new Date(`${today}T${ev.time || '12:00'}:00`).getTime()
        : ev.timestamp
    }));
  });

  const [foods, setFoods] = useState<FoodDiaryEntry[]>(() => {
    const saved = localStorage.getItem('babypulse_foods');
    if (saved) return JSON.parse(saved);
    const today = getTodayDateString();
    return INITIAL_FOODS.map(f => ({
      ...f,
      date: f.date === '2023-10-24' ? today : f.date,
      timestamp: f.date === '2023-10-24'
        ? new Date(`${today}T${f.time || '12:00'}:00`).getTime()
        : f.timestamp
    }));
  });

  const [instructions, setInstructions] = useState<SpecialInstruction[]>(() => {
    const saved = localStorage.getItem('babypulse_instructions');
    return saved ? JSON.parse(saved) : INITIAL_SPECIAL_INSTRUCTIONS;
  });

  // Date selection state
  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayDateString());
  
  // Tab states
  const [activeTab, setActiveTab] = useState<'today' | 'timeline' | 'food' | 'trends' | 'care'>('today');

  // Interactive Live sleep timer state
  const [isSleeping, setIsSleeping] = useState<boolean>(false);
  const [sleepStartTime, setSleepStartTime] = useState<number | null>(null);
  const [currentSleepElapsedStr, setCurrentSleepElapsedStr] = useState<string>('00:00');

  // Input states for writing custom descriptions / settings
  const [showSettings, setShowSettings] = useState<boolean>(false);
  // Custom Firebase configuration for Vercel/Self-hosting
  const [showCustomFirebase, setShowCustomFirebase] = useState<boolean>(false);
  const [customFirebaseJson, setCustomFirebaseJson] = useState<string>(() => {
    return localStorage.getItem('babypulse_custom_firebase_config') || '';
  });
  
  // Custom Cloud Sync Gateway configuration
  const [showGatewaySettings, setShowGatewaySettings] = useState<boolean>(false);
  const [gatewayMode, setGatewayMode] = useState<string>(() => {
    return localStorage.getItem('babypulse_gateway_mode') || 'dev';
  });
  const [customGatewayUrl, setCustomGatewayUrl] = useState<string>(() => {
    return localStorage.getItem('babypulse_custom_gateway_url') || '';
  });
  
  const [babyName, setBabyName] = useState<string>(() => {
    return localStorage.getItem('babypulse_baby_name') || 'Alex';
  });
  const [babyDob, setBabyDob] = useState<string>(() => {
    return localStorage.getItem('babypulse_baby_dob') || '2023-04-12';
  });
  
  // Custom Instruction form in Care Tab
  const [newInstructionText, setNewInstructionText] = useState<string>('');
  
  // Modal states
  const [isAddEventOpen, setIsAddEventOpen] = useState<boolean>(false);
  const [addEventType, setAddEventType] = useState<EventType>('sleep');
  const [isAddFoodOpen, setIsAddFoodOpen] = useState<boolean>(false);
  const [addFoodMealType, setAddFoodMealType] = useState<'Breakfast' | 'Lunch' | 'Snack'>('Breakfast');
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  // --- Persistent Schedules/Reminders State ---
  const [schedules, setSchedules] = useState<ScheduledReminder[]>(() => {
    const saved = localStorage.getItem('babypulse_schedules');
    if (saved) return JSON.parse(saved);
    const today = getTodayDateString();
    return INITIAL_SCHEDULES.map(s => ({
      ...s,
      completedDates: s.completedDates.map(d => d === '2023-10-24' ? today : d)
    }));
  });

  const [notificationPermission, setNotificationPermission] = useState<string>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [notifiedSchedules, setNotifiedSchedules] = useState<string[]>([]);
  
  // Custom Scheduler Add Form States
  const [newScheduleType, setNewScheduleType] = useState<'feed' | 'medication'>('feed');
  const [newScheduleTitle, setNewScheduleTitle] = useState<string>('');
  const [newScheduleTime, setNewScheduleTime] = useState<string>('05:00');
  const [newScheduleAmpm, setNewScheduleAmpm] = useState<'AM' | 'PM'>('PM');
  const [newScheduleAmountOz, setNewScheduleAmountOz] = useState<number>(4);
  const [newScheduleNotes, setNewScheduleNotes] = useState<string>('');
  const [showAddScheduleForm, setShowAddScheduleForm] = useState<boolean>(false);

  // --- Persistent Weight Logs State ---
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>(() => {
    const saved = localStorage.getItem('babypulse_weight_logs');
    return saved ? JSON.parse(saved) : INITIAL_WEIGHT_LOGS;
  });

  const [newWeightLb, setNewWeightLb] = useState<string>('14');
  const [newWeightOz, setNewWeightOz] = useState<string>('0');
  const [newWeightDate, setNewWeightDate] = useState<string>(() => getTodayDateString());
  const [newWeightNotes, setNewWeightNotes] = useState<string>('');
  const [showAddWeightForm, setShowAddWeightForm] = useState<boolean>(false);

  // --- Daily Goals State & Inputs ---
  const [goals, setGoals] = useState<DailyGoal[]>(() => {
    const saved = localStorage.getItem('babypulse_daily_goals');
    if (saved) return JSON.parse(saved);
    const today = getTodayDateString();
    return INITIAL_GOALS.map(g => {
      if (g.manualProgress && g.manualProgress['2023-10-24'] !== undefined) {
        return {
          ...g,
          manualProgress: {
            [today]: g.manualProgress['2023-10-24']
          }
        };
      }
      return g;
    });
  });

  const [newGoalCategory, setNewGoalCategory] = useState<GoalCategory>('feed_oz');
  const [newGoalTitle, setNewGoalTitle] = useState<string>('');
  const [newGoalTarget, setNewGoalTarget] = useState<string>('24');
  const [newGoalUnit, setNewGoalUnit] = useState<string>('oz');
  const [showAddGoalForm, setShowAddGoalForm] = useState<boolean>(false);

  // --- Gemini API Weekly Progress Analysis State ---
  const [geminiAnalysis, setGeminiAnalysis] = useState<string | null>(() => {
    return localStorage.getItem('babypulse_gemini_analysis');
  });
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // --- Gemini Feeding Pattern Insight State ---
  const [feedingInsight, setFeedingInsight] = useState<{
    averageGapMinutes: number;
    suggestedNextTime: string;
    reasoning: string;
    analysisText: string;
  } | null>(() => {
    const saved = localStorage.getItem('babypulse_feeding_insight');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoadingFeedingInsight, setIsLoadingFeedingInsight] = useState<boolean>(false);
  const [feedingInsightError, setFeedingInsightError] = useState<string | null>(null);

  // --- Dark Mode State ---
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('babypulse_dark_mode');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('babypulse_dark_mode', String(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Sync locks & credentials
  useEffect(() => {
    localStorage.setItem('babypulse_biometric_lock_enabled', String(isBiometricLockEnabled));
  }, [isBiometricLockEnabled]);

  useEffect(() => {
    if (biometricCredentialId) {
      localStorage.setItem('babypulse_biometric_credential_id', biometricCredentialId);
    } else {
      localStorage.removeItem('babypulse_biometric_credential_id');
    }
  }, [biometricCredentialId]);

  useEffect(() => {
    localStorage.setItem('babypulse_baby_name', babyName);
  }, [babyName]);

  useEffect(() => {
    localStorage.setItem('babypulse_baby_dob', babyDob);
  }, [babyDob]);

  // Check biometric support
  useEffect(() => {
    isBiometricsSupportedOnDevice().then(supported => {
      setIsBiometricsSupported(supported);
    });
  }, []);

  // Centralized Google session & Cloud Sync handler
  const syncUserData = async (user: User | { uid: string; email: string; displayName: string }) => {
    setIsSyncingCloud(true);
    try {
      const cloudData = await loadUserDataFromCloud(user.uid);
      
      // Filter out any default preloaded demo IDs from both loaded cloud records and local state files!
      const cloudEvents = (cloudData?.events || []).filter(e => !['e1', 'e2', 'e3', 'e4'].includes(e.id));
      const cloudFoods = (cloudData?.foods || []).filter(f => !['f1', 'f2', 'f3'].includes(f.id));
      const cloudInstructions = (cloudData?.instructions || []).filter(inst => !['s1', 's2'].includes(inst.id));
      const cloudSchedules = (cloudData?.schedules || []).filter(s => !['s-rem-1', 's-rem-2', 's-rem-3'].includes(s.id));
      const cloudWeightLogs = (cloudData?.weightLogs || []).filter(w => !['w-1', 'w-2', 'w-3', 'w-4', 'w-5', 'w-6'].includes(w.id));
      const cloudGoals = (cloudData?.goals || []).filter(g => !['g-1', 'g-2', 'g-3', 'g-4'].includes(g.id));

      if (cloudData && (
        cloudEvents.length > 0 || 
        cloudFoods.length > 0 ||
        cloudWeightLogs.length > 0 ||
        cloudSchedules.length > 0
      )) {
        // Load downloaded data
        if (cloudData.babyName) setBabyName(cloudData.babyName);
        if (cloudData.babyDob) setBabyDob(cloudData.babyDob);
        if (cloudData.isSleeping !== undefined) setIsSleeping(cloudData.isSleeping);
        if (cloudData.sleepStartTime !== undefined) setSleepStartTime(cloudData.sleepStartTime);
        
        setEvents(cloudEvents.sort((a, b) => b.timestamp - a.timestamp));
        setFoods(cloudFoods.sort((a, b) => b.timestamp - a.timestamp));
        setInstructions(cloudInstructions);
        setSchedules(cloudSchedules);
        setWeightLogs(cloudWeightLogs.sort((a, b) => a.timestamp - b.timestamp));
        setGoals(cloudGoals);
        
        // Show subtle status indicator denoting events updated
        setShowEventsSyncIndicator(true);
        setTimeout(() => {
          setShowEventsSyncIndicator(false);
        }, 6000);

        showToast("Successfully downloaded your baby diaries from Google Account!", "success");
      } else {
        // Cloud is empty. Filter out ALL local/guest demo records so we ONLY back up actual user custom logs!
        // This achieves "googal login nantr demo data remove zala paheje" perfectly!
        const filteredEvents = events.filter(e => !['e1', 'e2', 'e3', 'e4'].includes(e.id));
        const filteredFoods = foods.filter(f => !['f1', 'f2', 'f3'].includes(f.id));
        const filteredInstructions = instructions.filter(inst => !['s1', 's2'].includes(inst.id));
        const filteredSchedules = schedules.filter(s => !['s-rem-1', 's-rem-2', 's-rem-3'].includes(s.id));
        const filteredWeightLogs = weightLogs.filter(w => !['w-1', 'w-2', 'w-3', 'w-4', 'w-5', 'w-6'].includes(w.id));
        const filteredGoals = goals.filter(g => !['g-1', 'g-2', 'g-3', 'g-4'].includes(g.id));

        // Update the React states immediately to wipe the demo data!
        setEvents(filteredEvents);
        setFoods(filteredFoods);
        setInstructions(filteredInstructions);
        setSchedules(filteredSchedules);
        setWeightLogs(filteredWeightLogs);
        setGoals(filteredGoals);

        // Show subtle status indicator denoting events filtered/synced successfully
        setShowEventsSyncIndicator(true);
        setTimeout(() => {
          setShowEventsSyncIndicator(false);
        }, 6000);

        // Notify the user
        showToast("Google Sync Active: Preloaded demo data cleared to start fresh!", "info");
        
        await uploadLocalDataToCloud(
          user.uid,
          { 
            events: filteredEvents, 
            foods: filteredFoods, 
            instructions: filteredInstructions, 
            schedules: filteredSchedules, 
            weightLogs: filteredWeightLogs, 
            goals: filteredGoals 
          },
          babyName,
          babyDob,
          isSleeping,
          sleepStartTime
        );
        showToast("Your custom records are now safely backed up to Google Cloud!", "success");
      }
    } catch (err: any) {
      console.error("Firestore sync fetch issue:", err);
      showToast("Failed to load records from cloud database.", "error");
    } finally {
      setIsSyncingCloud(false);
    }
  };

  // Manage Google Account authentication & active cloud fetching
  useEffect(() => {
    // Listen to redirect outcome (useful for mobile browsers or in-app sandboxes)
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          showToast(`Welcome back! Signed in successfully as ${result.user.email}!`, "success");
        }
      })
      .catch(async (error: any) => {
        console.error("Firebase Auth Redirect Result Error:", error);
        const errCode = error?.code || "";
        const errMsg = error?.message || "";
        const currentHost = window.location.hostname;
        
        if (
          errCode === "auth/unauthorized-domain" || 
          errMsg.includes("unauthorized-domain") || 
          errMsg.includes("unauthorized client") || 
          errMsg.includes("auth/unauthorized") || 
          errMsg.includes("unauthorized_client")
        ) {
          const activateSim = await customConfirm(
            "Firebase Domain Authorization Needed",
            `Google Sign-In is restricted here because '${currentHost}' is not on the Authorized Domains list for this default AI Studio instance.\n\nTo resolve this permanently on Vercel:\n1. Go to Settings in this app.\n2. Tap 'Setup Custom Firebase' and paste your own Web Firebase JSON configuration.\n3. Add '${currentHost}' to your custom Firebase project's Authorized Domains list.\n\nWould you like to activate Parent Simulator to try out the app in simulated Cloud Sync mode for now?`,
            "Simulate Cloud Mode",
            "Stay Offline"
          );
          if (activateSim) {
            const mockUser = {
              uid: "demo-google-user",
              email: "parent.demo@gmail.com",
              displayName: "Demo Parent"
            };
            setCurrentUser(mockUser as any);
            showToast("Simulated parent account login: parent.demo@gmail.com", "success");
            await syncUserData(mockUser as any);
          }
        }
      });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
      if (user) {
        await syncUserData(user);
      }
    });
    return () => unsubscribe();
  }, []);

  // Helper to complete sign-in from a delegated secure gateway
  const signInWithDelegatedToken = async (
    idToken: string, 
    googleIdToken?: string | null, 
    googleAccessToken?: string | null, 
    firebaseIdToken?: string | null
  ) => {
    try {
      showToast("Cloud sync authenticated! Connecting to database...", "info");
      const { signInWithCredential, GoogleAuthProvider } = await import('firebase/auth');
      
      let credential;
      
      // Attempt 1: Reconstruct the authentic Google credentials (this is cross-project compatible!)
      if (googleIdToken) {
        console.log("Sync Gateway: Registering with primary Google OAuth Token...");
        credential = GoogleAuthProvider.credential(googleIdToken, googleAccessToken || undefined);
      } else {
        // Fallback: Default to passed token parameter
        console.log("Sync Gateway: Registering with fallback Token...");
        credential = GoogleAuthProvider.credential(idToken);
      }
      
      try {
        const result = await signInWithCredential(auth, credential);
        if (result?.user) {
          setCurrentUser(result.user);
          showToast(`Google Account Connected!`, "success");
          await syncUserData(result.user);
          return;
        }
      } catch (firstTryErr: any) {
        console.warn("Primary Google credential sync failed. Trying fallback token...", firstTryErr);
        
        // Attempt 2: If we had a firebase-specific token but it wasn't used first
        if (firebaseIdToken && googleIdToken !== firebaseIdToken) {
          try {
            const backupCred = GoogleAuthProvider.credential(firebaseIdToken);
            const result = await signInWithCredential(auth, backupCred);
            if (result?.user) {
              setCurrentUser(result.user);
              showToast(`Connected via fallback session token!`, "success");
              await syncUserData(result.user);
              return;
            }
          } catch (secondTryErr) {
            console.error("Backup session verification also failed:", secondTryErr);
          }
        }
        throw firstTryErr;
      }
    } catch (err: any) {
      console.error("Delegated secure sign-in verification failure:", err);
      let friendlyMsg = err?.message || "Verification failed";
      if (friendlyMsg.includes("invalid-id-token") || friendlyMsg.includes("auth/invalid-id-token")) {
         friendlyMsg = "Firebase token signature mismatch (auth/invalid-id-token). Make sure your custom Firebase settings coordinates match the gateway default credentials.";
      }
      showToast(`Handshake verification failed: ${friendlyMsg}`, "error");
    }
  };

  // Listen to messages from the delegated auth popup (supports smooth Google login on Vercel)
  useEffect(() => {
    const handleAuthMessage = async (event: MessageEvent) => {
      // Safety guard: Ensure the message is received from our authorized run.app hosting
      if (!event.origin.includes("run.app")) return;

      if (event.data && event.data.type === 'DELEGATED_AUTH_SUCCESS') {
        const { idToken, googleIdToken, googleAccessToken, firebaseIdToken } = event.data;
        if (!idToken) return;
        await signInWithDelegatedToken(idToken, googleIdToken, googleAccessToken, firebaseIdToken);
      }
    };

    window.addEventListener('message', handleAuthMessage);
    return () => window.removeEventListener('message', handleAuthMessage);
  }, []);

  // Listen to hash-based fallback delegated token (critical for mobile Chrome redirects!)
  useEffect(() => {
    const handleHashToken = async () => {
      const hash = window.location.hash;
      if (hash && (hash.includes('idToken=') || hash.includes('googleIdToken='))) {
        const params = new URLSearchParams(hash.substring(1)); // strip out the leading '#'
        const idToken = params.get('idToken') || '';
        const googleIdToken = params.get('googleIdToken');
        const googleAccessToken = params.get('googleAccessToken');
        const firebaseIdToken = params.get('firebaseIdToken');

        // Clear hash immediately for security and clean URL aesthetics
        window.location.hash = '';

        if (idToken || googleIdToken) {
          await signInWithDelegatedToken(idToken, googleIdToken, googleAccessToken, firebaseIdToken);
        }
      }
    };

    handleHashToken();
    window.addEventListener('hashchange', handleHashToken);
    return () => window.removeEventListener('hashchange', handleHashToken);
  }, []);

  // Helper to trigger toast
  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Sync arrays to local storage for offline fallback compatibility
  useEffect(() => {
    localStorage.setItem('babypulse_events', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem('babypulse_foods', JSON.stringify(foods));
  }, [foods]);

  useEffect(() => {
    localStorage.setItem('babypulse_instructions', JSON.stringify(instructions));
  }, [instructions]);

  useEffect(() => {
    localStorage.setItem('babypulse_schedules', JSON.stringify(schedules));
  }, [schedules]);

  useEffect(() => {
    localStorage.setItem('babypulse_weight_logs', JSON.stringify(weightLogs));
  }, [weightLogs]);

  useEffect(() => {
    localStorage.setItem('babypulse_daily_goals', JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    setNewWeightDate(selectedDate);
  }, [selectedDate]);

  const chartGridColor = isDarkMode ? "rgba(255, 255, 255, 0.08)" : "#ECEEF0";
  const chartTextColor = isDarkMode ? "#94a3b8" : "#71787f";
  const ouncesColor = isDarkMode ? "#34d399" : "#3c6842";
  const sleepColor = isDarkMode ? "#60a5fa" : "#1c648e";
  const primaryColor = isDarkMode ? "#38bdf8" : "#1c648e";

  // Digital Clock Timer (updates every 5 seconds for live checks)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const parseTimeToMinutes = (timeStr: string, ampm: 'AM' | 'PM'): number => {
    const parts = timeStr.trim().split(':');
    if (parts.length !== 2) return 0;
    let hr = parseInt(parts[0], 10);
    const min = parseInt(parts[1], 10);
    if (ampm === 'PM' && hr < 12) hr += 12;
    if (ampm === 'AM' && hr === 12) hr = 0;
    return hr * 60 + min;
  };

  const currentTotalMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

  const playNotificationSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      
      // Soothing two-note nursery chime (G5: 783.99 Hz followed by C6: 1046.50 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(783.99, now);
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.12, now + 0.04);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1046.50, now + 0.12);
      gain2.gain.setValueAtTime(0, now);
      gain2.gain.linearRampToValueAtTime(0.1, now + 0.16);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      
      osc1.start(now);
      osc1.stop(now + 0.5);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.7);
    } catch (e) {
      console.warn("Could not play notification chime:", e);
    }
  };

  // Browser Notification Engine & State Check
  useEffect(() => {
    if (typeof window === 'undefined') return;

    schedules.forEach((sched) => {
      const isCompleted = sched.completedDates?.includes(selectedDate);
      if (isCompleted) return;

      const schedMins = parseTimeToMinutes(sched.time, sched.ampm);
      const isOverdue = schedMins <= currentTotalMinutes;

      if (isOverdue) {
        const uniqueKey = `${sched.id}-${selectedDate}`;
        if (!notifiedSchedules.includes(uniqueKey)) {
          // Play a beautiful, subtle notification chime!
          playNotificationSound();

          // Display a non-blocking dialog fallback or popup browser alert alongside chemical chime
          setTimeout(() => {
            alert(`⏰ BabyPulse Alert: Scheduled routine "${sched.title}" has reached its reminder time of ${sched.time} ${sched.ampm}!`);
          }, 150);

          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification(`Overdue BabyPulse Reminder`, {
                body: `Attention! ${sched.title} was scheduled for ${sched.time} ${sched.ampm} and has passed.`,
                tag: uniqueKey,
                requireInteraction: true
              });
            } catch (err) {
              console.warn('Notification error or iframe sandbox restriction:', err);
            }
          }
          setNotifiedSchedules(prev => [...prev, uniqueKey]);
        }
      }
    });
  }, [currentTime, schedules, selectedDate, notifiedSchedules, currentTotalMinutes]);

  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
      } catch (err) {
        console.warn('Notification permission request error:', err);
      }
    }
  };

  const handleToggleScheduleCompleted = async (id: string) => {
    let triggeredEvent: BabyEvent | null = null;
    let targetSched: ScheduledReminder | null = null;

    setSchedules(prev => prev.map(sched => {
      if (sched.id === id) {
        const dates = sched.completedDates || [];
        const isCompletedAlready = dates.includes(selectedDate);
        let updatedDates = [];
        if (isCompletedAlready) {
          updatedDates = dates.filter(d => d !== selectedDate);
        } else {
          updatedDates = [...dates, selectedDate];
          
          // Automatically log actual BabyPulse activity to timeline!
          if (sched.type === 'feed') {
            triggeredEvent = {
              id: `e-${Date.now()}`,
              type: 'feed',
              title: `Completed Feed: ${sched.title}`,
              time: sched.time,
              ampm: sched.ampm,
              date: selectedDate,
              timestamp: Date.now(),
              feedType: 'Formula',
              amountOz: sched.amountOz || 4,
              amountMl: Math.round((sched.amountOz || 4) * 29.57),
              temp: 'Room Temp'
            };
          } else {
            triggeredEvent = {
              id: `e-${Date.now()}`,
              type: 'care',
              title: `Administered: ${sched.title}`,
              time: sched.time,
              ampm: sched.ampm,
              date: selectedDate,
              timestamp: Date.now(),
              notes: sched.notes || 'Administered medication/drops as scheduled.'
            };
          }
        }
        targetSched = { ...sched, completedDates: updatedDates };
        return targetSched;
      }
      return sched;
    }));

    if (triggeredEvent) {
      setEvents(prevEv => [triggeredEvent!, ...prevEv]);
    }

    if (currentUser && targetSched) {
      await safeSetDoc(`users/${currentUser.uid}/schedules`, id, { ...targetSched, userId: currentUser.uid });
      if (triggeredEvent) {
        await safeSetDoc(`users/${currentUser.uid}/events`, (triggeredEvent as BabyEvent).id, { ...triggeredEvent, userId: currentUser.uid });
      }
    }
  };

  const handleSnoozeReminder = async (id: string, minutes: number) => {
    let targetSched: ScheduledReminder | null = null;
    
    setSchedules(prev => prev.map(sched => {
      if (sched.id === id) {
        let totalMins = parseTimeToMinutes(sched.time, sched.ampm);
        totalMins = (totalMins + minutes) % 1440;
        
        let hoursType = Math.floor(totalMins / 60);
        const minsVal = totalMins % 60;
        
        let ampmVal: 'AM' | 'PM' = 'AM';
        if (hoursType >= 12) {
          ampmVal = 'PM';
          if (hoursType > 12) {
            hoursType -= 12;
          }
        }
        if (hoursType === 0) {
          hoursType = 12;
        }
        
        const pathHour = String(hoursType).padStart(2, '0');
        const pathMin = String(minsVal).padStart(2, '0');
        const newTimeStr = `${pathHour}:${pathMin}`;
        
        targetSched = {
          ...sched,
          time: newTimeStr,
          ampm: ampmVal
        };
        
        showToast(`Snoozed alert "${sched.title}" by ${minutes} mins! Rescheduled to ${newTimeStr} ${ampmVal}`, "info");
        return targetSched;
      }
      return sched;
    }));
    
    // Clear notification tracker entry so it can fire again when the new time is reached
    setNotifiedSchedules(prev => prev.filter(key => key !== `${id}-${selectedDate}`));
    
    if (currentUser && targetSched) {
      try {
        await safeSetDoc(`users/${currentUser.uid}/schedules`, id, { ...targetSched, userId: currentUser.uid });
      } catch (err) {
        console.error("Failed to sync snoozed schedule to Firebase:", err);
      }
    }
  };

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScheduleTitle.trim()) return;

    const newRem: ScheduledReminder = {
      id: `s-rem-${Date.now()}`,
      type: newScheduleType,
      title: newScheduleTitle.trim(),
      time: newScheduleTime,
      ampm: newScheduleAmpm,
      completedDates: [],
      isRepeating: true,
      amountOz: newScheduleType === 'feed' ? newScheduleAmountOz : undefined,
      notes: newScheduleType === 'medication' ? newScheduleNotes.trim() : undefined
    };

    setSchedules(prev => [...prev, newRem]);
    setNewScheduleTitle('');
    setNewScheduleNotes('');
    setShowAddScheduleForm(false);

    if (currentUser) {
      await safeSetDoc(`users/${currentUser.uid}/schedules`, newRem.id, { ...newRem, userId: currentUser.uid });
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    const verified = await verifyActionPermission("delete schedule reminder");
    if (!verified) return;

    setSchedules(prev => prev.filter(s => s.id !== id));

    if (currentUser) {
      await safeDeleteDoc(`users/${currentUser.uid}/schedules`, id);
    }
  };

  const handleAddWeightLog = async (e: React.FormEvent) => {
    e.preventDefault();
    const lbs = parseInt(newWeightLb, 10);
    const ozs = parseInt(newWeightOz, 10);
    if (isNaN(lbs) || isNaN(ozs) || !newWeightDate) return;

    const newLog: WeightLog = {
      id: `w-log-${Date.now()}`,
      weightLb: lbs,
      weightOz: ozs,
      date: newWeightDate,
      timestamp: new Date(newWeightDate + 'T12:00:00').getTime(), // Mid-day stamp to prevent timezone shifts
      notes: newWeightNotes.trim() || undefined
    };

    setWeightLogs(prev => {
      const updated = [...prev, newLog];
      return updated.sort((a, b) => a.timestamp - b.timestamp);
    });

    setNewWeightNotes('');
    setShowAddWeightForm(false);

    if (currentUser) {
      await safeSetDoc(`users/${currentUser.uid}/weightLogs`, newLog.id, { ...newLog, userId: currentUser.uid });
    }
  };

  const handleDeleteWeightLog = async (id: string) => {
    const verified = await verifyActionPermission("delete weight measurement");
    if (!verified) return;

    setWeightLogs(prev => prev.filter(w => w.id !== id));

    if (currentUser) {
      await safeDeleteDoc(`users/${currentUser.uid}/weightLogs`, id);
    }
  };

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetVal = parseFloat(newGoalTarget);
    if (isNaN(targetVal) || !newGoalTitle.trim()) return;

    const newGoal: DailyGoal = {
      id: `g-log-${Date.now()}`,
      category: newGoalCategory,
      title: newGoalTitle.trim(),
      target: targetVal,
      unit: newGoalUnit.trim(),
      manualProgress: newGoalCategory === 'custom' ? {} : undefined
    };

    setGoals(prev => [...prev, newGoal]);
    setNewGoalTitle('');
    setShowAddGoalForm(false);

    if (currentUser) {
      await safeSetDoc(`users/${currentUser.uid}/goals`, newGoal.id, { ...newGoal, userId: currentUser.uid });
    }
  };

  const handleDeleteGoal = async (id: string) => {
    const verified = await verifyActionPermission("delete daily goal");
    if (!verified) return;

    setGoals(prev => prev.filter(g => g.id !== id));

    if (currentUser) {
      await safeDeleteDoc(`users/${currentUser.uid}/goals`, id);
    }
  };

  const handleUpdateManualGoalProgress = async (goalId: string, change: number) => {
    let updatedGoal: DailyGoal | null = null;
    setGoals(prev => prev.map(g => {
      if (g.id !== goalId) return g;
      const manualProgress = { ...(g.manualProgress || {}) };
      const currentVal = manualProgress[selectedDate] || 0;
      manualProgress[selectedDate] = Math.max(0, currentVal + change);
      updatedGoal = { ...g, manualProgress };
      return updatedGoal;
    }));

    if (currentUser && updatedGoal) {
      await safeSetDoc(`users/${currentUser.uid}/goals`, goalId, { ...updatedGoal, userId: currentUser.uid });
    }
  };

  const handleAnalyzeProgress = async () => {
    setIsLoadingAnalysis(true);
    setAnalysisError(null);
    try {
      // 1. Compile recent sleep data from last 7 days from events (type === 'sleep')
      const sleepSamples = events
        .filter(evt => evt.type === 'sleep' && evt.durationMinutes !== undefined)
        .slice(-10) // last 10 entries for brevity
        .map(evt => ({
          date: evt.date,
          time: `${evt.time} ${evt.ampm}`,
          durationMins: evt.durationMinutes,
          notes: evt.notes || ''
        }));

      // 2. Compile recent food diary entries
      const foodSamples = foods
        .slice(-10)
        .map(f => ({
          date: f.date,
          item: f.itemName,
          portion: f.portion,
          meal: f.mealType,
          reaction: f.reaction,
          texture: f.texture
        }));

      // 3. Compile weight history
      const weightSamples = weightLogs
        .slice(-5)
        .map(w => ({
          date: w.date,
          lbs: w.weightLb,
          oz: w.weightOz,
          notes: w.notes || ''
        }));

      const res = await fetch("/api/gemini/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          babyName,
          sleepData: sleepSamples,
          foodData: foodSamples,
          weightData: weightSamples
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      setGeminiAnalysis(data.text);
      localStorage.setItem('babypulse_gemini_analysis', data.text);
    } catch (err: any) {
      console.error(err);
      setAnalysisError(err.message || "Failed to generate weekly summary. Please try again.");
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  const handleGenerateFeedingInsight = async () => {
    setIsLoadingFeedingInsight(true);
    setFeedingInsightError(null);

    try {
      // Extract feed events
      const feedEvents = events
        .filter(evt => evt.type === 'feed')
        // Sort chronologically ascending by timestamp
        .sort((a, b) => a.timestamp - b.timestamp);

      // Map to lightweight feeds to keep payload clean and quick
      const lightFeeds = feedEvents.map(evt => ({
        date: evt.date,
        time: evt.time,
        ampm: evt.ampm,
        feedType: evt.feedType || 'Formula',
        amountOz: evt.amountOz
      })).slice(-10); // send up to last 10 feeds for analysis

      const res = await fetch("/api/gemini/feeding-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          babyName,
          recentFeeds: lightFeeds
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      setFeedingInsight(data);
      localStorage.setItem('babypulse_feeding_insight', JSON.stringify(data));
      showToast("Feeding pattern analysis generated successfully!", "success");
    } catch (err: any) {
      console.error(err);
      setFeedingInsightError(err.message || "Failed to generate feeding insights. Please verify API key setup.");
    } finally {
      setIsLoadingFeedingInsight(false);
    }
  };

  const parseBoldText = (text: string) => {
    const parts = text.split(/\*\*(.*?)\*\*/);
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <strong key={i} className="font-bold text-neutral-800">{part}</strong>;
      }
      return part;
    });
  };

  const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, idx) => {
      const content = line.trim();
      if (!content) return <div key={idx} className="h-2" />;

      // Headers
      if (content.startsWith('### ')) {
        return <h4 key={idx} className="font-bold text-xs text-neutral-800 uppercase tracking-wide mt-4 mb-1.5 flex items-center gap-1.5">{parseBoldText(content.slice(4))}</h4>;
      }
      if (content.startsWith('## ')) {
        return <h3 key={idx} className="font-bold text-sm text-[#1c648e] mt-5 mb-2 border-b border-neutral-100 pb-1 flex items-center gap-2">{parseBoldText(content.slice(3))}</h3>;
      }
      if (content.startsWith('# ')) {
        return <h2 key={idx} className="font-bold text-base text-neutral-900 mt-6 mb-3">{parseBoldText(content.slice(2))}</h2>;
      }

      // Bullet points
      if (content.startsWith('- ') || content.startsWith('* ')) {
        return (
          <div key={idx} className="flex items-start gap-2 text-xs text-neutral-600 pl-2 py-0.5">
            <span className="text-secondary shrink-0 mt-1.5">•</span>
            <span>{parseBoldText(content.slice(2))}</span>
          </div>
        );
      }

      // Normal paragraph
      return <p key={idx} className="text-xs text-neutral-600 leading-relaxed mb-2">{parseBoldText(content)}</p>;
    });
  };

  // Pre-populate input fields based on selected category when adding a goal
  useEffect(() => {
    switch (newGoalCategory) {
      case 'feed_oz':
        setNewGoalTitle('Daily Food/Milk Intake');
        setNewGoalTarget('24');
        setNewGoalUnit('oz');
        break;
      case 'sleep_minutes':
        setNewGoalTitle('Nap/Sleep Duration Target');
        setNewGoalTarget('120');
        setNewGoalUnit('mins');
        break;
      case 'diapas_wet':
        setNewGoalTitle('Wet Diapers Count');
        setNewGoalTarget('4');
        setNewGoalUnit('times');
        break;
      case 'diapas_dirty':
        setNewGoalTitle('Dirty Diapers Count');
        setNewGoalTarget('3');
        setNewGoalUnit('times');
        break;
      case 'custom':
        setNewGoalTitle('Tummy Time Practice');
        setNewGoalTarget('20');
        setNewGoalUnit('mins');
        break;
    }
  }, [newGoalCategory]);

  // Live Timer Tracker for Current Sleep Cycle
  useEffect(() => {
    let interval: any;
    if (isSleeping && sleepStartTime) {
      interval = setInterval(() => {
        const diffMs = Date.now() - sleepStartTime;
        const totalSecs = Math.floor(diffMs / 1000);
        const hrs = Math.floor(totalSecs / 3600);
        const mins = Math.floor((totalSecs % 3600) / 60);
        const secs = totalSecs % 60;
        
        const hrsStr = hrs > 0 ? `${hrs}h ` : '';
        const minsStr = `${mins}m `;
        const secsStr = `${secs}s`;
        
        setCurrentSleepElapsedStr(`${hrsStr}${minsStr}${secsStr}`);
      }, 1000);
    } else {
      setCurrentSleepElapsedStr('00:00');
    }
    return () => clearInterval(interval);
  }, [isSleeping, sleepStartTime]);

  // Google Login / Logout & Biometrics handlers
  const handleGoogleLogin = async () => {
    const currentHost = window.location.hostname;
    const isAuthorizedHost = 
      currentHost.includes("run.app") || 
      currentHost.includes("localhost") || 
      currentHost.includes("127.0.0.1") || 
      currentHost.includes("gitpreview");
    const hasCustomFirebase = !!localStorage.getItem('babypulse_custom_firebase_config');

    // Seamlessly bypass the Firebase "Authorized Domains" restriction on Vercel deployment
    if (!isAuthorizedHost && !hasCustomFirebase) {
      showToast("Syncing via BabyPulse Secure Cloud Sync...", "info");
      
      let previewBase = "https://ais-dev-vusuvyh2idkdtdothaxckf-4315933380.asia-east1.run.app"; // Default to active Dev Gateway for safe testing
      if (gatewayMode === 'shared') {
        previewBase = "https://ais-pre-vusuvyh2idkdtdothaxckf-4315933380.asia-east1.run.app";
      } else if (gatewayMode === 'custom' && customGatewayUrl.trim()) {
        previewBase = customGatewayUrl.trim();
      }
      
      const delegateUrl = `${previewBase}/?action=oauth-delegate-login&parentOrigin=${encodeURIComponent(window.location.origin)}`;
      
      const width = 500;
      const height = 650;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const authPopup = window.open(
        delegateUrl, 
        'BabyPulseCloudSync', 
        `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes`
      );
      
      if (!authPopup) {
        showToast("Popup Blocked! Please authorize popups for this dashboard page to enable sync.", "error");
      }
      return;
    }

    try {
      showToast("Opening Google Sign-In secure window...", "info");
      const user = await loginWithGoogle();
      if (user) {
        showToast(`Signed in successfully as ${user.email}!`, "success");
      }
    } catch (err: any) {
      console.error("Firebase Auth Error:", err);
      const errCode = err?.code || "";
      const errMsg = err?.message || "";
      const currentHost = window.location.hostname;
      
      // Only detect sandbox frame if running inside AI Studio preview hostnames
      const isActuallyAIStudioSandbox = window.self !== window.top && (
        currentHost.includes("run.app") || 
        currentHost.includes("localhost") || 
        currentHost.includes("127.0.0.1") ||
        currentHost.includes("gitpreview")
      );

      if (
        errCode === "auth/unauthorized-domain" || 
        errMsg.includes("unauthorized-domain") || 
        errMsg.includes("unauthorized client") || 
        errMsg.includes("auth/unauthorized") || 
        errMsg.includes("unauthorized_client")
      ) {
        showToast(`Domain '${currentHost}' is not authorized!`, "error");
        const activateSim = await customConfirm(
          "Firebase Domain Authorization Needed",
          `Google Sign-In is restricted here because '${currentHost}' is not on the Authorized Domains list for this default AI Studio instance.\n\nTo resolve this permanently on Vercel:\n1. Go to Settings in this app.\n2. Tap 'Setup Custom Firebase' and paste your own Web Firebase JSON configuration.\n3. Add '${currentHost}' to your custom Firebase project's Authorized Domains list.\n\nWould you like to activate Parent Simulator to try out the app in simulated Cloud Sync mode for now?`,
          "Simulate Cloud Mode",
          "Stay Offline"
        );
        if (activateSim) {
          const mockUser = {
            uid: "demo-google-user",
            email: "parent.demo@gmail.com",
            displayName: "Demo Parent"
          };
          setCurrentUser(mockUser as any);
          showToast("Simulated parent account login: parent.demo@gmail.com", "success");
          await syncUserData(mockUser as any);
        }
      } else if (errCode === "auth/popup-blocked" || errMsg.includes("popup-blocked") || errMsg.includes("popup_blocked")) {
        showToast("Login popup was blocked by your browser. We are redirecting you to Google instead...", "info");
      } else if (errCode === "auth/popup-closed-by-user" || errMsg.includes("popup-closed-by-user") || errMsg.includes("closed-by-user")) {
        showToast("Login cancelled. Popup closed before completing.", "info");
      } else if (errCode === "auth/operation-not-allowed" || errMsg.includes("operation-not-allowed")) {
        showToast("Google Authentication is disabled in your Firebase Console settings.", "error");
      } else if (isActuallyAIStudioSandbox) {
        showToast("Federated login is blocked in sandboxed iframe previews. Try opening in a new tab!", "error");
        // Let's offer a demo account fallback if standard login is physically blocked by the parent frame!
        const useDemo = await customConfirm(
          "Iframe Login Limitation",
          "Google Sign-In is blocked by the editor sandbox iframe. Would you like to launch the Parent Simulator instead for offline cloud emulation?",
          "Simulate Cloud Mode",
          "Cancel"
        );
        if (useDemo) {
          const mockUser = {
            uid: "demo-google-user",
            email: "parent.demo@gmail.com",
            displayName: "Demo Parent"
          };
          setCurrentUser(mockUser as any);
          showToast("Simulated parent account login: parent.demo@gmail.com", "success");
          await syncUserData(mockUser as any);
        }
      } else {
        showToast(`Sign-in status: ${errMsg || "Unknown connection state"}`, "error");
        // Give mobile standalone users the fallback option
        const useDemo = await customConfirm(
          "Sign-In Connection Support",
          `Google Sign-In encountered a connectivity or config issue (${errCode || "connection error"}). Would you like to activate the Parent Simulator to try out the app anyways?`,
          "Simulate Cloud Mode",
          "Cancel"
        );
        if (useDemo) {
          const mockUser = {
            uid: "demo-google-user",
            email: "parent.demo@gmail.com",
            displayName: "Demo Parent"
          };
          setCurrentUser(mockUser as any);
          showToast("Simulated parent account login: parent.demo@gmail.com", "success");
          await syncUserData(mockUser as any);
        }
      }
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await logoutUser();
      setCurrentUser(null);
      showToast("Signed out of Google account.", "info");
    } catch (err) {
      // In case we are in simulated/demo mode, clear user:
      setCurrentUser(null);
      showToast("Signed out of simulation.", "info");
    }
  };

  const handleRegisterBiometrics = async () => {
    try {
      showToast("Initializing TouchID / Fingerprint capture...", "info");
      const email = currentUser?.email || "guest.parent@babypulse.local";
      const id = currentUser?.uid || "guest-id";
      const credId = await registerDeviceBiometrics(email, id);
      if (credId) {
        setBiometricCredentialId(credId);
        setIsBiometricLockEnabled(true);
        showToast("Fingerprint successfully registered. App lock activated!", "success");
      }
    } catch (err: any) {
      console.warn("Biometrics error:", err);
      // Fallback for sandboxed modes
      const bypass = await customConfirm(
        "Biometric Setup Sandbox Fallback",
        "Your browser sandboxes biometric registration inside editor parent frames. Would you like to register a simulated secure fingerprint credentials profile instead?",
        "Simulate Fingerprint",
        "Cancel"
      );
      if (bypass) {
        const dummyId = "f-print-cred-demo-" + Date.now();
        setBiometricCredentialId(dummyId);
        setIsBiometricLockEnabled(true);
        showToast("Simulated device fingerprint registered! App lock activated.", "success");
      }
    }
  };

  const handleUnlockWithBiometrics = async () => {
    setIsScanning(true);
    setPasscodeError(null);
    try {
      if (!biometricCredentialId) {
        showToast("No fingerprint credential enrolled yet on this device.", "error");
        setIsScanning(false);
        return;
      }
      // Skip WebAuthn verification for simulated demo credentials
      if (biometricCredentialId.startsWith('f-print-cred-demo-')) {
        setIsAppLocked(false);
        showToast("Demo fingerprint accepted!", "success");
        setIsScanning(false);
        return;
      }
      const success = await verifyDeviceBiometrics(biometricCredentialId);
      if (success) {
        setIsAppLocked(false);
        showToast("Device authorized successfully!", "success");
      }
    } catch (err: any) {
      console.warn("Biometrics login failed:", err);
      // If verification fails, the stored credential may be stale (old encoding).
      // Offer to re-enroll instead of leaving the user stuck.
      const reEnroll = await customConfirm(
        "Fingerprint Verification Failed",
        "Your stored fingerprint credential may be outdated or corrupted. Would you like to re-enroll your fingerprint now?",
        "Re-enroll Fingerprint",
        "Use PIN Instead"
      );
      if (reEnroll) {
        // Clear old credential and re-register
        setBiometricCredentialId(null);
        setIsBiometricLockEnabled(false);
        setIsAppLocked(false);
        showToast("Old credential cleared. Please re-enroll your fingerprint in Settings.", "info");
      }
    } finally {
      setIsScanning(false);
    }
  };

  // Auto-trigger fingerprint scanner when lock screen appears
  useEffect(() => {
    if (isAppLocked && biometricCredentialId && !isScanning) {
      // Small delay to let the lock screen UI render first
      const timer = setTimeout(() => {
        handleUnlockWithBiometrics();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isAppLocked]);

  const handlePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === '2810' || passcode === '1234') {
      setIsAppLocked(false);
      setPasscodeError(null);
      showToast("Authorized with security passcode!", "success");
    } else {
      setPasscodeError("Invalid security PIN. (Hint: Use '2810' or '1234')");
    }
  };

  // Handle sleep/wake toggle
  const handleToggleSleep = async () => {
    if (!isSleeping) {
      const nowStamp = Date.now();
      setIsSleeping(true);
      setSleepStartTime(nowStamp);

      if (currentUser) {
        await safeSetDoc('users', currentUser.uid, {
          userId: currentUser.uid,
          babyName,
          babyDob,
          isSleeping: true,
          sleepStartTime: nowStamp
        });
      }
    } else {
      // Calculate duration in minutes
      let newEvent: BabyEvent | null = null;
      if (sleepStartTime) {
        const diffMin = Math.max(1, Math.floor((Date.now() - sleepStartTime) / 60000));
        const now = new Date();
        const hrsRaw = now.getHours();
        const ampmVal = hrsRaw >= 12 ? 'PM' : 'AM';
        const formattedHrs = String(hrsRaw % 12 || 12).padStart(2, '0');
        const formattedMins = String(now.getMinutes()).padStart(2, '0');

        newEvent = {
          id: `e-${Date.now()}`,
          type: 'sleep',
          title: 'Nap Time',
          time: `${formattedHrs}:${formattedMins}`,
          ampm: ampmVal,
          date: selectedDate,
          timestamp: Date.now(),
          durationMinutes: diffMin,
          notes: `Tracked in real-time. Fell asleep easily.`
        };

        setEvents(prev => [newEvent!, ...prev]);
      }
      setIsSleeping(false);
      setSleepStartTime(null);

      if (currentUser) {
        await safeSetDoc('users', currentUser.uid, {
          userId: currentUser.uid,
          babyName,
          babyDob,
          isSleeping: false,
          sleepStartTime: null
        });
        if (newEvent) {
          await safeSetDoc(`users/${currentUser.uid}/events`, newEvent.id, { ...newEvent, userId: currentUser.uid });
        }
      }
    }
  };

  // Date Shift Helper
  const handleShiftDate = (direction: 'prev' | 'next') => {
    const curDate = new Date(selectedDate);
    if (direction === 'prev') {
      curDate.setDate(curDate.getDate() - 1);
    } else {
      curDate.setDate(curDate.getDate() + 1);
    }
    
    // Format YYYY-MM-DD
    const yyyy = curDate.getFullYear();
    const mm = String(curDate.getMonth() + 1).padStart(2, '0');
    const dd = String(curDate.getDate()).padStart(2, '0');
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  };

  const getFormattedSelectedDate = () => {
    const options: any = { month: 'short', day: 'numeric', year: 'numeric' };
    const dateObj = new Date(selectedDate);
    // Add daylight savings safe offset mapping
    return dateObj.toLocaleDateString('en-US', options);
  };

  // Verify biometrics before sensitive action
  const verifyActionPermission = async (actionLabel: string): Promise<boolean> => {
    if (isBiometricLockEnabled && biometricCredentialId) {
      setIsScanning(true);
      try {
        const success = await verifyDeviceBiometrics(biometricCredentialId);
        if (success) {
          showToast(`Biometric auth success: ${actionLabel} authorized!`, "success");
          setIsScanning(false);
          return true;
        }
      } catch (err: any) {
        console.warn("Biometrics error:", err);
        // Fallback for sandboxed preview window or browser cancelled
        const bypass = await customConfirm(
          "Action Authorization Required",
          `Verification required to ${actionLabel}.\nWould you like to simulate a fingerprint scan to authorize this parent request?`,
          "Simulate Fingerprint",
          "Cancel"
        );
        if (bypass) {
          showToast(`Biometric auth (mock) success: ${actionLabel} authorized!`, "success");
          setIsScanning(false);
          return true;
        }
      } finally {
        setIsScanning(false);
      }
      showToast("Biometric authorization failed.", "error");
      return false;
    }
    return true;
  };

  // Add custom special instruction
  const handleAddInstruction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInstructionText.trim()) return;

    const newInst: SpecialInstruction = {
      id: `s-${Date.now()}`,
      type: 'general',
      text: newInstructionText.trim()
    };

    setInstructions(prev => [...prev, newInst]);
    setNewInstructionText('');

    if (currentUser) {
      await safeSetDoc(`users/${currentUser.uid}/instructions`, newInst.id, { ...newInst, userId: currentUser.uid });
    }
  };

  const handleDeleteInstruction = async (id: string) => {
    const verified = await verifyActionPermission("delete instruction");
    if (!verified) return;

    setInstructions(prev => prev.filter(item => item.id !== id));

    if (currentUser) {
      await safeDeleteDoc(`users/${currentUser.uid}/instructions`, id);
    }
  };


  // Log savers
  const handleSaveEvent = async (eventPayload: Omit<BabyEvent, 'id' | 'timestamp'>) => {
    const newEvent: BabyEvent = {
      ...eventPayload,
      id: `e-${Date.now()}`,
      timestamp: Date.now()
    };
    setEvents(prev => [newEvent, ...prev]);

    if (currentUser) {
      await safeSetDoc(`users/${currentUser.uid}/events`, newEvent.id, { ...newEvent, userId: currentUser.uid });
    }
  };

  const handleSaveFood = async (foodPayload: Omit<FoodDiaryEntry, 'id' | 'timestamp'>) => {
    const newFood: FoodDiaryEntry = {
      ...foodPayload,
      id: `f-${Date.now()}`,
      timestamp: Date.now()
    };
    setFoods(prev => [newFood, ...prev]);

    if (currentUser) {
      await safeSetDoc(`users/${currentUser.uid}/foods`, newFood.id, { ...newFood, userId: currentUser.uid });
    }
  };

  const handleDeleteEvent = async (id: string) => {
    const verified = await verifyActionPermission("delete timeline event");
    if (!verified) return;

    setEvents(prev => prev.filter(e => e.id !== id));

    if (currentUser) {
      await safeDeleteDoc(`users/${currentUser.uid}/events`, id);
    }
  };

  const handleDeleteFood = async (id: string) => {
    const verified = await verifyActionPermission("delete food entry");
    if (!verified) return;

    setFoods(prev => prev.filter(f => f.id !== id));

    if (currentUser) {
      await safeDeleteDoc(`users/${currentUser.uid}/foods`, id);
    }
  };

  // --- Dynamic Stat Calculations ---
  
  // Foods filtered for chosen date
  const filteredFoods = foods.filter(f => f.date === selectedDate);
  const totalMealsLogged = filteredFoods.length;
  // Count of total favorites logged
  const totalNewFavorites = foods.filter(f => f.isFavorite).length;

  // Events filtered for chosen date
  const filteredEvents = events.filter(e => e.date === selectedDate);

  // Dynamic status parameters for selected day
  const feedings = filteredEvents.filter(e => e.type === 'feed');
  const sleepSessions = filteredEvents.filter(e => e.type === 'sleep');
  const diaperChanges = filteredEvents.filter(e => e.type === 'diaper');

  // Last actions based on overall events sorted by timestamp
  const getLatestEvent = (type: EventType) => {
    const match = [...events].filter(e => e.type === type).sort((a, b) => b.timestamp - a.timestamp);
    return match.length > 0 ? match[0] : null;
  };

  const latestFeed = getLatestEvent('feed');
  const latestSleep = getLatestEvent('sleep');
  const latestDiaper = getLatestEvent('diaper');

  // Wet & Dirty ratios
  const diaperWetCount = diaperChanges.filter(d => d.isWet).length;
  const diaperDirtyCount = diaperChanges.filter(d => d.isDirty).length;

  const getGoalProgress = (goal: DailyGoal) => {
    switch (goal.category) {
      case 'feed_oz':
        return filteredEvents
          .filter(evt => evt.type === 'feed' && evt.amountOz !== undefined)
          .reduce((sum, evt) => sum + (evt.amountOz || 0), 0);
      case 'sleep_minutes':
        return filteredEvents
          .filter(evt => evt.type === 'sleep' && evt.durationMinutes !== undefined)
          .reduce((sum, evt) => sum + (evt.durationMinutes || 0), 0);
      case 'diapas_wet':
        return filteredEvents
          .filter(evt => evt.type === 'diaper' && evt.isWet === true)
          .length;
      case 'diapas_dirty':
        return filteredEvents
          .filter(evt => evt.type === 'diaper' && evt.isDirty === true)
          .length;
      case 'custom':
      default:
        return goal.manualProgress?.[selectedDate] || 0;
    }
  };

  const getGoalProgressForDate = (goal: DailyGoal, dateStr: string) => {
    const dayEvents = events.filter(e => e.date === dateStr);
    switch (goal.category) {
      case 'feed_oz':
        return dayEvents
          .filter(evt => evt.type === 'feed' && evt.amountOz !== undefined)
          .reduce((sum, evt) => sum + (evt.amountOz || 0), 0);
      case 'sleep_minutes':
        return dayEvents
          .filter(evt => evt.type === 'sleep' && evt.durationMinutes !== undefined)
          .reduce((sum, evt) => sum + (evt.durationMinutes || 0), 0);
      case 'diapas_wet':
        return dayEvents
          .filter(evt => evt.type === 'diaper' && evt.isWet === true)
          .length;
      case 'diapas_dirty':
        return dayEvents
          .filter(evt => evt.type === 'diaper' && evt.isDirty === true)
          .length;
      case 'custom':
      default:
        return goal.manualProgress?.[dateStr] || 0;
    }
  };

  const getLast7Days = (endDateStr: string): string[] => {
    const dates: string[] = [];
    const parts = endDateStr.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    for (let i = 6; i >= 0; i--) {
      const d = new Date(year, month, day - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      dates.push(`${yyyy}-${mm}-${dd}`);
    }
    return dates;
  };

  return (
    <>
      {/* Biometric Guard Block */}
      {isAppLocked && (
        <div className="fixed inset-0 min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-neutral-800 dark:text-slate-100 transition-colors duration-300 z-[9999]">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-6 animate-scaleUp">
            <div className="space-y-2">
              <h1 className="font-sans font-extrabold text-2xl text-primary dark:text-sky-400">BabyPulse</h1>
              <p className="text-[10px] text-neutral-400 dark:text-slate-500 font-semibold uppercase tracking-wider">Pediatric Diary Guard</p>
            </div>

            <div className="flex flex-col items-center justify-center py-6">
              <button
                type="button"
                onClick={handleUnlockWithBiometrics}
                className={`relative w-24 h-24 rounded-full flex items-center justify-center border-2 border-dashed duration-300 focus:outline-none cursor-pointer ${
                  isScanning 
                    ? 'border-primary bg-primary/10 animate-pulse scale-105' 
                    : 'border-neutral-200 dark:border-slate-800 bg-neutral-50 dark:bg-slate-950 hover:border-primary/50 hover:bg-neutral-100/50 dark:hover:bg-slate-800/20'
                }`}
                title="Scan Fingerprint"
              >
                {isScanning && (
                  <div className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-75"></div>
                )}
                {/* SVG Fingerprint */}
                <svg className={`w-12 h-12 duration-200 ${isScanning ? 'text-primary scale-110' : 'text-neutral-500 dark:text-slate-400'}`} fill="none" opacity="0.9" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0-1.105-.895-2-2-2s-2 .895-2 2a4 4 0 004 4m0 0a4 4 0 004-4m-4 4v5m-4.5-9a6.5 6.5 0 0113 0v1.5a1.5 1.5 0 003 0V11a9.5 9.5 0 10-19 0v1.5a1.5 1.5 0 003 0V11z" />
                </svg>
              </button>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleUnlockWithBiometrics}
                disabled={isScanning || !biometricCredentialId}
                className={`w-full py-3 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 duration-150 cursor-pointer ${
                  biometricCredentialId 
                    ? 'bg-primary text-white hover:bg-primary/95 shadow-sm' 
                    : 'bg-neutral-200 dark:bg-slate-800 text-neutral-400 dark:text-slate-500 cursor-not-allowed'
                }`}
              >
                {isScanning ? 'Unlocking Session...' : biometricCredentialId ? 'Scan Fingerprint' : 'Enroll Fingerprint in Settings'}
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setIsAppLocked(false);
                  showToast("Sandbox demo bypass complete. Access granted!", "success");
                }}
                className="w-full py-2.5 border border-neutral-250 dark:border-slate-800 hover:bg-neutral-100 dark:hover:bg-slate-800/60 font-bold text-[11px] rounded-xl text-neutral-600 dark:text-slate-400 transition-all cursor-pointer"
              >
                Bypass Security (Iframe Safe Mode)
              </button>
            </div>

            <div className="border-t border-neutral-100 dark:border-slate-800/80 pt-4 space-y-3">
              <p className="text-[10px] text-neutral-400 dark:text-slate-500">
                {biometricCredentialId 
                  ? "No physical biometric scanner? Type backup PIN to authorize."
                  : "Setup biometric authorization in Settings once logged in."}
              </p>

              <form onSubmit={handlePasscodeSubmit} className="flex gap-2">
                <input
                  type="password"
                  placeholder="Backup PIN (2810 / 1234)"
                  value={passcode}
                  onChange={(e) => {
                    setPasscode(e.target.value);
                    setPasscodeError(null);
                  }}
                  className="flex-1 text-center bg-neutral-100 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-xl py-1.5 px-3 text-xs focus:outline-none focus:border-primary text-neutral-800 dark:text-slate-100"
                />
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-neutral-200 dark:bg-slate-800 hover:bg-neutral-300 dark:hover:bg-slate-700 text-neutral-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Unlock
                </button>
              </form>
              {passcodeError && (
                <p className="text-[10px] text-red-500 font-medium">{passcodeError}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Animated Sliding Toast notifications */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[99999] w-full max-w-sm px-4 animate-scaleUp">
          <div className={`p-3 rounded-2xl shadow-xl flex items-center gap-3 border ${
            toast.type === 'success' 
              ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-350 border-emerald-200 dark:border-emerald-900' 
              : toast.type === 'error'
              ? 'bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-350 border-red-200 dark:border-red-900'
              : 'bg-indigo-50 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-350 border-indigo-200 dark:border-indigo-900'
          }`}>
            <span className="text-sm shrink-0">
              {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}
            </span>
            <p className="text-xs font-semibold leading-snug">{toast.message}</p>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 pb-32 text-neutral-800 dark:text-slate-100 antialiased flex flex-col justify-between transition-colors duration-300">
        
        {/* Dynamic Header */}
        <header className="fixed top-0 w-full z-40 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-b border-neutral-100 dark:border-slate-800 shadow-sm transition-transform">
          <div className="flex justify-between items-center px-3 sm:px-6 h-16 max-w-2xl mx-auto w-full">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary-light/50 overflow-hidden border border-white dark:border-slate-800 shadow-sm shrink-0">
                <img 
                  alt="Baby profile" 
                  className="w-full h-full object-cover" 
                  src={activeTab === 'care' ? AVATAR_URLS.briefing : activeTab === 'trends' ? AVATAR_URLS.analytics : AVATAR_URLS.smiling} 
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap">
                  <h1 className="font-sans font-bold text-sm sm:text-lg tracking-tight text-primary dark:text-sky-450 truncate">BabyPulse</h1>
                  {currentUser ? (
                    <button
                      type="button"
                      onClick={() => setShowSettings(true)}
                      className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-450 hover:scale-105 duration-100 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer shrink-0"
                      title={`Synced to ${currentUser.email}`}
                    >
                      <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="hidden min-[400px]:inline">Cloud Active</span>
                      <span className="min-[400px]:hidden">Active</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowSettings(true)}
                      className="bg-neutral-150 dark:bg-slate-800 text-neutral-500 dark:text-slate-450 hover:bg-neutral-200 dark:hover:bg-slate-700 text-[9px] font-bold px-2 py-0.5 rounded-full cursor-pointer flex items-center gap-1 shrink-0"
                      title="Using local diary store. Connect to Google to secure."
                    >
                      <span className="hidden min-[400px]:inline">Offline Mode</span>
                      <span className="min-[400px]:hidden">Offline</span>
                    </button>
                  )}
                  {showEventsSyncIndicator && (
                    <span 
                      className="bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-400 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-sky-200/50 dark:border-sky-850 animate-pulse shrink-0"
                      title="Local diaper, feeding, and sleep diaries updated via background Google Sync!"
                    >
                      <span className="w-1 h-1 rounded-full bg-sky-500 animate-pulse"></span>
                      <span className="hidden min-[435px]:inline">Sync Success</span>
                      <span className="min-[435px]:hidden">Synced</span>
                    </span>
                  )}
                </div>
                <p className="text-[9px] sm:text-[10px] text-neutral-400 dark:text-slate-400 font-semibold uppercase tracking-wider">{babyName}'s Diary</p>
              </div>
            </div>
 
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button 
              type="button"
              onClick={() => setShowDownloadModal(true)}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-sky-50 dark:bg-sky-955/40 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-600 dark:text-sky-450 hover:text-sky-800 dark:hover:text-sky-300 transition-colors border border-sky-100/50 dark:border-sky-900/30 font-bold shrink-0 relative"
              title="Download Android App"
            >
              <Smartphone size={16} className="sm:size-[18px]" />
              {deferredPrompt && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
              )}
            </button>
            <button 
              type="button"
              onClick={() => setShowTutorial(true)}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 transition-colors border border-emerald-100/50 dark:border-emerald-900/30 font-bold shrink-0"
              title="Quick Tour Help Tutorial"
            >
              <HelpCircle size={16} className="sm:size-[18px]" />
            </button>
            <button 
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-neutral-50 dark:bg-slate-800 hover:bg-neutral-100 dark:hover:bg-slate-700 text-neutral-500 dark:text-slate-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors shrink-0"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun size={16} className="sm:size-[18px]" /> : <Moon size={16} className="sm:size-[18px]" />}
            </button>
            <button 
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-neutral-50 dark:bg-slate-800 hover:bg-neutral-100 dark:hover:bg-slate-700 text-neutral-500 dark:text-slate-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors shrink-0"
              title="Setting baby information"
            >
              <Settings size={16} className="sm:size-[18px]" />
            </button>
          </div>
        </div>
      </header>

      {/* Settings Modal Bar (In-app overlay) */}
      {showSettings && (
        <div className="fixed inset-0 bg-neutral-950/40 z-50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-neutral-200 dark:border-slate-800 max-w-md w-full space-y-4 animate-scaleUp max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base text-neutral-800 dark:text-slate-100">BabyPulse Diaries Settings</h3>
                <p className="text-[10px] text-neutral-400 dark:text-slate-550">Configure Google Sync & Device Biometrics</p>
              </div>
              <button onClick={() => setShowSettings(false)} className="text-neutral-400 hover:text-neutral-700 dark:text-slate-400 dark:hover:text-slate-200">
                <X size={18} />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Profile Details */}
              <div className="bg-neutral-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-neutral-200/50 dark:border-slate-800/80 space-y-3">
                <h4 className="text-[10px] uppercase font-bold text-neutral-500 dark:text-slate-400 tracking-wider">Baby Information</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 dark:text-slate-500 mb-1">Child Name</label>
                    <input 
                      type="text" 
                      value={babyName} 
                      onChange={(e) => setBabyName(e.target.value)}
                      className="w-full border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-neutral-800 dark:text-slate-100 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-primary"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 dark:text-slate-500 mb-1">Birth Date</label>
                    <input 
                      type="date" 
                      value={babyDob} 
                      onChange={(e) => setBabyDob(e.target.value)}
                      className="w-full border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-neutral-800 dark:text-slate-100 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Google Account Security */}
              <div className="bg-neutral-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-neutral-200/50 dark:border-slate-800/80 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] uppercase font-bold text-neutral-500 dark:text-slate-400 tracking-wider">Cloud Storage (Google Sync)</h4>
                  {currentUser ? (
                    <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-450 font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Cloud Synced
                    </span>
                  ) : (
                    <span className="text-[9px] bg-neutral-200 dark:bg-slate-800 text-neutral-500 dark:text-slate-400 font-bold px-1.5 py-0.5 rounded-full">
                      Offline Mode
                    </span>
                  )}
                </div>

                {currentUser ? (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 duration-150 p-2.5 rounded-xl border border-neutral-200/30 dark:border-slate-800/40">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary dark:text-sky-400 flex items-center justify-center font-bold text-xs">
                        {currentUser.email?.[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold text-neutral-750 dark:text-slate-205 truncate">
                          {currentUser.displayName || "Google User"}
                        </p>
                        <p className="text-[9px] text-neutral-400 truncate">
                          {currentUser.email}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleGoogleLogout}
                      className="w-full text-center py-2 bg-neutral-250 dark:bg-slate-800/85 text-neutral-700 dark:text-slate-350 hover:bg-neutral-300 dark:hover:bg-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                    >
                      Disconnect Google Account
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <p className="text-[10px] text-neutral-400">
                      Synchronize your baby's logs across devices. All data is securely locked under your personal Google account in Firebase Firestore.
                    </p>
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      className="w-full flex items-center justify-center gap-2 py-2 bg-sky-450 dark:bg-sky-500 hover:bg-sky-500 dark:hover:bg-sky-550 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer"
                    >
                      <svg className="w-4.5 h-4.5 bg-white p-0.5 rounded-full" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.77c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      Connect with Google Account
                    </button>
                  </div>
                )}

                {/* Custom Firebase Expansion */}
                <div className="pt-2 border-t border-neutral-200/20 dark:border-slate-800/25 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setShowCustomFirebase(!showCustomFirebase)}
                    className="text-[9px] text-sky-500 dark:text-sky-400 hover:underline flex items-center gap-1 font-semibold outline-none focus:outline-none"
                  >
                    ⚙️ {localStorage.getItem('babypulse_custom_firebase_config') ? 'Modify Custom Firebase Config' : 'Setup Custom Firebase (for Vercel deployment)'}
                  </button>

                  {showCustomFirebase && (
                    <div className="mt-2 p-2.5 bg-white dark:bg-slate-900 rounded-xl space-y-2 border border-neutral-200/45 dark:border-slate-800/40">
                      <p className="text-[9px] leading-normal text-neutral-400 dark:text-slate-500">
                        Paste your Firebase Web App credentials JSON configuration below to host Google Sign-In & cloud storage on your own Firebase database. Ensure you add <span className="font-mono text-neutral-750 dark:text-slate-200 font-bold">{window.location.hostname}</span> in Firebase console Authorized Domains list.
                      </p>
                      <textarea
                        rows={5}
                        value={customFirebaseJson}
                        onChange={(e) => setCustomFirebaseJson(e.target.value)}
                        placeholder={`{\n  "apiKey": "AIzaSy...",\n  "authDomain": "...",\n  "projectId": "...",\n  "storageBucket": "...",\n  "messagingSenderId": "...",\n  "appId": "..."\n}`}
                        className="w-full text-[9px] font-mono border border-neutral-200 dark:border-slate-800 bg-neutral-50 dark:bg-slate-950 text-neutral-800 dark:text-slate-100 rounded-lg p-2 focus:outline-none focus:border-sky-450"
                      />
                      <div className="flex gap-2 justify-end">
                        {localStorage.getItem('babypulse_custom_firebase_config') && (
                          <button
                            type="button"
                            onClick={async () => {
                              const confirmReset = await customConfirm(
                                "Reset Settings",
                                "Are you sure you want to restore the default AI Studio database project config? All custom data will switch back to local offline-only or standard developer session.",
                                "Reset Config",
                                "Cancel"
                              );
                              if (confirmReset) {
                                localStorage.removeItem('babypulse_custom_firebase_config');
                                showToast("Default configuration restored. Reloading page...", "info");
                                setTimeout(() => window.location.reload(), 1005);
                              }
                            }}
                            className="px-2 py-1 text-[9px] font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-md transition-colors"
                          >
                            Reset Custom
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            try {
                              if (!customFirebaseJson.trim()) {
                                localStorage.removeItem('babypulse_custom_firebase_config');
                                showToast("Config cleared! Reloading...", "info");
                                setTimeout(() => window.location.reload(), 1000);
                                return;
                              }
                              const parsed = JSON.parse(customFirebaseJson);
                              if (!parsed.apiKey || !parsed.projectId) {
                                showToast("Invalid configuration syntax. Must contain at least 'apiKey' and 'projectId'.", "error");
                                return;
                              }
                              localStorage.setItem('babypulse_custom_firebase_config', JSON.stringify(parsed, null, 2));
                              showToast("Custom project configuration loaded! Reloading...", "success");
                              setTimeout(() => window.location.reload(), 1111);
                            } catch (e) {
                              showToast("JSON format parsing error. Please check your config content format syntax.", "error");
                            }
                          }}
                          className="px-2 py-1 rounded-md bg-sky-500 hover:bg-sky-550 text-white font-bold text-[9px] transition-colors"
                        >
                          Save & Reload
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Secure Cloud Sync Gateway Settings */}
                <div className="pt-2 border-t border-neutral-200/20 dark:border-slate-800/25 mt-1.5 text-left">
                  <button
                    type="button"
                    onClick={() => setShowGatewaySettings(!showGatewaySettings)}
                    className="text-[9px] text-sky-500 dark:text-sky-400 hover:underline flex items-center gap-1 font-semibold outline-none focus:outline-none"
                  >
                    ⚡ {showGatewaySettings ? 'Hide Cloud Sync Gateway Overrides' : 'Setup Cloud Sync Gateway (bypasses 404 / Page Not Found on Vercel)'}
                  </button>

                  {showGatewaySettings && (
                    <div className="mt-2 p-2.5 bg-white dark:bg-slate-900 rounded-xl space-y-2.5 border border-neutral-200/45 dark:border-slate-800/40">
                      <p className="text-[9px] leading-normal text-neutral-400 dark:text-slate-500 font-medium">
                        Secure Sync delegates authentication using an authorized app container window so Google Login runs without "Page Not Found/404" errors on Vercel or custom domains.
                      </p>
                      
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-neutral-500 dark:text-slate-450 block">Select Gateway Server Routing Mode:</label>
                        
                        {/* Option 1: Active Dev Workspace */}
                        <button
                          type="button"
                          onClick={() => {
                            setGatewayMode('dev');
                            localStorage.setItem('babypulse_gateway_mode', 'dev');
                            showToast("Switched to Active Dev Gateway", "success");
                          }}
                          className={`w-full text-left p-2 rounded-lg border flex flex-col gap-0.5 pointer-events-auto cursor-pointer transition-all ${
                            gatewayMode === 'dev' 
                              ? 'border-sky-500 bg-sky-500/5 dark:bg-sky-500/10' 
                              : 'border-neutral-200 dark:border-slate-800 bg-neutral-50/50 dark:bg-slate-950/30'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-neutral-700 dark:text-slate-200">🟢 Active Dev Workspace (Recommended)</span>
                            {gatewayMode === 'dev' && <span className="text-[9px] font-bold text-sky-500">Active</span>}
                          </div>
                          <p className="text-[8px] text-neutral-450">
                            Loads authorization dynamic popup from your active builder instance (https://ais-dev-vusuvyh2idkdtdothaxckf-4315933380.asia-east1.run.app). Perfect for testing!
                          </p>
                        </button>

                        {/* Option 2: Shared App/Preview Link */}
                        <button
                          type="button"
                          onClick={() => {
                            setGatewayMode('shared');
                            localStorage.setItem('babypulse_gateway_mode', 'shared');
                            showToast("Switched to Shared App Gateway", "success");
                          }}
                          className={`w-full text-left p-2 rounded-lg border flex flex-col gap-0.5 pointer-events-auto cursor-pointer transition-all ${
                            gatewayMode === 'shared' 
                              ? 'border-sky-500 bg-sky-500/5 dark:bg-sky-500/10' 
                              : 'border-neutral-200 dark:border-slate-800 bg-neutral-50/50 dark:bg-slate-950/30'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-neutral-700 dark:text-slate-200">🌐 Shared App Preview Gateway</span>
                            {gatewayMode === 'shared' && <span className="text-[9px] font-bold text-sky-500">Active</span>}
                          </div>
                          <p className="text-[8px] text-neutral-400">
                            Uses the public sharing link (https://ais-pre-vusuvyh2idkdtdothaxckf-4315933380.asia-east1.run.app). App must be shared in AI Studio first.
                          </p>
                        </button>

                        {/* Option 3: Custom Domain Input */}
                        <div className={`p-2 rounded-lg border space-y-1.5 transition-all text-left ${
                          gatewayMode === 'custom' 
                            ? 'border-sky-500 bg-sky-500/5 dark:bg-sky-500/10' 
                            : 'border-neutral-200 dark:border-slate-800 bg-neutral-50/50 dark:bg-slate-950/30'
                        }`}>
                          <button
                            type="button"
                            onClick={() => {
                              setGatewayMode('custom');
                              localStorage.setItem('babypulse_gateway_mode', 'custom');
                            }}
                            className="w-full text-left flex items-center justify-between font-bold text-[10px] text-neutral-700 dark:text-slate-205 focus:outline-none pointer-events-auto cursor-pointer font-sans"
                          >
                            <span>🔧 Custom Gateway URL Gateway</span>
                            {gatewayMode === 'custom' && <span className="text-[9px] font-bold text-sky-500">Active</span>}
                          </button>
                          
                          {gatewayMode === 'custom' && (
                            <div className="space-y-1 pt-1">
                              <input
                                type="text"
                                placeholder="https://..."
                                value={customGatewayUrl}
                                onChange={(e) => {
                                   setCustomGatewayUrl(e.target.value);
                                   localStorage.setItem('babypulse_custom_gateway_url', e.target.value);
                                }}
                                className="w-full text-[9px] font-mono border border-neutral-150 dark:border-slate-850 p-1.5 rounded-md bg-white dark:bg-slate-950 text-neutral-750 dark:text-slate-200 focus:outline-none focus:border-sky-500"
                              />
                              <p className="text-[7.5px] text-neutral-400 leading-normal">
                                Specify full HTTPS URL to another proxy gateway instance handling postMessage authentications securely.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Biometrics Device Lock */}
              <div className="bg-neutral-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-neutral-200/50 dark:border-slate-800/80 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] uppercase font-bold text-neutral-500 dark:text-slate-400 tracking-wider">Fingerprint Protection</h4>
                  {isBiometricsSupported ? (
                    <span className="text-[9px] bg-sky-100 dark:bg-sky-950 text-sky-650 dark:text-sky-350 font-bold px-1.5 py-0.5 rounded-full">
                      Supported
                    </span>
                  ) : (
                    <span className="text-[9px] bg-neutral-200 dark:bg-slate-800 text-neutral-500 dark:text-slate-400 font-bold px-1.5 py-0.5 rounded-full">
                      Simulated Mode
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] text-neutral-400">
                    Use your device's biometric scanner (Touch ID, Face ID, or Windows Hello) to restrict access to logs, reports, and deletes.
                  </p>

                  <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-neutral-200/30 dark:border-slate-800/40">
                    <div>
                      <p className="text-[11px] font-semibold text-neutral-750 dark:text-slate-200">Require Fingerprint Lock</p>
                      <p className="text-[9px] text-neutral-400">Scan biometric on app launch & actions</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!biometricCredentialId) {
                          handleRegisterBiometrics();
                        } else {
                          setIsBiometricLockEnabled(!isBiometricLockEnabled);
                        }
                      }}
                      className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isBiometricLockEnabled && biometricCredentialId ? 'bg-primary' : 'bg-neutral-300 dark:bg-slate-800'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          isBiometricLockEnabled && biometricCredentialId ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2.5">
                    <span className="text-[10.5px] font-medium text-neutral-500 dark:text-slate-400">
                      {biometricCredentialId ? "✅ Enrolled on this Device" : "❌ Disenrolled / Setup Biometrics"}
                    </span>
                    <button
                      type="button"
                      onClick={handleRegisterBiometrics}
                      className="px-2.5 py-1 bg-primary text-white font-bold text-[10px] rounded-lg shadow-xs hover:bg-primary/95 cursor-pointer"
                    >
                      {biometricCredentialId ? "Re-enroll Fingerprint" : "Enroll Fingerprint"}
                    </button>
                  </div>
                </div>
              </div>

            </div>

            <button 
              onClick={async () => {
                setShowSettings(false);
                if (currentUser) {
                  await safeSetDoc('users', currentUser.uid, {
                    userId: currentUser.uid,
                    babyName,
                    babyDob,
                    isSleeping,
                    sleepStartTime
                  });
                }
                showToast("Settings saved and synced successfully!", "success");
              }}
              className="w-full py-2.5 bg-primary text-white font-semibold rounded-xl text-sm hover:bg-primary/95 shadow-sm cursor-pointer"
            >
              Apply Changes
            </button>
          </div>
        </div>
      )}

      {/* Main Canvas Segment */}
      <main className="flex-1 pt-24 px-6 max-w-2xl mx-auto w-full space-y-6">

        {/* --- Date Picker Section (Global except Trends/Analytics tab) --- */}
        {activeTab !== 'trends' && (
          <section className="animate-fadeIn">
            <div className="flex items-center justify-between bg-white rounded-2xl p-4 border border-cyan-50/10 shadow-[0_8px_24px_rgba(28,100,142,0.03)]">
              <button 
                onClick={() => handleShiftDate('prev')}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-neutral-50 text-neutral-500 hover:text-neutral-800 transition-colors"
               >
                <ChevronLeft size={20} />
              </button>
              <div className="text-center">
                <span className="font-bold font-sans text-stone-900 block text-base">
                  {selectedDate === getTodayDateString() ? 'Today' : getFormattedSelectedDate()}
                </span>
                <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider mt-0.5 block">{selectedDate}</span>
              </div>
              <button 
                onClick={() => handleShiftDate('next')}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-neutral-50 text-neutral-500 hover:text-neutral-800 transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </section>
        )}

        {/* --- Global Overdue Reminder Alert Banner --- */}
        {(() => {
          const overdue = schedules.filter(sched => {
            const isCompleted = sched.completedDates?.includes(selectedDate);
            if (isCompleted) return false;
            const schedMins = parseTimeToMinutes(sched.time, sched.ampm);
            return schedMins <= currentTotalMinutes;
          });
          if (overdue.length === 0) return null;
          return (
            <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 shadow-sm space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-700">
                  <Bell className="w-4 h-4 text-amber-500 animate-bounce" />
                  <span className="font-bold text-xs uppercase tracking-wider">Overdue Reminders ({overdue.length})</span>
                </div>
                <span className="text-[9px] bg-amber-100 text-amber-850 font-bold px-2 py-0.5 rounded-full uppercase">
                  Action Required Today
                </span>
              </div>
              <div className="divide-y divide-amber-150/50">
                {overdue.map(rem => (
                  <div key={rem.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 border-b border-amber-200/50 last:border-b-0 first:pt-0 last:pb-0">
                    <div>
                      <p className="font-bold text-xs text-amber-900">{rem.title}</p>
                      <p className="text-[10px] text-amber-600 mt-0.5">
                        Scheduled at <span className="font-mono font-bold">{rem.time} {rem.ampm}</span>
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="inline-flex rounded-lg shadow-sm border border-amber-200/40 divide-x divide-amber-200 bg-white">
                        <button
                          type="button"
                          onClick={() => handleSnoozeReminder(rem.id, 15)}
                          className="px-2.5 py-1.5 text-[9px] font-bold text-amber-800 hover:bg-amber-100 transition-colors uppercase outline-none rounded-l-lg"
                        >
                          Snooze 15m
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSnoozeReminder(rem.id, 30)}
                          className="px-2.5 py-1.5 text-[9px] font-bold text-amber-800 hover:bg-amber-100 transition-colors uppercase outline-none rounded-r-lg"
                        >
                          Snooze 30m
                        </button>
                      </div>
                      <button
                        onClick={() => handleToggleScheduleCompleted(rem.id)}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] px-3.5 py-1.5 rounded-xl transition-all shadow-sm flex items-center gap-1 shrink-0"
                      >
                        <Check size={11} className="stroke-[3px]" /> Complete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* ----------------- TAB 1: TODAY / OVERVIEW ----------------- */}
        {activeTab === 'today' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Countdown card */}
            <section className={`rounded-[32px] shadow-[0_8px_32px_rgba(28,100,142,0.04)] p-6 relative overflow-hidden border transition-all duration-1000 ${
              isSleeping 
                ? 'pulse-background' 
                : 'bg-gradient-to-br from-white to-sky-50/20 border-white/60'
            }`}>
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-2xl pointer-events-none"></div>
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-[#beefbf]/10 rounded-full blur-2xl pointer-events-none"></div>
              
              <div className="relative z-10 flex flex-col items-center text-center space-y-3 py-2">
                <div className="inline-flex items-center bg-primary-light text-[#00496d] px-3 py-1.5 rounded-full text-xs font-semibold">
                  <Moon size={13} className="mr-1 fill-primary text-primary" />
                  Routine Monitor
                </div>

                {isSleeping ? (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-neutral-500">Alex has been sleeping for</p>
                    <h2 className="text-4xl font-bold tracking-tight text-[#1c648e] font-mono subtle-vibration">
                      {currentSleepElapsedStr}
                    </h2>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <h2 className="text-4.5xl text-4xl font-bold tracking-tight text-primary font-sans">45m</h2>
                    <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">until next predicted nap</p>
                  </div>
                )}

                {/* Progress bar */}
                <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden mt-4">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${isSleeping ? 'bg-secondary animate-pulse w-[100%]' : 'bg-primary w-[65%]'}`}
                  ></div>
                </div>

                <button 
                  type="button"
                  onClick={handleToggleSleep}
                  className={`mt-4 px-6 py-2 rounded-full text-xs font-bold transition-all ${
                    isSleeping 
                      ? 'bg-secondary hover:bg-secondary/90 text-white shadow-md' 
                      : 'bg-primary hover:bg-primary/95 text-white shadow-md'
                  }`}
                >
                  {isSleeping ? 'Wake Alex up ☀️' : 'Put Alex to Sleep 💤'}
                </button>
              </div>
            </section>

            {/* Quick action grid */}
            <section className="space-y-3">
              <h3 className="font-bold text-sm uppercase tracking-wider text-neutral-500 px-1">Quick Log</h3>
              <div className="grid grid-cols-3 gap-3">
                
                {/* Sleep button */}
                <button 
                  onClick={() => { setAddEventType('sleep'); setIsAddEventOpen(true); }}
                  className="flex flex-col items-center justify-center bg-white shadow-sm hover:shadow border border-neutral-100 rounded-3xl p-4 transition-all hover:scale-97 min-h-[110px]"
                >
                  <div className="w-12 h-12 rounded-full bg-primary-light/40 flex items-center justify-center text-primary mb-2">
                    <Moon className="w-5 h-5 fill-primary text-primary" />
                  </div>
                  <span className="text-xs font-bold text-neutral-800">Sleep</span>
                </button>

                {/* Feed button */}
                <button 
                  onClick={() => { setAddEventType('feed'); setIsAddEventOpen(true); }}
                  className="flex flex-col items-center justify-center bg-white shadow-sm hover:shadow border border-neutral-100 rounded-3xl p-4 transition-all hover:scale-97 min-h-[110px]"
                >
                  <div className="w-12 h-12 rounded-full bg-[#beefbf]/30 flex items-center justify-center text-secondary mb-2">
                    <GlassWater className="w-5 h-5 fill-secondary text-secondary" />
                  </div>
                  <span className="text-xs font-bold text-neutral-800">Feed</span>
                </button>

                {/* Diaper button */}
                <button 
                  onClick={() => { setAddEventType('diaper'); setIsAddEventOpen(true); }}
                  className="flex flex-col items-center justify-center bg-white shadow-sm hover:shadow border border-neutral-100 rounded-3xl p-4 transition-all hover:scale-97 min-h-[110px]"
                >
                  <div className="w-12 h-12 rounded-full bg-[#ffe083]/30 flex items-center justify-center text-tertiary mb-2">
                    <Activity className="w-5 h-5 text-tertiary" />
                  </div>
                  <span className="text-xs font-bold text-neutral-800">Diaper</span>
                </button>

              </div>
            </section>

            {/* Interactive countdown feeding timer */}
            <FeedingTimer onSave={handleSaveEvent} showToast={showToast} />

            {/* Recent Activity summary */}
            <section className="space-y-3">
              <h3 className="font-bold text-sm uppercase tracking-wider text-neutral-500 px-1">Recent Activity</h3>
              {filteredEvents.length > 0 ? (
                (() => {
                  const sorted = [...filteredEvents].sort((a,b) => b.timestamp - a.timestamp);
                  const latest = sorted[0];
                  return (
                    <div className="bg-white rounded-3xl p-5 border border-neutral-100 shadow-[0_8px_24px_rgba(28,100,142,0.02)] flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white ${
                          latest.type === 'sleep' ? 'bg-primary' :
                          latest.type === 'feed' ? 'bg-secondary' : 'bg-tertiary'
                        }`}>
                          {latest.type === 'sleep' && <Moon size={20} className="fill-white" />}
                          {latest.type === 'feed' && <GlassWater size={20} />}
                          {latest.type === 'diaper' && <Activity size={20} />}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-neutral-800">{latest.title}</p>
                          <p className="text-[11px] text-neutral-500 mt-0.5">
                            {latest.type === 'feed' && `${latest.amountMl}ml · ${latest.temp}`}
                            {latest.type === 'sleep' && `Slept ${Math.floor((latest.durationMinutes || 0)/60)}h ${(latest.durationMinutes || 0)%60}m`}
                            {latest.type === 'diaper' && `${latest.isWet ? 'Wet' : ''}${latest.isWet && latest.isDirty ? ' / ' : ''}${latest.isDirty ? 'Dirty' : ''}`}
                            {latest.type === 'care' && latest.notes}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-primary">{latest.time} {latest.ampm}</p>
                        <button 
                          onClick={() => handleDeleteEvent(latest.id)}
                          className="text-[10px] text-red-500 hover:underline mt-1.5 font-semibold flex items-center gap-1 justify-end ml-auto"
                        >
                          <Trash2 size={10} /> Delete
                        </button>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="bg-white p-6 rounded-3xl border border-dashed border-neutral-200 text-center text-neutral-400 text-xs italic">
                  No activities record logged for today. Tap buttons above to quick log!
                </div>
              )}
            </section>

            {/* Daily Goals Tracker section */}
            <section className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-[0_8px_24px_rgba(28,100,142,0.02)] space-y-4">
              <div className="flex justify-between items-center border-b border-neutral-50 pb-3">
                <div>
                  <h3 className="font-bold text-sm text-neutral-800 flex items-center gap-2">
                    <Target className="text-secondary" size={18} />
                    Daily Goals Tracker
                  </h3>
                  <p className="text-[11px] text-neutral-500">Track and meet routines for {selectedDate === getTodayDateString() ? 'today' : getFormattedSelectedDate()}</p>
                </div>
                
                <button
                  type="button"
                  onClick={() => setShowAddGoalForm(!showAddGoalForm)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:text-opacity-80 transition-all bg-primary-light/50 px-3 py-1.5 rounded-xl border border-primary/10"
                >
                  <PlusCircle size={13} /> {showAddGoalForm ? 'Close' : 'Add Goal'}
                </button>
              </div>

              {/* Add Goal Form */}
              {showAddGoalForm && (
                <form onSubmit={handleAddGoal} className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200/60 space-y-3 animate-fadeIn">
                  <div className="flex justify-between items-center text-xs font-bold text-neutral-700 border-b border-neutral-100 pb-1.5">
                    <span>Configure Daily Goal</span>
                    <button type="button" onClick={() => setShowAddGoalForm(false)} className="text-neutral-400 hover:text-neutral-600">
                      <X size={14} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-neutral-400 uppercase mb-1">Goal Category</label>
                      <select
                        value={newGoalCategory}
                        onChange={(e) => setNewGoalCategory(e.target.value as GoalCategory)}
                        className="w-full bg-white border border-neutral-200 rounded-xl px-2.5 py-1.5 text-xs text-neutral-700 focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="feed_oz">🍼 Feed/Milk intake (oz)</option>
                        <option value="sleep_minutes">💤 Sleep / Nap duration (mins)</option>
                        <option value="diapas_wet">💦 Wet Diapers Count</option>
                        <option value="diapas_dirty">💩 Dirty Diapers Count</option>
                        <option value="custom">✨ Custom Manual Goal</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-neutral-400 uppercase mb-1">Goal Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Tummy Time Practice"
                        required
                        value={newGoalTitle}
                        onChange={(e) => setNewGoalTitle(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-xl px-2.5 py-1.5 text-xs text-neutral-700 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-neutral-400 uppercase mb-1">Daily Target</label>
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        required
                        value={newGoalTarget}
                        onChange={(e) => setNewGoalTarget(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-xl px-2.5 py-1.5 text-xs text-neutral-700 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-neutral-400 uppercase mb-1">Unit Label</label>
                      <input
                        type="text"
                        placeholder="e.g. oz, mins, times"
                        required
                        value={newGoalUnit}
                        onChange={(e) => setNewGoalUnit(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-xl px-2.5 py-1.5 text-xs text-neutral-700 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
                    <button
                      type="button"
                      onClick={() => setShowAddGoalForm(false)}
                      className="px-3 py-1.5 bg-neutral-200 text-neutral-700 font-bold text-[10px] rounded-lg hover:bg-neutral-300 active:scale-95 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-primary text-white font-bold text-[10px] rounded-lg hover:bg-opacity-90 active:scale-95 transition-all shadow-sm"
                    >
                      Save Goal
                    </button>
                  </div>
                </form>
              )}

              {/* Goal List */}
              <div className="space-y-3">
                {goals.map((goal) => {
                  const progress = getGoalProgress(goal);
                  const percent = goal.target > 0 ? Math.min(100, Math.round((progress / goal.target) * 100)) : 0;
                  const isCompleted = percent >= 100;

                  // Category themed progress colors
                  let fillClass = 'bg-[#1c648e]';
                  let iconBg = 'bg-primary-light/50';
                  if (goal.category === 'feed_oz') {
                    fillClass = 'bg-emerald-500';
                    iconBg = 'bg-emerald-50 text-emerald-600';
                  } else if (goal.category === 'sleep_minutes') {
                    fillClass = 'bg-blue-500';
                    iconBg = 'bg-blue-50 text-blue-600';
                  } else if (goal.category === 'diapas_wet') {
                    fillClass = 'bg-amber-500';
                    iconBg = 'bg-amber-50 text-amber-600';
                  } else if (goal.category === 'diapas_dirty') {
                    fillClass = 'bg-yellow-600';
                    iconBg = 'bg-yellow-50 text-yellow-750';
                  } else if (goal.category === 'custom') {
                    fillClass = 'bg-indigo-500';
                    iconBg = 'bg-indigo-50 text-indigo-600';
                  }

                  // 7-day trend calculations
                  const trend7Days = getLast7Days(selectedDate);
                  const trendValues = trend7Days.map(d => getGoalProgressForDate(goal, d));
                  
                  const trendAvg = trendValues.length > 0 ? (trendValues.reduce((a, b) => a + b, 0) / trendValues.length).toFixed(1) : '0';
                  const trendMax = Math.max(...trendValues, goal.target || 1);
                  const trendMin = Math.min(...trendValues, 0);
                  const trendRange = trendMax - trendMin;

                  const points = trendValues.map((val, i) => {
                    const x = (i / 6) * 100;
                    const y = trendRange === 0 ? 15 : 30 - ((val - trendMin) / trendRange) * 24 - 3;
                    return { x, y, val, date: trend7Days[i] };
                  });

                  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                  const areaD = `${pathD} L 100 30 L 0 30 Z`;

                  // Sparkline stroke matching category
                  let trendStrokeColor = '#1c648e';
                  if (goal.category === 'feed_oz') {
                    trendStrokeColor = '#10b981';
                  } else if (goal.category === 'sleep_minutes') {
                    trendStrokeColor = '#3b82f6';
                  } else if (goal.category === 'diapas_wet') {
                    trendStrokeColor = '#f59e0b';
                  } else if (goal.category === 'diapas_dirty') {
                    trendStrokeColor = '#ca8a04';
                  } else if (goal.category === 'custom') {
                    trendStrokeColor = '#6366f1';
                  }

                  return (
                    <div 
                      key={goal.id} 
                      className="bg-neutral-50/50 hover:bg-white dark:hover:bg-slate-900/60 p-4 rounded-2xl border border-neutral-105 dark:border-slate-850 hover:border-neutral-200/80 dark:hover:border-slate-700 hover:shadow-md transition-all duration-300 flex flex-col gap-2 relative group"
                    >
                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="absolute top-3 right-3 text-neutral-400 hover:text-red-500 dark:hover:text-red-400 bg-white dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-full shadow-md hover:shadow-lg transition-all duration-200 opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 hover:scale-110 active:scale-95 p-1.5 cursor-pointer z-10"
                        title="Delete Goal"
                      >
                        <Trash2 size={13} className="stroke-[2.5px]" />
                      </button>

                      <div className="flex justify-between items-center pr-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${iconBg}`}>
                            {goal.category === 'feed_oz' && <GlassWater size={14} />}
                            {goal.category === 'sleep_minutes' && <Moon size={14} />}
                            {goal.category === 'diapas_wet' && <Activity size={14} />}
                            {goal.category === 'diapas_dirty' && <Activity size={14} />}
                            {goal.category === 'custom' && <Target size={14} />}
                          </div>
                          <div>
                            <p className="font-bold text-xs text-neutral-800 flex items-center gap-1.5">
                              {goal.title}
                              {goal.category !== 'custom' && (
                                <span className="bg-[#1c648e]/5 text-[#1c648e] text-[9px] font-bold font-mono uppercase px-1.5 py-0.5 rounded-full scale-90">Auto</span>
                              )}
                            </p>
                            <p className="text-[10px] text-neutral-500 mt-0.5">
                              Progress: <strong className="text-neutral-850 font-mono">{progress}</strong> / {goal.target} <span className="text-[9px] uppercase font-semibold text-neutral-400">{goal.unit}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Manual Goals Step Controllers */}
                          {goal.category === 'custom' && (
                            <div className="flex items-center gap-1 bg-white border border-neutral-200 rounded-lg p-0.5 shadow-sm scale-90">
                              <button
                                type="button"
                                onClick={() => handleUpdateManualGoalProgress(goal.id, goal.unit === 'mins' ? -5 : -1)}
                                className="w-5 h-5 flex items-center justify-center bg-neutral-50 hover:bg-neutral-100 text-neutral-500 font-bold rounded"
                              >
                                -
                              </button>
                              <span className="text-[10px] font-bold font-mono text-neutral-700 px-1 py-0.5 min-w-[14px] text-center">
                                {goal.unit === 'mins' ? '5' : '1'}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateManualGoalProgress(goal.id, goal.unit === 'mins' ? 5 : 1)}
                                className="w-5 h-5 flex items-center justify-center bg-neutral-50 hover:bg-neutral-100 text-neutral-500 font-bold rounded"
                              >
                                +
                              </button>
                            </div>
                          )}

                          {/* Visual Progress Ring */}
                          <div className="relative w-11 h-11 flex items-center justify-center shrink-0" title={`${percent}% Completed`}>
                            <svg className="w-full h-full -rotate-90 select-none" viewBox="0 0 36 36">
                              {/* Background Circle */}
                              <circle
                                cx="18"
                                cy="18"
                                r="15"
                                fill="none"
                                className="stroke-neutral-150 dark:stroke-slate-800"
                                strokeWidth="3"
                              />
                              {/* Glowing Active Ring */}
                              <circle
                                key={`ring-${percent}`}
                                cx="18"
                                cy="18"
                                r="15"
                                fill="none"
                                stroke="currentColor"
                                className={`transition-all duration-500 ease-out pop-on-change ${
                                  goal.category === 'feed_oz' ? 'text-emerald-500' :
                                  goal.category === 'sleep_minutes' ? 'text-blue-500' :
                                  goal.category === 'diapas_wet' ? 'text-amber-500' :
                                  goal.category === 'diapas_dirty' ? 'text-yellow-600 dark:text-yellow-500' :
                                  'text-indigo-500'
                                }`}
                                strokeWidth="3"
                                strokeDasharray="94.25"
                                strokeDashoffset={94.25 - (Math.min(100, percent) / 100) * 94.25}
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              {isCompleted ? (
                                <Check key={`check-${percent}`} size={12} className={`pop-on-change ${
                                  goal.category === 'feed_oz' ? 'text-emerald-600 dark:text-emerald-400' :
                                  goal.category === 'sleep_minutes' ? 'text-blue-600 dark:text-blue-400' :
                                  goal.category === 'diapas_wet' ? 'text-amber-600 dark:text-amber-300' :
                                  goal.category === 'diapas_dirty' ? 'text-yellow-650 dark:text-yellow-450' :
                                  'text-indigo-600 dark:text-indigo-400'
                                } stroke-[3.5px]`} />
                              ) : (
                                <span key={`label-${percent}`} className="text-[10px] font-extrabold font-mono text-neutral-600 dark:text-slate-300 pop-on-change">{percent}%</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Goal Progress bar background */}
                      <div className="w-full bg-neutral-100/80 h-1.5 rounded-full overflow-hidden flex">
                        <div 
                          style={{ width: `${percent}%` }}
                          className={`h-full rounded-full transition-all duration-300 ${fillClass}`}
                        />
                      </div>

                      {/* Sparkline trend representation */}
                      <div className="mt-1.5 pt-2 border-t border-neutral-100/40 flex items-center justify-between gap-4">
                        <div className="space-y-0.5">
                          <p className="text-[8.5px] font-bold text-neutral-400 uppercase tracking-wider">7-Day Trend</p>
                          <p className="text-[10px] text-neutral-500">
                            Avg: <span className="font-bold text-neutral-700 font-mono">{trendAvg}</span> <span className="text-[8px] text-neutral-400 uppercase font-semibold">{goal.unit}</span>
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Mini Sparkline svg */}
                          <div className="relative">
                            <svg className="w-24 h-7 overflow-visible" viewBox="0 0 100 30" preserveAspectRatio="none">
                              <defs>
                                <linearGradient id={`grad-${goal.id}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor={trendStrokeColor} stopOpacity={0.2} />
                                  <stop offset="100%" stopColor={trendStrokeColor} stopOpacity={0.0} />
                                </linearGradient>
                              </defs>
                              
                              {/* Filled path under line */}
                              <path d={areaD} fill={`url(#grad-${goal.id})`} />
                              
                              {/* Sparkline stroke */}
                              <path d={pathD} fill="none" stroke={trendStrokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              
                              {/* Highlight dots */}
                              {points.map((p, pIdx) => (
                                <g key={pIdx} className="group/dot">
                                  <circle 
                                    cx={p.x} 
                                    cy={p.y} 
                                    r={pIdx === 6 ? "2.5" : "1.5"} 
                                    fill={pIdx === 6 ? '#ffffff' : trendStrokeColor} 
                                    stroke={pIdx === 6 ? trendStrokeColor : 'none'} 
                                    strokeWidth={pIdx === 6 ? 1.5 : 0}
                                    style={{ cursor: 'pointer' }}
                                  />
                                  <title>
                                    {p.date}: {p.val} {goal.unit}
                                  </title>
                                </g>
                              ))}
                            </svg>
                          </div>

                          {/* Numeric Mini labels */}
                          <div className="flex flex-col text-[8px] font-mono font-bold text-neutral-400 justify-between h-7 text-right min-w-[20px] select-none border-l border-neutral-100/60 pl-1.5 leading-none">
                            <span className="text-neutral-500" title="Daily Maximum">{trendMax}</span>
                            <span className="text-neutral-300" title="Daily Minimum">{trendMin}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {goals.length === 0 && (
                  <div className="py-6 px-4 border border-dashed border-neutral-200 rounded-2xl text-center space-y-3">
                    <p className="text-xs text-neutral-400 italic">No daily goals configured for the tracker.</p>
                    <button
                      type="button"
                      onClick={() => setGoals(INITIAL_GOALS)}
                      className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#1c648e] bg-primary-light/50 px-3.5 py-1.5 rounded-lg border border-primary/20 hover:bg-primary-light transition-all shadow-sm"
                    >
                      ⚡ Load Default Goals
                    </button>
                  </div>
                )}
              </div>
            </section>

          </div>
        )}

        {/* ----------------- TAB 2: TIMELINE ----------------- */}
        {activeTab === 'timeline' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* List with vertical indicator line */}
            <section className="relative">
              {filteredEvents.length > 0 && (
                <div className="absolute left-6 top-4 bottom-0 w-0.5 bg-neutral-200 rounded-full"></div>
              )}

              <div className="space-y-5">
                {filteredEvents.length > 0 ? (
                  [...filteredEvents].sort((a,b) => b.timestamp - a.timestamp).map((evt) => (
                    <div key={evt.id} className="flex gap-4 group animate-fadeIn">
                      
                      {/* Timeline Icon Badge */}
                      <div className="flex flex-col items-center pt-2">
                        <div className={`w-12 h-12 rounded-full border-2 border-white flex items-center justify-center z-10 shadow-sm transition-transform group-hover:scale-105 ${
                          evt.type === 'feed' ? 'bg-primary-light text-primary' :
                          evt.type === 'sleep' ? 'bg-neutral-200 text-neutral-700' :
                          evt.type === 'diaper' ? 'bg-tertiary-light text-tertiary' : 'bg-[#bbecbc]/70 text-[#25502c]'
                        }`}>
                          {evt.type === 'feed' && <GlassWater size={18} className="fill-current" />}
                          {evt.type === 'sleep' && <Moon size={18} className="fill-current" />}
                          {evt.type === 'diaper' && <Activity size={18} />}
                          {evt.type === 'care' && <Sun size={18} />}
                        </div>
                      </div>

                      {/* Card block */}
                      <div className="flex-grow bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-[0_8px_24px_rgba(28,100,142,0.02)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.15)] border border-neutral-100 dark:border-slate-800 relative overflow-hidden">
                        <button
                          onClick={() => handleDeleteEvent(evt.id)}
                          className="absolute top-4 right-4 text-neutral-300 dark:text-slate-600 hover:text-red-500 transition-colors"
                          title="Delete post log"
                        >
                          <Trash2 size={13} />
                        </button>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2 pr-6">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-sm text-neutral-800 dark:text-slate-100">{evt.title}</h4>
                            {evt.mood && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-50 dark:bg-emerald-950/45 text-emerald-700 dark:text-emerald-350 border border-emerald-100 dark:border-emerald-900/60 shadow-sm" title={`Mood: ${evt.mood}`}>
                                <span>{evt.mood === 'Happy' ? '😊' : evt.mood === 'Calm' ? '😌' : evt.mood === 'Fussing' ? '😕' : '😢'}</span>
                                <span className="text-[9px] font-bold">{evt.mood}</span>
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-neutral-500 dark:text-slate-400 font-bold bg-neutral-50 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                            {evt.time} {evt.ampm}
                          </span>
                        </div>

                        {evt.type === 'feed' && (
                          <div className="space-y-2">
                            <p className="text-xs text-neutral-600">{evt.feedType} bottle · {evt.temp}</p>
                            <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-2.5 py-1 rounded-full text-[10px] font-bold">
                              Size: {evt.amountOz} oz / {evt.amountMl} ml
                            </span>
                          </div>
                        )}

                        {evt.type === 'sleep' && (
                          <div className="space-y-2">
                            <p className="text-xs text-neutral-600">{evt.notes}</p>
                            <span className="inline-flex items-center gap-1.5 bg-neutral-100 text-neutral-600 px-2.5 py-1 rounded-full text-[10px] font-bold">
                              Duration: {Math.floor((evt.durationMinutes || 0) / 60)}h {(evt.durationMinutes || 0) % 60}m
                            </span>
                          </div>
                        )}

                        {evt.type === 'diaper' && (
                          <div className="space-y-2">
                            <p className="text-xs text-neutral-600">{evt.diaperNotes}</p>
                            <div className="flex gap-1.5">
                              {evt.isWet && (
                                <span className="bg-primary/10 text-primary font-bold text-[9px] uppercase px-2.5 py-0.5 rounded-full">Wet</span>
                              )}
                              {evt.isDirty && (
                                <span className="bg-tertiary-light text-tertiary font-bold text-[9px] uppercase px-2.5 py-0.5 rounded-full">Dirty</span>
                              )}
                            </div>
                          </div>
                        )}

                        {evt.type === 'care' && (
                          <p className="text-xs text-neutral-600">{evt.notes}</p>
                        )}

                      </div>

                    </div>
                  ))
                ) : (
                  <div className="bg-white p-12 rounded-3xl border border-dashed border-neutral-200 text-center">
                    <Baby className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                    <p className="text-sm font-bold text-neutral-500">No events logged on this date</p>
                    <p className="text-xs text-neutral-400 mt-1">Tap the float button below to record feeding, diaper, or nap event!</p>
                  </div>
                )}
              </div>
            </section>

          </div>
        )}

        {/* ----------------- TAB 3: SOLID FOOD DIARY ----------------- */}
        {activeTab === 'food' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Quick overview metric cards */}
            <section className="grid grid-cols-2 gap-4">
              
              <div className="bg-primary-light/40 rounded-3xl p-5 border border-white flex flex-col items-center justify-center text-center">
                <UtensilsCrossed size={18} className="text-primary mb-1" />
                <span className="text-xl font-bold text-neutral-800">{totalMealsLogged}</span>
                <span className="text-[10px] font-bold text-primary tracking-wider uppercase mt-0.5">Meals Logged</span>
              </div>

              <div className="bg-secondary-light/40 rounded-3xl p-5 border border-white flex flex-col items-center justify-center text-center">
                <Heart size={18} className="text-secondary fill-secondary mb-1" />
                <span className="text-xl font-bold text-neutral-800">{totalNewFavorites}</span>
                <span className="text-[10px] font-bold text-secondary tracking-wider uppercase mt-0.5">Favorites tagged</span>
              </div>

            </section>

            {/* List diary logs */}
            <section className="space-y-4">
              <h3 className="font-bold text-sm uppercase tracking-wider text-neutral-500 px-1">Solid Food Intake</h3>
              
              <div className="space-y-4">
                {filteredFoods.length > 0 ? (
                  filteredFoods.map((f) => (
                    <article key={f.id} className="bg-white rounded-3xl p-5 border border-neutral-100 shadow-sm relative overflow-hidden flex flex-col gap-3">
                      {/* Left Indicator bar */}
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#ffe083]"></div>
                      
                      <div className="flex justify-between items-start pl-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#ffe083]/35 flex items-center justify-center text-tertiary">
                            <UtensilsCrossed size={14} />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-neutral-800">{f.mealType}</h4>
                            <span className="text-[10px] text-neutral-400 font-semibold">{f.time} {f.ampm}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {f.isFavorite && (
                            <span className="p-1 rounded-full text-red-500" title="Favorite food">
                              <Heart size={13} className="fill-red-500 text-red-500" />
                            </span>
                          )}
                          <button 
                            onClick={() => handleDeleteFood(f.id)}
                            className="p-1 text-neutral-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Nutrient Content */}
                      <div className="bg-neutral-50 px-4 py-3 rounded-2xl border border-neutral-100">
                        <h5 className="text-xs font-bold text-neutral-800">{f.itemName}</h5>
                        <p className="text-[11px] text-neutral-500 mt-0.5">Portion: {f.portion}</p>
                      </div>

                      {/* Tags */}
                      <div className="flex items-center gap-1.5 pl-2">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold ${
                          f.reaction === 'loved_it' ? 'bg-green-100 text-[#002109]' :
                          f.reaction === 'ate_some' ? 'bg-yellow-100 text-yellow-850' :
                          f.reaction === 'not_a_fan' ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-900'
                        }`}>
                          <Smile size={11} />
                          {f.reaction.replace('_', ' ')}
                        </span>
                        
                        <span className="inline-flex items-center gap-1.5 bg-[#beefbf]/50 text-secondary px-3 py-1 rounded-full text-[10px] font-bold">
                          Texture: {f.texture}
                        </span>
                      </div>

                    </article>
                  ))
                ) : (
                  <div className="bg-white p-12 rounded-3xl border border-dashed border-neutral-200 text-center">
                    <Smile className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                    <p className="text-sm font-bold text-neutral-500">No solid foods logged for today</p>
                    <p className="text-xs text-neutral-400 mt-1">Tap the float action button below to start tracking solid foods!</p>
                  </div>
                )}
              </div>
            </section>

          </div>
        )}

        {/* ----------------- TAB 4: TRENDS / ANALYTICS ----------------- */}
        {activeTab === 'trends' && (
          <div className="space-y-6 animate-fadeIn">
            
            <section className="flex flex-col gap-1">
              <h2 className="font-bold text-lg text-neutral-900 dark:text-slate-100">Smart Analytics</h2>
              <div className="flex items-center text-xs text-neutral-500 dark:text-slate-400 font-semibold gap-1.5 mt-0.5">
                <Calendar size={13} />
                <span>Last 7 Days tracker summary log</span>
              </div>
            </section>

            {/* Insight cards layout stack on mobile, horizontal row scan on tablet/desktop */}
            <section className="space-y-2">
              <h3 className="font-bold text-[11px] uppercase tracking-wider text-neutral-400 dark:text-slate-500">Smart Insights</h3>
              <div className="flex flex-col sm:flex-row gap-4 sm:overflow-x-auto hide-scrollbar pb-1">
                
                {INITIAL_INSIGHTS.map((insight) => (
                  <div 
                    key={insight.id}
                    className={`w-full sm:min-w-[260px] sm:w-[260px] p-5 rounded-3xl border shadow-sm flex flex-col justify-between shrink-0 ${
                      insight.id === 'i1' 
                        ? 'bg-primary text-white border-primary-light dark:border-primary/40' 
                        : 'bg-secondary text-white border-secondary-light dark:border-secondary/40'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white">
                        {insight.id === 'i1' ? <Clock size={16} /> : <UtensilsCrossed size={16} />}
                      </div>
                      <span className="bg-white/25 text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full">
                        {insight.badge}
                      </span>
                    </div>

                    <div className="mt-4">
                      <p className="text-[10px] text-white/75 uppercase tracking-wider font-bold">{insight.title}</p>
                      <p className="text-lg font-bold mt-0.5">{insight.value}</p>
                      <p className="text-[11px] text-white/80 mt-1">{insight.description}</p>
                    </div>
                  </div>
                ))}

              </div>
            </section>

            {/* Gemini AI Summary Section */}
            <section className="bg-gradient-to-br from-[#f5f3ff] via-white to-[#fdf4ff] dark:from-slate-900 dark:via-slate-900/60 dark:to-purple-950/20 p-6 rounded-[32px] border border-purple-100 dark:border-purple-900/60 shadow-[0_12px_32px_rgba(139,92,246,0.04)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.2)] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-100/60 dark:border-purple-900/40 pb-4">
                <div>
                  <h3 className="font-bold text-sm text-neutral-800 dark:text-slate-100 flex items-center gap-2">
                    <Sparkles className="text-purple-600 dark:text-purple-400 animate-pulse" size={18} />
                    Gemini AI Weekly Progress Analysis
                  </h3>
                  <p className="text-[11px] text-neutral-500 dark:text-slate-400">Intelligent, encouraging summary of {babyName}'s routines and benchmarks</p>
                </div>
                <div>
                  <span className="inline-flex items-center gap-1.5 bg-purple-50 dark:bg-purple-950/55 text-purple-700 dark:text-purple-300 text-[10px] font-bold px-3 py-1 rounded-full border border-purple-100 dark:border-purple-900/80 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-ping"></span>
                    Gemini 2.0 Flash
                  </span>
                </div>
              </div>

              {isLoadingAnalysis ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-10 h-10 border-4 border-purple-500/10 border-t-purple-500 rounded-full animate-spin"></div>
                  <div>
                    <p className="text-xs font-bold text-purple-700 dark:text-purple-400">Analyzing routines...</p>
                    <p className="text-[10px] text-neutral-400 dark:text-slate-400 mt-1">Aggregating {babyName}'s recent sleep, solid feeds, and weight progress metrics</p>
                  </div>
                </div>
              ) : analysisError ? (
                <div className="p-4 bg-red-50 dark:bg-rose-950/30 border border-red-100 dark:border-rose-900/30 rounded-2xl text-center space-y-3">
                  <p className="text-xs text-red-650 dark:text-rose-300 font-medium">{analysisError}</p>
                  <button
                    type="button"
                    onClick={handleAnalyzeProgress}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-red-500 hover:bg-opacity-90 px-4 py-2 rounded-xl shadow-sm transition-all active:scale-95"
                  >
                    Retry Analysis
                  </button>
                </div>
              ) : geminiAnalysis ? (
                <div className="space-y-4 animate-fadeIn">
                  <div className="bg-white/80 dark:bg-slate-950/80 border border-purple-50/60 dark:border-purple-950/60 p-5 rounded-2xl max-h-[350px] overflow-y-auto scrollbar-thin shadow-inner-sm text-neutral-700 dark:text-slate-300 space-y-1">
                    {renderMarkdown(geminiAnalysis)}
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setGeminiAnalysis(null);
                        localStorage.removeItem('babypulse_gemini_analysis');
                      }}
                      className="px-3.5 py-2 text-neutral-400 dark:text-slate-400 hover:text-neutral-500 dark:hover:text-slate-200 text-xs font-semibold"
                    >
                      Clear Summary
                    </button>
                    <button
                      type="button"
                      onClick={handleAnalyzeProgress}
                      className="inline-flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-md shadow-purple-500/10 active:scale-95"
                    >
                      <Sparkles size={13} /> Regenerate Report
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-10 text-center space-y-4">
                  <div className="w-12 h-12 bg-purple-50 dark:bg-purple-950/40 rounded-full flex items-center justify-center mx-auto border border-purple-100 dark:border-purple-900 text-purple-500">
                    <Sparkles size={20} className="animate-pulse" />
                  </div>
                  <div className="max-w-md mx-auto space-y-1">
                    <p className="text-xs font-bold text-neutral-800 dark:text-slate-100">No report generated for this week yet</p>
                    <p className="text-[11px] text-neutral-500 dark:text-slate-400 leading-relaxed">
                      Tap the button below to send {babyName}'s feeding sessions, nap schedule logs, and weigh-in metrics to Gemini for a pediatric routine audit.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAnalyzeProgress}
                    className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-purple-500/20 active:scale-95"
                  >
                    <Sparkles size={14} /> Analyze Progress with Gemini
                  </button>
                </div>
              )}
            </section>

            {/* AI Feeding Pattern Predictor Section */}
            <section className="bg-gradient-to-br from-[#f0fdf4] via-white to-[#ecfdf5] dark:from-slate-900 dark:via-slate-900/60 dark:to-emerald-950/20 p-6 rounded-[32px] border border-emerald-100 dark:border-emerald-900/40 shadow-[0_12px_32px_rgba(16,185,129,0.02)] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-100/60 dark:border-emerald-900/30 pb-4">
                <div>
                  <h3 className="font-bold text-sm text-neutral-800 dark:text-slate-100 flex items-center gap-2">
                    <Sparkles className="text-emerald-600 dark:text-emerald-400 animate-pulse" size={18} />
                    Gemini AI Feeding Insight & Prediction
                  </h3>
                  <p className="text-[11px] text-neutral-500 dark:text-slate-400">Smart analysis of historical interval gaps to estimate optimal next feeding sessions</p>
                </div>
                <div>
                  <span className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-955 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-3 py-1 rounded-full border border-emerald-100 dark:border-emerald-900/40 font-mono select-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Predictor Engine Active
                  </span>
                </div>
              </div>

              {isLoadingFeedingInsight ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 animate-pulse">
                  <div className="w-10 h-10 border-4 border-emerald-500/10 border-t-emerald-500 rounded-full animate-spin"></div>
                  <div>
                    <p className="text-xs font-bold text-emerald-700 dark:text-emerald-450">Analyzing feeding chronology...</p>
                    <p className="text-[10px] text-neutral-400 dark:text-slate-405 mt-1">Calculating sequential interval averages and comparing Formula vs Breastfeed durations</p>
                  </div>
                </div>
              ) : feedingInsightError ? (
                <div className="p-4 bg-red-50 dark:bg-rose-950/30 border border-red-105 dark:border-rose-900/30 rounded-2xl text-center space-y-3">
                  <p className="text-xs text-red-650 dark:text-rose-355 font-medium">{feedingInsightError}</p>
                  <button
                    type="button"
                    onClick={handleGenerateFeedingInsight}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-opacity-90 px-4 py-2 rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer"
                  >
                    Retry Prediction
                  </button>
                </div>
              ) : feedingInsight ? (
                <div className="space-y-4 animate-fadeIn">
                  {/* Smart calculated metrics header row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-white/90 dark:bg-slate-950/90 border border-emerald-100/50 dark:border-emerald-950/50 p-3.5 rounded-2xl flex flex-col justify-center shadow-inner-sm text-center">
                      <span className="text-[10px] text-neutral-450 dark:text-slate-500 uppercase tracking-wider font-bold">Estimated Next Feed</span>
                      <span className="text-lg font-bold text-emerald-650 dark:text-emerald-400 mt-1 font-mono">{feedingInsight.suggestedNextTime}</span>
                    </div>

                    <div className="bg-white/90 dark:bg-slate-950/90 border border-emerald-100/50 dark:border-emerald-950/50 p-3.5 rounded-2xl flex flex-col justify-center shadow-inner-sm text-center">
                      <span className="text-[10px] text-neutral-450 dark:text-slate-500 uppercase tracking-wider font-bold">Avg Interval Gap</span>
                      <span className="text-lg font-bold text-neutral-800 dark:text-slate-100 mt-1 font-mono">
                        {feedingInsight.averageGapMinutes > 0 
                          ? `${Math.floor(feedingInsight.averageGapMinutes / 60)}h ${feedingInsight.averageGapMinutes % 60}m` 
                          : 'Sparse Data'}
                      </span>
                    </div>

                    <div className="bg-white/90 dark:bg-slate-950/90 border border-emerald-100/50 dark:border-emerald-950/50 p-3.5 rounded-2xl flex flex-col justify-center shadow-inner-sm text-center">
                      <span className="text-[10px] text-neutral-450 dark:text-slate-500 uppercase tracking-wider font-bold">Estimation Basis</span>
                      <span className="text-xs font-bold text-neutral-700 dark:text-slate-300 mt-2 truncate underline decoration-emerald-400 decoration-2 underline-offset-4">Chronological Gaps</span>
                    </div>
                  </div>

                  <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border-l-4 border-emerald-500 p-3 rounded-r-xl text-xs font-semibold text-emerald-800 dark:text-emerald-300 leading-relaxed italic">
                    💡 Prediction: {feedingInsight.reasoning}
                  </div>

                  <div className="bg-white/80 dark:bg-slate-950/80 border border-emerald-50/60 dark:border-emerald-950/60 p-5 rounded-2xl max-h-[300px] overflow-y-auto scrollbar-thin text-neutral-700 dark:text-slate-300 space-y-1">
                    {renderMarkdown(feedingInsight.analysisText)}
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFeedingInsight(null);
                        localStorage.removeItem('babypulse_feeding_insight');
                      }}
                      className="px-3.5 py-2 text-neutral-400 dark:text-slate-400 hover:text-neutral-500 dark:hover:text-slate-200 text-xs font-semibold"
                    >
                      Clear Insights
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerateFeedingInsight}
                      className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-md shadow-emerald-550/10 active:scale-95 cursor-pointer animate-none"
                    >
                      <Sparkles size={13} /> Recalculate Pattern
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-10 text-center space-y-4">
                  <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/40 rounded-full flex items-center justify-center mx-auto border border-emerald-100 dark:border-emerald-900 text-emerald-500">
                    <Clock size={20} className="animate-pulse" />
                  </div>
                  <div className="max-w-md mx-auto space-y-1">
                    <p className="text-xs font-bold text-neutral-800 dark:text-slate-100">No predictions generated yet</p>
                    <p className="text-[11px] text-neutral-500 dark:text-slate-400 leading-relaxed">
                      Tap below to send {babyName}'s recent feed timestamps to Gemini to analyze average feeding intervals, gaps, and compute the best time for the next session!
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateFeedingInsight}
                    className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer"
                  >
                    <Sparkles size={14} /> Calculate Feeding Prediction
                  </button>
                </div>
              )}
            </section>

            {/* Custom Recharts Dual-Axis Correlation Chart (responsive and styled) */}
            <section className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-neutral-100 dark:border-slate-800 shadow-sm space-y-4">
              <div>
                <h3 className="font-bold text-sm text-neutral-800 dark:text-slate-100">Slept Hours vs. Ounces Fed</h3>
                <p className="text-[11px] text-neutral-500 dark:text-slate-450">7-Day correlation patterns for {babyName}</p>
              </div>

              {/* Responsive Container for Recharts Chart */}
              <div className="w-full h-56 sm:h-64 text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={WEEKLY_CHART_DATA} margin={{ top: 15, right: -5, left: -20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorOunces" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#bbecbc" stopOpacity={0.6}/>
                        <stop offset="95%" stopColor="#bbecbc" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="colorSleep" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1c648e" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#1c648e" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGridColor} />
                    <XAxis dataKey="day" tickLine={false} axisLine={false} stroke={chartTextColor} />
                    <YAxis yAxisId="left" tickLine={false} axisLine={false} stroke={ouncesColor} label={{ value: 'Ounces (oz)', angle: -90, position: 'insideLeft', style: { fill: ouncesColor } }} />
                    <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} stroke={sleepColor} label={{ value: 'Sleep (hrs)', angle: 90, position: 'insideRight', style: { fill: sleepColor } }} />
                    <Tooltip contentStyle={{ borderRadius: 16, border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #eceef0', backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', color: isDarkMode ? '#f8fafc' : '#1e1e24' }} />
                    <Legend verticalAlign="top" height={36}/>
                    <Area yAxisId="left" type="monotone" dataKey="fed" name="Ounces Fed (oz)" stroke={ouncesColor} fillOpacity={1} fill="url(#colorOunces)" strokeWidth={2} />
                    <Area yAxisId="right" type="monotone" dataKey="sleep" name="Hours Slept (hrs)" stroke={sleepColor} fillOpacity={1} fill="url(#colorSleep)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Average sleep meter and duration chart side content */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-neutral-100 dark:border-slate-800 shadow-sm flex flex-col justify-between min-h-[160px]">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-slate-500">Avg Daily Sleep</span>
                  <div className="p-1.5 bg-primary-light/50 dark:bg-slate-800 rounded-full text-primary dark:text-sky-400">
                    <Moon size={14} className="fill-current" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold font-sans text-primary dark:text-sky-400">14</span>
                    <span className="text-xs font-bold text-neutral-500 dark:text-slate-400 uppercase">h</span>
                    <span className="text-3xl font-bold font-sans text-primary dark:text-sky-400 ml-1">20</span>
                    <span className="text-xs font-bold text-neutral-500 dark:text-slate-400 uppercase">m</span>
                  </div>
                  <p className="text-[11px] text-green-600 dark:text-green-400 font-bold flex items-center gap-1 mt-1">
                    <TrendingUp size={12} /> +45m from last week average
                  </p>
                </div>
              </div>

              {/* Bar charts details */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-neutral-100 dark:border-slate-800 shadow-sm flex flex-col justify-between min-h-[160px]">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-slate-500">Daily Nap Duration</span>
                </div>
                <div className="h-16 w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={WEEKLY_CHART_DATA} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <Bar dataKey="sleep" fill="#7cb9e8" radius={[4, 4, 0, 0]}>
                        {WEEKLY_CHART_DATA.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={index === 5 ? (isDarkMode ? '#38bdf8' : '#1c648e') : '#7cb9e8'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </section>

            {/* --- Weight Tracking Section --- */}
            <section className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-neutral-100 dark:border-slate-800 shadow-[0_8px_24px_rgba(28,100,142,0.02)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.2)] space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-50 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="font-bold text-sm text-neutral-800 dark:text-slate-100 flex items-center gap-2">
                    <TrendingUp className="text-primary dark:text-sky-400" size={18} />
                    Weight Over Time
                  </h3>
                  <p className="text-[11px] text-neutral-500 dark:text-slate-400">Record and monitor weight milestones for {babyName}</p>
                </div>

                <div className="flex items-center gap-2">
                  {!showAddWeightForm ? (
                    <button
                      type="button"
                      onClick={() => setShowAddWeightForm(true)}
                      className="inline-flex items-center gap-1.5 bg-primary hover:bg-opacity-90 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-sm"
                    >
                      <PlusCircle size={14} /> Log Weight
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Add Weight Form (Inline if toggled) */}
              {showAddWeightForm && (
                <form onSubmit={handleAddWeightLog} className="bg-neutral-50 dark:bg-slate-950 p-4 rounded-2xl border border-neutral-150 dark:border-slate-800 space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between font-bold text-xs text-neutral-700 dark:text-slate-300 pb-1 border-b border-neutral-100 dark:border-slate-800/80">
                    <span>Log New Weight Entry</span>
                    <button type="button" onClick={() => setShowAddWeightForm(false)} className="text-neutral-400 hover:text-neutral-600 dark:text-slate-400 dark:hover:text-slate-200">
                      <X size={15} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-500 dark:text-slate-400 uppercase mb-1">Pounds (lbs)</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        placeholder="lbs"
                        value={newWeightLb}
                        onChange={(e) => setNewWeightLb(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-neutral-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-primary"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-neutral-500 dark:text-slate-400 uppercase mb-1">Ounces (oz)</label>
                      <input
                        type="number"
                        min={0}
                        max={15}
                        placeholder="oz"
                        value={newWeightOz}
                        onChange={(e) => setNewWeightOz(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-neutral-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-primary"
                        required
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-neutral-500 dark:text-slate-400 uppercase mb-1">Weigh-In Date</label>
                      <input
                        type="date"
                        value={newWeightDate}
                        onChange={(e) => setNewWeightDate(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-neutral-750 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-primary"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 dark:text-slate-400 uppercase mb-1">Measurement Notes (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Doctor check-up, before morning feed"
                      value={newWeightNotes}
                      onChange={(e) => setNewWeightNotes(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-neutral-700 dark:text-slate-300 focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => setShowAddWeightForm(false)}
                      className="px-3 py-1.5 bg-neutral-200 dark:bg-slate-800 text-neutral-700 dark:text-slate-300 font-bold text-[11px] rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-primary text-white font-bold text-[11px] rounded-lg shadow-sm"
                    >
                      Save Weight
                    </button>
                  </div>
                </form>
              )}

              {/* Grid with line chart and weight list */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Chart (takes 2 cols on lg) */}
                <div className="lg:col-span-2 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-slate-500 block pb-1">Weight Progress Line Chart</span>
                  {weightLogs.length > 0 ? (
                    <div className="w-full h-56 sm:h-64 text-xs">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={weightLogs.map(log => ({
                            ...log,
                            weightDec: Number((log.weightLb + log.weightOz / 16).toFixed(2)),
                            displayDate: new Date(log.date + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                          }))}
                          margin={{ top: 15, right: 5, left: -20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGridColor} />
                          <XAxis 
                            dataKey="displayDate" 
                            tickLine={false} 
                            axisLine={false} 
                            stroke={chartTextColor} 
                          />
                          <YAxis 
                            tickLine={false} 
                            axisLine={false} 
                            stroke={primaryColor} 
                            domain={['auto', 'auto']}
                            label={{ value: 'Weight (lbs)', angle: -90, position: 'insideLeft', style: { fill: primaryColor } }}
                          />
                          <Tooltip 
                            contentStyle={{ borderRadius: 16, border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #eceef0', backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', color: isDarkMode ? '#f8fafc' : '#1e1e24' }} 
                            formatter={(value: any, name: any, props: any) => {
                              const item = props.payload;
                              return [`${item.weightLb} lbs ${item.weightOz} oz`, 'Weight'];
                            }}
                          />
                          <Legend verticalAlign="top" height={36}/>
                          <Line 
                            type="monotone" 
                            dataKey="weightDec" 
                            name={`${babyName}'s Weight (lbs)`} 
                            stroke={primaryColor} 
                            strokeWidth={3} 
                            activeDot={{ r: 6 }} 
                            dot={{ stroke: primaryColor, strokeWidth: 2, fill: isDarkMode ? '#1e293b' : '#fff', r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-56 sm:h-64 border border-dashed border-neutral-150 dark:border-slate-800 rounded-2xl flex items-center justify-center text-xs text-neutral-400 dark:text-slate-500">
                      No weight records logged yet.
                    </div>
                  )}
                </div>

                {/* List and Summary (takes 1 col on lg) */}
                <div className="space-y-4">
                  
                  {/* Latest weight summary card */}
                  {weightLogs.length > 0 ? (() => {
                    const sortedLogsByDate = [...weightLogs].sort((a, b) => a.timestamp - b.timestamp);
                    const latest = sortedLogsByDate[sortedLogsByDate.length - 1];
                    return (
                      <div className="bg-primary/5 dark:bg-sky-500/5 p-4 rounded-xl border border-primary/10 dark:border-sky-500/10">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-primary/70 dark:text-sky-400/80 block">Current Weight</span>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-2xl font-bold font-sans text-primary dark:text-sky-450">{latest.weightLb}</span>
                          <span className="text-xs font-bold text-primary/70 dark:text-sky-400/80 uppercase">lbs</span>
                          <span className="text-2xl font-bold font-sans text-primary dark:text-sky-450 ml-1.5">{latest.weightOz}</span>
                          <span className="text-xs font-bold text-primary/70 dark:text-sky-400/80 uppercase">oz</span>
                        </div>
                        <span className="text-[10px] text-neutral-400 dark:text-slate-500 block mt-1">
                          Weighed on: <strong>{latest.date}</strong>
                        </span>
                      </div>
                    );
                  })() : (
                    <div className="bg-neutral-50 dark:bg-slate-950 p-4 rounded-xl border border-neutral-100 dark:border-slate-800 text-xs text-neutral-400 dark:text-slate-500 italic">
                      No current weight logged.
                    </div>
                  )}

                  {/* Scrolling List of weight history */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-slate-500 block">Weigh-in History</span>
                    <div className="max-h-52 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                      {weightLogs.slice().reverse().map((log) => (
                        <div 
                          key={log.id} 
                          className="flex justify-between items-start p-3 rounded-xl bg-neutral-50 dark:bg-slate-950 border border-neutral-150 dark:border-slate-850/80 relative"
                        >
                          <div>
                            <div className="flex items-baseline gap-1">
                              <span className="font-bold text-xs text-neutral-800 dark:text-slate-200">{log.weightLb} lb</span>
                              <span className="font-bold text-[10px] text-neutral-500 dark:text-slate-400">{log.weightOz} oz</span>
                            </div>
                            <span className="text-[9px] font-mono text-neutral-400 dark:text-slate-500 block mt-0.5">{log.date}</span>
                            {log.notes && (
                              <p className="text-[10px] text-neutral-500 dark:text-slate-450 italic mt-1 leading-snug">
                                {log.notes}
                              </p>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteWeightLog(log.id)}
                            className="text-neutral-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1 self-start"
                            title="Delete weight entry"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}

                      {weightLogs.length === 0 && (
                        <p className="text-[11px] text-neutral-400 dark:text-slate-500 italic py-2">No weight entries.</p>
                      )}
                    </div>
                  </div>

                </div>

              </div>
            </section>

          </div>
        )}

        {/* ----------------- TAB 5: CARE / DAILY SUMMARY ----------------- */}
        {activeTab === 'care' && (
          <div className="space-y-6 animate-fadeIn">
            
            <section className="flex flex-col gap-1">
              <h2 className="font-bold text-lg text-neutral-900">Daily Briefing</h2>
              <p className="text-xs text-neutral-500">Quick status lookup for morning caregivers and handovers</p>
            </section>

            {/* Quick status cards */}
            <section className="grid grid-cols-2 gap-4">
              
              {/* Last Fed details card */}
              <div className="bg-white rounded-3xl p-5 border border-neutral-100 shadow-sm flex flex-col gap-2">
                <div className="flex gap-2 items-center text-primary">
                  <Clock size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Last Feed</span>
                </div>
                <div>
                  {latestFeed ? (
                    <>
                      <p className="text-2xl font-bold tracking-tight text-neutral-800">
                        {latestFeed.time} <span className="text-xs font-bold text-neutral-500">{latestFeed.ampm}</span>
                      </p>
                      <p className="text-[10px] text-neutral-500 mt-1 uppercase font-bold text-neutral-400">
                        {latestFeed.feedType} · {latestFeed.amountOz} oz
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-lg font-bold text-neutral-500">Not Feed</p>
                      <p className="text-[10px] text-neutral-400">No records today</p>
                    </>
                  )}
                </div>
              </div>

              {/* Last slept details card */}
              <div className="bg-white rounded-3xl p-5 border border-neutral-100 shadow-sm flex flex-col gap-2">
                <div className="flex gap-2 items-center text-[#ceb052]">
                  <Moon size={14} className="fill-[#ceb052]" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Last Slept</span>
                </div>
                <div>
                  {latestSleep ? (
                    <>
                      <p className="text-2xl font-bold tracking-tight text-neutral-800">
                        {Math.floor((latestSleep.durationMinutes || 0)/60)}h <span className="text-xs font-bold text-neutral-500">{(latestSleep.durationMinutes || 0)%60}m</span>
                      </p>
                      <p className="text-[10px] text-neutral-500 mt-1 uppercase font-bold text-neutral-400">
                        At {latestSleep.time} {latestSleep.ampm}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-lg font-bold text-neutral-500">Not Logged</p>
                      <p className="text-[10px] text-neutral-400">No sleeping recorded</p>
                    </>
                  )}
                </div>
              </div>

              {/* Last changed diaper statistics  */}
              <div className="bg-white rounded-3xl p-5 border border-neutral-100 shadow-sm col-span-2 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex gap-2 items-center text-secondary">
                    <Activity size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">Last Change Status</span>
                  </div>
                  {latestDiaper && (
                    <span className="text-[10px] text-neutral-400 font-bold">{latestDiaper.time} {latestDiaper.ampm}</span>
                  )}
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-sm font-bold text-neutral-800 block">Today's diaper changes</span>
                    <span className="text-xs text-neutral-500">
                      Total: {diaperChanges.length} changes ({diaperWetCount} Wet · {diaperDirtyCount} Dirty)
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    <span className="bg-[#beefbf]/50 text-secondary border border-secondary/20 font-bold text-[9px] uppercase px-3 py-1.5 rounded-full">Wet</span>
                    <span className="bg-neutral-100 text-neutral-500 font-bold text-[9px] uppercase px-3 py-1.5 rounded-full opacity-60">Dirty</span>
                  </div>
                </div>
              </div>

            </section>

            {/* Scheduled Routines & Reminders section */}
            <section className="bg-white rounded-3xl p-6 border border-neutral-100 shadow-[0_8px_24px_rgba(28,100,142,0.02)] space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <div className="flex items-center gap-2">
                  <Bell className="text-amber-500" size={18} />
                  <h3 className="font-bold text-sm text-neutral-800">Schedules & Reminders</h3>
                </div>
                {notificationPermission === 'granted' ? (
                  <span className="text-[10px] text-green-600 font-bold bg-green-50 px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></span> Desktop Active
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={requestNotificationPermission}
                    className="text-[10px] text-amber-600 hover:text-amber-700 font-bold flex items-center gap-1 hover:underline shrink-0"
                  >
                    🔔 Enable Alerts
                  </button>
                )}
              </div>

              {/* Reminders List */}
              <div className="space-y-3">
                {schedules.map((sched) => {
                  const isCompleted = sched.completedDates?.includes(selectedDate);
                  const schedMins = parseTimeToMinutes(sched.time, sched.ampm);
                  const isOverdue = schedMins <= currentTotalMinutes && !isCompleted;
                  
                  return (
                    <div 
                      key={sched.id} 
                      className={`flex justify-between items-center p-3.5 rounded-2xl border transition-all ${
                        isCompleted 
                          ? 'bg-green-50/50 border-green-100 opacity-85' 
                          : isOverdue 
                            ? 'bg-amber-50 border-amber-200 shadow-[0_4px_12px_rgba(217,119,6,0.06)]' 
                            : 'bg-neutral-50/60 border-neutral-150'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleToggleScheduleCompleted(sched.id)}
                          className={`w-6 h-6 rounded-full flex items-center justify-center transition-all shrink-0 ${
                            isCompleted 
                              ? 'bg-green-500 text-white' 
                              : isOverdue 
                                ? 'bg-white border-2 border-amber-500 text-amber-500 hover:bg-amber-100' 
                                : 'bg-white border hover:border-neutral-400 text-neutral-350'
                          }`}
                          title={isCompleted ? "Mark Uncompleted" : "Mark Completed"}
                        >
                          {isCompleted ? <Check size={11} className="stroke-[3px]" /> : <div className="w-1 h-1 rounded-full bg-current opacity-0 hover:opacity-100" />}
                        </button>

                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className={`font-bold text-xs ${isCompleted ? 'text-neutral-400 line-through' : 'text-neutral-800'}`}>
                              {sched.title}
                            </span>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider ${
                              sched.type === 'feed' ? 'bg-blue-100/70 text-blue-800' : 'bg-purple-100/70 text-purple-800'
                            }`}>
                              {sched.type}
                            </span>
                          </div>
                          
                          <div className="flex gap-2 text-[10px] text-neutral-400 font-semibold mt-0.5">
                            <span className="font-mono">{sched.time} {sched.ampm}</span>
                            {sched.amountOz && <span>· {sched.amountOz} oz</span>}
                            {sched.notes && <span className="italic">· {sched.notes}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isOverdue && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[9px] text-red-500 font-bold bg-red-100/20 px-2 py-1 rounded-lg animate-pulse uppercase tracking-wider shrink-0">
                              Overdue
                            </span>
                            <div className="inline-flex rounded-lg shadow-sm border border-neutral-200/60 divide-x divide-neutral-200 bg-white">
                              <button
                                type="button"
                                onClick={() => handleSnoozeReminder(sched.id, 15)}
                                className="px-2 py-1 text-[9px] font-bold text-amber-800 hover:bg-neutral-50 transition-colors uppercase outline-none rounded-l-lg"
                                title="Snooze 15 minutes"
                              >
                                Snooze 15m
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSnoozeReminder(sched.id, 30)}
                                className="px-2 py-1 text-[9px] font-bold text-amber-800 hover:bg-neutral-50 transition-colors uppercase outline-none rounded-r-lg"
                                title="Snooze 30 minutes"
                              >
                                Snooze 30m
                              </button>
                            </div>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteSchedule(sched.id)}
                          className="text-neutral-300 hover:text-red-500 transition-colors p-1"
                          title="Delete Reminder"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {schedules.length === 0 && (
                  <p className="text-center text-xs text-neutral-400 italic py-4">No scheduled routine reminders configured yet.</p>
                )}
              </div>

              {/* Add reminder inline trigger button */}
              {!showAddScheduleForm ? (
                <button
                  type="button"
                  onClick={() => setShowAddScheduleForm(true)}
                  className="w-full py-2.5 bg-neutral-150 hover:bg-neutral-200 text-neutral-600 hover:text-neutral-800 font-bold text-xs rounded-xl border border-dashed border-neutral-300 flex items-center justify-center gap-2 transition-colors"
                >
                  <PlusCircle size={15} /> Add Scheduled Routine Reminder
                </button>
              ) : (
                <form onSubmit={handleAddSchedule} className="bg-neutral-50 p-4 rounded-2xl border border-neutral-150 space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between font-bold text-xs text-neutral-700 pb-1 border-b border-neutral-100">
                    <span>Create Repeating Reminder</span>
                    <button type="button" onClick={() => setShowAddScheduleForm(false)} className="text-neutral-400 hover:text-neutral-600">
                      <X size={15} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">Reminder Type</label>
                      <select 
                        value={newScheduleType}
                        onChange={(e) => setNewScheduleType(e.target.value as any)}
                        className="w-full bg-white border border-neutral-200 rounded-xl px-2 py-1.5 text-xs text-neutral-700 focus:outline-none"
                      >
                        <option value="feed">🍼 Feeding Schedule</option>
                        <option value="medication">💊 Medication Schedule</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">Reminder Title</label>
                      <input 
                        type="text"
                        placeholder={newScheduleType === 'feed' ? 'e.g. Afternoon Formula' : 'e.g. Vitamin D drops'}
                        value={newScheduleTitle}
                        onChange={(e) => setNewScheduleTitle(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-xl px-2.5 py-1.5 text-xs text-neutral-700 focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">Select Time</label>
                      <div className="flex items-center gap-1.5">
                        <input 
                          type="text"
                          placeholder="e.g. 05:30"
                          value={newScheduleTime}
                          onChange={(e) => setNewScheduleTime(e.target.value)}
                          className="w-full bg-white border border-neutral-200 rounded-xl px-2 py-1 text-xs text-neutral-700 focus:outline-none"
                          required
                        />
                        <select
                          value={newScheduleAmpm}
                          onChange={(e) => setNewScheduleAmpm(e.target.value as any)}
                          className="bg-white border border-neutral-200 rounded-xl px-1.5 py-1 text-xs text-neutral-700 focus:outline-none"
                        >
                          <option value="AM">AM</option>
                          <option value="PM">PM</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      {newScheduleType === 'feed' ? (
                        <>
                          <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">Amount (oz)</label>
                          <input 
                            type="number"
                            min={0.5}
                            max={16}
                            step={0.5}
                            value={newScheduleAmountOz}
                            onChange={(e) => setNewScheduleAmountOz(Number(e.target.value))}
                            className="w-full bg-white border border-neutral-200 rounded-xl px-2 py-1 text-xs text-neutral-700 focus:outline-none"
                          />
                        </>
                      ) : (
                        <>
                          <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">Dose / Notes</label>
                          <input 
                            type="text"
                            placeholder="e.g. 1ml oral"
                            value={newScheduleNotes}
                            onChange={(e) => setNewScheduleNotes(e.target.value)}
                            className="w-full bg-white border border-neutral-200 rounded-xl px-2.5 py-1 text-xs text-neutral-700 focus:outline-none"
                          />
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
                    <button
                      type="button"
                      onClick={() => setShowAddScheduleForm(false)}
                      className="px-3 py-1.5 bg-neutral-200 hover:bg-neutral-250 text-neutral-700 font-bold text-[11px] rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-primary text-white font-bold text-[11px] rounded-lg shadow-sm"
                    >
                      Save Reminder
                    </button>
                  </div>
                </form>
              )}
            </section>

            {/* Handover Special instructions */}
            <section className="bg-white rounded-3xl p-6 border border-neutral-100 shadow-[0_8px_24px_rgba(28,100,142,0.02)] space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <div className="flex items-center gap-2">
                  <BadgeAlert className="text-red-500" size={18} />
                  <h3 className="font-bold text-sm text-neutral-800">Special Instructions for Today</h3>
                </div>
                <span className="text-[10px] uppercase font-bold text-red-500 tracking-wider">Active alerts</span>
              </div>

              <ul className="space-y-3">
                {instructions.map((inst) => (
                  <li key={inst.id} className="flex justify-between items-start bg-neutral-50 p-4 rounded-xl border border-neutral-100 animate-fadeIn text-xs">
                    <p className="text-xs text-neutral-700 leading-relaxed pr-3">{inst.text}</p>
                    <button 
                      onClick={() => handleDeleteInstruction(inst.id)}
                      className="text-neutral-300 hover:text-red-500 transition-colors pt-0.5 shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>

              {/* Add instruction inline form */}
              <form onSubmit={handleAddInstruction} className="flex gap-2 pt-2">
                <input 
                  type="text"
                  placeholder="e.g. Try to keep the afternoon nap under 2 hours..."
                  value={newInstructionText}
                  onChange={(e) => setNewInstructionText(e.target.value)}
                  className="flex-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-red-500 focus:bg-white transition-colors"
                />
                <button 
                  type="submit"
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl text-xs transition-colors shadow-sm"
                >
                  Add Advice
                </button>
              </form>
            </section>

            {/* Pediatrician export triggering action */}
            <section className="space-y-2">
              <button 
                type="button"
                onClick={() => setIsExportOpen(true)}
                className="w-full h-14 bg-primary text-white font-semibold text-sm rounded-full flex items-center justify-center gap-2.5 shadow-md hover:bg-primary/95 hover:shadow-lg transition-all"
              >
                <Download size={18} />
                Export Pediatrician Report
              </button>
              <p className="text-center text-[10px] text-neutral-400 font-medium">
                Generates a detailed 24-hour pediatric checklist and summary report.
              </p>
            </section>

          </div>
        )}

      </main>

      {/* --- Floating Action Button (Active only in Timeline & Food Tabs) --- */}
      {(activeTab === 'timeline' || activeTab === 'food') && (
        <button 
          onClick={() => {
            if (activeTab === 'timeline') {
              setAddEventType('sleep');
              setIsAddEventOpen(true);
            } else {
              setAddFoodMealType('Breakfast');
              setIsAddFoodOpen(true);
            }
          }}
          aria-label="Add recording item"
          className="fixed bottom-24 right-6 w-14 h-14 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform z-35"
        >
          <Plus size={28} />
        </button>
      )}

      {/* --- Floating Save as PDF Button (Active only in Care Tab) --- */}
      {activeTab === 'care' && (
        <button 
          onClick={() => printPediatricianReport(selectedDate, events, foods, instructions)}
          aria-label="Save Pediatrician Report as PDF"
          title="Save Report as PDF"
          className="fixed bottom-24 right-6 flex items-center gap-2 px-4 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl shadow-xl hover:scale-[1.03] active:scale-95 transition-all z-35 animate-fadeIn border border-indigo-500/20"
        >
          <Printer size={16} />
          <span>Save as PDF</span>
        </button>
      )}

      {/* --- Bottom Navigation Tab Bar (Fluid frosted glass) --- */}
      <nav className="fixed bottom-0 left-0 w-full z-45 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-neutral-100 dark:border-slate-800 shadow-[0_-8px_24px_rgba(28,100,142,0.03)] dark:shadow-[0_-8px_24px_rgba(0,0,0,0.2)] pb-safe-bottom pt-2 h-20">
        <div className="flex justify-around items-center max-w-2xl mx-auto h-full px-2">
          
          {/* Today Tab button */}
          <button 
            type="button"
            onClick={() => setActiveTab('today')}
            className={`flex flex-col items-center justify-center text-xs transition-all w-16 p-1.5 rounded-xl ${
              activeTab === 'today' 
                ? 'bg-primary-light dark:bg-slate-850 text-primary dark:text-sky-400 font-bold' 
                : 'text-neutral-400 hover:text-neutral-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Clock size={18} className={activeTab === 'today' ? 'fill-current' : ''} />
            <span className="text-[10px] mt-1">Today</span>
          </button>

          {/* Timeline Tab button */}
          <button 
            type="button"
            onClick={() => setActiveTab('timeline')}
            className={`flex flex-col items-center justify-center text-xs transition-all w-16 p-1.5 rounded-xl ${
              activeTab === 'timeline' 
                ? 'bg-primary-light dark:bg-slate-850 text-primary dark:text-sky-400 font-bold' 
                : 'text-neutral-400 hover:text-neutral-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Layers size={18} />
            <span className="text-[10px] mt-1">Timeline</span>
          </button>

          {/* Food Tab button */}
          <button 
            type="button"
            onClick={() => setActiveTab('food')}
            className={`flex flex-col items-center justify-center text-xs transition-all w-16 p-1.5 rounded-xl ${
              activeTab === 'food' 
                ? 'bg-primary-light dark:bg-slate-850 text-primary dark:text-sky-400 font-bold' 
                : 'text-neutral-400 hover:text-neutral-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <UtensilsCrossed size={18} />
            <span className="text-[10px] mt-1">Food</span>
          </button>

          {/* Trends Tab button */}
          <button 
            type="button"
            onClick={() => setActiveTab('trends')}
            className={`flex flex-col items-center justify-center text-xs transition-all w-16 p-1.5 rounded-xl ${
              activeTab === 'trends' 
                ? 'bg-primary-light dark:bg-slate-850 text-primary dark:text-sky-400 font-bold' 
                : 'text-neutral-400 hover:text-neutral-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <TrendingUp size={18} />
            <span className="text-[10px] mt-1">Trends</span>
          </button>

          {/* Care Tab button */}
          <button 
            type="button"
            onClick={() => setActiveTab('care')}
            className={`flex flex-col items-center justify-center text-xs transition-all w-16 p-1.5 rounded-xl relative ${
              activeTab === 'care' 
                ? 'bg-primary-light dark:bg-slate-850 text-primary dark:text-sky-400 font-bold' 
                : 'text-neutral-400 hover:text-neutral-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <Briefcase size={18} />
              {(() => {
                const overdueCount = schedules.filter(sched => {
                  const isCompleted = sched.completedDates?.includes(selectedDate);
                  if (isCompleted) return false;
                  const schedMins = parseTimeToMinutes(sched.time, sched.ampm);
                  return schedMins <= currentTotalMinutes;
                }).length;
                if (overdueCount === 0) return null;
                return (
                  <span className="absolute -top-1.5 -right-2 bg-red-500 text-white font-bold text-[8px] rounded-full h-4 w-4 flex items-center justify-center animate-bounce shadow">
                    {overdueCount}
                  </span>
                );
              })()}
            </div>
            <span className="text-[10px] mt-1">Care</span>
          </button>

        </div>
      </nav>

      {/* --- ADD EVENT MODAL --- */}
      <AddEventModal 
        isOpen={isAddEventOpen}
        onClose={() => setIsAddEventOpen(false)}
        onSave={handleSaveEvent}
        initialType={addEventType}
        defaultDate={selectedDate}
      />

      {/* --- ADD FOOD MODAL --- */}
      <AddFoodModal 
        isOpen={isAddFoodOpen}
        onClose={() => setIsAddFoodOpen(false)}
        onSave={handleSaveFood}
        initialMealType={addFoodMealType}
        defaultDate={selectedDate}
      />

      {/* --- EXPORT pediatric BRIEF MODAL --- */}
      <ExportModal 
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        date={selectedDate}
        events={events}
        foods={foods}
        instructions={instructions}
      />

      {/* --- INTERACTIVE WALKTHROUGH TUTORIAL MODAL --- */}
      {showTutorial && (
        <AppTutorial 
          onClose={() => setShowTutorial(false)}
          babyName={babyName}
        />
      )}

      {/* --- DOWNLOAD NATIVE APP MODAL --- */}
      {showDownloadModal && (
        <DownloadAppModal 
          onClose={() => setShowDownloadModal(false)}
          onTriggerInstall={handleTriggerPwaInstall}
          isInstallAvailable={!!deferredPrompt}
        />
      )}

      {/* --- promise-based custom confirm modal --- */}
      {confirmState && confirmState.isOpen && (
        <div className="fixed inset-0 bg-neutral-950/45 z-[100] backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[28px] p-6 shadow-2xl border border-neutral-150 dark:border-slate-800 max-w-sm w-full space-y-5 animate-scaleUp relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-sky-400"></div>
            <div className="space-y-2">
              <h3 className="font-extrabold text-base text-neutral-800 dark:text-slate-100 tracking-tight">
                {confirmState.title}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-slate-400 leading-relaxed whitespace-pre-line">
                {confirmState.message}
              </p>
            </div>
            <div className="flex justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => confirmState.resolve(false)}
                className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-neutral-600 dark:text-slate-350 font-bold text-xs rounded-xl active:scale-95 transition-all cursor-pointer"
              >
                {confirmState.cancelLabel}
              </button>
              <button
                type="button"
                onClick={() => confirmState.resolve(true)}
                className="px-4 py-2 bg-primary dark:bg-sky-600 text-white font-bold text-xs rounded-xl hover:opacity-90 active:scale-95 transition-all cursor-pointer"
              >
                {confirmState.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
    </>
  );
}
