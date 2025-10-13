/**
 * Phase 7: Bulk Approval Panel
 * Management bulk verify and bill operations (project-wise)
 * Mobile-first design with 44px touch targets
 */

import React, { useState } from 'react';
import {
  CheckCircle,
  DollarSign,
  AlertCircle,
  X,
  FileCheck,
  Info
} from 'lucide-react';
import type { ProjectTimesheetGroup } from '../../../types/timesheetApprovals';

interface BulkApprovalPanelProps {
  projects: ProjectTimesheetGroup[];
  onBulkVerify: (timesheetIds: string[], projectId?: string) => Promise<void>;
  onBulkBill: (timesheetIds: string[], projectId?: string) => Promise<void>;
  isLoading?: boolean;
}

export const BulkApprovalPanel: React.FC<BulkApprovalPanelProps> = ({
  projects,
  onBulkVerify,
  onBulkBill,
  isLoading = false
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'verify' | 'bill'>('verify');

  // Get eligible timesheets based on action
  const getEligibleTimesheets = (action: 'verify' | 'bill') => {
    const timesheets: Array<{ id: string; projectName: string; userName: string }> = [];

    projects.forEach((project) => {
      // Filter based on selection
      if (selectedProjectId !== 'all' && project.project_id !== selectedProjectId) {
        return;
      }

      project.members.forEach((member) => {
        const ts = member.current_week_timesheet;
        if (!ts) return;

        // For verify: must be manager_approved
        if (action === 'verify' && ts.status === 'manager_approved') {
          timesheets.push({
            id: ts.timesheet_id,
            projectName: project.project_name,
            userName: member.user_name
          });
        }

        // For bill: must be frozen
        if (action === 'bill' && ts.status === 'frozen') {
          timesheets.push({
            id: ts.timesheet_id,
            projectName: project.project_name,
            userName: member.user_name
          });
        }
      });
    });

    return timesheets;
  };

  const eligibleForVerify = getEligibleTimesheets('verify');
  const eligibleForBill = getEligibleTimesheets('bill');

  const handleVerifyClick = () => {
    if (eligibleForVerify.length === 0) return;
    setConfirmAction('verify');
    setShowConfirmModal(true);
  };

  const handleBillClick = () => {
    if (eligibleForBill.length === 0) return;
    setConfirmAction('bill');
    setShowConfirmModal(true);
  };

  const handleConfirm = async () => {
    const timesheets = confirmAction === 'verify' ? eligibleForVerify : eligibleForBill;
    const timesheetIds = timesheets.map(t => t.id);
    const projectId = selectedProjectId === 'all' ? undefined : selectedProjectId;

    try {
      if (confirmAction === 'verify') {
        await onBulkVerify(timesheetIds, projectId);
      } else {
        await onBulkBill(timesheetIds, projectId);
      }
      setShowConfirmModal(false);
    } catch (error) {
      console.error('Bulk operation failed:', error);
    }
  };

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
          <FileCheck className="w-5 h-5 text-purple-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900">Bulk Operations</h3>
          <p className="text-sm text-gray-600 mt-1">
            Verify or bill multiple timesheets at once
          </p>
        </div>
      </div>

      {/* Info Alert */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex gap-2">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Management Privileges</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Verify:</strong> Freeze manager-approved timesheets</li>
              <li><strong>Bill:</strong> Mark frozen timesheets as billed</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Project Selector */}
      <div className="mb-4">
        <label htmlFor="project-select" className="block text-sm font-medium text-gray-700 mb-2">
          Select Scope
        </label>
        <select
          id="project-select"
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 min-h-[44px]"
          disabled={isLoading}
        >
          <option value="all">All Projects</option>
          {projects.map((project) => (
            <option key={project.project_id} value={project.project_id}>
              {project.project_name} ({project.pending_approvals_count} pending)
            </option>
          ))}
        </select>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-2xl font-bold text-purple-600">{eligibleForVerify.length}</div>
          <div className="text-xs text-gray-600 mt-1">Ready to Verify</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-2xl font-bold text-green-600">{eligibleForBill.length}</div>
          <div className="text-xs text-gray-600 mt-1">Ready to Bill</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleVerifyClick}
          disabled={eligibleForVerify.length === 0 || isLoading}
          className="flex-1 flex items-center justify-center px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] active:bg-purple-800"
        >
          <CheckCircle className="w-5 h-5 mr-2" />
          Verify {eligibleForVerify.length > 0 && `(${eligibleForVerify.length})`}
        </button>

        <button
          onClick={handleBillClick}
          disabled={eligibleForBill.length === 0 || isLoading}
          className="flex-1 flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] active:bg-green-800"
        >
          <DollarSign className="w-5 h-5 mr-2" />
          Mark as Billed {eligibleForBill.length > 0 && `(${eligibleForBill.length})`}
        </button>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <BulkConfirmationModal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          onConfirm={handleConfirm}
          action={confirmAction}
          timesheets={confirmAction === 'verify' ? eligibleForVerify : eligibleForBill}
          projectName={
            selectedProjectId === 'all'
              ? 'All Projects'
              : projects.find(p => p.project_id === selectedProjectId)?.project_name || ''
          }
          isLoading={isLoading}
        />
      )}
    </div>
  );
};

/**
 * Bulk Confirmation Modal
 */
interface BulkConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  action: 'verify' | 'bill';
  timesheets: Array<{ id: string; projectName: string; userName: string }>;
  projectName: string;
  isLoading: boolean;
}

const BulkConfirmationModal: React.FC<BulkConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  action,
  timesheets,
  projectName,
  isLoading
}) => {
  if (!isOpen) return null;

  const actionText = action === 'verify' ? 'Verify' : 'Mark as Billed';
  const actionColor = action === 'verify' ? 'purple' : 'green';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Confirm Bulk {actionText}
          </h3>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center active:bg-gray-100 rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Warning */}
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">Confirm Action</p>
                <p>
                  You are about to <strong>{actionText.toLowerCase()}</strong> {timesheets.length} timesheet{timesheets.length !== 1 ? 's' : ''} for <strong>{projectName}</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Timesheet List */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              Affected Timesheets ({timesheets.length}):
            </h4>
            <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
              {timesheets.map((ts, index) => (
                <div
                  key={ts.id}
                  className={`px-4 py-3 ${index !== 0 ? 'border-t border-gray-100' : ''} hover:bg-gray-50`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <span className="font-medium text-gray-900">{ts.userName}</span>
                      <span className="text-gray-500 mx-2">•</span>
                      <span className="text-gray-600">{ts.projectName}</span>
                    </div>
                    <CheckCircle className={`w-4 h-4 text-${actionColor}-500`} />
                  </div>
                </div>
              ))}
            </div>
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
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 px-4 py-2 bg-${actionColor}-600 text-white rounded-lg font-medium hover:bg-${actionColor}-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] active:bg-${actionColor}-800`}
          >
            {isLoading ? 'Processing...' : `Confirm ${actionText}`}
          </button>
        </div>
      </div>
    </div>
  );
};
