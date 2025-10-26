import React, { useEffect, useState } from 'react';
import type { BillingClient } from '../../../types/billing';
import { getCurrentWeekMonday } from '../../../utils/timesheetHelpers';

interface InvoiceGenerateDialogProps {
  open: boolean;
  clients: BillingClient[];
  onClose: () => void;
  onGenerate: (clientId: string, weekStart: string) => Promise<void> | void;
}

export function InvoiceGenerateDialog({ open, clients, onClose, onGenerate }: InvoiceGenerateDialogProps) {
  const [clientId, setClientId] = useState('');
  const [weekStart, setWeekStart] = useState(getCurrentWeekMonday);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setWeekStart(getCurrentWeekMonday());
      setClientId(clients[0]?.id ?? '');
    }
  }, [open, clients]);

  if (!open) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!clientId) return;
    setSubmitting(true);
    await onGenerate(clientId, weekStart);
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Generate Invoice
        </h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Create a billing invoice for a client using approved timesheets.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">
              Client
            </label>
            <select
              value={clientId}
              onChange={(event) => setClientId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              required
            >
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">
              Week Start
            </label>
            <input
              type="date"
              value={weekStart}
              onChange={(event) => setWeekStart(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              required
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Invoices include timesheets frozen after the selected week.
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={submitting || !clientId}
            >
              {submitting ? 'Generating...' : 'Generate Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
