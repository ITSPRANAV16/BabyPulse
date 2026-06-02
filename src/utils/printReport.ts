/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BabyEvent, FoodDiaryEntry, SpecialInstruction } from '../types';

export function printPediatricianReport(
  date: string,
  events: BabyEvent[],
  foods: FoodDiaryEntry[],
  instructions: SpecialInstruction[]
) {
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

  const windowUrl = 'about:blank';
  const uniqueName = new Date().getTime();
  const windowName = 'Print' + uniqueName;
  const printWindow = window.open(windowUrl, windowName, 'left=50,top=50,width=800,height=900,toolbar=0,scrollbars=0,status=0');

  if (printWindow) {
    const specialInstructionsHtml = instructions.length > 0
      ? `
        <div class="bg-red-50 rounded-xl p-4 border border-red-100">
          <div class="flex gap-2 items-center text-red-600 font-bold text-xs uppercase tracking-wider mb-2">
            Care Advice & Instructions
          </div>
          <ul class="space-y-1.5 text-xs text-neutral-700">
            ${instructions.map((inst) => `
              <li class="flex gap-2 items-start">
                <span class="text-red-500">•</span>
                <span>${inst.text}</span>
              </li>
            `).join('')}
          </ul>
        </div>
      `
      : '';

    const foodsHtml = dayFoods.length > 0
      ? `
        <div class="space-y-2">
          ${dayFoods.map((food) => {
            const reactionClass = 
              food.reaction === 'loved_it' ? 'bg-green-100 text-green-800' :
              food.reaction === 'ate_some' ? 'bg-yellow-101 bg-yellow-100 text-yellow-800' :
              food.reaction === 'not_a_fan' ? 'bg-orange-100 text-orange-850' : 'bg-red-100 text-red-800';
            return `
              <div class="flex justify-between items-center p-3 bg-neutral-50 rounded-xl text-xs">
                <div>
                  <p class="font-bold text-neutral-800">${food.itemName}</p>
                  <p class="text-neutral-500 text-[10px]">
                    ${food.mealType} at ${food.time} ${food.ampm} · Portion: ${food.portion} (${food.texture})
                  </p>
                </div>
                <span class="px-2 py-1 rounded-full font-bold text-[9px] uppercase ${reactionClass}">
                  ${food.reaction.replace('_', ' ')}
                </span>
              </div>
            `;
          }).join('')}
        </div>
      `
      : '<p class="text-xs text-neutral-400 italic text-center py-2">No solid foods recorded for this date.</p>';

    const eventsHtml = dayEvents.length > 0
      ? `
        <div class="divide-y divide-neutral-100 space-y-2.5">
          ${dayEvents.map((evt) => {
            const detailText = 
              evt.type === 'feed' ? `${evt.feedType} Bottle · ${evt.amountOz} oz / ${evt.amountMl} ml (${evt.temp})` :
              evt.type === 'sleep' ? `Duration: ${Math.floor((evt.durationMinutes || 0) / 60)}h ${(evt.durationMinutes || 0) % 60}m · ${evt.notes || ''}` :
              evt.type === 'diaper' ? `${evt.isWet ? 'Wet' : ''} ${evt.isDirty ? 'Dirty' : ''} · ${evt.diaperNotes || ''}` :
              `${evt.notes || ''}`;
            
            return `
              <div class="pt-2.5 flex justify-between items-start text-xs">
                <div class="flex gap-2.5">
                  <span class="font-bold text-neutral-500 whitespace-nowrap">${evt.time} ${evt.ampm}</span>
                  <div>
                    <p class="font-bold text-neutral-800">${evt.title}</p>
                    <p class="text-neutral-500 text-[10px]">${detailText}</p>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `
      : '<p class="text-xs text-neutral-400 italic text-center py-2">No timeline events logged.</p>';

    printWindow.document.write(`
      <html>
        <head>
          <title>BabyPulse Daily Pediatrician Report - ${date}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
          <style>
            body {
              font-family: 'Plus Jakarta Sans', sans-serif;
              background-color: white;
              color: #191c1e;
              padding: 40px;
            }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="bg-white rounded-2xl p-8 border border-neutral-200 max-w-xl mx-auto space-y-6">
            
            <!-- Report Header Logo Section -->
            <div class="flex justify-between items-start border-b border-neutral-101 pb-6">
              <div>
                <h1 class="text-2xl font-bold text-[#1c648e]">BabyPulse</h1>
                <p class="text-xs text-neutral-500 font-semibold tracking-wider uppercase mt-1">Caregiver & Pediatrician report</p>
              </div>
              <div class="text-right">
                <span class="bg-[#1c648e]/10 text-[#1c648e] font-bold text-xs px-3 py-1.5 rounded-full">
                  Date: ${date}
                </span>
                <p class="text-[10px] text-neutral-400 mt-2">Generated · 24-Hour Period</p>
              </div>
            </div>

            <!-- Quick Metrics Dashboard -->
            <div class="grid grid-cols-3 gap-3">
              <div class="bg-[#1c648e]/5 p-4 rounded-xl text-center border border-[#1c648e]/10">
                <p class="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Formula Feed</p>
                <p class="text-xl font-bold text-[#1c648e] mt-1">${totalFormulaOz} <span class="text-xs">oz</span></p>
                <p class="text-[10px] text-neutral-500">(${totalFormulaMl} ml total)</p>
              </div>
              <div class="bg-amber-500/5 p-4 rounded-xl text-center border border-amber-500/10">
                <p class="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Total Sleep</p>
                <p class="text-xl font-bold text-amber-600 mt-1">
                  ${sleepHrs}h <span class="text-xs">${sleepMins}m</span>
                </p>
                <p class="text-[10px] text-neutral-500">(${sleeps.length} total naps)</p>
              </div>
              <div class="bg-indigo-500/5 p-4 rounded-xl text-center border border-indigo-500/10">
                <p class="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Diaper Changes</p>
                <p class="text-xl font-bold text-indigo-600 mt-1">
                  ${wetDiapers + dirtyDiapers} <span class="text-xs">total</span>
                </p>
                <p class="text-[10px] text-neutral-500">${wetDiapers} wet · ${dirtyDiapers} dirty</p>
              </div>
            </div>

            <!-- Special Instructions -->
            ${specialInstructionsHtml}

            <!-- Solid Food Diary Summary -->
            <div class="space-y-3">
              <h3 class="font-bold text-sm text-neutral-800 uppercase tracking-wider border-b border-neutral-100 pb-2">
                Solid Food Diary
              </h3>
              ${foodsHtml}
            </div>

            <!-- Regular Routine Timeline -->
            <div class="space-y-3">
              <h3 class="font-bold text-sm text-neutral-800 uppercase tracking-wider border-b border-neutral-100 pb-2">
                Routine Event Timeline
              </h3>
              ${eventsHtml}
            </div>

            <!-- Verification sign-off -->
            <div class="border-t border-neutral-100 pt-6 flex justify-between items-center text-[10px] text-neutral-400">
              <p>BabyPulse Digital Health Companion</p>
              <div class="text-right">
                <p class="border-b border-neutral-200 w-32 ml-auto mb-1"></p>
                <p>Caregiver Signature</p>
              </div>
            </div>

          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }
}
