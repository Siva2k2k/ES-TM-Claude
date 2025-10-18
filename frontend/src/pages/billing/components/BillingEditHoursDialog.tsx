import React, { useEffect, useState } from 'react';

interface BillingEditHoursDialogProps {
  open: boolean;
  title?: string;
  description?: React.ReactNode;
  initialHours: number;
  originalHours?: number;
  workedHours?: number;
  confirmLabel?: string;
  onClose: () => void;
  onSave: (newHours: number) => Promise<void> | void;
}

export function BillingEditHoursDialog({
  open,
  title = 'Adjust Billable Hours',
  description,
  initialHours,
  originalHours,
  workedHours,
  confirmLabel = 'Save',
  onClose,
  onSave
}: BillingEditHoursDialogProps) {
  const [hours, setHours] = useState<number>(initialHours);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setHours(Number(initialHours));
    }
  }, [initialHours, open]);

  if (!open) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    await onSave(Number(hours));
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {title}
        </h3>
        {description && (
          <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {description}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">
              Billable Hours
            </label>
            <input
              type="number"
              step="0.25"
              min={0}
              value={hours}
              onChange={(event) => setHours(Number(event.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            {(originalHours !== undefined || workedHours !== undefined) && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {originalHours !== undefined && (
                  <>
                    Original: {originalHours.toFixed(2)}h
                    {workedHours !== undefined && ' | '}
                  </>
                )}
                {workedHours !== undefined && <>Worked: {workedHours.toFixed(2)}h</>}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={saving}
            >
              {saving ? 'Saving...' : confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
