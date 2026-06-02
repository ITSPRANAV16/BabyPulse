/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BabyEvent, FoodDiaryEntry, SpecialInstruction, SmartInsight, ScheduledReminder, WeightLog, DailyGoal } from './types';

export const INITIAL_EVENTS: BabyEvent[] = [
  {
    id: 'e1',
    type: 'feed',
    title: 'Feeding',
    time: '10:30',
    ampm: 'AM',
    date: '2023-10-24',
    timestamp: new Date('2023-10-24T10:30:00').getTime(),
    feedType: 'Formula',
    amountOz: 4,
    amountMl: 120,
    temp: 'Warm',
    mood: 'Happy'
  },
  {
    id: 'e2',
    type: 'sleep',
    title: 'Nap Time',
    time: '08:15',
    ampm: 'AM',
    date: '2023-10-24',
    timestamp: new Date('2023-10-24T08:15:00').getTime(),
    durationMinutes: 105, // 1h 45m
    notes: 'Fell asleep in crib easily. Quiet environment.',
    mood: 'Calm'
  },
  {
    id: 'e3',
    type: 'diaper',
    title: 'Diaper Change',
    time: '07:30',
    ampm: 'AM',
    date: '2023-10-24',
    timestamp: new Date('2023-10-24T07:30:00').getTime(),
    isWet: true,
    isDirty: true,
    diaperNotes: 'Wet & Dirty. Applied rash cream.',
    mood: 'Fussing'
  },
  {
    id: 'e4',
    type: 'care',
    title: 'Good Morning',
    time: '06:45',
    ampm: 'AM',
    date: '2023-10-24',
    timestamp: new Date('2023-10-24T06:45:00').getTime(),
    notes: 'Woke up smiling. Ready to start the day!',
    mood: 'Happy'
  }
];

export const INITIAL_FOODS: FoodDiaryEntry[] = [
  {
    id: 'f1',
    mealType: 'Breakfast',
    time: '08:30',
    ampm: 'AM',
    date: '2023-10-24',
    timestamp: new Date('2023-10-24T08:30:00').getTime(),
    itemName: 'Oatmeal with Mashed Banana',
    portion: '1/4 cup',
    reaction: 'loved_it',
    texture: 'Smooth',
    isFavorite: true
  },
  {
    id: 'f2',
    mealType: 'Lunch',
    time: '12:15',
    ampm: 'PM',
    date: '2023-10-24',
    timestamp: new Date('2023-10-24T12:15:00').getTime(),
    itemName: 'Sweet Potato Puree',
    portion: '2 tbsp',
    reaction: 'ate_some',
    texture: 'Puree',
    isFavorite: true
  },
  {
    id: 'f3',
    mealType: 'Snack',
    time: '03:00',
    ampm: 'PM',
    date: '2023-10-24',
    timestamp: new Date('2023-10-24T15:00:00').getTime(),
    itemName: 'Avocado Mash',
    portion: '1 tbsp',
    reaction: 'not_a_fan',
    texture: 'Mashed',
    isFavorite: false
  }
];

export const INITIAL_SPECIAL_INSTRUCTIONS: SpecialInstruction[] = [
  {
    id: 's1',
    type: 'medical',
    text: 'Please apply diaper cream after every change today (minor rash).'
  },
  {
    id: 's2',
    type: 'schedule',
    text: 'Try to keep the afternoon nap under 2 hours to ensure good nighttime sleep.'
  }
];

export const INITIAL_INSIGHTS: SmartInsight[] = [
  {
    id: 'i1',
    type: 'wake_window',
    title: 'Predictive Wake Window',
    value: '2:15 PM - 3:00 PM',
    description: 'Optimal time to start nap routine based on morning sleep duration.',
    badge: 'High Confidence',
    theme: 'primary'
  },
  {
    id: 'i2',
    type: 'feed_pattern',
    title: 'Feeding Pattern',
    value: '+4 oz Average',
    description: 'Evening intake has increased over the last 3 days.',
    badge: 'Trending',
    theme: 'secondary'
  }
];

