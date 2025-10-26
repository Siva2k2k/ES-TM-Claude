import React from 'react';
import { CheckCircle2, Eye, FileText, XCircle } from 'lucide-react';
import type { BillingInvoice } from '../../../types/billing';
import * as formatting from '../../../utils/formatting';

interface InvoiceListProps {
  invoices: BillingInvoice[];
  loading: boolean;
  onApprove: (invoiceId: string) => void;
  onReject: (invoiceId: string) => void;
  onView?: (invoice: BillingInvoice) => void;
}

const statusStyles: Record<BillingInvoice['status'], { label: string; classes: string }> = {
  draft: { label: 'Draft', classes: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200' },
  pending_approval: { label: 'Pending Approval', classes: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  approved: { label: 'Approved', classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  sent: { label: 'Sent', classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  paid: { label: 'Paid', classes: 'bg-emerald-200 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200' },
  overdue: { label: 'Overdue', classes: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  cancelled: { label: 'Cancelled', classes: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300' }
};

const canApproveStatus: Array<BillingInvoice['status']> = ['pending_approval'];
const canRejectStatus: Array<BillingInvoice['status']> = ['pending_approval', 'approved'];

export function InvoiceList({ invoices, loading, onApprove, onReject, onView }: InvoiceListProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-14 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
        No invoices found for the selected filters.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
          <thead className="bg-slate-50 dark:bg-slate-800/60">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                Invoice #
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                Client
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                Issue / Due
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                Total
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {invoices.map((invoice) => {
              const status = statusStyles[invoice.status];
              return (
                <tr key={invoice.id} className="hover:bg-blue-50/40 dark:hover:bg-blue-900/30">
                  <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {invoice.invoice_number}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                    {invoice.client_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                    {new Date(invoice.issue_date).toLocaleDateString()} &middot;{' '}
                    {new Date(invoice.due_date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {formatting.formatCurrency(invoice.total_amount, 'USD')}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${status.classes}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {onView && (
                        <button
                          type="button"
                          onClick={() => onView(invoice)}
                          className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          <Eye className="mr-1 h-4 w-4" /> View
                        </button>
                      )}
                      {canApproveStatus.includes(invoice.status) && (
                        <button
                          type="button"
                          onClick={() => onApprove(invoice.id)}
                          className="inline-flex items-center rounded-lg bg-emerald-600 px-3 py-1 text-sm font-semibold text-white hover:bg-emerald-500"
                        >
                          <CheckCircle2 className="mr-1 h-4 w-4" /> Approve
                        </button>
                      )}
                      {canRejectStatus.includes(invoice.status) && (
                        <button
                          type="button"
                          onClick={() => onReject(invoice.id)}
                          className="inline-flex items-center rounded-lg bg-red-600 px-3 py-1 text-sm font-semibold text-white hover:bg-red-500"
                        >
                          <XCircle className="mr-1 h-4 w-4" /> Reject
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
