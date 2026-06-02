import React, { useState } from 'react';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  Clock, 
  Bell, 
  Activity, 
  ShieldCheck, 
  RotateCcw,
  GlassWater,
  PartyPopper
} from 'lucide-react';

interface AppTutorialProps {
  onClose: () => void;
  babyName: string;
}

export const AppTutorial: React.FC<AppTutorialProps> = ({ onClose, babyName }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "Welcome to BabyPulse 🍼",
      description: `Track and secure all pediatric daily diaries for ${babyName || 'your baby'} to ensure smooth developmental routines.`,
      icon: <Activity className="w-12 h-12 text-primary dark:text-sky-400" />,
      bullets: [
        "Logged Feedings: Capture ounces or ml formulas easily.",
        "Sleep & Diaper Diaries: Watch continuous duration blocks.",
        "Secure Storage: Your data remains private, persistent, and entirely safe."
      ]
    },
    {
      title: "Feeding Timer & Tactile Reset ⏱️",
      description: "Log feedings precisely with our state-of-the-art countdown timers.",
      icon: <Clock className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />,
      bullets: [
        "Tactile Reset: Use 'Reset All' button to clear and restart all elements (amount, type) in just one single tap.",
        "Vibrate Notification: Dual-pulse tactile haptic feedback warns you with navigator.vibrate when the countdown hits zero.",
        "Easy Tracking: Keeps accurate tabs on formula vs. dual-side breastfeed sessions."
      ]
    },
    {
      title: "Overdue Reminders & Smart Snooze 🔔",
      description: "Ensure your baby's scheduled tasks are completed perfectly on time.",
      icon: <Bell className="w-12 h-12 text-amber-500 animate-bounce" />,
      bullets: [
        "Instant Reminders: Active alerts highlight forgotten or overdue pediatric tasks.",
        "Smart 15m / 30m Snoozing: Keep tracking fluidly by shifting alarms forward by 15 or 30 minutes in one click.",
        "Automatic Syncing: Snoozed reminder intervals synchronize automatically across all your connected devices."
      ]
    },
    {
      title: "Gemini AI Feeding Analytics 🔮",
      description: "Discover deep insight of historical feeding behavior and pattern analysis.",
      icon: <Sparkles className="w-12 h-12 text-purple-500" />,
      bullets: [
        "Predictive Scheduling: Gemini automatically analyzes historical feeding intervals.",
        "Best Next Time: Estimates and displays the optimal estimated next feed time.",
        "Supportive Guidance: Generates loving, pediatric-grade consulting summaries."
      ]
    },
    {
      title: "Google Cloud Sync & Fingerprint Guard 🔒",
      description: "Enterprise-grade safety for your precious milestones.",
      icon: <ShieldCheck className="w-12 h-12 text-blue-500" />,
      bullets: [
        "Pediatric Biometric Guard: Prevent accidental app edits with custom simulated fingerprint shields.",
        "Seamless Cloud Backup: Instantly synchronizes diaries with Google accounts.",
        "Fully Offline First: The application operates completely offline without lost context."
      ]
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onFinish();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const onFinish = () => {
    localStorage.setItem('babypulse_tutorial_completed', 'true');
    onClose();
  };

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 bg-neutral-950/40 z-50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-[32px] p-6 sm:p-8 shadow-xl border border-neutral-200 dark:border-slate-800 max-w-md w-full space-y-6 animate-scaleUp relative overflow-hidden">
        {/* Subtle Top Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-emerald-400 to-purple-500"></div>

        {/* Header */}
        <div className="flex justify-between items-start mt-1">
          <div>
            <span className="text-[9px] font-bold tracking-widest text-neutral-400 dark:text-slate-500 uppercase">
              BabyPulse Walkthrough • Step {currentStep + 1} of {steps.length}
            </span>
            <h3 className="font-extrabold text-lg text-neutral-800 dark:text-slate-100 flex items-center gap-1.5 mt-0.5">
              {step.title}
            </h3>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="text-neutral-400 hover:text-neutral-700 dark:text-slate-400 dark:hover:text-slate-200 p-1 rounded-full hover:bg-neutral-50 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Icon & Description Body */}
        <div className="flex flex-col items-center text-center space-y-4 py-3 bg-neutral-50/60 dark:bg-slate-950/30 p-5 rounded-2xl border border-neutral-100 dark:border-slate-850/50">
          <div className="p-3 bg-white dark:bg-slate-950 rounded-full shadow-sm border border-neutral-150/40 dark:border-slate-800">
            {step.icon}
          </div>
          <p className="text-xs text-neutral-600 dark:text-slate-350 leading-relaxed font-medium">
            {step.description}
          </p>
        </div>

        {/* Highlight Bullets */}
        <div className="space-y-2.5">
          {step.bullets.map((bullet, idx) => (
            <div key={idx} className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 mt-1.5 shrink-0"></span>
              <span className="text-xs font-semibold text-neutral-700 dark:text-slate-400 leading-normal">
                {bullet}
              </span>
            </div>
          ))}
        </div>

        {/* Direct Step Indicator Dots */}
        <div className="flex justify-center gap-1.5 pt-1">
          {steps.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrentStep(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentStep ? 'w-5 bg-primary dark:bg-sky-400' : 'w-1.5 bg-neutral-200 dark:bg-slate-800 hover:bg-neutral-350'
              }`}
            />
          ))}
        </div>

        {/* Actions Button Bar */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentStep === 0}
            className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1 transition-all ${
              currentStep === 0 
                ? 'text-neutral-300 dark:text-slate-700 cursor-not-allowed opacity-50' 
                : 'text-neutral-500 dark:text-slate-400 hover:text-neutral-800 dark:hover:text-slate-200 hover:bg-neutral-50 dark:hover:bg-slate-800 cursor-pointer'
            }`}
          >
            <ChevronLeft size={14} /> Back
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="px-5 py-2.5 bg-neutral-850 dark:bg-slate-850 hover:bg-neutral-900 dark:hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-1 shadow-sm transition-all hover:scale-101 cursor-pointer"
          >
            {currentStep === steps.length - 1 ? (
              <>
                Got it! <PartyPopper size={13} />
              </>
            ) : (
              <>
                Next <ChevronRight size={14} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