export const AVATAR_URLS = {
  smiling: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCX8cZePUiE7YOVmYcs-7wX1_zdqKJTEw-NeytNqgNBZ0-MHJWpPpOZ7e03vOfJXRSXwM3iTuIxQmoF5ibjHXluKb-pkctOZg_FnnRubdjWjxfK6vZt_xlq5xUw5RI6Zr_gF5cS5HynHuvrL_wPluC9GNwQr_yeAO0IXzkLgN8kYEyE_n_4bULGwGAQonXg-1ZTSZHRqJpaBQsnAPKSH8838Up0fj_N2JyK-g_PkylrzcG9GucrdVKoKp006HBjtH3bSirC66MVKw',
  sleeping: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBZlXlgqIYt38V2lvp3BJO4K7C3bQDom_M7IAhoIKy8NGkU8u3MujKkUHksRZiJ04AJEASIeKBLB_fIJz3yZR8H02uD5stogQyeyrGeYJYf0Jrcqig5jya4FQB2_-t3wsG1rXHMNSJDHzzDXi0U8aabTmzmBV4SU3iZdvSmUhEOaQX4Ip5cUb3toroHmb78ktEAmWOYDt31csc4WlBQw53EvnExmlFSsvRkmEu8JP7Hr7Jj9ceUablbq17paf4FNiXR5vgZOpLNcA',
  briefing: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAS-CK4D05y_qwzhEBV3qBJZ_LcBYMNuUsvfqPHT2lSiLOtPyF6O101DhbNJTNSKq0zrfVPUrMDnSfikUDz0KwJguvCeoUaVJSmK87gY2zC7hg9UqF-RG9W9ynGwy91wDVckup_E9nEfQcRG2WKjM5M6vGVDgBCblPsiUquTcrPuY5Y0Pvvnmz9mrECcDnXDNkM3nVhimnLQOGm0jyXHJjRGfwZ-2wgfaBHWCOkstSMUPRRTY6RmsIV9DfiWSm29p_rTCE2J71pAg',
  analytics: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAOrgpPQy7YfJJuaEL7hPwj5hgy_1s9K0Fn2Evrt1cPyNV9CKUD-Nv86CyX_HIMkCtYCEoKgwgM7G8SZXBWDh663x6mxNhJW5y-gz-rmcY2hSmQCjQ2seUvjk4VKnvsICcOoDYYQJ2kaB6rq1yEgFMCOsx3aVTNSucCXHlBoj99G1plenyswB9dHSPw787HfvfnjqDLYrwcxdyG6qydvgV2Fjk48GrdTzINVJRKoVGMxD6fM7CvVLg5oSTviNcyzelegXY_Gy9wWw'
};

// Past 7 days data for charts: sleep hours & feeding ounces
export const WEEKLY_CHART_DATA = [
  { day: 'Mon', fed: 24, sleep: 13.5 },
  { day: 'Tue', fed: 28, sleep: 14.2 },
  { day: 'Wed', fed: 20, sleep: 13.0 },
  { day: 'Thu', fed: 32, sleep: 15.0 },
  { day: 'Fri', fed: 26, sleep: 14.1 },
  { day: 'Sat', fed: 34, sleep: 14.8 },
  { day: 'Sun', fed: 30, sleep: 14.4 },
];

export const INITIAL_SCHEDULES: ScheduledReminder[] = [
  {
    id: 's-rem-1',
    type: 'feed',
    title: 'Morning Formula Bottle',
    time: '07:15',
    ampm: 'AM',
    completedDates: ['2023-10-24'],
    isRepeating: true,
    amountOz: 4
  },
  {
    id: 's-rem-2',
    type: 'feed',
    title: 'Evening Breast/Formula Feeding',
    time: '05:00',
    ampm: 'PM',
    completedDates: [], // not completed yet, so it is overdue since current system time is 5:01 PM!
    isRepeating: true,
    amountOz: 6
  },
  {
    id: 's-rem-3',
    type: 'medication',
    title: 'Vitamin D & Iron Oral Drops',
    time: '08:30',
    ampm: 'PM',
    completedDates: [],
    isRepeating: true,
    notes: 'Give 1ml via syringe after dinner.'
  }
];

export const INITIAL_WEIGHT_LOGS: WeightLog[] = [
  {
    id: 'w-1',
    weightLb: 11,
    weightOz: 8,
    date: '2026-05-01',
    timestamp: new Date('2026-05-01').getTime(),
    notes: '2-month checkup. Growing in the 50th percentile.'
  },
  {
    id: 'w-2',
    weightLb: 12,
    weightOz: 0,
    date: '2026-05-08',
    timestamp: new Date('2026-05-08').getTime(),
    notes: 'Home scale check.'
  },
  {
    id: 'w-3',
    weightLb: 12,
    weightOz: 10,
    date: '2026-05-15',
    timestamp: new Date('2026-05-15').getTime(),
    notes: 'Good appetite this week!'
  },
  {
    id: 'w-4',
    weightLb: 13,
    weightOz: 4,
    date: '2026-05-22',
    timestamp: new Date('2026-05-22').getTime()
  },
  {
    id: 'w-5',
    weightLb: 13,
    weightOz: 15,
    date: '2026-05-29',
    timestamp: new Date('2026-05-29').getTime(),
    notes: 'Almost 14 pounds!'
  },
  {
    id: 'w-6',
    weightLb: 14,
    weightOz: 3,
    date: '2026-06-01', // Fits current system date
    timestamp: new Date('2026-06-01').getTime(),
    notes: 'Measured with diaper off.'
  }
];

export const INITIAL_GOALS: DailyGoal[] = [
  {
    id: 'g-1',
    category: 'feed_oz',
    title: 'Daily Food/Milk Intake',
    target: 24,
    unit: 'oz'
  },
  {
    id: 'g-2',
    category: 'sleep_minutes',
    title: 'Nap/Sleep Duration Target',
    target: 120,
    unit: 'mins'
  },
  {
    id: 'g-3',
    category: 'diapas_wet',
    title: 'Wet Diapers Count',
    target: 4,
    unit: 'times'
  },
  {
    id: 'g-4',
    category: 'custom',
    title: 'Tummy Time Practice',
    target: 20,
    unit: 'mins',
    manualProgress: {
      '2023-10-24': 15
    }
  }
];

