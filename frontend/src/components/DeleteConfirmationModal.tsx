import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Trash2 } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  itemName: string;
  itemType: string;
  isDangerous?: boolean;
  isLoading?: boolean;
  dependencies?: string[];
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  itemName,
  itemType,
  isDangerous = true,
  isLoading = false,
  dependencies = []
}) => {
  const [confirmText, setConfirmText] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setConfirmText('');
      setIsConfirming(false);
    }
  }, [isOpen]);

  const canDelete = !isDangerous || confirmText.toLowerCase() === itemName.toLowerCase();
  const hasDependencies = dependencies.length > 0;

  const handleConfirm = async () => {
    if (!canDelete || hasDependencies) return;

    setIsConfirming(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && canDelete && !hasDependencies) {
      handleConfirm();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white bg-opacity-20 p-2 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
            disabled={isConfirming || isLoading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Message */}
          <p className="text-slate-700 leading-relaxed">{message}</p>

          {/* Item to delete */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-slate-600 mb-1">{itemType} to delete:</p>
            <p className="font-semibold text-slate-900">{itemName}</p>
          </div>

          {/* Dependencies Warning */}
          {hasDependencies && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-yellow-900 mb-2">Cannot Delete</p>
                  <p className="text-sm text-yellow-800 mb-2">
                    This {itemType.toLowerCase()} has the following dependencies:
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    {dependencies.map((dep, index) => (
                      <li key={index} className="text-sm text-yellow-800">{dep}</li>
                    ))}
                  </ul>
                  <p className="text-sm text-yellow-800 mt-2 font-medium">
                    Please resolve these dependencies before deleting.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Confirmation Input for Dangerous Actions */}
          {isDangerous && !hasDependencies && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Type <span className="font-bold text-red-600">"{itemName}"</span> to confirm deletion:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`Type "${itemName}" here`}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                disabled={isConfirming || isLoading}
                autoFocus
              />
              {confirmText && !canDelete && (
                <p className="text-sm text-red-600">
                  Text doesn't match. Please type exactly: {itemName}
                </p>
              )}
            </div>
          )}

          {/* Warning Text */}
          {!hasDependencies && (
            <div className="flex items-start space-x-2 text-sm text-slate-600">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p>
                This action cannot be undone. The {itemType.toLowerCase()} will be {isDangerous ? 'permanently deleted' : 'marked as deleted'}.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-medium"
            disabled={isConfirming || isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canDelete || hasDependencies || isConfirming || isLoading}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
              canDelete && !hasDependencies && !isConfirming && !isLoading
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          >
            {(isConfirming || isLoading) ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Delete {itemType}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;
