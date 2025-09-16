import { ScheduleConfig, LatenessPolicy } from '../types/pro-analytics';

// Note: Timezone is assumed to be Africa/Casablanca as per requirements.
// All HH:mm times are local to that timezone.

export const latenessPolicy: LatenessPolicy = {
  graceMinutes: 5,
  minorDelayMinutes: 10,
  halfDayThresholdHours: 4,
  requiredDaysPerMonth: 26,
};

export const scheduleConfig: ScheduleConfig = {
  company_default: {
    morning: { start: "09:00", end: "13:00" },
    afternoon: { start: "14:00", end: "18:00" },
    worksSaturday: false,
  },
  department_defaults: {
    "Production": {
      worksSaturday: true,
    },
    "IT": {
      morning: { start: "08:30", end: "12:30" },
      afternoon: { start: "13:30", end: "17:30" },
    }
  },
  employee_overrides: {
    "123": { // Example: Employee with matricule '123' has a custom schedule
      morning: { start: "10:00", end: "14:00" },
      afternoon: { start: "15:00", end: "19:00" },
      worksSaturday: false,
    }
  }
};

// Holiday data and functions have been moved to src/utils/holidayManager.ts
