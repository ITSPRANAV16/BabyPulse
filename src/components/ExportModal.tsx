/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { X, Printer, Download, Star, Sparkles, Activity } from 'lucide-react';
import { BabyEvent, FoodDiaryEntry, SpecialInstruction } from '../types';
import { printPediatricianReport } from '../utils/printReport';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  events: BabyEvent[];
  foods: FoodDiaryEntry[];
  instructions: SpecialInstruction[];
}

export function ExportModal({ isOpen, onClose, date, events, foods, instructions }: ExportModalProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  // Filter items for the selected day
  const dayEvents = events.filter(e => e.date === date);
  const dayFoods = foods.filter(f => f.date === date);

  // Math stats
  const totalFormulaOz = dayEvents
    .filter(e => e.type === 'feed' && e.feedType === 'Formula')
    .reduce((sum, e) => sum + (e.amountOz || 0), 0);
  
  const totalFormulaMl = dayEvents
    .filter(e => e.type === 'feed' && e.feedType === 'Formula')
    .reduce((sum, e) => sum + (e.amountMl || 0), 0);

  const sleeps = dayEvents.filter(e => e.type === 'sleep');
  const totalSleepMinutes = sleeps.reduce((sum, e) => sum + (e.durationMinutes || 0), 0);
  const sleepHrs = Math.floor(totalSleepMinutes / 60);
  const sleepMins = totalSleepMinutes % 60;

  const wetDiapers = dayEvents.filter(e => e.type === 'diaper' && e.isWet).length;
  const dirtyDiapers = dayEvents.filter(e => e.type === 'diaper' && e.isDirty).length;

  const handlePrint = () => {
    printPediatricianReport(date, events, foods, instructions);
  };

  return (
    <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-white/40 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="bg-primary text-white p-6 flex justify-between items-center shrink-0">
          <div>
            <h3 className="font-bold text-xl flex items-center gap-2">
              <Sparkles size={20} className="text-tertiary-light fill-tertiary-light" />
              Pediatrician Summary
            </h3>
            <p className="text-white/80 text-xs">Ready for medical print or export sharing</p>
          </div>
          <div className="flex gap-2">
            <button 
              type="button" 
              onClick={handlePrint}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-xl text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Printer size={14} />
              Print / Save PDF
            </button>
            <button 
              type="button" 
              onClick={onClose} 
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable body content */}
        <div className="flex-1 overflow-y-auto p-6 bg-neutral-50" ref={printAreaRef}>
          <div className="bg-white rounded-2xl p-8 border border-neutral-200 shadow-sm max-w-xl mx-auto space-y-6">
            
            {/* Report Header Logo Section */}
            <div className="flex justify-between items-start border-b border-neutral-100 pb-6">
              <div>
                <h1 className="text-2xl font-bold text-primary">BabyPulse</h1>
                <p className="text-xs text-neutral-500 font-semibold tracking-wider uppercase mt-1">Caregiver & Pediatrician report</p>
              </div>
              <div className="text-right">
                <span className="bg-primary/10 text-primary font-bold text-xs px-3 py-1.5 rounded-full">
                  Date: {date}
                </span>
                <p className="text-[10px] text-neutral-400 mt-2">Generated 2026-06-01 · 24-Hour Period</p>
              </div>
            </div>

            {/* Quick Metrics Dashboard */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-primary-light/20 p-4 rounded-xl text-center border border-primary-light/30">
                <p className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Formula Feed</p>
                <p className="text-xl font-bold text-primary mt-1">{totalFormulaOz} <span className="text-xs">oz</span></p>
                <p className="text-[10px] text-neutral-500">({totalFormulaMl} ml total)</p>
              </div>
              <div className="bg-secondary-light/35 p-4 rounded-xl text-center border border-secondary-light/30">
                <p className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Total Sleep</p>
                <p className="text-xl font-bold text-secondary mt-1">
                  {sleepHrs}h <span className="text-xs">{sleepMins}m</span>
                </p>
                <p className="text-[10px] text-neutral-500">({sleeps.length} total naps)</p>
              </div>
              <div className="bg-tertiary-light/20 p-4 rounded-xl text-center border border-tertiary-light/30">
                <p className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Diaper Changes</p>
                <p className="text-xl font-bold text-tertiary mt-1">
                  {wetDiapers + dirtyDiapers} <span className="text-xs">total</span>
                </p>
                <p className="text-[10px] text-neutral-500">{wetDiapers} wet · {dirtyDiapers} dirty</p>
              </div>
            </div>

            {/* Special Instructions */}
            {instructions.length > 0 && (
              <div className="bg-red-50/50 rounded-xl p-4 border border-red-100">
                <div className="flex gap-2 items-center text-red-600 font-bold text-xs uppercase tracking-wider mb-2">
                  <Activity size={14} />
                  Care Advice & Instructions
                </div>
                <ul className="space-y-1.5 text-xs text-neutral-700">
                  {instructions.map((inst) => (
                    <li key={inst.id} className="flex gap-2 items-start">
                      <span className="text-red-500">•</span>
                      <span>{inst.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Solid Food Diary Summary */}
            <div className="space-y-3">
              <h3 className="font-bold text-sm text-neutral-800 uppercase tracking-wider border-b border-neutral-100 pb-2">
                Solid Food Diary
              </h3>
              {dayFoods.length > 0 ? (
                <div className="space-y-2">
                  {dayFoods.map((food) => (
                    <div key={food.id} className="flex justify-between items-center p-3 bg-neutral-50 rounded-xl text-xs">
                      <div>
                        <p className="font-bold text-neutral-800">{food.itemName}</p>
                        <p className="text-neutral-500 text-[10px]">
                          {food.mealType} at {food.time} {food.ampm} · Portion: {food.portion} ({food.texture})
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-full font-bold text-[9px] uppercase ${
                        food.reaction === 'loved_it' ? 'bg-green-100 text-green-800' :
                        food.reaction === 'ate_some' ? 'bg-yellow-101 bg-yellow-100 text-yellow-800' :
                        food.reaction === 'not_a_fan' ? 'bg-orange-100 text-orange-850' : 'bg-red-100 text-red-800'
                      }`}>
                        {food.reaction.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-neutral-400 italic text-center py-2">No solid foods recorded for this date.</p>
              )}
            </div>

            {/* Regular Routine Timeline */}
            <div className="space-y-3">
              <h3 className="font-bold text-sm text-neutral-800 uppercase tracking-wider border-b border-neutral-100 pb-2">
                Routine Event Timeline
              </h3>
              {dayEvents.length > 0 ? (
                <div className="divide-y divide-neutral-100 space-y-2.5">
                  {dayEvents.map((evt) => (
                    <div key={evt.id} className="pt-2.5 flex justify-between items-start text-xs">
                      <div className="flex gap-2.5">
                        <span className="font-bold text-neutral-500 whitespace-nowrap">{evt.time} {evt.ampm}</span>
                        <div>
                          <p className="font-bold text-neutral-800">{evt.title}</p>
                          <p className="text-neutral-500 text-[10px]">
                            {evt.type === 'feed' && `${evt.feedType} Bottle · ${evt.amountOz} oz / ${evt.amountMl} ml (${evt.temp})`}
                            {evt.type === 'sleep' && `Duration: ${Math.floor((evt.durationMinutes || 0) / 60)}h ${(evt.durationMinutes || 0) % 60}m · ${evt.notes || ''}`}
                            {evt.type === 'diaper' && `${evt.isWet ? 'Wet' : ''} ${evt.isDirty ? 'Dirty' : ''} · ${evt.diaperNotes || ''}`}
                            {evt.type === 'care' && `${evt.notes || ''}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-neutral-400 italic text-center py-2">No timeline events logged.</p>
              )}
            </div>

            {/* Verification sign-off */}
            <div className="border-t border-neutral-100 pt-6 flex justify-between items-center text-[10px] text-neutral-400">
              <p>BabyPulse Digital Health Companion</p>
              <div className="text-right">
                <p className="border-b border-neutral-200 w-32 ml-auto mb-1"></p>
                <p>Caregiver Signature</p>
              </div>
            </div>

          </div>
        </div>

        {/* Footer print advice */}
        <div className="p-4 bg-neutral-100 border-t border-neutral-200 text-center shrink-0">
          <button 
            type="button" 
            onClick={handlePrint}
            className="px-6 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/95 shadow flex items-center gap-2 mx-auto justify-center"
          >
            <Printer size={16} />
            Launch Print / Open OS Save PDF
          </button>
        </div>

      </div>
    </div>
  );
}
