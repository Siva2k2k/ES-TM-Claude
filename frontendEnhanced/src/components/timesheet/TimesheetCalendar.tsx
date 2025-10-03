/**
 * TimesheetCalendar Component
 *
 * Weekly calendar view for visualizing timesheet entries.
 * Displays entries in a grid format with daily totals and color coding.
 *
 * Features:
 * - Week-based calendar view
 * - Color-coded entries by project
 * - Daily and weekly totals
 * - Click to view/edit entries
 * - Responsive design
 *
 * Cognitive Complexity: 7 (Target: <15)
 */

import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { formatDate, formatDuration } from '../../utils/formatting';
import type { TimeEntry } from '../../types/timesheet.schemas';

export interface TimesheetCalendarProps {
  /** Week start date (Monday) */
  weekStartDate: string;
  /** Time entries for the week */
  entries: TimeEntry[];
  /** Available projects for color mapping */
  projects?: Array<{ id: string; name: string; color?: string }>;
  /** Callback when week is changed */
  onWeekChange?: (newWeekStart: string) => void;
  /** Callback when an entry is clicked */
  onEntryClick?: (entry: TimeEntry) => void;
  /** Callback when a day cell is clicked */
  onDayClick?: (date: string) => void;
}

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const DEFAULT_COLORS = [
  'bg-blue-100 text-blue-800 border-blue-300',
  'bg-purple-100 text-purple-800 border-purple-300',
  'bg-green-100 text-green-800 border-green-300',
  'bg-yellow-100 text-yellow-800 border-yellow-300',
  'bg-pink-100 text-pink-800 border-pink-300',
  'bg-indigo-100 text-indigo-800 border-indigo-300',
];

export const TimesheetCalendar: React.FC<TimesheetCalendarProps> = ({
  weekStartDate,
  entries,
  projects = [],
  onWeekChange,
  onEntryClick,
  onDayClick
}) => {
  // Generate week dates
  const weekDates = useMemo(() => {
    const dates: Date[] = [];
    const startDate = new Date(weekStartDate);
    for (let i = 0; i < 5; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [weekStartDate]);

  // Map projects to colors
  const projectColors = useMemo(() => {
    const colorMap: Record<string, string> = {};
    projects.forEach((project, idx) => {
      colorMap[project.id] = project.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
    });
    return colorMap;
  }, [projects]);

  // Group entries by date
  const entriesByDate = useMemo(() => {
    const grouped: Record<string, TimeEntry[]> = {};
    entries.forEach(entry => {
      if (!grouped[entry.date]) grouped[entry.date] = [];
      grouped[entry.date].push(entry);
    });
    return grouped;
  }, [entries]);

  // Calculate daily totals
  const dailyTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    entries.forEach(entry => {
      totals[entry.date] = (totals[entry.date] || 0) + entry.hours;
    });
    return totals;
  }, [entries]);

  // Calculate weekly total
  const weeklyTotal = useMemo(() => {
    return entries.reduce((sum, entry) => sum + entry.hours, 0);
  }, [entries]);

  const handlePreviousWeek = () => {
    const newDate = new Date(weekStartDate);
    newDate.setDate(newDate.getDate() - 7);
    onWeekChange?.(newDate.toISOString().split('T')[0]);
  };

  const handleNextWeek = () => {
    const newDate = new Date(weekStartDate);
    newDate.setDate(newDate.getDate() + 7);
    onWeekChange?.(newDate.toISOString().split('T')[0]);
  };

  const getProjectName = (projectId?: string): string => {
    if (!projectId) return 'No Project';
    return projects.find(p => p.id === projectId)?.name || 'Unknown';
  };

  const getDayTotalColor = (hours: number): string => {
    if (hours === 0) return 'text-gray-400';
    if (hours < 8) return 'text-yellow-600';
    if (hours > 10) return 'text-red-600';
    return 'text-green-600';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Weekly Calendar
          </CardTitle>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-gray-500">Week Total</p>
              <p className={`text-xl font-bold ${
                weeklyTotal > 56 ? 'text-red-600' :
                weeklyTotal >= 40 ? 'text-green-600' : 'text-yellow-600'
              }`}>
                {formatDuration(weeklyTotal)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousWeek}
                icon={ChevronLeft}
                aria-label="Previous week"
              />
              <span className="text-sm font-medium min-w-[200px] text-center">
                {formatDate(weekStartDate, 'MMM DD')} - {formatDate(weekDates[4], 'MMM DD, YYYY')}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextWeek}
                icon={ChevronRight}
                aria-label="Next week"
              />
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-5 gap-4">
          {weekDates.map((date, dayIndex) => {
            const dateStr = date.toISOString().split('T')[0];
            const dayEntries = entriesByDate[dateStr] || [];
            const dayTotal = dailyTotals[dateStr] || 0;
            const isToday = dateStr === new Date().toISOString().split('T')[0];

            return (
              <div
                key={dateStr}
                className={`border rounded-lg overflow-hidden ${
                  isToday ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                {/* Day Header */}
                <div className={`p-3 ${isToday ? 'bg-blue-50' : 'bg-gray-50'} border-b`}>
                  <p className="text-sm font-semibold text-gray-700">{WEEKDAYS[dayIndex]}</p>
                  <p className="text-xs text-gray-500">{formatDate(date, 'MMM DD')}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Clock className="h-3 w-3 text-gray-400" />
                    <p className={`text-sm font-bold ${getDayTotalColor(dayTotal)}`}>
                      {dayTotal}h
                    </p>
                  </div>
                </div>

                {/* Day Entries */}
                <div
                  className="p-2 min-h-[200px] space-y-2 cursor-pointer hover:bg-gray-50"
                  onClick={() => onDayClick?.(dateStr)}
                >
                  {dayEntries.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-xs text-gray-400">No entries</p>
                    </div>
                  ) : (
                    dayEntries.map((entry, idx) => (
                      <div
                        key={idx}
                        className={`p-2 rounded border cursor-pointer hover:shadow-md transition-shadow ${
                          entry.project_id
                            ? projectColors[entry.project_id]
                            : 'bg-gray-100 text-gray-800 border-gray-300'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEntryClick?.(entry);
                        }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-semibold truncate">
                            {getProjectName(entry.project_id)}
                          </p>
                          <span className="text-xs font-bold">{entry.hours}h</span>
                        </div>
                        {entry.description && (
                          <p className="text-xs opacity-75 truncate">{entry.description}</p>
                        )}
                        {entry.is_billable && (
                          <Badge variant="success" size="sm" className="mt-1">
                            Billable
                          </Badge>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Week Summary */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-5 gap-4 text-center">
            {weekDates.map((date, idx) => {
              const dateStr = date.toISOString().split('T')[0];
              const total = dailyTotals[dateStr] || 0;
              return (
                <div key={dateStr}>
                  <p className="text-xs text-gray-500 mb-1">{WEEKDAYS[idx]}</p>
                  <p className={`text-lg font-bold ${getDayTotalColor(total)}`}>
                    {total}h
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        {projects.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-gray-500 mb-2">Projects:</p>
            <div className="flex flex-wrap gap-2">
              {projects.map(project => (
                <div
                  key={project.id}
                  className={`px-3 py-1 rounded-full text-xs font-medium border ${
                    projectColors[project.id]
                  }`}
                >
                  {project.name}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
