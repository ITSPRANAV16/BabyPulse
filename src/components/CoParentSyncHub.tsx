import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Check, 
  Clock, 
  Send, 
  Smile, 
  Moon, 
  GlassWater, 
  Activity,
  Sparkles
} from 'lucide-react';

interface CoParentSyncHubProps {
  currentUser: any;
  coParentHandoverNote: string;
  coParentActiveStatus: string;
  coParentHandoverTimestamp: number | null;
  onUpdate: (noteStr: string, statusStr: string) => Promise<void> | void;
  babyName: string;
}

// Preset child states
const STATUS_PRESETS = [
  { label: '☀️ Awake & Playful', value: 'Awake & Active', color: 'bg-emerald-50 text-emerald-800 border-emerald-200 focus:ring-emerald-400' },
  { label: '🍼 Hungry / Feed Time', value: 'Hungry (Needs Milk)', color: 'bg-amber-50 text-amber-800 border-amber-200 focus:ring-amber-400' },
  { label: '💤 Napping / Resting', value: 'Sleeping Soundly', color: 'bg-sky-50 text-sky-800 border-sky-200 focus:ring-sky-400' },
  { label: '🚨 Teething / Fussy', value: 'Fussy (Teething/Gassy)', color: 'bg-rose-50 text-rose-800 border-rose-200 focus:ring-rose-400' },
];

// Quick notes for Dads/Co-Parents
const DAD_SHORTCUTS = [
  { label: '🍼 Gave Milk Bottle', text: 'Gave a fresh milk bottle. Alex finished it fully.' },
  { label: '💩 Diaper Changed', text: 'Changed wet and dirty diaper. Applied rash cream. Alex is fresh!' },
  { label: '🧼 Gave Bath', text: 'Gave warm bath and put on comfortable clean clothes.' },
  { label: '💖 Settled & Content', text: 'Alex was crying but calmed down. Currently relaxed and happy.' },
  { label: '💤 Sleeping Now', text: 'Put Alex down for nap in crib. Fell asleep with minimal rocking.' },
];

