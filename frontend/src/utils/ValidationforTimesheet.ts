import { formatDate } from './formatting';
import { isWeekend } from './timesheetHelpers';
import type { TimeEntry } from '../types/timesheet.schemas';

export function getValidationWarnings(
  entries: TimeEntry[],
  dailyTotals: Record<string, number>,
  weeklyTotal: number,
  weekDates: Date[]
) {
  const warnings: string[] = [];
  const blockingErrors: string[] = [];

  // Daily validation
  Object.entries(dailyTotals).forEach(([date, total]) => {
    const isWeekendDay = isWeekend(date);

    if (isWeekendDay) {
      if (total > 10) {
        warnings.push(`${formatDate(date)} (Weekend): Exceeds 10h (${total}h)`);
      }
    } else {
      if (total < 8) {
        blockingErrors.push(`${formatDate(date)}: Min 8h required (current: ${total}h)`);
      } else if (total > 10) {
        blockingErrors.push(`${formatDate(date)}: Max 10h allowed (current: ${total}h)`);
      }
    }
  });

  // Weekly total validation
  if (weeklyTotal > 56) {
    blockingErrors.push(`Weekly total ${weeklyTotal}h exceeds max 56h`);
  }

  // Missing weekdays check
  const entryDates = new Set(entries.map(e => e.date));
  weekDates.forEach((date, idx) => {
    const dateStr = date.toISOString().split('T')[0];
    if (!isWeekend(dateStr) && !entryDates.has(dateStr)) {
      warnings.push(`${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][idx]}: No entries logged`);
    }
  });

  // Weekend billable check
  const billableWeekendEntries = entries.filter(e => isWeekend(e.date) && e.is_billable);
  if (billableWeekendEntries.length > 0) {
    warnings.push('Weekend entries are automatically non-billable');
  }

  return { warnings, blockingErrors };
}