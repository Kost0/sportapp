import { describe, expect, it } from 'vitest';
import { clampDateParts, formatDateOnly, isBirthDate, parseDateOnly } from '../../utils/date-only';

describe('birth dates', () => {
  it.each(['2001-02-29', '2000-02-30', '1999-04-31', '2000-13-01', '2000-00-01', '2000-01-00', 'bad'])('rejects %s', date => {
    expect(parseDateOnly(date)).toBeNull();
  });
  it('preserves the exact day, including leap days', () => {
    expect(formatDateOnly(parseDateOnly('2000-02-29')!)).toBe('2000-02-29');
    expect(formatDateOnly(parseDateOnly('1998-07-03')!)).toBe('1998-07-03');
  });
  it('clamps leap days when changing year and prevents future birthdays', () => {
    const max = { year: 2026, month: 11, day: 21 };
    expect(clampDateParts({ year: 2001, month: 2, day: 29 }, 1906, max)).toEqual({ year: 2001, month: 2, day: 28 });
    expect(clampDateParts({ year: 2030, month: 12, day: 31 }, 1906, max)).toEqual(max);
    expect(isBirthDate('2999-01-01')).toBe(false);
  });
});
