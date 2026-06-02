import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  Check, 
  Clock, 
  Send, 
  Smile, 
  Moon, 
  GlassWater, 
  Activity,
  Sparkles,
  Copy,
  Link,
  Link2Off,
  UserCheck,
  User,
  Heart,
  Smartphone,
  Bell,
  BellOff,
  MessageSquare
} from 'lucide-react';
import { ChatMessage } from '../types';

interface CoParentSyncHubProps {
  currentUser: any;
  coParentHandoverNote: string;
  coParentActiveStatus: string;
  coParentHandoverTimestamp: number | null;
  onUpdate: (noteStr: string, statusStr: string) => Promise<void> | void;
  babyName: string;
  linkedFamilyId: string | null;
  coParentEmail: string | null;
  coParentName: string | null;
  onConnect: (pairingKey: string) => Promise<void>;
  onDisconnect: () => Promise<void>;
  notificationPermission: string;
  onRequestNotificationPermission: () => Promise<void> | void;
  messages: ChatMessage[];
  onSendMessage: (text: string) => Promise<void> | void;
}

// Preset child states
const STATUS_PRESETS = [
  { label: '☀️ Awake & Playful', value: 'Awake & Active', color: 'bg-emerald-50 text-emerald-800 border-emerald-200 focus:ring-emerald-400' },
  { label: '🍼 Hungry / Feed Time', value: 'Hungry (Needs Milk)', color: 'bg-amber-50 text-amber-800 border-amber-200 focus:ring-amber-400' },
  { label: '💤 Napping / Resting', value: 'Sleeping Soundly', color: 'bg-sky-50 text-sky-800 border-sky-200 focus:ring-sky-400' },
  { label: '🚨 Teething / Fussy', value: 'Fussy (Teething/Gassy)', color: 'bg-rose-50 text-rose-800 border-rose-200 focus:ring-rose-400' },
];

// Quick notes for Speed Logs
const PARENT_SHORTCUTS = [
  { label: '🍼 Gave Milk Bottle', text: 'Gave a fresh milk bottle. Finished it fully.' },
  { label: '💩 Diaper Changed', text: 'Changed wet and dirty diaper. Applied diaper rash protection cream.' },
  { label: '🧼 Bath Time', text: 'Gave a warm relaxing bath and got baby dressed in clean warm clothes.' },
  { label: '💖 Pat & Settled', text: 'Baby is feeling secure, cuddled, and was quickly settled to sleep.' },
  { label: '💤 Sleeping peacefully', text: 'Layed baby in crib. Fell asleep peacefully with soft background lullaby.' },
];

