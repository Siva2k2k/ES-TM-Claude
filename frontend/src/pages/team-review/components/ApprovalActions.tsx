/**
 * Phase 7: Approval Actions Component
 * Approve/Reject buttons with rejection reason modal
 * Mobile-first design with 44px touch targets
 */

import React, { useState } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

interface ApprovalActionsProps {
  timesheetId: string;
  projectId: string;
  onApprove: (timesheetId: string, projectId: string) => void;
  onReject: (timesheetId: string, projectId: string, reason: string) => void;
  isLoading?: boolean;
  variant?: 'default' | 'compact';
}

export const ApprovalActions: React.FC<ApprovalActionsProps> = ({
  timesheetId,
  projectId,
  onApprove,
  onReject,
  isLoading = false,
  variant = 'default'
}) => {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [reasonError, setReasonError] = useState('');

  const handleApproveClick = () => {
    onApprove(timesheetId, projectId);
  };

  const handleRejectClick = () => {
    setShowRejectModal(true);
    setRejectionReason('');
    setReasonError('');
  };

  const handleRejectSubmit = () => {
    // Validation
    if (!rejectionReason.trim()) {
      setReasonError('Please provide a reason for rejection');
      return;
    }

    if (rejectionReason.trim().length < 10) {
      setReasonError('Reason must be at least 10 characters');
      return;
    }

    // Submit rejection
    onReject(timesheetId, projectId, rejectionReason.trim());
    setShowRejectModal(false);
  };

  const handleModalClose = () => {
    if (!isLoading) {
      setShowRejectModal(false);
      setRejectionReason('');
      setReasonError('');
    }
  };

  // Compact variant for inline use
  if (variant === 'compact') {
    return (
      <>
        <div className="flex gap-2">
          {/* Approve Button */}
          <button
            onClick={handleApproveClick}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] active:bg-green-800"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Approve
          </button>

          {/* Reject Button */}
          <button
            onClick={handleRejectClick}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] active:bg-red-800"
          >
            <XCircle className="w-4 h-4 mr-2" />
            Reject
          </button>
        </div>

        {/* Rejection Modal */}
        {showRejectModal && (
          <RejectionModal
            isOpen={showRejectModal}
            onClose={handleModalClose}
            onSubmit={handleRejectSubmit}
            reason={rejectionReason}
            setReason={setRejectionReason}
            error={reasonError}
            isLoading={isLoading}
          />
        )}
      </>
    );
  }

  // Default variant for standalone use
  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Approve Button */}
        <button
          onClick={handleApproveClick}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] active:bg-green-800"
        >
          <CheckCircle className="w-5 h-5 mr-2" />
          Approve Timesheet
        </button>

        {/* Reject Button */}
        <button
          onClick={handleRejectClick}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] active:bg-red-800"
        >
          <XCircle className="w-5 h-5 mr-2" />
          Reject Timesheet
        </button>
      </div>

      {/* Rejection Modal */}
      {showRejectModal && (
        <RejectionModal
          isOpen={showRejectModal}
          onClose={handleModalClose}
          onSubmit={handleRejectSubmit}
          reason={rejectionReason}
          setReason={setRejectionReason}
          error={reasonError}
          isLoading={isLoading}
        />
      )}
    </>
  );
};

/**
 * Rejection Reason Modal
 */
interface RejectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  reason: string;
  setReason: (reason: string) => void;
  error: string;
  isLoading: boolean;
}

const RejectionModal: React.FC<RejectionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  reason,
  setReason,
  error,
  isLoading
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Reject Timesheet</h3>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center active:bg-gray-100 rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            Please provide a clear reason for rejecting this timesheet. The employee will be able to see this feedback.
          </p>

          {/* Reason Textarea */}
          <div>
            <label htmlFor="rejection-reason" className="block text-sm font-medium text-gray-700 mb-2">
              Rejection Reason *
            </label>
            <textarea
              id="rejection-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none ${
                error ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="e.g., Hours don't match project records, missing task descriptions, incorrect date entries..."
              disabled={isLoading}
            />
            <p className="mt-1 text-xs text-gray-500">
              {reason.length}/500 characters (minimum 10)
            </p>
            {error && (
              <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] active:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={isLoading || !reason.trim()}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] active:bg-red-800"
          >
            {isLoading ? 'Rejecting...' : 'Confirm Rejection'}
          </button>
        </div>
      </div>
    </div>
  );
};