export const CoParentSyncHub: React.FC<CoParentSyncHubProps> = ({
  currentUser,
  coParentHandoverNote,
  coParentActiveStatus,
  coParentHandoverTimestamp,
  onUpdate,
  babyName
}) => {
  const [localNote, setLocalNote] = useState(coParentHandoverNote);
  const [selectedStatus, setSelectedStatus] = useState(coParentActiveStatus);
  const [relativeTime, setRelativeTime] = useState<string>('Never updated');
  const [isNoteFocused, setIsNoteFocused] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Keep local values matched with props (especially since firebase onSnapshot updates them live!)
  useEffect(() => {
    setLocalNote(coParentHandoverNote);
  }, [coParentHandoverNote]);

  useEffect(() => {
    setSelectedStatus(coParentActiveStatus);
  }, [coParentActiveStatus]);

  // Update relative timestamp string
  useEffect(() => {
    const updateTime = () => {
      if (!coParentHandoverTimestamp) {
        setRelativeTime('No record yet today');
        return;
      }
      const diffMs = Date.now() - coParentHandoverTimestamp;
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHrs = Math.floor(diffMin / 60);

      if (diffSec < 60) {
        setRelativeTime('Just now');
      } else if (diffMin < 60) {
        setRelativeTime(`${diffMin}m ago`);
      } else if (diffHrs < 24) {
        setRelativeTime(`${diffHrs}h ${diffMin % 60}m ago`);
      } else {
        const dateObj = new Date(coParentHandoverTimestamp);
        setRelativeTime(dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
    };

    updateTime();
    const timer = setInterval(updateTime, 30000); // refresh every 30 seconds
    return () => clearInterval(timer);
  }, [coParentHandoverTimestamp]);

  const handleApplyPresetStatus = (statusValue: string) => {
    setSelectedStatus(statusValue);
  };

  const handleApplyShortcut = (shortcutText: string) => {
    setLocalNote(shortcutText);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      await onUpdate(localNote, selectedStatus);
    } finally {
      setIsUpdating(false);
    }
  };

  const isChanged = localNote !== coParentHandoverNote || selectedStatus !== coParentActiveStatus;

  return (
    <section className="bg-white rounded-3xl p-5 border border-cyan-50/15 shadow-[0_8px_32px_rgba(28,100,142,0.025)] space-y-4 animate-fadeIn">
      {/* Header section with syncing state */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary-light flex items-center justify-center text-primary">
            <Users size={18} className="stroke-[2.5]" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-neutral-800 flex items-center gap-1.5 leading-tight">
              Father's Co-Parent Hub
              <span className="text-[10px] bg-[#e0f5fe] text-primary px-2 py-0.5 rounded-full font-bold uppercase tracking-wider scale-90 sm:scale-100">Sync Status</span>
            </h3>
            <p className="text-[10px] text-neutral-400">Collaborative live alignment assistant for parents</p>
          </div>
        </div>

        <div>
          {currentUser ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-55/10 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Synced Account
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-neutral-400 bg-neutral-100 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-300"></span>
              Local Only (Sign In to Sync)
            </span>
          )}
        </div>
      </div>

      {/* Main Form content */}
      <form onSubmit={handleFormSubmit} className="space-y-4">
        {/* Step 1: Active Baby Status */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wide">
            1. Set {babyName}'s Current Active State
          </label>
          <div className="grid grid-cols-2 gap-2">
            {STATUS_PRESETS.map((preset) => {
              const isSelected = selectedStatus === preset.value;
              return (
                <button
                  type="button"
                  key={preset.value}
                  onClick={() => handleApplyPresetStatus(preset.value)}
                  className={`text-[11px] font-bold py-2 px-3 rounded-2xl border text-left transition-all ${
                    isSelected 
                      ? `${preset.color} border-current ring-1 ring-offset-1 ring-primary/30 shadow-sm font-extrabold` 
                      : 'bg-neutral-50/50 hover:bg-neutral-50 border-neutral-200 text-neutral-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{preset.label}</span>
                    {isSelected && <Check size={11} className="stroke-[3px]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Father/Mother hand-off notes */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wide">
              2. Father Handover Note
            </label>
            <span className="text-[9px] text-neutral-400 font-medium">Clear communication keeps baby happy</span>
          </div>
          
          <div className={`relative rounded-2xl border transition-all ${
            isNoteFocused 
              ? 'border-primary ring-1 ring-primary/25 bg-white' 
              : 'border-neutral-200 bg-neutral-50/40'
          }`}>
            <textarea
              value={localNote}
              onChange={(e) => setLocalNote(e.target.value)}
              placeholder="e.g. Diaper changed. Fed formula, sleeping in cot. Don't wake before 7 PM."
              onFocus={() => setIsNoteFocused(true)}
              onBlur={() => setIsNoteFocused(false)}
              className="w-full text-xs text-neutral-800 bg-transparent px-3 py-2.5 min-h-[70px] focus:outline-none resize-none"
            />
          </div>

          {/* Quick Dad Shortcuts */}
          <div className="space-y-1">
            <span className="block text-[8px] font-bold text-neutral-400 uppercase tracking-wider">
              ⚡ Dad's Speed-Log Shortcuts
            </span>
            <div className="flex flex-wrap gap-1.5 pb-1">
              {DAD_SHORTCUTS.map((shortcut) => (
                <button
                  type="button"
                  key={shortcut.label}
                  onClick={() => handleApplyShortcut(shortcut.text)}
                  className="text-[9px] font-semibold text-primary hover:text-[#00496d] bg-primary-light/40 hover:bg-primary-light/85 border border-primary/10 px-2 py-1 rounded-xl transition-all"
                >
                  {shortcut.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Display Current Live Active Log Card & Update Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-neutral-50/80 p-3.5 rounded-2xl border border-neutral-100">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-neutral-500">Current Alignment:</span>
              <span className="text-[10px] font-extrabold text-neutral-800 rounded bg-[#e7f7ff] px-1.5 py-0.5">
                {selectedStatus}
              </span>
            </div>
            {coParentHandoverNote ? (
              <p className="text-[11px] text-neutral-600 line-clamp-1 italic">
                "{coParentHandoverNote}"
              </p>
            ) : (
              <p className="text-[10px] text-neutral-400 italic">No notes written yet</p>
            )}
            
            <div className="flex items-center gap-1 text-[9px] text-neutral-400 font-medium">
              <Clock size={10} />
              <span>Last update: <span className="font-mono font-bold text-neutral-500">{relativeTime}</span></span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isUpdating || !isChanged}
            className={`cursor-pointer px-4 py-2.5 rounded-xl font-bold text-xs text-white shadow-sm flex items-center justify-center gap-1.5 transition-all ${
              isChanged && !isUpdating
                ? 'bg-primary hover:bg-primary/95 hover:scale-98'
                : 'bg-neutral-300 cursor-not-allowed opacity-80'
            }`}
          >
            {isUpdating ? (
              <span className="w-3.5 h-3.5 rounded-full border-2 border-white/50 border-t-white animate-spin"></span>
            ) : (
              <Send size={11} />
            )}
            {isUpdating ? 'Syncing...' : 'Update live'}
          </button>
        </div>
      </form>
    </section>
  );
};