export const CoParentSyncHub: React.FC<CoParentSyncHubProps> = ({
  currentUser,
  coParentHandoverNote,
  coParentActiveStatus,
  coParentHandoverTimestamp,
  onUpdate,
  babyName,
  linkedFamilyId,
  coParentEmail,
  coParentName,
  onConnect,
  onDisconnect,
  notificationPermission,
  onRequestNotificationPermission,
  messages,
  onSendMessage
}) => {
  const [localNote, setLocalNote] = useState(coParentHandoverNote);
  const [selectedStatus, setSelectedStatus] = useState(coParentActiveStatus);
  const [relativeTime, setRelativeTime] = useState<string>('Never updated');
  const [isNoteFocused, setIsNoteFocused] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Coupling form controls
  const [inputKey, setInputKey] = useState('');
  const [showPairingPanel, setShowPairingPanel] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Chat form controls
  const [chatInput, setChatInput] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Keep local values matched with props (live firebase sync triggers)
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
        setRelativeTime('No active hand-off recorded');
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

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setIsSendingChat(true);
    try {
      await onSendMessage(chatInput);
      setChatInput('');
    } finally {
      setIsSendingChat(false);
    }
  };

  const handleCopyPersonalCode = () => {
    if (!currentUser) return;
    navigator.clipboard.writeText(currentUser.uid);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleConnectClick = async () => {
    if (!inputKey.trim()) return;
    setIsLinking(true);
    try {
      await onConnect(inputKey);
      setInputKey('');
    } finally {
      setIsLinking(false);
    }
  };

  const isChanged = localNote !== coParentHandoverNote || selectedStatus !== coParentActiveStatus;
  const isPaired = !!linkedFamilyId;

  return (
    <section className="bg-white rounded-3xl p-5 border border-cyan-50/15 shadow-[0_8px_32px_rgba(28,100,142,0.025)] space-y-4 animate-fadeIn">
      {/* Header section with syncing state */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary-light flex items-center justify-center text-primary">
            <Users size={18} className="stroke-[2.5]" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-neutral-800 flex items-center gap-1.5 leading-tight">
              Community Co-Parent Hub
              {isPaired ? (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wider">
                  2-Parent Synced
                </span>
              ) : (
                <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 border border-amber-100 rounded-full font-bold">
                  Single Diary
                </span>
              )}
            </h3>
            <p className="text-[10px] text-neutral-400">
              {isPaired 
                ? `Paired community diary syncing Mother & Father records`
                : `Connect with your spouse to share diaries in real-time`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-center flex-wrap">
          {notificationPermission !== 'granted' ? (
            <button
              type="button"
              onClick={onRequestNotificationPermission}
              className="text-[10.5px] font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200/50 px-3 py-1.5 rounded-xl cursor-pointer flex items-center gap-1.5 animate-pulse"
              title="Click to grant browser notification permission for real-time alerts"
            >
              <Bell size={12} className="stroke-[2.5]" />
              Enable Alerts
            </button>
          ) : (
            <span 
              className="text-[10.5px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/40 px-3 py-1.5 rounded-xl flex items-center gap-1.5"
              title="Browser notifications active for co-parent updates!"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Alerts Active
            </span>
          )}

          <button
            type="button"
            onClick={() => setShowPairingPanel(!showPairingPanel)}
            className="text-[10.5px] font-bold text-primary hover:text-primary-dark hover:underline bg-primary-light px-3 py-1.5 rounded-xl cursor-pointer"
          >
            {isPaired ? "Manage Partnership" : "⚡ Pair Spouse / Community (Co-parent)"}
          </button>
        </div>
      </div>

      {/* Connection & Community Manage Drawer */}
      {showPairingPanel && (
        <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-4 space-y-3.5 animate-slideDown">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11.5px] font-bold text-slate-800 flex items-center gap-1">
                <Heart size={12} className="text-red-500 fill-red-500" />
                Community Connection Manager
              </p>
              <p className="text-[9.5px] text-slate-500">
                Synchronize two different Google Accounts (e.g., Mother & Father) on separate devices.
              </p>
            </div>
          </div>

          {currentUser ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
              {/* Share section */}
              <div className="bg-white border border-slate-100 p-3 rounded-xl space-y-2">
                <span className="block text-[9px] font-extrabold text-neutral-400 uppercase tracking-wider">
                  My Diary Sync Key
                </span>
                <p className="text-[9.5px] text-neutral-500 leading-snug">
                  Give this code to your partner to let them join your diary and receive live notification alerts.
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] bg-slate-100 border border-slate-200 text-slate-700 px-2 py-1.5 rounded-lg select-all break-all flex-1">
                    {currentUser.uid}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyPersonalCode}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 rounded-lg shrink-0 cursor-pointer"
                  >
                    {copySuccess ? <span className="text-[9px] font-extrabold text-emerald-600">Copied!</span> : <Copy size={12} />}
                  </button>
                </div>
              </div>

              {/* Join section */}
              <div className="bg-white border border-slate-100 p-3 rounded-xl space-y-2">
                <span className="block text-[9px] font-extrabold text-neutral-400 uppercase tracking-wider">
                  Connect to Partner's Diary
                </span>
                {isPaired ? (
                  <div className="space-y-2">
                    <p className="text-[10.5px] font-semibold text-emerald-700 flex items-center gap-1">
                      <UserCheck size={12} />
                      Connected to spouse:
                    </p>
                    <div className="text-[10px] text-neutral-600 font-mono space-y-0.5">
                      <p>📧 {coParentEmail || 'Registered Spouse Email'}</p>
                      <p>👤 Name: {coParentName || 'Spouse Co-Parent'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={onDisconnect}
                      className="w-full mt-1.5 py-1.5 px-3 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 font-bold text-[10px] rounded-lg shrink-0 flex items-center justify-center gap-1 cursor-pointer transition-all"
                    >
                      <Link2Off size={11} />
                      Break Sync Connection
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[9.5px] text-neutral-500">
                      Paste your partner's Diary Sync Key here to combine your logs.
                    </p>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={inputKey}
                        onChange={(e) => setInputKey(e.target.value)}
                        placeholder="Paste partner's Sync Key here..."
                        className="flex-1 text-[10px] bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-lg focus:outline-none focus:border-primary font-mono text-slate-700"
                      />
                      <button
                        type="button"
                        onClick={handleConnectClick}
                        disabled={isLinking || !inputKey.trim()}
                        className="px-3 bg-primary hover:bg-primary-dark disabled:bg-neutral-300 font-bold text-white text-[10px] rounded-lg cursor-pointer flex items-center gap-1 transition-all"
                      >
                        {isLinking ? <span className="w-3 h-3 rounded-full border border-white/50 border-t-white animate-spin"></span> : <Link size={10} />}
                        Link
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-amber-100 p-4 rounded-xl text-center space-y-1">
              <span className="block text-xs font-bold text-amber-800">🔒 Account Registration Required</span>
              <p className="text-[10.5px] text-neutral-500">
                To link devices, Mother and Father must log in with separate Google accounts first using the "Google Sync" option in Settings or Title bar.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Main Form content */}
      <form onSubmit={handleFormSubmit} className="space-y-4">
        {/* Step 1: Active Baby Status */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-extrabold text-neutral-400 uppercase tracking-wide">
            1. Set {babyName}'s Live Operational State
          </label>
          <div className="grid grid-cols-2 gap-2">
            {STATUS_PRESETS.map((preset) => {
              const isSelected = selectedStatus === preset.value;
              return (
                <button
                  type="button"
                  key={preset.value}
                  onClick={() => handleApplyPresetStatus(preset.value)}
                  className={`text-[11px] font-bold py-2.5 px-3 rounded-2xl border text-left transition-all cursor-pointer ${
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

        {/* Step 2: Shared hand-over notes */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="block text-[10px] font-extrabold text-neutral-400 uppercase tracking-wide">
              2. Shared Handover Note & Live Status Feed
            </label>
            <span className="text-[9px] text-neutral-400 font-medium">Keep your partner aligned instantly</span>
          </div>
          
          <div className={`relative rounded-2xl border transition-all ${
            isNoteFocused 
              ? 'border-primary ring-1 ring-primary/25 bg-white' 
              : 'border-neutral-200 bg-neutral-50/40'
          }`}>
            <textarea
              value={localNote}
              onChange={(e) => setLocalNote(e.target.value)}
              placeholder="e.g. Fed formula 4oz. Diaper changed and put on sleeping clothes. Sleeping soundly, do not wake before 7 PM."
              onFocus={() => setIsNoteFocused(true)}
              onBlur={() => setIsNoteFocused(false)}
              className="w-full text-xs text-neutral-800 bg-transparent px-3 py-2.5 min-h-[75px] focus:outline-none resize-none"
            />
          </div>

          {/* Quick Speed Shortcuts */}
          <div className="space-y-1">
            <span className="block text-[8px] font-extrabold text-neutral-400 uppercase tracking-wider">
              ⚡ Speed Handover Shortcuts
            </span>
            <div className="flex flex-wrap gap-1.5 pb-1">
              {PARENT_SHORTCUTS.map((shortcut) => (
                <button
                  type="button"
                  key={shortcut.label}
                  onClick={() => handleApplyShortcut(shortcut.text)}
                  className="text-[9.5px] font-bold text-primary hover:text-[#00496d] bg-primary-light/40 hover:bg-primary-light/85 border border-primary/10 px-2.5 py-1 rounded-xl transition-all cursor-pointer"
                >
                  {shortcut.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Display Current Live Active Log Card & Update Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-neutral-50/80 p-3.5 rounded-2xl border border-neutral-100">
          <div className="space-y-1 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[9.5px] font-bold text-neutral-500">Last Synced Status:</span>
              <span className="text-[9.5px] font-extrabold text-primary rounded bg-primary-light px-2 py-0.5 border border-primary/10">
                {coParentActiveStatus}
              </span>
            </div>
            {coParentHandoverNote ? (
              <p className="text-[11px] text-neutral-600 italic">
                "{coParentHandoverNote}"
              </p>
            ) : (
              <p className="text-[10px] text-neutral-400 italic">No notes written click shortcuts above to compose</p>
            )}
            
            <div className="flex items-center gap-1 text-[9px] text-neutral-400 font-medium">
              <Clock size={10} />
              <span>Timestamp: <span className="font-mono font-bold text-neutral-500">{relativeTime}</span></span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isUpdating || !isChanged}
            className={`cursor-pointer px-4 py-3 rounded-xl font-bold text-xs text-white shadow-sm flex items-center justify-center gap-1.5 transition-all shrink-0 ${
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
            {isUpdating ? 'Broadcasting...' : 'Broadcast to Partner'}
          </button>
        </div>
      </form>

      {/* Real-time Care Chat Thread */}
      <div className="border-t border-neutral-100 pt-4 mt-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-sky-50 text-sky-850 rounded-lg">
              <MessageSquare size={14} className="stroke-[2.5]" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-neutral-800 flex items-center gap-1">
                Direct Care Messenger
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </h4>
              <p className="text-[9.5px] text-neutral-400">Exchange direct updates with your co-parent</p>
            </div>
          </div>
          {isPaired && (
            <span className="text-[9px] font-extrabold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-150/40">
              Active with partner
            </span>
          )}
        </div>

        {/* Messages Feed Box */}
        <div className="bg-neutral-50/50 border border-neutral-200/60 rounded-2xl p-3 h-[240px] flex flex-col justify-between overflow-hidden">
          <div className="overflow-y-auto space-y-2.5 flex-1 pr-1.5 scrollbar-thin max-h-[190px]">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                  <MessageSquare size={16} />
                </div>
                <p className="text-[10.5px] font-bold text-neutral-500">No care messages yet</p>
                <p className="text-[9px] text-neutral-400 max-w-[220px]">Send a quick update, confirmation, or nursing question to your partner.</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = currentUser 
                  ? msg.senderId === currentUser.uid 
                  : msg.senderId === 'local-parent';

                // Format timestamp
                let timeStr = '';
                if (msg.timestamp) {
                  const dObj = new Date(msg.timestamp);
                  timeStr = dObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                }

                return (
                  <div 
                    key={msg.id} 
                    className={`flex flex-col max-w-[85%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                  >
                    <span className="text-[8.5px] font-bold text-neutral-400 mb-0.5 px-1">
                      {isMe ? 'You' : (msg.senderName || 'Partner')} • {timeStr}
                    </span>
                    <div className={`p-2.5 rounded-2xl text-xs leading-normal shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${
                      isMe 
                        ? 'bg-primary text-white rounded-tr-none' 
                        : 'bg-white border border-neutral-200 text-neutral-800 rounded-tl-none'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Chat Input Form */}
          <form onSubmit={handleSendChatMessage} className="flex gap-2 border-t border-neutral-150 pt-2 shrink-0">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={currentUser ? "Type a message about baby care..." : "Log in to chat in real-time with partner..."}
              disabled={isSendingChat || !currentUser}
              className="flex-1 text-xs bg-white border border-neutral-200 px-3 py-2 rounded-xl focus:outline-none focus:border-primary disabled:bg-neutral-100 disabled:cursor-not-allowed text-neutral-800 placeholder-neutral-400 font-medium"
            />
            <button
              type="submit"
              disabled={isSendingChat || !chatInput.trim() || !currentUser}
              className="px-3 py-2 bg-primary hover:bg-primary-dark disabled:bg-neutral-200 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-all shrink-0 shadow-sm"
              title="Send Care Chat Message"
            >
              {isSendingChat ? (
                <span className="w-3.5 h-3.5 rounded-full border border-white/50 border-t-white animate-spin"></span>
              ) : (
                <Send size={11} className="stroke-[2.5]" />
              )}
              Send
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};
