import { toZonedTime, format } from 'date-fns-tz';
import { Holiday } from '../types/pro-analytics';

const TIMEZONE = 'Africa/Casablanca';

// Data store for holidays
const HOLIDAY_DATA: { fixed: { date: string; name: string }[], religious: { [year: number]: { date: string; name: string }[] } } = {
  fixed: [
    { date: '01-01', name: "New Year's Day" },
    { date: '01-11', name: "Proclamation of Independence" },
    { date: '05-01', name: "Labour Day" },
    { date: '07-30', name: "Throne Day" },
    { date: '08-14', name: "Oued Ed-Dahab Day" },
    { date: '08-20', name: "Revolution of the King and the People" },
    { date: '08-21', name: "Youth Day" },
    { date: '11-06', name: "Green March" },
    { date: '11-18', name: "Independence Day" },
  ],
  religious: {
    2025: [
      { date: '2025-03-31', name: "Eid al-Fitr" },
      { date: '2025-04-01', name: "Eid al-Fitr" },
      { date: '2025-06-07', name: "Eid al-Adha" },
      { date: '2025-06-08', name: "Eid al-Adha" },
      { date: '2025-06-09', name: "Eid al-Adha (Admin Day)" },
      { date: '2025-06-27', name: "Hijri New Year" },
      { date: '2025-09-05', name: "Prophet's Birthday" },
      { date: '2025-09-06', name: "Prophet's Birthday" },
    ],
    // Placeholder for future years
    2026: [], 
    2027: [],
    2028: [],
    2029: [],
    2030: [],
  }
};

// In-memory cache for generated holiday maps
const holidayCache = new Map<number, Map<string, Holiday>>();

/**
 * Generates and returns a map of holidays for a given year.
 * Results are cached to avoid re-computation.
 * @param year The year to get holidays for.
 * @returns A Map where keys are 'YYYY-MM-DD' and values are Holiday objects.
 */
export function getHolidaysForYear(year: number): Map<string, Holiday> {
  if (holidayCache.has(year)) {
    return holidayCache.get(year)!;
  }

  const holidays = new Map<string, Holiday>();

  // Add fixed holidays
  HOLIDAY_DATA.fixed.forEach(h => {
    holidays.set(`${year}-${h.date}`, { name: h.name, type: 'fixed' });
  });

  // Add religious holidays for the specific year
  const religiousHolidays = HOLIDAY_DATA.religious[year] || [];
  religiousHolidays.forEach(h => {
    holidays.set(h.date, { name: h.name, type: 'religious' });
  });

  holidayCache.set(year, holidays);
  return holidays;
}

/**
 * Checks if a given date string is a holiday.
 * @param dateYMD A date string in 'YYYY-MM-DD' format.
 * @returns An object with isHoliday flag and holiday details if it is one.
 */
export function isHoliday(dateYMD: string): { isHoliday: boolean; details?: Holiday } {
  try {
    const year = parseInt(dateYMD.substring(0, 4), 10);
    const yearHolidays = getHolidaysForYear(year);
    const holidayDetails = yearHolidays.get(dateYMD);

    if (holidayDetails) {
      return { isHoliday: true, details: holidayDetails };
    }
    return { isHoliday: false };
  } catch (e) {
    return { isHoliday: false };
  }
}

/**
 * Gets the current date as a 'YYYY-MM-DD' string in the Africa/Casablanca timezone.
 * @returns The formatted date string.
 */
export function getTodayYMD(): string {
  const now = new Date();
  const zonedDate = toZonedTime(now, TIMEZONE);
  return format(zonedDate, 'yyyy-MM-dd');
}
