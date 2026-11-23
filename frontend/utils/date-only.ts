export type DateParts = { year: number; month: number; day: number };
export const daysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();
export const formatDateOnly = ({ year, month, day }: DateParts) =>
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
export const parseDateOnly = (value: string): DateParts | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1000 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
};
export const todayDateOnly = (now = new Date()) => formatDateOnly({
  year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate(),
});
export const isBirthDate = (value: string) => Boolean(parseDateOnly(value)) && value <= todayDateOnly();
export const clampDateParts = (parts: DateParts, minimumYear: number, maximum: DateParts): DateParts => {
  const year = Math.max(minimumYear, Math.min(parts.year, maximum.year));
  const month = Math.max(1, Math.min(parts.month, year === maximum.year ? maximum.month : 12));
  const lastDay = year === maximum.year && month === maximum.month
    ? maximum.day : daysInMonth(year, month);
  return { year, month, day: Math.max(1, Math.min(parts.day, lastDay)) };
};
