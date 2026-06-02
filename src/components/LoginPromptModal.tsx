import React from 'react';
import { 
  X, 
  LogIn, 
  ShieldCheck, 
  Baby, 
  MessageSquare, 
  Bell, 
  Users, 
  Sparkles 
} from 'lucide-react';

interface LoginPromptModalProps {
  onClose: () => void;
  onLogin: () => void;
  isInitial?: boolean;
}

export const LoginPromptModal: React.FC<LoginPromptModalProps> = ({ 
  onClose, 
  onLogin,
  isInitial = false
}) => {
  return (
    <div className="fixed inset-0 bg-neutral-950/50 z-55 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-[32px] p-6 sm:p-8 shadow-2xl border border-neutral-200 dark:border-slate-800 max-w-md w-full space-y-6 animate-scaleUp relative overflow-hidden">
        {/* Top Decorative Gradient Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-emerald-400 to-indigo-500"></div>

        {/* Modal Header */}
        <div className="flex justify-between items-start mt-1">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold tracking-widest text-[#df5538] uppercase bg-orange-50 dark:bg-orange-950/20 px-2.5 py-1 rounded-full border border-orange-100 dark:border-orange-900/30">
              {isInitial ? 'Welcome to BabyPulse' : 'Authentication Required'}
            </span>
            <h3 className="font-extrabold text-lg text-neutral-800 dark:text-slate-100 flex items-center gap-2 mt-2">
              <ShieldCheck className="text-primary" size={22} />
              {isInitial ? 'Set Up Your Care Sync' : 'Login Required to Access'}
            </h3>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="text-neutral-400 hover:text-neutral-700 dark:text-slate-400 dark:hover:text-slate-200 p-1.5 rounded-full hover:bg-neutral-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Continue as Guest"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Description */}
        <div className="space-y-4">
          <p className="text-xs text-neutral-500 dark:text-slate-400 leading-relaxed font-medium">
            {isInitial 
              ? "Gain secure real-time sync with your co-parent! Set up your account using Google to unlock instant syncing, multi-device tracking, and direct care messages." 
              : "This function requires an authenticated account to store data safely and sync in real-time with your partner."}
          </p>

          {/* Core Privileges */}
          <div className="space-y-3 bg-neutral-50/65 dark:bg-slate-950/30 p-5 rounded-3xl border border-neutral-100 dark:border-slate-850/50">
            <h4 className="text-[9.5px] uppercase font-extrabold text-neutral-400 dark:text-slate-500 tracking-wider">
              Cloud Synchronized Features Include:
            </h4>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 flex items-center justify-center shrink-0">
                  <Users className="text-indigo-500" size={13} />
                </div>
                <div>
                  <p className="text-xs font-bold text-neutral-700 dark:text-slate-200">Co-Parent Sync Hub</p>
                  <p className="text-[10.5px] text-neutral-400 leading-normal">
                    Pair instantly with your partner to share logs, status, and alerts on separate devices.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-sky-50 dark:bg-sky-950/20 flex items-center justify-center shrink-0">
                  <MessageSquare className="text-sky-500" size={13} />
                </div>
                <div>
                  <p className="text-xs font-bold text-neutral-700 dark:text-slate-200">Direct Care Messenger</p>
                  <p className="text-[10.5px] text-neutral-400 leading-normal">
                    Send quick notes, reactions, and direct care chat messages in real-time.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center shrink-0">
                  <Baby className="text-emerald-500" size={13} />
                </div>
                <div>
                  <p className="text-xs font-bold text-neutral-700 dark:text-slate-200">Routines & Safety Checklists</p>
                  <p className="text-[10.5px] text-neutral-400 leading-normal">
                    Collaborate on food prep checklists, weight tracking, and daily activity routine targets.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Buttons */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => {
              onLogin();
              onClose();
            }}
            className="w-full py-4.5 bg-primary hover:bg-primary-dark active:scale-98 text-white font-extrabold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/10 cursor-pointer transition-all"
          >
            <LogIn size={15} className="stroke-[2.5]" /> Setup Account with Google Sign-In
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-3.5 bg-white border border-neutral-200 hover:bg-neutral-50 dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-slate-800 hover:text-neutral-700 dark:text-slate-300 font-bold text-xs rounded-2xl flex items-center justify-center gap-1 cursor-pointer transition-all"
          >
            <Sparkles size={13} className="text-amber-500" /> Continue as Guest (Read-Only Mode)
          </button>
        </div>
      </div>
    </div>
  );
};
