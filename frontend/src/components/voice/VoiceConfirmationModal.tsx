import React, { useState, useEffect } from 'react';
import { useVoice } from '../../contexts/VoiceContext';
import { VoiceAction, VoiceActionField } from '../../types/voice';
import { backendApi } from '../../lib/backendApi';

const IconCheck = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconX = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconEdit = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconAlert = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
    <path d="M12 8v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const IconLoader = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-spin">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
    <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75" />
  </svg>
);

interface FieldRendererProps {
  field: VoiceActionField;
  value: any;
  onChange: (value: any) => void;
  editMode: boolean;
  options?: Array<{ value: string; label: string }>;
}

const FieldRenderer: React.FC<FieldRendererProps> = ({ field, value, onChange, editMode, options }) => {
  const renderFieldValue = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  const displayValue = renderFieldValue(value);

  if (!editMode) {
    return (
      <div className="px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded text-sm text-gray-900 dark:text-white">
        {displayValue || <span className="text-gray-400 dark:text-gray-500 italic">Not specified</span>}
      </div>
    );
  }

  const baseInputClasses = "px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full";

  switch (field.type) {
    case 'boolean':
      return (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            className="w-4 h-4 text-blue-600 bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 rounded focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {value ? 'Yes' : 'No'}
          </span>
        </label>
      );

    case 'number':
      return (
        <input
          type="number"
          value={value || ''}
          onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : '')}
          className={baseInputClasses}
          step="any"
        />
      );

    case 'date':
      return (
        <input
          type="date"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={baseInputClasses}
        />
      );

    case 'enum':
      // Check if we have dynamic options (from API) or static enum values
      const selectOptions = options || (field.enumValues || []).map(val => ({ value: val, label: val }));

      return (
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={baseInputClasses}
        >
          <option value="">-- Select {field.label || field.name} --</option>
          {selectOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );

    case 'array':
      return (
        <textarea
          value={Array.isArray(value) ? value.join(', ') : String(value || '')}
          onChange={(e) => {
            const arr = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
            onChange(arr);
          }}
          className={baseInputClasses}
          rows={2}
          placeholder="Comma-separated values"
        />
      );

    default: // string
      return (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={baseInputClasses}
        />
      );
  }
};

