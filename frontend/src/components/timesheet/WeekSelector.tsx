import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { type Control, Controller } from 'react-hook-form';
import { formatDate } from '../../utils/formatting';
import { mondayToIsoWeek, isoWeekToMonday, getCurrentWeekMonday } from '../../utils/timesheetHelpers';

interface WeekSelectorProps {
  control: Control<any>;
  weekStartDate: string;
  setValue: (name: string, value: any, options?: any) => void;
  disabled?: boolean;
}

export const WeekSelector: React.FC<WeekSelectorProps> = ({
  control,
  weekStartDate,
  setValue,
  disabled = false
}) => {
  const goDeltaWeek = (delta: number, currentValue: string) => {
    try {
      const cur = new Date(String(currentValue));
      cur.setDate(cur.getDate() + delta * 7);
      const newVal = cur.toISOString().split('T')[0];
      setValue('week_start_date', newVal, { shouldValidate: true, shouldDirty: true });
    } catch {}
  };

  const currentWeekIso = mondayToIsoWeek(getCurrentWeekMonday());

  return (
    <Controller
      name="week_start_date"
      control={control}
      render={({ field }) => {
        const weekInputValue = mondayToIsoWeek(String(field.value || weekStartDate));
        const endDate = new Date(new Date(field.value || weekStartDate).setDate(new Date(field.value || weekStartDate).getDate() + 6));

        return (
          <div className="flex items-center gap-3">
            <label htmlFor="week-start-input" className="text-sm font-medium text-gray-700">Week Starting</label>
            <div className="flex items-center gap-2">
              <button type="button" className="px-2 py-1 rounded border bg-white" onClick={() => goDeltaWeek(-1, field.value)} disabled={disabled}>
                <ArrowLeft />
              </button>
              <input id="week-start-input" type="week" className="border rounded px-2 py-1" value={weekInputValue} max={currentWeekIso} 
                onChange={(e) => { const monday = isoWeekToMonday(e.target.value); if (monday) { field.onChange(monday); setValue('week_start_date', monday, { shouldValidate: true, shouldDirty: true }); } }} 
                disabled={disabled} 
              />
              <button type="button" className="px-2 py-1 rounded border bg-white" onClick={() => goDeltaWeek(1, field.value)} disabled={disabled}>
                <ArrowRight />
              </button>
              <div className="ml-3 text-sm text-gray-500">
                {formatDate(field.value || weekStartDate)} - {formatDate(endDate.toISOString().split('T')[0])}
              </div>
            </div>
          </div>
        );
      }}
    />
  );
};