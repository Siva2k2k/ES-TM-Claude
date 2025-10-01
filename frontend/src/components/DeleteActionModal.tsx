import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Trash2, RotateCcw, AlertCircle } from 'lucide-react';

export type DeleteAction = 'soft' | 'hard' | 'restore';

interface DeleteActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (action: DeleteAction, reason?: string) => void | Promise<void>;
  title: string;
  itemName: string;
  itemType: string;
  action: DeleteAction;
  isLoading?: boolean;
  dependencies?: string[];
  isSoftDeleted?: boolean;
  canHardDelete?: boolean;
}

/**
 * DeleteActionModal - Professional delete/restore confirmation modal
 *
 * Features:
 * - Soft delete (recoverable) with reason requirement
 * - Hard delete (permanent) with type-to-confirm safety
 * - Restore deleted items
 * - Dependency checking
 * - Loading states
 * - Professional UI with danger indicators
 */
export const DeleteActionModal: React.FC<DeleteActionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemName,
  itemType,
  action,
  isLoading = false,
  dependencies = [],
  isSoftDeleted = false,
  canHardDelete = false
}) => {
  const [reason, setReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState('');

  const expectedConfirmText = action === 'hard' ? 'PERMANENTLY DELETE' : '';
  const needsConfirmation = action === 'hard';
  const needsReason = action === 'soft';

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setConfirmText('');
      setError('');
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    // Validation
    if (needsConfirmation && confirmText !== expectedConfirmText) {
      setError(`Please type "${expectedConfirmText}" to confirm`);
      return;
    }

    if (needsReason && !reason.trim()) {
      setError('Please provide a reason for deletion');
      return;
    }

    if (dependencies.length > 0 && action !== 'restore') {
      setError(`Cannot delete: has active dependencies`);
      return;
    }

    setError('');
    await onConfirm(action, reason);
  };

  if (!isOpen) return null;

  const getActionConfig = () => {
    switch (action) {
      case 'soft':
        return {
          icon: <Trash2 className="w-6 h-6" />,
          iconColor: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          buttonColor: 'bg-orange-600 hover:bg-orange-700',
          title: 'Delete ' + itemType,
          description: `This will mark "${itemName}" as deleted. You can restore it later if needed.`,
          buttonText: 'Delete'
        };
      case 'hard':
        return {
          icon: <AlertTriangle className="w-6 h-6" />,
          iconColor: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          buttonColor: 'bg-red-600 hover:bg-red-700',
          title: 'Permanently Delete ' + itemType,
          description: `This will PERMANENTLY delete "${itemName}". This action CANNOT be undone. All audit logs will be archived.`,
          buttonText: 'Permanently Delete'
        };
      case 'restore':
        return {
          icon: <RotateCcw className="w-6 h-6" />,
          iconColor: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          buttonColor: 'bg-green-600 hover:bg-green-700',
          title: 'Restore ' + itemType,
          description: `This will restore "${itemName}" and make it active again.`,
          buttonText: 'Restore'
        };
    }
  };

  const config = getActionConfig();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${config.borderColor} ${config.bgColor}`}>
          <div className="flex items-center space-x-3">
            <div className={config.iconColor}>
              {config.icon}
            </div>
            <h2 className="text-xl font-semibold text-gray-900">{title || config.title}</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Description */}
          <div className="text-gray-700">
            <p>{config.description}</p>
          </div>

          {/* Dependencies Warning */}
          {dependencies.length > 0 && action !== 'restore' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-semibold text-red-900 mb-2">Cannot Delete - Active Dependencies</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-red-800">
                    {dependencies.map((dep, idx) => (
                      <li key={idx}>{dep}</li>
                    ))}
                  </ul>
                  <p className="text-sm text-red-700 mt-2">
                    Please resolve these dependencies before deleting.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Soft Delete - already deleted, can hard delete */}
          {action === 'hard' && !canHardDelete && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-yellow-800">
                    Only Super Admin can permanently delete items. Item must be soft deleted first.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Reason Input (for soft delete) */}
          {needsReason && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Deletion <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Please provide a reason for deleting this item..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                rows={3}
                disabled={isLoading}
              />
            </div>
          )}

          {/* Type to Confirm (for hard delete) */}
          {needsConfirmation && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type <span className="font-mono font-bold">{expectedConfirmText}</span> to confirm
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={expectedConfirmText}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent font-mono"
                disabled={isLoading}
              />
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Warning for Hard Delete */}
          {action === 'hard' && (
            <div className="bg-red-50 border border-red-300 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-semibold text-red-900 mb-1">Warning: Permanent Action</h4>
                  <p className="text-sm text-red-800">
                    This action is irreversible. All data associated with this {itemType} will be permanently removed.
                    Audit logs will be archived but the item cannot be restored.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={
              isLoading ||
              (needsConfirmation && confirmText !== expectedConfirmText) ||
              (needsReason && !reason.trim()) ||
              (dependencies.length > 0 && action !== 'restore') ||
              (action === 'hard' && !canHardDelete)
            }
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${config.buttonColor} transition-colors`}
          >
            {isLoading ? (
              <span className="flex items-center space-x-2">
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Processing...</span>
              </span>
            ) : (
              config.buttonText
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteActionModal;