const VoiceConfirmationModal: React.FC = () => {
  const { state, executeActions, clearPendingActions } = useVoice();
  const [editMode, setEditMode] = useState(false);
  const [editedActions, setEditedActions] = useState<VoiceAction[]>(state.pendingActions);
  const [dropdownOptions, setDropdownOptions] = useState<Record<string, Array<{ value: string; label: string }>>>({});
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Update edited actions when pending actions change
  useEffect(() => {
    setEditedActions(state.pendingActions);
    // Fetch dropdown options when modal opens
    if (state.pendingActions.length > 0) {
      fetchDropdownOptions(state.pendingActions);
    }
  }, [state.pendingActions]);

  const fetchDropdownOptions = async (actions: VoiceAction[]) => {
    setLoadingOptions(true);
    const options: Record<string, Array<{ value: string; label: string }>> = {};

    try {
      // Check which entities we need to fetch
      const needsClients = actions.some(action =>
        action.fields?.some(f => f.name === 'client_id' || f.name.includes('client'))
      );
      const needsManagers = actions.some(action =>
        action.fields?.some(f => f.name === 'primary_manager_id' || f.name.includes('manager'))
      );
      const needsUsers = actions.some(action =>
        action.fields?.some(f => f.name === 'user_id' || f.name.includes('user'))
      );
      const needsProjects = actions.some(action =>
        action.fields?.some(f => f.name === 'project_id' || f.name.includes('project'))
      );

      // Fetch clients
      if (needsClients) {
        try {
          const clientsData = await backendApi.get<{ clients: any[] }>('/api/clients');
          options['client_id'] = clientsData.clients.map((c: any) => ({
            value: c.id || c._id,
            label: c.name || c.client_name
          }));
        } catch (error) {
          console.error('Failed to fetch clients:', error);
        }
      }

      // Fetch managers/users
      if (needsManagers || needsUsers) {
        try {
          const usersData = await backendApi.get<{ users: any[] }>('/api/users');
          const managers = usersData.users.filter((u: any) =>
            ['manager', 'management', 'lead', 'super_admin'].includes(u.role?.toLowerCase())
          );

          options['primary_manager_id'] = managers.map((u: any) => ({
            value: u.id || u._id,
            label: u.full_name || u.name
          }));

          options['user_id'] = usersData.users.map((u: any) => ({
            value: u.id || u._id,
            label: u.full_name || u.name
          }));
        } catch (error) {
          console.error('Failed to fetch users:', error);
        }
      }

      // Fetch projects
      if (needsProjects) {
        try {
          const projectsData = await backendApi.get<{ projects: any[] }>('/api/projects');
          options['project_id'] = projectsData.projects.map((p: any) => ({
            value: p.id || p._id,
            label: p.name || p.project_name
          }));
        } catch (error) {
          console.error('Failed to fetch projects:', error);
        }
      }

      setDropdownOptions(options);
    } catch (error) {
      console.error('Failed to fetch dropdown options:', error);
    } finally {
      setLoadingOptions(false);
    }
  };

  const handleConfirm = async () => {
    await executeActions(editMode ? editedActions : state.pendingActions);
  };

  const handleCancel = () => {
    clearPendingActions();
    setEditMode(false);
  };

  const handleEdit = () => {
    setEditMode(true);
  };

  const handleFieldChange = (actionIndex: number, field: string, value: any) => {
    const updated = [...editedActions];
    updated[actionIndex] = {
      ...updated[actionIndex],
      data: {
        ...updated[actionIndex].data,
        [field]: value,
      },
    };
    setEditedActions(updated);
  };

  const handleRemoveAction = (actionIndex: number) => {
    const updated = editedActions.filter((_, idx) => idx !== actionIndex);
    setEditedActions(updated);
  };

  const getIntentDisplayName = (intent: string): string => {
    return intent
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (state.pendingActions.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-800 rounded-lg shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Confirm Voice Command
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Review the detected actions and confirm to proceed
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {loadingOptions && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded flex items-center gap-2">
              <IconLoader size={16} />
              <span className="text-sm text-blue-800 dark:text-blue-200">Loading options...</span>
            </div>
          )}

          {/* Actions List */}
          <div className="space-y-4">
            {(editMode ? editedActions : state.pendingActions).map((action, idx) => (
              <div
                key={idx}
                className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 bg-gray-50 dark:bg-slate-900"
              >
                {/* Action Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium rounded">
                      {getIntentDisplayName(action.intent)}
                    </span>
                    {action.confidence !== undefined && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Confidence: {Math.round(action.confidence * 100)}%
                      </span>
                    )}
                  </div>
                  {editMode && (
                    <button
                      onClick={() => handleRemoveAction(idx)}
                      className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded text-red-600 dark:text-red-400"
                      title="Remove action"
                    >
                      <IconX size={16} />
                    </button>
                  )}
                </div>

                {/* Description */}
                {action.description && (
                  <div className="mb-3 text-sm text-gray-600 dark:text-gray-400 italic">
                    {action.description}
                  </div>
                )}

                {/* Errors */}
                {action.errors && action.errors.length > 0 && (
                  <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                    <div className="flex items-start gap-2">
                      <IconAlert size={16} />
                      <div className="flex-1">
                        <div className="text-xs font-medium text-red-800 dark:text-red-200 mb-1">
                          Errors:
                        </div>
                        <ul className="text-xs text-red-700 dark:text-red-300 list-disc list-inside space-y-1">
                          {action.errors.map((error, errIdx) => (
                            <li key={errIdx}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Warnings */}
                {action.warnings && action.warnings.length > 0 && (
                  <div className="mb-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                    <div className="flex items-start gap-2">
                      <IconAlert size={16} />
                      <div className="flex-1">
                        <div className="text-xs font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                          Warnings:
                        </div>
                        <ul className="text-xs text-yellow-700 dark:text-yellow-300 list-disc list-inside space-y-1">
                          {action.warnings.map((warning, warnIdx) => (
                            <li key={warnIdx}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Data Fields - Use action.fields if available, otherwise fall back to action.data */}
                <div className="space-y-2">
                  {action.fields && action.fields.length > 0 ? (
                    // Render based on field definitions
                    action.fields.map((field) => (
                      <div key={field.name} className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          {field.label || field.name}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        <FieldRenderer
                          field={field}
                          value={action.data[field.name]}
                          onChange={(value) => handleFieldChange(idx, field.name, value)}
                          editMode={editMode}
                          options={dropdownOptions[field.name]}
                        />
                      </div>
                    ))
                  ) : (
                    // Fallback: Render all data fields as text inputs
                    Object.entries(action.data).map(([field, value]) => (
                      <div key={field} className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          {field
                            .split(/(?=[A-Z])/)
                            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                            .join(' ')}
                        </label>
                        {editMode ? (
                          <input
                            type="text"
                            value={String(value || '')}
                            onChange={(e) => handleFieldChange(idx, field, e.target.value)}
                            className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        ) : (
                          <div className="px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded text-sm text-gray-900 dark:text-white">
                            {String(value || '')}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Original Transcript */}
          {state.transcript && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
              <div className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">
                Original Command:
              </div>
              <div className="text-sm text-blue-900 dark:text-blue-100 italic">
                "{state.transcript}"
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {!editMode && (
              <button
                onClick={handleEdit}
                disabled={state.isProcessing}
                className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <IconEdit size={16} />
                Edit
              </button>
            )}
            {editMode && (
              <button
                onClick={() => {
                  setEditMode(false);
                  setEditedActions(state.pendingActions);
                }}
                disabled={state.isProcessing}
                className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              disabled={state.isProcessing}
              className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={state.isProcessing || (editMode && editedActions.length === 0)}
              className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {state.isProcessing ? (
                <>
                  <IconLoader size={20} />
                  Processing...
                </>
              ) : (
                <>
                  <IconCheck size={20} />
                  Confirm {editMode && `(${editedActions.length})`}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceConfirmationModal;
