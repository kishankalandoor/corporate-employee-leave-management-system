import { CompanyHoliday } from '../modules/holidays/company-holiday.model.js';
import { env } from '../config/env.js';

// Weekends: 0=Sunday, 6=Saturday
const WEEKEND_DAYS = new Set([0, 6]);

/**
 * Normalizes a date to midnight in the application timezone
 * to avoid timezone-induced date shifts.
 */
export function toDateOnly(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  // Use the app timezone to get the correct local date
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: env.APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(d);
  const year = parseInt(parts.find((p) => p.type === 'year')!.value, 10);
  const month = parseInt(parts.find((p) => p.type === 'month')!.value, 10) - 1;
  const day = parseInt(parts.find((p) => p.type === 'day')!.value, 10);
  return new Date(Date.UTC(year, month, day));
}

export function isWeekend(date: Date): boolean {
  return WEEKEND_DAYS.has(date.getUTCDay());
}

export interface HolidayDetail {
  holidayType: 'FULL_DAY' | 'HALF_DAY_AFTERNOON' | 'HALF_DAY_MORNING' | 'OPTIONAL' | 'SPECIAL_WORKING_DAY';
  isOptional: boolean;
  departmentId?: string | null;
}

export async function getHolidaysMap(year: number, departmentId?: string): Promise<Map<string, HolidayDetail>> {
  const query: any = { year, published: true };
  if (departmentId) {
    query.$or = [{ scope: 'COMPANY_WIDE' }, { department: departmentId }];
  } else {
    query.scope = 'COMPANY_WIDE';
  }
  const holidays = await CompanyHoliday.find(query).lean();
  const map = new Map<string, HolidayDetail>();
  for (const h of holidays) {
    const key = toDateOnly(h.date).toISOString().split('T')[0];
    map.set(key, {
      holidayType: h.holidayType || (h.isOptional ? 'OPTIONAL' : 'FULL_DAY'),
      isOptional: !!h.isOptional,
      departmentId: h.department ? h.department.toString() : null,
    });
  }
  return map;
}

export async function getHolidayDates(year: number): Promise<Set<string>> {
  const map = await getHolidaysMap(year);
  const set = new Set<string>();
  for (const [dateStr, detail] of map.entries()) {
    if (detail.holidayType === 'FULL_DAY' && !detail.isOptional) {
      set.add(dateStr);
    }
  }
  return set;
}

/**
 * Calculates the number of working days between two dates (inclusive).
 * Excludes weekends and company holidays.
 * For half-days, returns 0.5 working days.
 * For half-day holidays, deducts only the working portion (0.5).
 * Special working days count as a working day even if on a weekend.
 */
export async function calculateWorkingDays(
  startDate: Date,
  endDate: Date,
  isHalfDay = false,
  departmentId?: string
): Promise<number> {
  const start = toDateOnly(startDate);
  const end = toDateOnly(endDate);

  if (end < start) return 0;

  // Collect all years spanned
  const years = new Set<number>();
  const cur = new Date(start);
  while (cur <= end) {
    years.add(cur.getUTCFullYear());
    cur.setUTCFullYear(cur.getUTCFullYear() + 1);
  }

  // Fetch holidays map for all years
  const holidayMap = new Map<string, HolidayDetail>();
  for (const year of years) {
    const yearHolidays = await getHolidaysMap(year, departmentId);
    for (const [k, v] of yearHolidays) holidayMap.set(k, v);
  }

  if (isHalfDay) {
    // Single-day half-day request
    const dateStr = start.toISOString().split('T')[0];
    const holiday = holidayMap.get(dateStr);
    
    // If it's a special working day on weekend, it counts
    const isWeekendDay = isWeekend(start);
    if (holiday?.holidayType === 'SPECIAL_WORKING_DAY') {
      return 0.5;
    }
    if (isWeekendDay) return 0;
    if (holiday && holiday.holidayType === 'FULL_DAY' && !holiday.isOptional) return 0;
    if (holiday && (holiday.holidayType === 'HALF_DAY_AFTERNOON' || holiday.holidayType === 'HALF_DAY_MORNING')) {
      // It's already a half-day holiday, so an employee taking half-day leave takes 0.5 (or the remaining portion)
      return 0.5;
    }
    return 0.5;
  }

  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];
    const holiday = holidayMap.get(dateStr);
    const isWeekendDay = isWeekend(current);

    if (holiday?.holidayType === 'SPECIAL_WORKING_DAY') {
      // Special working day overrides regular weekend
      count += 1;
    } else if (!isWeekendDay) {
      if (!holiday) {
        count += 1;
      } else if (holiday.holidayType === 'HALF_DAY_AFTERNOON' || holiday.holidayType === 'HALF_DAY_MORNING') {
        // Half day holiday: scheduled working day is 0.5 day
        count += 0.5;
      } else if (holiday.isOptional) {
        // Optional holiday is normally a working day unless explicitly taken
        count += 1;
      }
      // If FULL_DAY, count += 0 (it is off)
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return count;
}

/**
 * Checks if two date ranges overlap (inclusive).
 */
export function dateRangesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date
): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}
