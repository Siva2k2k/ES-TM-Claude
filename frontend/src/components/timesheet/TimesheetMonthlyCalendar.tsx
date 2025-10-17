import React, { useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Plus,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { cn } from '../../utils/cn';

export type DayStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

export interface CalendarEntryDetail {
  id: string;
  timesheetId: string;
  projectId?: string;
  projectName: string;
  projectColor?: string;
  hours: number;
  status: DayStatus;
  description?: string;
}

export interface CalendarDay {
  date: string;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  totalHours: number;
  status: DayStatus | 'idle';
  entries: CalendarEntryDetail[];
}

interface TimesheetMonthlyCalendarProps {
  referenceDate: Date;
  days: CalendarDay[];
  onChangeMonth: (newDate: Date) => void;
  onCreateTimesheet?: () => void;
  onDayClick?: (date: string) => void;
  onEntryClick?: (entry: CalendarEntryDetail) => void;
}

const STATUS_BADGE: Record<DayStatus | 'idle', string> = {
  idle: 'bg-gray-200 text-gray-600',
  draft: 'bg-gray-300 text-gray-800',
  submitted: 'bg-blue-500 text-white',
  approved: 'bg-green-500 text-white',
  rejected: 'bg-red-500 text-white',
};

const STATUS_LABEL: Record<DayStatus | 'idle', string> = {
  idle: 'No Timesheet',
  draft: 'Draft',
  submitted: 'Submitted',
  approved: 'Approved',
  rejected: 'Rejected',
};

export const TimesheetMonthlyCalendar: React.FC<TimesheetMonthlyCalendarProps> = ({
  referenceDate,
  days,
  onChangeMonth,
  onCreateTimesheet,
  onDayClick,
  onEntryClick,
}) => {
  const { monthYearLabel, totalHours, statusCounts } = useMemo(() => {
    const total = days.reduce((sum, day) => sum + (day.isCurrentMonth ? day.totalHours : 0), 0);
    const counts: Record<DayStatus | 'idle', number> = {
      idle: 0,
      draft: 0,
      submitted: 0,
      approved: 0,
      rejected: 0,
    };

    days.forEach((day) => {
      if (day.isCurrentMonth) {
        counts[day.status] = (counts[day.status] || 0) + 1;
      }
    });

    const label = referenceDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return { monthYearLabel: label, totalHours: total, statusCounts: counts };
  }, [days, referenceDate]);

  const handlePreviousMonth = () => {
    const date = new Date(referenceDate);
    date.setMonth(referenceDate.getMonth() - 1);
    onChangeMonth(date);
  };

  const handleNextMonth = () => {
    const date = new Date(referenceDate);
    date.setMonth(referenceDate.getMonth() + 1);
    onChangeMonth(date);
  };

  return (
    <div className="space-y-6">
      <Card className="border border-slate-200">
        <CardHeader className="border-b border-slate-100">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                <CalendarIcon className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-2xl font-semibold text-slate-900">{monthYearLabel}</CardTitle>
                <p className="text-sm text-slate-500">
                  Total recorded hours this month: <span className="font-medium text-slate-700">{totalHours.toFixed(1)}h</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" size="sm" onClick={handlePreviousMonth}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>
              <Button variant="outline" size="sm" onClick={handleNextMonth}>
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
              {onCreateTimesheet && (
                <Button size="sm" onClick={onCreateTimesheet}>
                  <Plus className="-ml-1 mr-2 h-4 w-4" />
                  New Timesheet
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
            <span className="font-medium text-slate-700">Status legend:</span>
            {(Object.keys(STATUS_LABEL) as Array<DayStatus | 'idle'>).map((status) => (
              <div key={status} className="flex items-center gap-2">
                <span
                  className={cn('h-3 w-3 rounded-full border border-white shadow-sm', {
                    'bg-slate-300': status === 'idle',
                    'bg-slate-400': status === 'draft',
                    'bg-blue-500': status === 'submitted',
                    'bg-green-500': status === 'approved',
                    'bg-red-500': status === 'rejected',
                  })}
                />
                <span>
                  {STATUS_LABEL[status]}
                  {status !== 'idle' && (
                    <span className="ml-1 text-xs text-slate-400">
                      ({statusCounts[status] ?? 0})
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border border-slate-200">
        <CardContent className="p-0">
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-sm font-medium text-slate-600">
            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
              <div key={day} className="border-r border-slate-200 px-2 py-3 last:border-r-0">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {days.map((day) => (
              <div
                key={day.date}
                className={cn(
                  'h-40 border-b border-r border-slate-200 p-2 transition-colors last:border-r-0',
                  day.isCurrentMonth ? 'bg-white' : 'bg-slate-50 text-slate-400',
                  day.isToday && 'ring-2 ring-blue-400 ring-offset-1'
                )}
              >
                <button
                  type="button"
                  onClick={() => onDayClick?.(day.date)}
                  className="flex w-full items-start justify-between text-left"
                >
                  <span className="text-sm font-semibold text-slate-700">{day.day}</span>
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_BADGE[day.status])}>
                    {day.totalHours > 0 ? `${day.totalHours.toFixed(1)}h` : STATUS_LABEL[day.status]}
                  </span>
                </button>

                <div className="mt-2 flex flex-col gap-2 overflow-hidden">
                  {day.entries.slice(0, 3).map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => onEntryClick?.(entry)}
                      className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1 text-left text-xs hover:border-blue-300 hover:shadow-sm"
                    >
                      <span
                        className="mt-1 h-2 w-2 rounded-full"
                        style={{ backgroundColor: entry.projectColor || '#64748b' }}
                      />
                      <span className="flex-1">
                        <span className="block font-semibold text-slate-700">
                          {entry.projectName}
                        </span>
                        <span className="flex items-center gap-1 text-slate-500">
                          <Clock className="h-3 w-3" />
                          {entry.hours.toFixed(1)}h · {STATUS_LABEL[entry.status]}
                        </span>
                        {entry.description && (
                          <span className="mt-0.5 line-clamp-1 text-slate-400">{entry.description}</span>
                        )}
                      </span>
                    </button>
                  ))}
                  {day.entries.length > 3 && (
                    <Badge variant="outline" className="self-start text-xs text-slate-500">
                      +{day.entries.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
