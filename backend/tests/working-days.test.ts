import { describe, it, expect, vi, beforeEach } from 'vitest';

// We mock the CompanyHoliday model so tests don't need DB
vi.mock('../src/modules/holidays/company-holiday.model.js', () => ({
  CompanyHoliday: {
    find: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    }),
  },
}));

vi.mock('../src/config/env.js', () => ({
  env: {
    APP_TIMEZONE: 'Asia/Kolkata',
    NODE_ENV: 'test',
  },
}));

import { calculateWorkingDays, toDateOnly, isWeekend, dateRangesOverlap } from '../src/utils/working-days.service.js';

describe('WorkingDaysService', () => {
  describe('toDateOnly', () => {
    it('should parse ISO date string', () => {
      const d = toDateOnly('2024-01-15');
      expect(d.getUTCFullYear()).toBe(2024);
      expect(d.getUTCMonth()).toBe(0);
      expect(d.getUTCDate()).toBe(15);
    });
  });

  describe('isWeekend', () => {
    it('should identify Saturday as weekend', () => {
      const sat = new Date('2024-01-06T00:00:00Z');
      expect(isWeekend(sat)).toBe(true);
    });

    it('should identify Sunday as weekend', () => {
      const sun = new Date('2024-01-07T00:00:00Z');
      expect(isWeekend(sun)).toBe(true);
    });

    it('should identify Monday as weekday', () => {
      const mon = new Date('2024-01-08T00:00:00Z');
      expect(isWeekend(mon)).toBe(false);
    });
  });

  describe('calculateWorkingDays', () => {
    it('should count 5 working days for Mon-Fri', async () => {
      const start = new Date('2024-01-08T00:00:00Z'); // Monday
      const end = new Date('2024-01-12T00:00:00Z');   // Friday
      const result = await calculateWorkingDays(start, end);
      expect(result).toBe(5);
    });

    it('should count 0 days for weekend', async () => {
      const start = new Date('2024-01-06T00:00:00Z'); // Saturday
      const end = new Date('2024-01-07T00:00:00Z');   // Sunday
      const result = await calculateWorkingDays(start, end);
      expect(result).toBe(0);
    });

    it('should count 1 day for a single weekday', async () => {
      const start = new Date('2024-01-08T00:00:00Z');
      const end = new Date('2024-01-08T00:00:00Z');
      const result = await calculateWorkingDays(start, end);
      expect(result).toBe(1);
    });

    it('should return 0.5 for a half day', async () => {
      const start = new Date('2024-01-08T00:00:00Z');
      const end = new Date('2024-01-08T00:00:00Z');
      const result = await calculateWorkingDays(start, end, true);
      expect(result).toBe(0.5);
    });

    it('should return 0 for end before start', async () => {
      const start = new Date('2024-01-10T00:00:00Z');
      const end = new Date('2024-01-08T00:00:00Z');
      const result = await calculateWorkingDays(start, end);
      expect(result).toBe(0);
    });

    it('should skip weekends in multi-week range', async () => {
      // 2 full weeks: Mon 8 Jan to Fri 19 Jan = 10 working days
      const start = new Date('2024-01-08T00:00:00Z');
      const end = new Date('2024-01-19T00:00:00Z');
      const result = await calculateWorkingDays(start, end);
      expect(result).toBe(10);
    });
  });

  describe('dateRangesOverlap', () => {
    it('should detect overlapping ranges', () => {
      const aStart = new Date('2024-01-10');
      const aEnd = new Date('2024-01-15');
      const bStart = new Date('2024-01-12');
      const bEnd = new Date('2024-01-20');
      expect(dateRangesOverlap(aStart, aEnd, bStart, bEnd)).toBe(true);
    });

    it('should detect non-overlapping ranges', () => {
      const aStart = new Date('2024-01-10');
      const aEnd = new Date('2024-01-12');
      const bStart = new Date('2024-01-15');
      const bEnd = new Date('2024-01-20');
      expect(dateRangesOverlap(aStart, aEnd, bStart, bEnd)).toBe(false);
    });

    it('should detect adjacent ranges as overlapping', () => {
      const aStart = new Date('2024-01-10');
      const aEnd = new Date('2024-01-15');
      const bStart = new Date('2024-01-15');
      const bEnd = new Date('2024-01-20');
      expect(dateRangesOverlap(aStart, aEnd, bStart, bEnd)).toBe(true);
    });
  });
});
