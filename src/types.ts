/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type EventType = 'sleep' | 'feed' | 'diaper' | 'care';

export interface BabyEvent {
  id: string;
  type: EventType;
  title: string;          // e.g. "Feeding", "Nap Time", "Diaper Change", "Good Morning"
  time: string;           // HH:MM (e.g. "10:30")
  ampm: 'AM' | 'PM';
  date: string;           // YYYY-MM-DD
  timestamp: number;      // raw stamp for sorting
  
  // Sleep specific
  durationMinutes?: number; // e.g. 105 for 1h 45m
  notes?: string;           // e.g. "Fell asleep in crib easily. Quiet environment."
  
  // Feed specific
  feedType?: 'Formula' | 'Breast Left' | 'Breast Right' | 'Breast Both';
  amountOz?: number;        // e.g. 4
  amountMl?: number;        // e.g. 120
  temp?: 'Warm' | 'Cold' | 'Room Temp';
  
  // Diaper specific
  isWet?: boolean;
  isDirty?: boolean;
  diaperNotes?: string;     // e.g. "Wet & Dirty. Applied rash cream."
  mood?: 'Happy' | 'Calm' | 'Fussing' | 'Crying';
}

export interface FoodDiaryEntry {
  id: string;
  mealType: 'Breakfast' | 'Lunch' | 'Snack';
  time: string;           // HH:MM
  ampm: 'AM' | 'PM';
  date: string;           // YYYY-MM-DD
  timestamp: number;
  itemName: string;       // e.g. "Oatmeal with Mashed Banana"
  portion: string;        // e.g. "1/4 cup" or "2 tbsp"
  reaction: 'loved_it' | 'ate_some' | 'not_a_fan' | 'spit_out' | 'none';
  texture: 'Smooth' | 'Chunky' | 'Puree' | 'Mashed' | 'Finger Food';
  isFavorite?: boolean;
}

export interface SpecialInstruction {
  id: string;
  type: 'medical' | 'schedule' | 'general';
  text: string;
}

export interface ScheduledReminder {
  id: string;
  type: 'feed' | 'medication';
  title: string;              // e.g. "Vitamin D Drops", "Afternoon Formula"
  time: string;               // e.g. "17:00" or "05:00"
  ampm: 'AM' | 'PM';
  completedDates?: string[];  // dates on which this is marked completed
  isRepeating?: boolean;      // daily repeat
  amountOz?: number;          // optional, for feed schedules
  notes?: string;             // optional, for medicine instructions
}

export interface SmartInsight {
  id: string;
  type: 'wake_window' | 'feed_pattern' | 'general';
  title: string;
  value: string;
  description: string;
  badge: string;
  theme: 'primary' | 'secondary' | 'tertiary';
}

export interface WeightLog {
  id: string;
  weightLb: number;   // e.g. 12
  weightOz: number;   // e.g. 8 (for 12 lbs 8 oz)
  date: string;       // YYYY-MM-DD
  timestamp: number;  // sorting and charting
  notes?: string;
}

export type GoalCategory = 'feed_oz' | 'sleep_minutes' | 'diapas_wet' | 'diapas_dirty' | 'custom';

export interface DailyGoal {
  id: string;
  category: GoalCategory;
  title: string;       // e.g. "Total Ounces", "Nap duration target"
  target: number;      // e.g. 32
  unit: string;        // e.g. "oz", "mins", "times"
  manualProgress?: { [date: string]: number }; // For custom goals that are tracked manually per day
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  userId?: string; // Standard matching field for permissions and syncing
}

