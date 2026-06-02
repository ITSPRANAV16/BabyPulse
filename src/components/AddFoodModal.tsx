/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Smile, Utensils, Heart } from 'lucide-react';
import { FoodDiaryEntry } from '../types';

interface AddFoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (food: Omit<FoodDiaryEntry, 'id' | 'timestamp'>) => void;
  initialMealType?: 'Breakfast' | 'Lunch' | 'Snack';
  defaultDate?: string;
}

export function AddFoodModal({ isOpen, onClose, onSave, initialMealType = 'Breakfast', defaultDate }: AddFoodModalProps) {
  const [mealType, setMealType] = useState<'Breakfast' | 'Lunch' | 'Snack'>(initialMealType);
  const [time, setTime] = useState<string>(() => {
    if (initialMealType === 'Breakfast') return '08:30';
    if (initialMealType === 'Lunch') return '12:15';
    return '03:00';
  });
  const [ampm, setAmpm] = useState<'AM' | 'PM'>(() => {
    return initialMealType === 'Breakfast' ? 'AM' : 'PM';
  });
  
  const [date, setDate] = useState<string>(() => {
    if (defaultDate) return defaultDate;
    const localDate = new Date();
    const yyyy = localDate.getFullYear();
    const mm = String(localDate.getMonth() + 1).padStart(2, '0');
    const dd = String(localDate.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [itemName, setItemName] = useState<string>('Oatmeal with Mashed Banana');
  const [portion, setPortion] = useState<string>('1/4 cup');
  const [texture, setTexture] = useState<'Smooth' | 'Chunky' | 'Puree' | 'Mashed' | 'Finger Food'>('Smooth');
  const [reaction, setReaction] = useState<'loved_it' | 'ate_some' | 'not_a_fan' | 'spit_out'>('loved_it');
  const [isFavorite, setIsFavorite] = useState<boolean>(true);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      mealType,
      time,
      ampm,
      date,
      itemName,
      portion,
      texture,
      reaction,
      isFavorite
    });
    onClose();
  };

  const handleMealChange = (type: 'Breakfast' | 'Lunch' | 'Snack') => {
    setMealType(type);
    if (type === 'Breakfast') {
      setTime('08:30');
      setAmpm('AM');
      setItemName('Oatmeal with Mashed Banana');
      setPortion('1/4 cup');
      setTexture('Smooth');
    } else if (type === 'Lunch') {
      setTime('12:15');
      setAmpm('PM');
      setItemName('Sweet Potato Puree');
      setPortion('2 tbsp');
      setTexture('Puree');
    } else {
      setTime('03:00');
      setAmpm('PM');
      setItemName('Avocado Mash');
      setPortion('1 tbsp');
      setTexture('Mashed');
    }
  };

  return (
    <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-white/40 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#3c6842] text-white p-6 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-xl">Log Solid Food</h3>
            <p className="text-white/80 text-xs text-secondary-light">Trace first bites and favorites</p>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-neutral-100 p-3 bg-neutral-50 gap-2">
          {(['Breakfast', 'Lunch', 'Snack'] as const).map((meal) => (
            <button
              key={meal}
              type="button"
              onClick={() => handleMealChange(meal)}
              className={`flex-1 py-2 text-xs font-semibold rounded-full transition-all ${
                mealType === meal
                  ? 'bg-secondary text-white shadow-sm'
                  : 'text-neutral-500 hover:bg-neutral-100'
              }`}
            >
              {meal}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {/* Time & Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-600 mb-1" id="food-time-label">TimeOfMeal</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="08:30"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-secondary focus:bg-white transition-colors"
                  required
                />
                <select
                  value={ampm}
                  onChange={(e) => setAmpm(e.target.value as 'AM' | 'PM')}
                  className="bg-neutral-50 border border-neutral-200 rounded-xl px-2 py-2 text-sm focus:outline-none focus:border-secondary"
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-600 mb-1" id="food-date-label">MealDate</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-secondary focus:bg-white"
                required
              />
            </div>
          </div>

          {/* Food Details Bento */}
          <div className="p-4 bg-secondary-light/20 rounded-2xl border border-secondary-light/30 space-y-3">
            <div className="flex gap-2 items-center text-secondary mb-2">
              <Utensils size={15} />
              <span className="text-xs font-bold uppercase tracking-wider">Food & Portions</span>
            </div>

            <div>
              <label className="block text-xs text-neutral-600 mb-1">Food Item Name</label>
              <input
                type="text"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="e.g. Oatmeal with Mashed Banana"
                className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-secondary"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-neutral-600 mb-1">Portion Size</label>
                <input
                  type="text"
                  value={portion}
                  onChange={(e) => setPortion(e.target.value)}
                  placeholder="e.g., 1/4 cup, 2 tbsp"
                  className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-secondary"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-neutral-600 mb-1">Texture</label>
                <select
                  value={texture}
                  onChange={(e) => setTexture(e.target.value as any)}
                  className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-secondary"
                >
                  <option value="Smooth">Smooth</option>
                  <option value="Puree">Puree</option>
                  <option value="Mashed">Mashed</option>
                  <option value="Chunky">Chunky</option>
                  <option value="Finger Food">Finger Food</option>
                </select>
              </div>
            </div>
          </div>

          {/* Reaction Selector Pill Grid */}
          <div>
            <label className="block text-xs font-bold text-neutral-600 mb-2">Baby's Reaction</label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { value: 'loved_it', label: 'Loved it', emoji: '😋' },
                  { value: 'ate_some', label: 'Ate some', emoji: '🙂' },
                  { value: 'not_a_fan', label: 'Not a fan', emoji: '😕' },
                  { value: 'spit_out', label: 'Spit out', emoji: '🤮' },
                ] as const
              ).map((reactOption) => (
                <button
                  key={reactOption.value}
                  type="button"
                  onClick={() => setReaction(reactOption.value)}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                    reaction === reactOption.value
                      ? 'bg-secondary text-white border-secondary'
                      : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  <span>{reactOption.emoji}</span>
                  <span>{reactOption.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Favorite Indicator Checklist */}
          <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-2xl border border-neutral-100">
            <div className="flex items-center gap-2">
              <Heart className={`w-5 h-5 ${isFavorite ? 'text-red-500 fill-red-500' : 'text-neutral-400'}`} />
              <div>
                <p className="text-xs font-bold text-neutral-800">Add to Favorites</p>
                <p className="text-[10px] text-neutral-500">List this under favorite foods</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={isFavorite}
              onChange={(e) => setIsFavorite(e.target.checked)}
              className="w-5 h-5 accent-secondary rounded"
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-sm font-semibold rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 text-sm font-semibold rounded-xl bg-secondary text-white hover:bg-secondary/95 shadow-md hover:shadow-lg transition-all"
            >
              Log Food
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
