/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { X, Clock, GlassWater, Bed, Trash2, ShieldAlert, Mic, MicOff } from 'lucide-react';
import { BabyEvent, EventType } from '../types';

interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: Omit<BabyEvent, 'id' | 'timestamp'>) => void;
  initialType?: EventType;
  defaultDate?: string;
}

export function AddEventModal({ isOpen, onClose, onSave, initialType = 'sleep', defaultDate }: AddEventModalProps) {
  const [type, setType] = useState<EventType>(initialType);
  const [time, setTime] = useState<string>(() => {
    const now = new Date();
    const hrs = String(now.getHours() % 12 || 12).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    return `${hrs}:${mins}`;
  });
  const [ampm, setAmpm] = useState<'AM' | 'PM'>(() => {
    return new Date().getHours() >= 12 ? 'PM' : 'AM';
  });
  
  const [date, setDate] = useState<string>(() => {
    if (defaultDate) return defaultDate;
    const localDate = new Date();
    const yyyy = localDate.getFullYear();
    const mm = String(localDate.getMonth() + 1).padStart(2, '0');
    const dd = String(localDate.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  // Sleep specifics
  const [durationHr, setDurationHr] = useState<number>(1);
  const [durationMin, setDurationMin] = useState<number>(45);
  const [sleepNotes, setSleepNotes] = useState<string>('Fell asleep easily in crib.');

  // Feed specifics
  const [feedType, setFeedType] = useState<'Formula' | 'Breast Left' | 'Breast Right' | 'Breast Both'>('Formula');
  const [amountOz, setAmountOz] = useState<number>(4);
  const [temp, setTemp] = useState<'Warm' | 'Cold' | 'Room Temp'>('Warm');

  // Diaper specifics
  const [isWet, setIsWet] = useState<boolean>(true);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [diaperNotes, setDiaperNotes] = useState<string>('Wet diaper. Applied rash cream.');

  // General Care notes
  const [careTitle, setCareTitle] = useState<string>('Tummy Time');
  const [careNotes, setCareNotes] = useState<string>('Lifted head well for 5 minutes.');

  // Mood selection state (available to all types)
  const [mood, setMood] = useState<'Happy' | 'Calm' | 'Fussing' | 'Crying'>('Happy');

  const [isListening, setIsListening] = useState<boolean>(false);
  const [activeListenField, setActiveListenField] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const toggleListening = (fieldName: 'sleep' | 'diaper' | 'care') => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please try Chrome or Safari.");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      setActiveListenField(null);
      if (activeListenField === fieldName) {
        return;
      }
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setActiveListenField(fieldName);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (fieldName === 'sleep') {
        setSleepNotes((prev) => (prev ? `${prev} ${transcript}` : transcript));
      } else if (fieldName === 'diaper') {
        setDiaperNotes((prev) => (prev ? `${prev} ${transcript}` : transcript));
      } else if (fieldName === 'care') {
        setCareNotes((prev) => (prev ? `${prev} ${transcript}` : transcript));
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('Speech recognition error:', event.error);
      setIsListening(false);
      setActiveListenField(null);
    };

    recognition.onend = () => {
      setIsListening(false);
      setActiveListenField(null);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const eventPayload: any = {
      type,
      time,
      ampm,
      date,
      mood,
    };

    if (type === 'sleep') {
      eventPayload.title = 'Nap Time';
      eventPayload.durationMinutes = (durationHr * 60) + durationMin;
      eventPayload.notes = sleepNotes;
    } else if (type === 'feed') {
      eventPayload.title = 'Feeding';
      eventPayload.feedType = feedType;
      eventPayload.amountOz = amountOz;
      eventPayload.amountMl = Math.round(amountOz * 29.5735); // Oz to ml
      eventPayload.temp = temp;
    } else if (type === 'diaper') {
      eventPayload.title = 'Diaper Change';
      eventPayload.isWet = isWet;
      eventPayload.isDirty = isDirty;
      let calculatedNotes = diaperNotes;
      if (!calculatedNotes) {
        calculatedNotes = `${isWet ? 'Wet' : ''}${isWet && isDirty ? ' & ' : ''}${isDirty ? 'Dirty' : ''}.`;
      }
      eventPayload.diaperNotes = calculatedNotes;
    } else {
      eventPayload.title = careTitle;
      eventPayload.notes = careNotes;
    }

    onSave(eventPayload);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-white/40 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-primary text-white p-6 flex justify-between items-center relative">
          <div>
            <h3 className="font-bold text-xl">Log Baby Activity</h3>
            <p className="text-white/80 text-xs">Record routine stats instantly</p>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-neutral-100 p-3 bg-neutral-50 gap-2">
          {(['sleep', 'feed', 'diaper', 'care'] as EventType[]).map((tabType) => (
            <button
              key={tabType}
              type="button"
              onClick={() => setType(tabType)}
              className={`flex-1 py-2 text-xs font-semibold capitalize rounded-full transition-all ${
                type === tabType
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-neutral-500 hover:bg-neutral-100'
              }`}
            >
              {tabType}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Shared parameters: Time and Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-600 mb-1" id="time-label">Time</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="08:30"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary focus:bg-white transition-colors"
                  required
                />
                <select
                  value={ampm}
                  onChange={(e) => setAmpm(e.target.value as 'AM' | 'PM')}
                  className="bg-neutral-50 border border-neutral-200 rounded-xl px-2 py-2 text-sm focus:outline-none focus:border-primary"
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-600 mb-1" id="date-label">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary focus:bg-white"
                required
              />
            </div>
          </div>

          {/* Conditional parameters based on Type */}

          {type === 'sleep' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 bg-primary-light/20 rounded-2xl border border-primary-light/30">
                <div className="flex gap-2 items-center text-primary mb-2">
                  <Bed size={16} />
                  <span className="text-xs font-bold uppercase tracking-wider">Nap Parameter</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-neutral-600 mb-1">Hours</label>
                    <input
                      type="number"
                      min={0}
                      max={12}
                      value={durationHr}
                      onChange={(e) => setDurationHr(Number(e.target.value))}
                      className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-600 mb-1">Minutes</label>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={durationMin}
                      onChange={(e) => setDurationMin(Number(e.target.value))}
                      className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-neutral-600">Nap Description/Notes</label>
                  <button
                    type="button"
                    onClick={() => toggleListening('sleep')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-tight transition-all border ${
                      isListening && activeListenField === 'sleep'
                        ? 'bg-red-500 border-red-600 text-white animate-pulse'
                        : 'bg-neutral-100 hover:bg-neutral-200 border-neutral-200 text-neutral-600 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {isListening && activeListenField === 'sleep' ? (
                      <>
                        <MicOff size={11} className="animate-bounce" />
                        <span>Listening...</span>
                      </>
                    ) : (
                      <>
                        <Mic size={11} />
                        <span>Speak Notes</span>
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  value={sleepNotes}
                  onChange={(e) => setSleepNotes(e.target.value)}
                  rows={3}
                  placeholder="e.g., Fell asleep easily in crib. Quiet environment."
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary focus:bg-white"
                />
              </div>
            </div>
          )}

          {type === 'feed' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 bg-secondary-light/20 rounded-2xl border border-secondary-light/30">
                <div className="flex gap-2 items-center text-secondary mb-3">
                  <GlassWater size={16} />
                  <span className="text-xs font-bold uppercase tracking-wider">Formula / Breast Details</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-neutral-600 mb-1">Feeding Source</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Formula', 'Breast Left', 'Breast Right', 'Breast Both'].map((src) => (
                        <button
                          key={src}
                          type="button"
                          onClick={() => setFeedType(src as any)}
                          className={`py-2 text-xs font-medium rounded-xl border transition-all ${
                            feedType === src
                              ? 'bg-secondary border-secondary text-white'
                              : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                          }`}
                        >
                          {src}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs text-neutral-600 mb-1">Amount (Ounces)</label>
                      <input
                        type="number"
                        min={0.5}
                        max={16}
                        step={0.5}
                        value={amountOz}
                        onChange={(e) => setAmountOz(Number(e.target.value))}
                        className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-sm"
                      />
                      <span className="text-[10px] text-neutral-400 mt-1 block">
                        ≈ {Math.round(amountOz * 29.57)} ml
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs text-neutral-600 mb-1">Temperature</label>
                      <select
                        value={temp}
                        onChange={(e) => setTemp(e.target.value as any)}
                        className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-sm"
                      >
                        <option value="Warm">Warm</option>
                        <option value="Cold">Cold</option>
                        <option value="Room Temp">Room Temp</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {type === 'diaper' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 bg-tertiary-light/20 rounded-2xl border border-tertiary-light/30">
                <div className="flex gap-2 items-center text-tertiary mb-3">
                  <ShieldAlert size={16} />
                  <span className="text-xs font-bold uppercase tracking-wider">Diaper Status</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setIsWet(!isWet)}
                    className={`py-3 text-sm font-semibold rounded-2xl border flex flex-col items-center gap-1 transition-all ${
                      isWet
                        ? 'bg-primary-light/30 border-primary text-primary'
                        : 'border-neutral-200 text-neutral-500 bg-white hover:bg-neutral-50'
                    }`}
                  >
                    <span className="text-xs font-bold uppercase">Wet</span>
                    <span className="text-[10px]">{isWet ? '✅ Selected' : 'Not Wet'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsDirty(!isDirty)}
                    className={`py-3 text-sm font-semibold rounded-2xl border flex flex-col items-center gap-1 transition-all ${
                      isDirty
                        ? 'bg-tertiary-light/30 border-tertiary text-tertiary'
                        : 'border-neutral-200 text-neutral-500 bg-white hover:bg-neutral-50'
                    }`}
                  >
                    <span className="text-xs font-bold uppercase">Dirty</span>
                    <span className="text-[10px]">{isDirty ? '✅ Selected' : 'Not Dirty'}</span>
                  </button>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-neutral-600">Diaper Notes</label>
                  <button
                    type="button"
                    onClick={() => toggleListening('diaper')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-tight transition-all border ${
                      isListening && activeListenField === 'diaper'
                        ? 'bg-red-500 border-red-600 text-white animate-pulse'
                        : 'bg-neutral-100 hover:bg-neutral-200 border-neutral-200 text-neutral-600 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {isListening && activeListenField === 'diaper' ? (
                      <>
                        <MicOff size={11} className="animate-bounce" />
                        <span>Listening...</span>
                      </>
                    ) : (
                      <>
                        <Mic size={11} />
                        <span>Speak Notes</span>
                      </>
                    )}
                  </button>
                </div>
                <input
                  type="text"
                  value={diaperNotes}
                  onChange={(e) => setDiaperNotes(e.target.value)}
                  placeholder="e.g., Wet & Dirty. Applied rash cream."
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary focus:bg-white"
                />
              </div>
            </div>
          )}

          {type === 'care' && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1">Activity Name/Title</label>
                <input
                  type="text"
                  value={careTitle}
                  onChange={(e) => setCareTitle(e.target.value)}
                  placeholder="e.g., Tummy Time, Good Morning, Bath"
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary focus:bg-white"
                  required
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-neutral-600">Observation / Details</label>
                  <button
                    type="button"
                    onClick={() => toggleListening('care')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-tight transition-all border ${
                      isListening && activeListenField === 'care'
                        ? 'bg-red-500 border-red-600 text-white animate-pulse'
                        : 'bg-neutral-100 hover:bg-neutral-200 border-neutral-200 text-neutral-600 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {isListening && activeListenField === 'care' ? (
                      <>
                        <MicOff size={11} className="animate-bounce" />
                        <span>Listening...</span>
                      </>
                    ) : (
                      <>
                        <Mic size={11} />
                        <span>Speak Notes</span>
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  value={careNotes}
                  onChange={(e) => setCareNotes(e.target.value)}
                  rows={3}
                  placeholder="Describe details..."
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary focus:bg-white"
                />
              </div>
            </div>
          )}

          {/* Mood Selector (Common for all event types) */}
          <div className="space-y-2 pt-4 border-t border-neutral-100">
            <span className="block text-xs font-bold text-neutral-600">
              Baby's Mood
            </span>
            <div className="grid grid-cols-4 gap-2">
              {[
                { name: 'Happy', emoji: '😊' },
                { name: 'Calm', emoji: '😌' },
                { name: 'Fussing', emoji: '😕' },
                { name: 'Crying', emoji: '😢' },
              ].map((m) => {
                const isSelected = mood === m.name;
                return (
                  <button
                    key={m.name}
                    type="button"
                    onClick={() => setMood(m.name as any)}
                    className={`flex flex-col items-center py-2 px-1 rounded-2xl border text-[11px] font-medium transition-all gap-1 ${
                      isSelected
                        ? 'border-primary ring-2 ring-primary/15 bg-primary/5 text-primary scale-102 font-bold'
                        : 'border-neutral-200 text-neutral-500 bg-white hover:bg-neutral-50'
                    }`}
                  >
                    <span className="text-base">{m.emoji}</span>
                    <span>{m.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-sm font-semibold rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary/95 shadow-md hover:shadow-lg transition-all"
            >
              Create Log
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
