import React, { useEffect, useState } from 'react';

interface BillingEditHoursDialogProps {
  open: boolean;
  title?: string;
  description?: React.ReactNode;
  initialHours: number;
  originalHours?: number;
  workedHours?: number;
  verifiedWorkedHours?: number;
  verifiedBillableHours?: number;
  managerAdjustment?: number;
  verifiedAt?: string;
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
  verifiedWorkedHours,
  verifiedBillableHours,
  managerAdjustment,
  verifiedAt,
  confirmLabel = 'Save',
  onClose,
  onSave
}: BillingEditHoursDialogProps) {
  const [hours, setHours] = useState<number>(initialHours);
  const [saving, setSaving] = useState(false);

  const hasVerificationData = verifiedWorkedHours !== undefined && verifiedBillableHours !== undefined;

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
          {hasVerificationData && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-green-700 dark:text-green-300">
                Team Review Verification
              </h4>
              {verifiedAt && (
                <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                  Verified on {new Date(verifiedAt).toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </p>
              )}
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-300">Worked Hours:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {verifiedWorkedHours.toFixed(1)}h
                  </span>
                </div>
                {managerAdjustment !== undefined && managerAdjustment !== 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Manager Adjustment:</span>
                    <span className={`font-semibold ${managerAdjustment > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                      {managerAdjustment > 0 ? '+' : ''}{managerAdjustment.toFixed(1)}h
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-green-300 pt-2 dark:border-green-700">
                  <span className="text-slate-600 dark:text-slate-300">Verified Billable:</span>
                  <span className="font-bold text-green-700 dark:text-green-300">
                    {verifiedBillableHours.toFixed(1)}h
                  </span>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">
              {hasVerificationData ? 'Management Adjustment (Final Billable Hours)' : 'Billable Hours'}
            </label>
            <input
              type="number"
              step="0.25"
              min={0}
              value={hours}
              onChange={(event) => setHours(Number(event.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            {hasVerificationData ? (
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                  <span>Verified Billable:</span>
                  <span>{verifiedBillableHours.toFixed(2)}h</span>
                </div>
                <div className="flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
                  <span>Additional Adjustment:</span>
                  <span className={hours !== verifiedBillableHours ? 
                    (hours > verifiedBillableHours ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400') 
                    : ''}>
                    {hours > verifiedBillableHours ? '+' : ''}{(hours - verifiedBillableHours).toFixed(2)}h
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 pt-1 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:text-slate-100">
                  <span>Final Billable:</span>
                  <span>{hours.toFixed(2)}h</span>
                </div>
              </div>
            ) : (
              (originalHours !== undefined || workedHours !== undefined) && (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {originalHours !== undefined && (
                    <>
                      Original: {originalHours.toFixed(2)}h
                      {workedHours !== undefined && ' | '}
                    </>
                  )}
                  {workedHours !== undefined && <>Worked: {workedHours.toFixed(2)}h</>}
                </p>
              )
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
