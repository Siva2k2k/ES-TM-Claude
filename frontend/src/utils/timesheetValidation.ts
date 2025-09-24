/**
 * Timesheet Validation Utilities
 * Extracted business rules for testing and reuse
 */

export interface TimeEntry {
  project_id?: string;
  task_id?: string;
  date: string;
  hours: number;
}

/**
 * Validates timesheet entries against business rules
 * @param entries Array of time entries to validate
 * @returns Array of warning messages (empty if valid)
 */
export function validateTimesheet(entries: TimeEntry[]): string[] {
  const warnings: string[] = [];
  if (!entries || entries.length === 0) return warnings;

  const validEntries = entries.filter(e => e && e.date);

  // 1) Daily totals (min 8, max 10)
  const dailyTotals: Record<string, number> = {};
  for (const e of validEntries) {
    // if (!e || !e.date) continue;
    dailyTotals[e.date] = (dailyTotals[e.date] || 0) + (Number(e.hours) || 0);
  }

  for (const [date, total] of Object.entries(dailyTotals)) {
    if (total < 8) warnings.push(`On ${date}: total hours ${total} < minimum 8`);
    if (total > 10) warnings.push(`On ${date}: total hours ${total} > maximum 10`);
  }

  // 2) Weekly max 56
  const weekTotal = Object.values(dailyTotals).reduce((s, v) => s + v, 0);
  if (weekTotal > 56) warnings.push(`Total weekly hours ${weekTotal} > maximum 56`);

  // 3) Duplicate project+task+date combos
  const seen = new Set<string>();
  for (const e of validEntries) {
    const key = `${e.project_id || ''}::${e.task_id || ''}::${e.date}`;
    if (seen.has(key)) {
      warnings.push(`Duplicate entry for project/task/date: ${e.project_id || 'N/A'}/${e.task_id || 'N/A'}/${e.date}`);
    } else {
      seen.add(key);
    }
  }

  return warnings;
}

/**
 * Business rule constants
 */
export const VALIDATION_RULES = Object.freeze({
  MIN_DAILY_HOURS: 8,
  MAX_DAILY_HOURS: 10,
  MAX_WEEKLY_HOURS: 56,
} as const);
