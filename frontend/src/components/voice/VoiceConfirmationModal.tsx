import React, { useState, useEffect } from 'react';
import { useVoice } from '../../contexts/VoiceContext';
import { VoiceAction, VoiceActionField, VoiceError } from '../../types/voice';
import { Project, User, ProjectMember } from '../../types';
import { backendApi } from '../../lib/backendApi';
import { sanitizeVoiceActions } from '../../utils/voiceDataSanitization';
import VoiceErrorDisplay from '../VoiceErrorDisplay';

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

  // Determine if field should use dropdown
  // Priority: 1) API-fetched options (reference fields), 2) enumValues (enum fields)
  let dropdownOptions = options;

  // If no API options provided, check for enumValues
  if (!dropdownOptions && field.enumValues && field.enumValues.length > 0) {
    dropdownOptions = field.enumValues.map(val => ({ value: val, label: val }));
  }

  // A field should use dropdown if it's a reference type or enum type with options
  const shouldUseDropdown = (field.type === 'reference' || field.type === 'enum') &&
                           dropdownOptions &&
                           dropdownOptions.length > 0;

  // Debug logging for reference/enum fields
  if ((field.type === 'reference' || field.type === 'enum') && process.env.NODE_ENV === 'development') {
    console.log('Dropdown field:', {
      fieldName: field.name,
      fieldType: field.type,
      referenceType: field.referenceType,
      hasOptions: !!dropdownOptions,
      optionsCount: dropdownOptions?.length || 0,
      enumValues: field.enumValues,
      currentValue: value
    });
  }

  // Display mode
  if (!editMode) {
    let displayText = renderFieldValue(value);

    // Show label instead of value if dropdown options exist
    if (shouldUseDropdown && dropdownOptions) {
      const option = dropdownOptions.find(opt => opt.value === value);
      if (option) displayText = option.label;
    }

    return (
      <div className="px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded text-sm text-gray-900 dark:text-white">
        {displayText || <span className="text-gray-400 dark:text-gray-500 italic">Not specified</span>}
      </div>
    );
  }

  const baseInputClasses = "px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full";

  // Render dropdown if options are available (from API or enumValues)
  if (shouldUseDropdown && dropdownOptions) {
    return (
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className={baseInputClasses}
      >
        <option value="">-- Select {field.label || field.name} --</option>
        {dropdownOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  // Otherwise render based on field type
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

    case 'date': {
      // Format date value for HTML date input (requires YYYY-MM-DD format)
      let dateValue = '';
      if (value) {
        if (value instanceof Date) {
          // Use local date formatting to avoid timezone shifting
          const year = value.getFullYear();
          const month = String(value.getMonth() + 1).padStart(2, '0');
          const day = String(value.getDate()).padStart(2, '0');
          dateValue = `${year}-${month}-${day}`;
        } else if (typeof value === 'string') {
          const parsedDate = new Date(value);
          if (!isNaN(parsedDate.getTime())) {
            // Use local date formatting to avoid timezone shifting
            const year = parsedDate.getFullYear();
            const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
            const day = String(parsedDate.getDate()).padStart(2, '0');
            dateValue = `${year}-${month}-${day}`;
          } else {
            dateValue = value;
          }
        } else {
          dateValue = String(value);
        }
      }

      return (
        <input
          type="date"
          value={dateValue}
          onChange={(e) => onChange(e.target.value)}
          className={baseInputClasses}
        />
      );
    }

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
      // Collect all reference types needed from field definitions
      const referenceTypes = new Set<string>();
      let projectIdForTasks: string | null = null;
      let projectIdForMembers: string | null = null;

      actions.forEach(action => {
        action.fields?.forEach(field => {
          if (field.type === 'reference' && field.referenceType) {
            referenceTypes.add(field.referenceType);

            // Track project ID for task/member fetching
            if (field.referenceType === 'task' || field.referenceType === 'projectMember') {
              const projectId = action.data.project_id || action.data.projectName || action.data.project;
              if (projectId) {
                if (field.referenceType === 'task') projectIdForTasks = projectId;
                if (field.referenceType === 'projectMember') projectIdForMembers = projectId;
              }
            }
          }
        });

        // Also check legacy field patterns that might not have explicit field definitions
        Object.keys(action.data).forEach(fieldName => {
          if (fieldName.includes('client') || fieldName === 'client_id') {
            referenceTypes.add('client');
          }
          if (fieldName.includes('manager') || fieldName.includes('user')) {
            referenceTypes.add('user');
            referenceTypes.add('manager');
          }
          if (fieldName.includes('project') || fieldName === 'project_id') {
            referenceTypes.add('project');
          }
        });
      });

      // Fetch clients if needed
      if (referenceTypes.has('client')) {
        try {
          const clientsResponse = await backendApi.get<{ success: boolean; data: any[] }>('/clients');
          if (clientsResponse.success && clientsResponse.data) {
            const clientOptions = clientsResponse.data.map((c: any) => ({
              value: c.id || c._id,
              label: c.name || c.client_name
            }));
            
            // Map to all possible client field names
            options['client'] = clientOptions;
            options['client_id'] = clientOptions;
            options['clientName'] = clientOptions;
            options['client_name'] = clientOptions;
          }
        } catch (error) {
          console.error('Failed to fetch clients:', error);
        }
      }

      // Fetch projects first (needed for resolving project names to IDs)
      let projectsData: Project[] = [];
      if (referenceTypes.has('project')) {
        try {
          const projectsResponse = await backendApi.get<{ success: boolean; projects: Project[] }>('/projects');
          if (projectsResponse.success && projectsResponse.projects) {
            projectsData = projectsResponse.projects;
            const projectOptions = projectsData.map((p: Project) => ({
              value: p.id,
              label: p.name
            }));
            options['project'] = projectOptions;
            options['project_id'] = projectOptions;
            options['projectName'] = projectOptions;
          }
        } catch (error) {
          console.error('Failed to fetch projects:', error);
        }
      }

      // Fetch users and managers if needed
      if (referenceTypes.has('user') || referenceTypes.has('manager')) {
        try {
          const usersResponse = await backendApi.get<{ success: boolean; users: User[] }>('/users');
          if (usersResponse.success && usersResponse.users) {
            const allUsers = usersResponse.users.map((u: User) => ({
              value: u.id,
              label: u.full_name
            }));

            // For manager reference type, only include users with "manager" role
            // Not other management-level roles like "management", "lead", "super_admin"
            const managers = usersResponse.users
              .filter((u: User) => u.role?.toLowerCase() === 'manager') // Only actual managers
              .map((u: User) => ({
                value: u.id,
                label: u.full_name
              }));

            if (referenceTypes.has('user')) {
              options['user'] = allUsers;
              options['user_id'] = allUsers;
              options['userName'] = allUsers;
            }

            if (referenceTypes.has('manager')) {
              options['manager'] = managers;
              options['primary_manager_id'] = managers;
              options['managerName'] = managers;
            }

            // Special handling for add_project_member intent
            const projectMemberAction = actions.find(action => action.intent === 'add_project_member' || action.intent === 'remove_project_member');
            if (projectMemberAction) {
              const projectNameOrId = (projectMemberAction.data?.projectName || projectMemberAction.data?.project_id) as string;
              const selectedRole = projectMemberAction.data?.role as string;
              
              // Resolve project name to actual project ID
              let resolvedProjectId = projectNameOrId;
              if (projectNameOrId && projectsData.length > 0) {
                // First check if it's already a valid ID (ObjectId format)
                const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(String(projectNameOrId));
                if (!isValidObjectId) {
                  // Try to find by name
                  const matchingProject = projectsData.find((p: Project) => 
                    p.name?.toLowerCase() === String(projectNameOrId).toLowerCase()
                  );
                  if (matchingProject) {
                    resolvedProjectId = matchingProject.id;
                  }
                }
              }
              
              let filteredUsers = [...usersResponse.users];
              
              // Filter by role if selected
              if (selectedRole && typeof selectedRole === 'string') {
                if (selectedRole.toLowerCase() === 'employee') {
                  filteredUsers = filteredUsers.filter((u: User) => u.role?.toLowerCase() === 'employee');
                } else if (selectedRole.toLowerCase() === 'lead') {
                  filteredUsers = filteredUsers.filter((u: User) => u.role?.toLowerCase() === 'lead');
                }
              }
              
              // Exclude existing project members if we have a valid project ID
              if (resolvedProjectId) {
                try {
                  const existingMembersResponse = await backendApi.get<{ success: boolean; members: ProjectMember[] }>(`/projects/${resolvedProjectId}/members`);
                  if (existingMembersResponse.success && existingMembersResponse.members) {
                    const existingMemberIds = existingMembersResponse.members.map((m: ProjectMember) => m.user_id);
                    filteredUsers = filteredUsers.filter((u: User) => !existingMemberIds.includes(u.id));
                  }
                } catch (error) {
                  console.error('Failed to fetch existing project members:', error);
                  // Continue without filtering existing members
                }
              }
              
              const availableUserOptions = filteredUsers.map((u: User) => ({
                value: u.id,
                label: u.full_name
              }));
              
              // Store for project member name field - override the general user options
              options['name'] = availableUserOptions;
              options['memberName'] = availableUserOptions;
            }
          }
        } catch (error) {
          console.error('Failed to fetch users:', error);
        }
      }

      // Fetch tasks for specific project
      if (referenceTypes.has('task') && projectIdForTasks) {
        try {
          const tasksResponse = await backendApi.get<{ success: boolean; tasks: any[] }>(`/projects/${projectIdForTasks}/tasks`);
          if (tasksResponse.success && tasksResponse.tasks) {
            const taskOptions = tasksResponse.tasks.map((t: any) => ({
              value: t.id || t._id,
              label: t.name || t.task_name
            }));
            options['task'] = taskOptions;
            options['task_id'] = taskOptions;
            options['taskName'] = taskOptions;
          }
        } catch (error) {
          console.error('Failed to fetch tasks:', error);
        }
      }

      // Fetch project members for specific project
      if (referenceTypes.has('projectMember') && projectIdForMembers) {
        try {
          const membersResponse = await backendApi.get<{ success: boolean; members: any[] }>(`/projects/${projectIdForMembers}/members`);
          if (membersResponse.success && membersResponse.members) {
            const memberOptions = membersResponse.members.map((m: any) => ({
              value: m.user_id || m.id || m._id,
              label: m.full_name || m.name
            }));
            options['projectMember'] = memberOptions;
            options['assignedMemberName'] = memberOptions;
          }
        } catch (error) {
          console.error('Failed to fetch project members:', error);
        }
      }

      setDropdownOptions(options);
    } catch (error) {
      console.error('Failed to fetch dropdown options:', error);
    } finally {
      setLoadingOptions(false);
    }
  };

  // Helper function to get dropdown options for a field
  const getOptionsForField = (field: VoiceActionField): Array<{ value: string; label: string }> | undefined => {
    // First try exact field name match
    if (dropdownOptions[field.name]) {
      return dropdownOptions[field.name];
    }

    // For reference fields, use referenceType to find options
    if (field.referenceType) {
      // Direct referenceType match
      if (dropdownOptions[field.referenceType]) {
        return dropdownOptions[field.referenceType];
      }

      // Try common variations based on referenceType
      const variations: Record<string, string[]> = {
        project: ['project', 'project_id', 'projectName'],
        client: ['client', 'client_id', 'clientName'],
        user: ['user', 'user_id', 'userName'],
        manager: ['manager', 'primary_manager_id', 'managerName'],
        task: ['task', 'task_id', 'taskName'],
        projectMember: ['projectMember', 'assignedMemberName']
      };

      const possibleKeys = variations[field.referenceType] || [];
      for (const key of possibleKeys) {
        if (dropdownOptions[key]) {
          return dropdownOptions[key];
        }
      }
    }

    // Fallback: try to infer from field name
    const lowerName = field.name.toLowerCase();
    if (lowerName.includes('project')) {
      return dropdownOptions['project'] || dropdownOptions['project_id'];
    }
    if (lowerName.includes('client')) {
      return dropdownOptions['client'] || dropdownOptions['client_id'];
    }
    if (lowerName.includes('manager')) {
      return dropdownOptions['manager'] || dropdownOptions['primary_manager_id'];
    }
    if (lowerName.includes('user') && !lowerName.includes('manager')) {
      return dropdownOptions['user'] || dropdownOptions['user_id'];
    }
    if (lowerName.includes('task')) {
      return dropdownOptions['task'] || dropdownOptions['task_id'];
    }

    return undefined;
  };

  const handleConfirm = async () => {
    // Use centralized sanitization utility to prevent data corruption issues
    const actionsToExecute = sanitizeVoiceActions(editMode ? editedActions : state.pendingActions);
    await executeActions(actionsToExecute);
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

    // If this is a role change for add_project_member intent, re-fetch dropdown options
    if ((updated[actionIndex].intent === 'add_project_member' || updated[actionIndex].intent === 'remove_project_member') && field === 'role') {
      // Trigger re-fetch of dropdown options with the new role selection
      setTimeout(() => {
        fetchDropdownOptions(updated);
      }, 100);
    }
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
                          options={getOptionsForField(field)}
                        />
                      </div>
                    ))
                  ) : (
                    // Fallback: Render all data fields as text inputs or dropdowns
                    Object.entries(action.data).map(([field, value]) => {
                      const isProjectField = field === 'project_id' || 
                                            field === 'projectName' || 
                                            field === 'project_name' || 
                                            field === 'project' ||
                                            field.toLowerCase().includes('project');
                      
                      const fieldOptions = dropdownOptions[field] || 
                                          (isProjectField ? dropdownOptions['project_id'] : undefined);
                      
                      return (
                        <div key={field} className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            {field
                              .split(/(?=[A-Z])/)
                              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                              .join(' ')}
                          </label>
                          {editMode ? (
                            fieldOptions && fieldOptions.length > 0 ? (
                              <select
                                value={String(value || '')}
                                onChange={(e) => handleFieldChange(idx, field, e.target.value)}
                                className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              >
                                <option value="">-- Select {field} --</option>
                                {fieldOptions.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type="text"
                                value={String(value || '')}
                                onChange={(e) => handleFieldChange(idx, field, e.target.value)}
                                className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            )
                          ) : (
                            <div className="px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded text-sm text-gray-900 dark:text-white">
                              {(() => {
                                // Show label instead of value for dropdown fields
                                if (fieldOptions && fieldOptions.length > 0) {
                                  const option = fieldOptions.find(opt => opt.value === value);
                                  return option ? option.label : String(value || '');
                                }
                                return String(value || '');
                              })()}
                            </div>
                          )}
                        </div>
                      );
                    })
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
