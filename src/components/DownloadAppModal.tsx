import React from 'react';
import { 
  X, 
  Smartphone, 
  Download, 
  ChevronRight, 
  Compass, 
  Share, 
  PlusSquare, 
  Bookmark,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

interface DownloadAppModalProps {
  onClose: () => void;
  onTriggerInstall: () => void;
  isInstallAvailable: boolean;
}

export const DownloadAppModal: React.FC<DownloadAppModalProps> = ({ 
  onClose, 
  onTriggerInstall, 
  isInstallAvailable 
}) => {
  return (
    <div className="fixed inset-0 bg-neutral-950/40 z-50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-[32px] p-6 sm:p-8 shadow-2xl border border-neutral-200 dark:border-slate-800 max-w-md w-full space-y-6 animate-scaleUp relative overflow-hidden">
        {/* Top Decorative Gradient Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-sky-450 via-emerald-400 to-indigo-500"></div>

        {/* Modal Header */}
        <div className="flex justify-between items-start mt-1">
          <div className="space-y-1">
            <span className="text-[9px] font-bold tracking-widest text-sky-600 dark:text-sky-400 uppercase bg-sky-50 dark:bg-sky-955 px-2.5 py-1 rounded-full border border-sky-100 dark:border-sky-900/40">
              Android Native Experience
            </span>
            <h3 className="font-extrabold text-lg text-neutral-800 dark:text-slate-100 flex items-center gap-2 mt-2">
              <Smartphone className="text-sky-500 animate-pulse" size={20} />
              Download Android App
            </h3>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="text-neutral-400 hover:text-neutral-700 dark:text-slate-400 dark:hover:text-slate-200 p-1.5 rounded-full hover:bg-neutral-50 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Dynamic Installer Options */}
        {isInstallAvailable ? (
          <div className="space-y-4">
            <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/60 dark:border-emerald-900/40 p-4 rounded-2xl flex items-start gap-3">
              <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={18} />
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-neutral-800 dark:text-slate-100">Ready for Instant Download!</p>
                <p className="text-[11px] text-neutral-500 dark:text-slate-400 leading-normal">
                  Your Android browser supports direct install. Click the download button below to load the native App shell on your phone.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onTriggerInstall();
                onClose();
              }}
              className="w-full py-3.5 bg-gradient-to-r from-sky-500 to-emerald-500 hover:opacity-90 active:scale-98 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-sky-500/10 cursor-pointer transition-all"
            >
              <Download size={15} /> Install BabyPulse App Directly
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100/60 dark:border-amber-900/30 p-3.5 rounded-2xl flex items-start gap-2.5">
              <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={16} />
              <p className="text-[10px] sm:text-[11px] text-neutral-600 dark:text-slate-400 leading-relaxed font-semibold">
                Since you are browsing inside AI Studio or in an iframe environment, direct download triggers might be sandboxed. Follow these simple steps instead for your Android phone:
              </p>
            </div>

            {/* Standard Step-by-Step Android Installation Guide */}
            <div className="space-y-4 bg-neutral-50/60 dark:bg-slate-950/30 p-5 rounded-3xl border border-neutral-100 dark:border-slate-850/50">
              <h4 className="text-[10px] uppercase font-bold text-neutral-400 dark:text-slate-500 tracking-wider">
                Chrome for Android Instructions
              </h4>
              <div className="space-y-3.5">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-white dark:bg-slate-950 border border-neutral-150 shadow-sm flex items-center justify-center text-xs font-black shrink-0 text-sky-500">
                    1
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-bold text-neutral-700 dark:text-slate-200">Open in Chrome or Device Browser</p>
                    <p className="text-[10px] text-neutral-500 dark:text-slate-400 leading-normal">
                      Copy the Shared App URL and open it directly inside your Android Chrome browser.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-white dark:bg-slate-950 border border-neutral-150 shadow-sm flex items-center justify-center text-xs font-black shrink-0 text-sky-500">
                    2
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-bold text-neutral-700 dark:text-slate-200 flex items-center gap-1">
                      Tap Browser Settings Menus <span>(⋮)</span>
                    </p>
                    <p className="text-[10px] text-neutral-500 dark:text-slate-400 leading-normal">
                      Click on the three vertical dots <span className="font-bold">⋮</span> in the top-right corner of the browser shell.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-white dark:bg-slate-950 border border-neutral-150 shadow-sm flex items-center justify-center text-xs font-black shrink-0 text-sky-500">
                    3
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-bold text-neutral-700 dark:text-slate-200">
                      Tap "Add to Home screen" or "Install App"
                    </p>
                    <p className="text-[10px] text-neutral-500 dark:text-slate-400 leading-normal">
                      Confirm installation. The app will generate its offline native Android APK launcher icon instantly on your dashboard!
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Apple iOS alternative just in case */}
            <div className="space-y-2 text-center pt-1 border-t border-neutral-100 dark:border-slate-850">
              <p className="text-[9px] text-neutral-400 dark:text-slate-500 uppercase font-bold tracking-wider">
                💡 iOS Alternative
              </p>
              <p className="text-[10px] text-neutral-500 dark:text-slate-400 leading-normal max-w-xs mx-auto">
                On Safari, tap <span className="font-bold">Share</span> icon then choose <span className="font-bold">"Add to Home Screen"</span> to download.
              </p>
            </div>
          </div>
        )}

        {/* Close Banner Section */}
        <div className="flex justify-between items-center bg-sky-50 dark:bg-sky-950/20 p-3.5 rounded-2xl border border-sky-100/50 dark:border-sky-900/30">
          <div className="flex items-center gap-2 text-sky-700 dark:text-sky-305">
            <Compass size={15} className="text-sky-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Offline Supported</span>
          </div>
          <span className="text-[9px] text-sky-600 dark:text-sky-400 font-bold bg-white dark:bg-slate-950 border border-sky-100 dark:border-sky-900/30 px-2 py-0.5 rounded-full uppercase">
            Includes PWA Storage
          </span>
        </div>
      </div>
    </div>
  );
};
