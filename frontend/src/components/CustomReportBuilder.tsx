import React, { useState } from 'react';
import { ReportService, ReportTemplate, ReportCategory, ReportFormat } from '../services/ReportService';
import { useAuth } from '../store/contexts/AuthContext';
import { showError, showSuccess } from '../utils/toast';

const CustomReportBuilder: React.FC = () => {
  const { currentUser } = useAuth();
  const [templateName, setTemplateName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ReportCategory>('project');
  const [dataSource, setDataSource] = useState('');
  const [selectedFormats, setSelectedFormats] = useState<ReportFormat[]>(['pdf']);
  const [defaultFormat, setDefaultFormat] = useState<ReportFormat>('pdf');
  const [canBeScheduled, setCanBeScheduled] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Only Management and Super Admin can create custom reports
  const canCreateCustomReports = currentUser?.role === 'management' || currentUser?.role === 'super_admin';

  if (!canCreateCustomReports) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Access Restricted</h2>
        <p className="text-gray-600">
          Custom report creation is only available for Management and Super Admin roles.
        </p>
      </div>
    );
  }

  const categories: Array<{ value: ReportCategory; label: string; icon: string }> = [
    { value: 'personal', label: 'Personal', icon: '👤' },
    { value: 'team', label: 'Team', icon: '👥' },
    { value: 'project', label: 'Project', icon: '🎯' },
    { value: 'financial', label: 'Financial', icon: '💰' },
    { value: 'executive', label: 'Executive', icon: '📈' },
    { value: 'system', label: 'System', icon: '🔒' }
  ];

  const dataSources = [
    { value: 'timesheets', label: 'Timesheets', icon: '⏰' },
    { value: 'users', label: 'Users', icon: '👥' },
    { value: 'projects', label: 'Projects', icon: '🎯' },
    { value: 'billing_snapshots', label: 'Billing Snapshots', icon: '💰' },
    { value: 'audit_logs', label: 'Audit Logs', icon: '📋' }
  ];

  const availableFormats: Array<{ value: ReportFormat; label: string; icon: string }> = [
    { value: 'pdf', label: 'PDF', icon: '📄' },
    { value: 'excel', label: 'Excel', icon: '📊' },
    { value: 'csv', label: 'CSV', icon: '📋' }
  ];

  const handleFormatToggle = (format: ReportFormat) => {
    setSelectedFormats(prev => {
      if (prev.includes(format)) {
        const newFormats = prev.filter(f => f !== format);
        // If removing the default format, set a new default
        if (format === defaultFormat && newFormats.length > 0) {
          setDefaultFormat(newFormats[0]);
        }
        return newFormats;
      } else {
        return [...prev, format];
      }
    });
  };

  const handleCreate = async () => {
    // Validation
    if (!templateName.trim()) {
      showError('Template name is required');
      return;
    }

    if (!description.trim()) {
      showError('Description is required');
      return;
    }

    if (!dataSource) {
      showError('Data source is required');
      return;
    }

    if (selectedFormats.length === 0) {
      showError('At least one export format is required');
      return;
    }

    if (!selectedFormats.includes(defaultFormat)) {
      showError('Default format must be one of the selected formats');
      return;
    }

    try {
      setIsCreating(true);

      // Build template data
      const templateData: Partial<ReportTemplate> = {
        name: templateName.trim(),
        description: description.trim(),
        category,
        template_id: `custom-${templateName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
        available_formats: selectedFormats,
        default_format: defaultFormat,
        can_be_scheduled: canBeScheduled,
        featured,
        // Simple data source configuration
        // In a real implementation, this would include more detailed query builder
      };

      const result = await ReportService.createCustomTemplate(templateData);

      if (result.success && result.template) {
        showSuccess('Custom report template created successfully');
        // Reset form
        setTemplateName('');
        setDescription('');
        setCategory('project');
        setDataSource('');
        setSelectedFormats(['pdf']);
        setDefaultFormat('pdf');
        setCanBeScheduled(false);
        setFeatured(false);
      } else {
        showError(result.error || 'Failed to create custom template');
      }
    } catch (error) {
      console.error('Error creating custom template:', error);
      showError('Failed to create custom template');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg shadow p-6 border border-purple-200">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <span className="text-3xl">🛠️</span>
          Custom Report Builder
        </h1>
        <p className="text-gray-600 mt-1">
          Create custom report templates for your organization
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">📝 Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g., Monthly Project Summary"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this report will show..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {categories.map(cat => (
                    <label
                      key={cat.value}
                      className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        category === cat.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="category"
                        value={cat.value}
                        checked={category === cat.value}
                        onChange={(e) => setCategory(e.target.value as ReportCategory)}
                        className="sr-only"
                      />
                      <span className="text-2xl mr-2">{cat.icon}</span>
                      <span className="font-medium text-sm">{cat.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Data Source */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">🗄️ Data Source</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Data Source <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {dataSources.map(source => (
                  <label
                    key={source.value}
                    className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      dataSource === source.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="dataSource"
                      value={source.value}
                      checked={dataSource === source.value}
                      onChange={(e) => setDataSource(e.target.value)}
                      className="sr-only"
                    />
                    <span className="text-3xl mr-3">{source.icon}</span>
                    <span className="font-medium">{source.label}</span>
                  </label>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Note: Advanced query building will be available in a future update
              </p>
            </div>
          </div>

          {/* Export Formats */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">📤 Export Formats</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Available Formats <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {availableFormats.map(format => (
                    <label
                      key={format.value}
                      className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedFormats.includes(format.value)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedFormats.includes(format.value)}
                        onChange={() => handleFormatToggle(format.value)}
                        className="mr-3"
                      />
                      <span className="text-2xl mr-2">{format.icon}</span>
                      <span className="font-medium">{format.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {selectedFormats.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Format <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={defaultFormat}
                    onChange={(e) => setDefaultFormat(e.target.value as ReportFormat)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {selectedFormats.map(format => (
                      <option key={format} value={format}>
                        {format.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Options */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">⚙️ Options</h2>
            <div className="space-y-3">
              <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={canBeScheduled}
                  onChange={(e) => setCanBeScheduled(e.target.checked)}
                  className="mr-3 rounded text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <div>
                  <div className="font-medium text-gray-900">Enable Scheduling</div>
                  <div className="text-sm text-gray-500">Allow this report to be scheduled for automatic generation</div>
                </div>
              </label>

              <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                  className="mr-3 rounded text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <div>
                  <div className="font-medium text-gray-900">Feature this report</div>
                  <div className="text-sm text-gray-500">Show this report in the featured section</div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Preview & Actions Panel */}
        <div className="space-y-6">
          {/* Preview */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">👁️ Preview</h2>
            <div className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <span className="text-4xl">
                  {categories.find(c => c.value === category)?.icon || '📄'}
                </span>
                {featured && <span className="text-yellow-500 text-xl">⭐</span>}
              </div>

              <div>
                <h3 className="font-semibold text-gray-900">
                  {templateName || 'Template Name'}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {description || 'Description will appear here...'}
                </p>
              </div>

              <div className="pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-2">Category</p>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${
                  category === 'personal' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                  category === 'team' ? 'bg-green-100 text-green-800 border-green-300' :
                  category === 'project' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                  category === 'financial' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                  category === 'executive' ? 'bg-indigo-100 text-indigo-800 border-indigo-300' :
                  'bg-red-100 text-red-800 border-red-300'
                }`}>
                  {category}
                </span>
              </div>

              {dataSource && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Data Source</p>
                  <p className="text-sm font-medium text-gray-900">
                    {dataSources.find(s => s.value === dataSource)?.label || dataSource}
                  </p>
                </div>
              )}

              {selectedFormats.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Export Formats</p>
                  <div className="flex gap-2">
                    {selectedFormats.map(format => (
                      <span
                        key={format}
                        className={`px-2 py-1 text-xs rounded ${
                          format === defaultFormat
                            ? 'bg-blue-100 text-blue-800 font-semibold'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {format.toUpperCase()}
                        {format === defaultFormat && ' ★'}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {canBeScheduled && (
                <div className="text-xs text-gray-600 flex items-center gap-1">
                  <span>🔄</span>
                  <span>Can be scheduled</span>
                </div>
              )}
            </div>
          </div>

          {/* Create Button */}
          <div className="bg-white rounded-lg shadow p-6">
            <button
              onClick={handleCreate}
              disabled={isCreating || !templateName || !description || !dataSource || selectedFormats.length === 0}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Creating Template...
                </>
              ) : (
                <>
                  ✨ Create Template
                </>
              )}
            </button>
          </div>

          {/* Info */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="font-semibold text-purple-900 mb-2">ℹ️ Information</h3>
            <ul className="text-sm text-purple-800 space-y-1">
              <li>• Custom templates are saved to your organization</li>
              <li>• Access is based on role permissions</li>
              <li>• Templates can be edited after creation</li>
              <li>• Advanced query builder coming soon</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomReportBuilder;
