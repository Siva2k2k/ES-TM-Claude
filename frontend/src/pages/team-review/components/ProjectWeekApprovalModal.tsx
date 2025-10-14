/**
 * ProjectWeekApprovalModal Component
 * Confirmation modal for bulk approve/reject actions
 */

import React, { useState } from 'react';
import { X, AlertTriangle, CheckCircle } from 'lucide-react';
import type { ProjectWeekGroup } from '../../../types/timesheetApprovals';

interface ProjectWeekApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectWeek: ProjectWeekGroup | null;
  action: 'approve' | 'reject';
  onConfirm: (reason?: string) => Promise<void>;
  isLoading?: boolean;
}

export const ProjectWeekApprovalModal: React.FC<ProjectWeekApprovalModalProps> = ({
  isOpen,
  onClose,
  projectWeek,
  action,
  onConfirm,
  isLoading = false
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (!isOpen || !projectWeek) return null;

  const handleConfirm = async () => {
    if (action === 'reject') {
      if (!reason.trim()) {
        setError('Rejection reason is required');
        return;
      }
      if (reason.trim().length < 10) {
        setError('Rejection reason must be at least 10 characters');
        return;
      }
    }

    try {
      setError('');
      await onConfirm(action === 'reject' ? reason : undefined);
      setReason('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setReason('');
      setError('');
      onClose();
    }
  };

  const pendingUsers = projectWeek.users.filter(u => u.approval_status === 'pending');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full">
          {/* Header */}
          <div className={`flex items-center justify-between p-6 border-b ${
            action === 'approve' ? 'bg-green-50' : 'bg-red-50'
          }`}>
            <div className="flex items-center gap-3">
              {action === 'approve' ? (
                <CheckCircle className="w-6 h-6 text-green-600" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-red-600" />
              )}
              <h3 className="text-lg font-semibold text-gray-900">
                {action === 'approve' ? 'Approve Project-Week' : 'Reject Project-Week'}
              </h3>
            </div>
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Project-Week Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">
                {projectWeek.project_name}
              </h4>
              <p className="text-sm text-gray-600 mb-3">
                Week: {projectWeek.week_label}
              </p>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {pendingUsers.length}
                  </div>
                  <div className="text-xs text-gray-600">Users</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {projectWeek.total_hours.toFixed(1)}
                  </div>
                  <div className="text-xs text-gray-600">Hours</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {projectWeek.total_entries}
                  </div>
                  <div className="text-xs text-gray-600">Entries</div>
                </div>
              </div>
            </div>

            {/* Affected Users */}
            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-2">
                Affected Users:
              </h5>
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3 space-y-1">
                {pendingUsers.map(user => (
                  <div key={user.user_id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-900">{user.user_name}</span>
                    <span className="text-gray-600">
                      {user.total_hours_for_project.toFixed(1)}h
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Warning/Confirmation Message */}
            <div className={`p-4 rounded-lg ${
              action === 'approve' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <p className={`text-sm ${
                action === 'approve' ? 'text-green-800' : 'text-red-800'
              }`}>
                {action === 'approve' ? (
                  <>
                    You are about to <strong>approve</strong> all {pendingUsers.length} user timesheet(s)
                    for this project-week. This action will update the approval status for all affected timesheets.
                  </>
                ) : (
                  <>
                    You are about to <strong>reject</strong> all {pendingUsers.length} user timesheet(s)
                    for this project-week. This will reset all approvals and require resubmission.
                  </>
                )}
              </p>
            </div>

            {/* Rejection Reason */}
            {action === 'reject' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rejection Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    setError('');
                  }}
                  disabled={isLoading}
                  placeholder="Explain why these timesheets are being rejected (minimum 10 characters)..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:opacity-50 resize-none"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {reason.length}/10 characters minimum
                </p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading || (action === 'reject' && reason.trim().length < 10)}
              className={`px-4 py-2 rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                action === 'approve'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </span>
              ) : (
                `Confirm ${action === 'approve' ? 'Approval' : 'Rejection'}`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
