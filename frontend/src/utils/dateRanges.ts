import type { Project } from '../types';
import { formatDate } from './formatting';

export type ViewMode = 'monthly' | 'weekly' | 'timeline' | 'custom';

const toIso = (date: Date) => date.toISOString().split('T')[0];

export function buildMonthlyRange(offset: number) {
  const start = new Date();
  start.setDate(1);
  start.setMonth(start.getMonth() + offset);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
  return {
    startDate: toIso(start),
    endDate: toIso(end),
    label: start.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  };
}

export function buildWeeklyRange(offset: number) {
  const anchor = new Date();
  anchor.setDate(anchor.getDate() + offset * 7);
  const day = anchor.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(anchor);
  start.setDate(anchor.getDate() + diffToMonday);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    startDate: toIso(start),
    endDate: toIso(end),
    label: `${formatDate(start, 'short')} - ${formatDate(end, 'short')}`
  };
}

export function buildTimelineRange(
  projectIds: string[],
  projects: Project[],
  fallback: { startDate: string; endDate: string; label: string }
) {
  if (projectIds.length === 0) {
    return fallback;
  }

  let earliest: Date | null = null;
  let latest: Date | null = null;

  projectIds.forEach((projectId) => {
    const project = projects.find((item) => (item._id ?? item.id ?? '') === projectId);
    if (!project) {
      return;
    }

    if (project.start_date) {
      const startDate = new Date(project.start_date);
      if (!Number.isNaN(startDate.getTime()) && (!earliest || startDate < earliest)) {
        earliest = startDate;
      }
    }

    if (project.end_date) {
      const endDate = new Date(project.end_date);
      if (!Number.isNaN(endDate.getTime()) && (!latest || endDate > latest)) {
        latest = endDate;
      }
    }
  });

  if (!earliest) {
    return fallback;
  }

  const resolvedLatest = latest ?? new Date();
  if (resolvedLatest < earliest) {
    resolvedLatest.setTime(earliest.getTime());
  }

  return {
    startDate: toIso(earliest),
    endDate: toIso(resolvedLatest),
    label: `${formatDate(earliest, 'short')} - ${formatDate(resolvedLatest, 'short')}`
  };
}

export function formatRangeLabel(startDate: string, endDate: string, mode: ViewMode) {
  if (!startDate || !endDate) {
    return 'No range selected';
  }

  if (mode === 'monthly') {
    const date = new Date(startDate);
    return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  return `${formatDate(start, 'short')} - ${formatDate(end, 'short')}`;
}
