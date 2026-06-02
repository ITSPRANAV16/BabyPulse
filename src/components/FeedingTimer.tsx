/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Check, GlassWater, Clock, Plus, Minus } from 'lucide-react';
import { BabyEvent } from '../types';

interface FeedingTimerProps {
  onSave: (event: Omit<BabyEvent, 'id' | 'timestamp'>) => void;
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export function FeedingTimer({ onSave, showToast }: FeedingTimerProps) {
  // Preset options (in minutes)
  const PRESETS = [5, 10, 15, 20, 30];

  const [setupMinutes, setSetupMinutes] = useState<number>(15);
  const [totalSeconds, setTotalSeconds] = useState<number>(15 * 60);
  const [secondsLeft, setSecondsLeft] = useState<number>(15 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [hasStarted, setHasStarted] = useState<boolean>(false);

  // Feeding detailed attributes
  const [feedType, setFeedType] = useState<'Formula' | 'Breast Left' | 'Breast Right' | 'Breast Both'>('Breast Left');
  const [amountOz, setAmountOz] = useState<number>(4);
  const [temp, setTemp] = useState<'Warm' | 'Cold' | 'Room Temp'>('Warm');
  const [notes, setNotes] = useState<string>('');

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync timer limits when setup minutes changes (unless target already active)
  useEffect(() => {
    if (!hasStarted) {
      const secs = setupMinutes * 60;
      setTotalSeconds(secs);
      setSecondsLeft(secs);
    }
  }, [setupMinutes, hasStarted]);

  // Live tick effect
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            
            // Provide dual-pulse tactile feedback (vibrate 500ms, pause 250ms, vibrate 500ms)
            if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
              try {
                navigator.vibrate([500, 250, 500]);
              } catch (e) {
                console.warn("Haptic vibration blocked or not supported on this browser:", e);
              }
            }

            showToast("🍼 Feeding countdown timer finished!", "success");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning, showToast]);

  const handleStartPause = () => {
    setIsRunning(!isRunning);
    setHasStarted(true);
  };

  const handleReset = () => {
    setIsRunning(false);
    setHasStarted(false);
    setSecondsLeft(setupMinutes * 60);
  };

  const handleClearAll = () => {
    setIsRunning(false);
    setHasStarted(false);
    setSetupMinutes(15);
    setTotalSeconds(15 * 60);
    setSecondsLeft(15 * 60);
    setFeedType('Breast Left');
    setAmountOz(4);
    setTemp('Warm');
    setNotes('');
    showToast("Reset completed: Cleared all feeding attributes and timer state!", "info");
  };

  const adjustMinutes = (amount: number) => {
    if (hasStarted) return;
    setSetupMinutes((prev) => Math.max(1, Math.min(60, prev + amount)));
  };

  // Log the elapsed duration
  const handleLogFeeding = () => {
    const elapsedSeconds = totalSeconds - secondsLeft;
    if (elapsedSeconds < 5) {
      showToast("Feeding duration is too short to log. Minimum 5 seconds.", "error");
      return;
    }

    const elapsedMin = Math.floor(elapsedSeconds / 60);
    const elapsedSec = elapsedSeconds % 60;
    
    // Calculate display values
    const now = new Date();
    const hrsRaw = now.getHours();
    const hrs = String(hrsRaw % 12 || 12).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const ampm = hrsRaw >= 12 ? 'PM' : 'AM';
    const dateStr = now.toISOString().split('T')[0];

    // Auto-formatted duration detail
    const durationText = `${elapsedMin > 0 ? `${elapsedMin}m ` : ''}${elapsedSec}s`;
    
    const feedPayload: Omit<BabyEvent, 'id' | 'timestamp'> = {
      type: 'feed',
      title: `Feeding (${feedType})`,
      time: `${hrs}:${mins}`,
      ampm,
      date: dateStr,
      durationMinutes: Math.max(1, Math.round(elapsedSeconds / 60)), // Standard duration field in minutes
      feedType,
      amountOz: feedType === 'Formula' ? amountOz : undefined,
      amountMl: feedType === 'Formula' ? Math.round(amountOz * 29.57) : undefined,
      temp: feedType === 'Formula' ? temp : undefined,
      mood: 'Calm',
      notes: notes.trim() 
        ? `${notes.trim()} (Timer duration: ${durationText})`
        : `Fed for ${durationText} successfully using live countdown timer.`,
    };

    onSave(feedPayload);
    showToast(`Logged feeding session: ${feedType} duration of ${durationText}!`, "success");
    
    // Reset timer
    handleReset();
    setNotes('');
  };

  // Formatting helper MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Progress circle configuration
  const percentage = totalSeconds > 0 ? (secondsLeft / totalSeconds) * 100 : 0;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="bg-white dark:bg-slate-900 border border-neutral-100 dark:border-slate-800 rounded-3xl p-6 shadow-[0_8px_32px_rgba(28,100,142,0.03)] space-y-5 animate-scaleUp">
      <div className="flex justify-between items-center border-b border-neutral-50 dark:border-slate-800/50 pb-3">
        <div>
          <h3 className="font-bold text-sm text-neutral-800 dark:text-slate-100 flex items-center gap-2">
            <Clock className="text-secondary" size={17} />
            Live Feeding Timer
          </h3>
          <p className="text-[10px] text-neutral-400 dark:text-slate-500">
            {hasStarted ? "Session in progress..." : "Configure & start countdown"}
          </p>
        </div>
        
        {hasStarted && (
          <span className="text-[9px] bg-red-100 dark:bg-red-950 text-red-650 dark:text-red-400 font-bold px-2 py-0.5 rounded-full animate-pulse">
            LIVE TIMER
          </span>
        )}
      </div>

      <div className="flex flex-col md:flex-row items-center gap-6 justify-center">
        {/* SVG Circle Timer View */}
        <div className="relative flex items-center justify-center w-36 h-36 shrink-0">
          <svg className="w-full h-full transform -rotate-90">
            {/* Background Circle */}
            <circle
              cx="72"
              cy="72"
              r={radius}
              className="stroke-neutral-100 dark:stroke-slate-800"
              strokeWidth="6"
              fill="transparent"
            />
            {/* Foreground circle indicator */}
            <circle
              cx="72"
              cy="72"
              r={radius}
              className="stroke-secondary transition-all duration-300"
              strokeWidth="6"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
          
          <div className="absolute flex flex-col items-center">
            <span className="text-2xl font-bold font-mono tracking-tight text-neutral-800 dark:text-slate-100">
              {formatTime(secondsLeft)}
            </span>
            <span className="text-[9px] text-neutral-400 uppercase font-bold tracking-wider mt-0.5">
              Ref {setupMinutes}m
            </span>
          </div>
        </div>

        {/* Configurations & Incrementor controls */}
        <div className="flex-1 w-full space-y-4">
          {!hasStarted ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-500 dark:text-slate-400">Target Duration</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => adjustMinutes(-1)}
                    className="w-7 h-7 bg-neutral-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-neutral-600 dark:text-slate-350 hover:bg-neutral-200"
                    title="Decrease 1 min"
                  >
                    <Minus size={13} />
                  </button>
                  <span className="text-xs font-bold font-mono w-10 text-center">
                    {setupMinutes}m
                  </span>
                  <button
                    type="button"
                    onClick={() => adjustMinutes(1)}
                    className="w-7 h-7 bg-neutral-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-neutral-600 dark:text-slate-350 hover:bg-neutral-200"
                    title="Increase 1 min"
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap gap-1.5 justify-start">
                {PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setSetupMinutes(p)}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all ${
                      setupMinutes === p
                        ? 'bg-secondary/10 border-secondary/40 text-secondary'
                        : 'border-neutral-200 dark:border-slate-800 text-neutral-500 hover:bg-neutral-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {p}m
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-3 bg-neutral-50 dark:bg-slate-950/60 rounded-xl border border-neutral-150 dark:border-slate-800/80 text-xs">
              <div className="flex justify-between items-center mb-1 text-neutral-400 text-[10px] uppercase font-bold tracking-wider">
                <span>Timer Details:</span>
                <span>In Progress</span>
              </div>
              <p className="font-semibold text-neutral-700 dark:text-slate-300">
                Tracking {feedType} session ({setupMinutes}m setting).
              </p>
              <p className="text-[10px] text-neutral-400 mt-0.5">
                Elapsed duration is logged to baby timeline immediately on 'Log'.
              </p>
            </div>
          )}

          {/* Action trigger row */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleStartPause}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer ${
                isRunning
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'bg-secondary hover:bg-secondary/95 text-white'
              }`}
            >
              {isRunning ? (
                <>
                  <Pause size={13} /> Pause Timer
                </>
              ) : (
                <>
                  <Play size={13} /> {hasStarted ? "Resume" : "Start Live Timer"}
                </>
              )}
            </button>

            {hasStarted && (
              <button
                type="button"
                onClick={handleReset}
                className="p-2 bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200/80 dark:hover:bg-slate-705 text-neutral-600 dark:text-slate-350 rounded-xl transition-all cursor-pointer"
                title="Reset Timer"
              >
                <RotateCcw size={15} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Segment / Feeding detail fields (Expanded) */}
      <div className="border-t border-neutral-150/60 dark:border-slate-800/60 pt-4 space-y-3.5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-neutral-400 dark:text-slate-500 uppercase mb-1">Feeding Source</label>
            <select
              value={feedType}
              onChange={(e) => setFeedType(e.target.value as any)}
              className="w-full bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none text-neutral-750 dark:text-slate-200"
            >
              <option value="Breast Left">Breast Left 👈</option>
              <option value="Breast Right">Breast Right 👉</option>
              <option value="Breast Both">Breast Both 👐</option>
              <option value="Formula">Formula Bottle 🍼</option>
            </select>
          </div>

          {feedType === 'Formula' ? (
            <div>
              <label className="block text-[10px] font-bold text-neutral-400 dark:text-slate-500 uppercase mb-1">Bottle Amount</label>
              <div className="flex gap-1.5 items-center">
                <input
                  type="number"
                  min={0.5}
                  max={16}
                  step={0.5}
                  value={amountOz}
                  onChange={(e) => setAmountOz(Number(e.target.value))}
                  className="w-full bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-xl px-2 text-xs py-1.5 text-center text-neutral-750 dark:text-slate-100"
                />
                <span className="text-[10px] font-semibold text-neutral-400">oz</span>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-[10px] font-bold text-neutral-400 dark:text-slate-500 uppercase mb-1">Status Indicator</label>
              <div className="bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-neutral-500 dark:text-slate-400 text-center select-none truncate">
                Direct Nursing 🌸
              </div>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-neutral-400 dark:text-slate-500 uppercase">Session Notes (Optional)</label>
          <input
            type="text"
            placeholder="e.g. Swallowed well, burped quickly."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-secondary text-neutral-750 dark:text-slate-100"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleClearAll}
            className="flex-1 py-2.5 bg-neutral-100 hover:bg-neutral-150 dark:bg-slate-800 dark:hover:bg-slate-750 text-neutral-600 dark:text-slate-350 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all duration-150 cursor-pointer"
            title="Reset timer and all selected feed attributes"
          >
            <RotateCcw size={13} /> Reset All
          </button>
          
          <button
            type="button"
            onClick={handleLogFeeding}
            className="flex-[2] py-2.5 bg-neutral-850 hover:bg-neutral-900 dark:bg-slate-850 dark:hover:bg-slate-800 hover:scale-101 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all duration-150 cursor-pointer"
          >
            <Check size={14} /> Log Feeding
          </button>
        </div>
      </div>
    </div>
  );
}
