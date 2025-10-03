import React, { useState, useEffect } from 'react';
import { Plus, FileText } from 'lucide-react';
import { ReportTemplate, SettingsService } from '../../services/SettingsService';
import { usePermissions } from '../../hooks/usePermissions';

interface ReportTemplateFormData {
  name: string;
  description: string;
  category: 'timesheet' | 'project' | 'user' | 'analytics' | 'custom';
  fields: string[];
  filters: Record<string, string | number | boolean>;
  format: 'pdf' | 'excel' | 'csv';
  access_level: 'personal' | 'team' | 'organization' | 'system';
}

interface ReportTemplateSettingsProps {
  onSettingsChange: () => void;
  onSettingsSaved: () => void;
}

const ReportTemplateSettings: React.FC<ReportTemplateSettingsProps> = ({
  onSettingsChange,
  onSettingsSaved
}) => {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [formData, setFormData] = useState<ReportTemplateFormData>({
    name: '',
    description: '',
    category: 'custom',
    fields: ['date', 'hours', 'project'],
    filters: {},
    format: 'pdf',
    access_level: 'personal'
  });

  const permissions = usePermissions();

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    const result = await SettingsService.getReportTemplates();
    if (result.templates) {
      setTemplates(result.templates);
      setError(null);
    } else {
      setError(result.error || 'Failed to load templates');
    }
    setLoading(false);
  };

  const handleCreateTemplate = async () => {
    onSettingsChange();
    const result = await SettingsService.createReportTemplate({
      name: formData.name,
      description: formData.description,
      category: formData.category,
      template_data: {
        fields: formData.fields,
        filters: formData.filters,
        format: formData.format
      },
      access_level: formData.access_level,
      is_active: true
    });

    if (result.template) {
      setTemplates(prev => [...prev, result.template!]);
      setShowCreateForm(false);
      resetForm();
      onSettingsSaved();
    } else {
      setError(result.error || 'Failed to create template');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'custom',
      fields: ['date', 'hours', 'project'],
      filters: {},
      format: 'pdf',
      access_level: 'personal'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2 flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Report Templates
          </h3>
          <p className="text-sm text-gray-500">Create and manage custom report templates for different data exports.</p>
        </div>
        {permissions.canManageUsers() && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">Create New Template</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="template-name" className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
              <input
                id="template-name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter template name"
              />
            </div>

            <div>
              <label htmlFor="template-format" className="block text-sm font-medium text-gray-700 mb-1">Format</label>
              <select
                id="template-format"
                value={formData.format}
                onChange={(e) => setFormData(prev => ({ ...prev, format: e.target.value as ReportTemplateFormData['format'] }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="pdf">PDF</option>
                <option value="excel">Excel</option>
                <option value="csv">CSV</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={() => {
                setShowCreateForm(false);
                resetForm();
              }}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateTemplate}
              disabled={!formData.name}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              Create Template
            </button>
          </div>
        </div>
      )}

      {/* Templates List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {templates.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No templates</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a new report template.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {templates.map((template) => (
              <li key={template.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900">{template.name}</h4>
                    {template.description && (
                      <p className="mt-1 text-sm text-gray-500">{template.description}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {template.template_data.format.toUpperCase()}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ReportTemplateSettings;