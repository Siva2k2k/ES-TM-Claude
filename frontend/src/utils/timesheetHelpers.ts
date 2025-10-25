export function isWeekend(dateStr: string): boolean {
  try {
    const d = new Date(dateStr);
    const day = d.getDay();
    return day === 0 || day === 6;
  } catch {
    return false;
  }
}

export function generateUid(): string {
  return `e_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

export function getCurrentWeekMonday(): string {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(today.setDate(diff));
  return monday.toISOString().split('T')[0];
}

export function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function mondayToIsoWeek(mondayStr: string): string {
  try {
    const parts = mondayStr.split('-');
    if (parts.length !== 3) return '';
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    d.setHours(0, 0, 0, 0);

    const thursday = new Date(d);
    thursday.setDate(d.getDate() + (4 - ((d.getDay() || 7) - 1)));
    thursday.setHours(0, 0, 0, 0);

    const year = thursday.getFullYear();
    const jan4 = new Date(year, 0, 4);
    const jan4Day = jan4.getDay();
    const daysToMonday = (jan4Day === 0) ? 6 : jan4Day - 1;
    const mondayOfWeek1 = new Date(year, 0, 4 - daysToMonday);
    mondayOfWeek1.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor((d.getTime() - mondayOfWeek1.getTime()) / 86400000);
    const weekNo = Math.floor(daysDiff / 7) + 1;

    return `${year}-W${String(weekNo).padStart(2, '0')}`;
  } catch {
    return '';
  }
}

export function isoWeekToMonday(isoWeek: string): string {
  try {
    const parts = isoWeek.split('-W');
    if (parts.length !== 2) return '';
    const year = parseInt(parts[0], 10);
    const week = parseInt(parts[1], 10);

    const jan4 = new Date(year, 0, 4);
    const jan4Day = jan4.getDay();
    const daysToMonday = (jan4Day === 0) ? 6 : jan4Day - 1;

    const mondayOfWeek1 = new Date(year, 0, 4 - daysToMonday);
    mondayOfWeek1.setHours(0, 0, 0, 0);

    const targetMonday = new Date(mondayOfWeek1);
    targetMonday.setDate(mondayOfWeek1.getDate() + (week - 1) * 7);
    targetMonday.setHours(0, 0, 0, 0);

    const year2 = targetMonday.getFullYear();
    const month = String(targetMonday.getMonth() + 1).padStart(2, '0');
    const day = String(targetMonday.getDate()).padStart(2, '0');
    return `${year2}-${month}-${day}`;
  } catch {
    return '';
  }
}

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];