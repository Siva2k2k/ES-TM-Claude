import React, { useState, useEffect } from 'react';
import { ReportService, ReportTemplate, ReportRequest, ReportFormat, ReportPreview } from '../services/ReportService';
import { showError, showSuccess } from '../utils/toast';

interface ReportBuilderProps {
  template: ReportTemplate;
  onBack?: () => void;
}

const ReportBuilder: React.FC<ReportBuilderProps> = ({ template, onBack }) => {
  const [dateRange, setDateRange] = useState(() => {
    const { start, end } = ReportService.getDefaultDateRange();
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  });
  const [selectedFormat, setSelectedFormat] = useState<ReportFormat>(template.default_format);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [preview, setPreview] = useState<ReportPreview | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    // Initialize filters with required fields
    const initialFilters: Record<string, any> = {};
    template.available_filters.forEach(filter => {
      if (filter.required) {
        initialFilters[filter.name] = filter.type === 'multi-select' ? [] : '';
      }
    });
    setFilters(initialFilters);
  }, [template]);

  const handleFilterChange = (filterName: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const validateFilters = (): boolean => {
    for (const filter of template.available_filters) {
      if (filter.required) {
        const value = filters[filter.name];
        if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
          showError(`${filter.name} is required`);
          return false;
        }
      }
    }
    return true;
  };

  const handlePreview = async () => {
    if (!validateFilters()) return;

    try {
      setIsPreviewing(true);
      const request: Omit<ReportRequest, 'format'> = {
        template_id: template.template_id,
        date_range: {
          start: new Date(dateRange.start).toISOString(),
          end: new Date(dateRange.end).toISOString()
        },
        filters
      };

      const result = await ReportService.previewReport(request);

      if (result.success && result.report) {
        setPreview(result.report);
        setShowPreview(true);
      } else {
        showError(result.error || 'Failed to preview report');
      }
    } catch (error) {
      console.error('Error previewing report:', error);
      showError('Failed to preview report');
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleGenerate = async () => {
    if (!validateFilters()) return;

    try {
      setIsGenerating(true);
      const request: ReportRequest = {
        template_id: template.template_id,
        date_range: {
          start: new Date(dateRange.start).toISOString(),
          end: new Date(dateRange.end).toISOString()
        },
        filters,
        format: selectedFormat
      };

      const result = await ReportService.generateReport(request);

      if (result.success && result.blob && result.filename) {
        ReportService.downloadReport(result.blob, result.filename);
        showSuccess('Report generated successfully');
      } else {
        showError(result.error || 'Failed to generate report');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      showError('Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const renderFilterInput = (filter: any) => {
    const commonClasses = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent";

    switch (filter.type) {
      case 'date':
        return (
          <input
            type="date"
            value={filters[filter.name] || ''}
            onChange={(e) => handleFilterChange(filter.name, e.target.value)}
            className={commonClasses}
            required={filter.required}
          />
        );

      case 'text':
        return (
          <input
            type="text"
            value={filters[filter.name] || ''}
            onChange={(e) => handleFilterChange(filter.name, e.target.value)}
            className={commonClasses}
            placeholder={`Enter ${filter.name}`}
            required={filter.required}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={filters[filter.name] || ''}
            onChange={(e) => handleFilterChange(filter.name, e.target.value)}
            className={commonClasses}
            placeholder={`Enter ${filter.name}`}
            required={filter.required}
          />
        );

      case 'select':
        return (
          <select
            value={filters[filter.name] || ''}
            onChange={(e) => handleFilterChange(filter.name, e.target.value)}
            className={commonClasses}
            required={filter.required}
          >
            <option value="">Select {filter.name}</option>
            {filter.options?.map((opt: any) => (
              <option key={opt.value || opt} value={opt.value || opt}>
                {opt.label || opt}
              </option>
            ))}
          </select>
        );

      case 'multi-select':
        return (
          <select
            multiple
            value={filters[filter.name] || []}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions, option => option.value);
              handleFilterChange(filter.name, selected);
            }}
            className={`${commonClasses} min-h-[100px]`}
            required={filter.required}
          >
            {filter.options?.map((opt: any) => (
              <option key={opt.value || opt} value={opt.value || opt}>
                {opt.label || opt}
              </option>
            ))}
          </select>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ← Back
              </button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <span className="text-3xl">{template.icon || ReportService.getCategoryIcon(template.category)}</span>
                {template.name}
              </h1>
              <p className="text-gray-600 mt-1">{template.description}</p>
            </div>
          </div>
          <span className={`px-3 py-1 text-sm font-semibold rounded-full border ${
            template.category === 'personal' ? 'bg-blue-100 text-blue-800 border-blue-300' :
            template.category === 'team' ? 'bg-green-100 text-green-800 border-green-300' :
            template.category === 'project' ? 'bg-purple-100 text-purple-800 border-purple-300' :
            template.category === 'financial' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
            template.category === 'executive' ? 'bg-indigo-100 text-indigo-800 border-indigo-300' :
            'bg-red-100 text-red-800 border-red-300'
          }`}>
            {template.category}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Date Range */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">📅 Date Range</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
          </div>

          {/* Filters */}
          {template.available_filters.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">🔍 Filters</h2>
              <div className="space-y-4">
                {template.available_filters.map(filter => (
                  <div key={filter.name}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {filter.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      {filter.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {renderFilterInput(filter)}
                    {filter.type === 'multi-select' && (
                      <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview Section */}
          {showPreview && preview && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">👁️ Preview</h2>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Close Preview
                </button>
              </div>

              {/* Preview Metadata */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Total Records:</span>
                    <span className="ml-2 font-semibold">{preview.metadata.total_records}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Preview Showing:</span>
                    <span className="ml-2 font-semibold">{preview.data.length} of {preview.full_count}</span>
                  </div>
                </div>
              </div>

              {/* Preview Data Table */}
              {preview.data.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {Object.keys(preview.data[0]).map(key => (
                          <th
                            key={key}
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            {key.replace(/_/g, ' ')}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {preview.data.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          {Object.values(row).map((value: any, colIdx) => (
                            <td key={colIdx} className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No data available for the selected criteria
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions Panel */}
        <div className="space-y-6">
          {/* Format Selection */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">📄 Export Format</h2>
            <div className="space-y-2">
              {template.available_formats.map(format => (
                <label
                  key={format}
                  className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedFormat === format
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="format"
                    value={format}
                    checked={selectedFormat === format}
                    onChange={(e) => setSelectedFormat(e.target.value as ReportFormat)}
                    className="mr-3"
                  />
                  <span className="text-2xl mr-2">{ReportService.getFormatIcon(format)}</span>
                  <span className="font-medium">{format.toUpperCase()}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">⚡ Actions</h2>
            <div className="space-y-3">
              <button
                onClick={handlePreview}
                disabled={isPreviewing || isGenerating}
                className="w-full px-4 py-3 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 transition-colors font-medium flex items-center justify-center gap-2"
              >
                {isPreviewing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
                    Previewing...
                  </>
                ) : (
                  <>
                    👁️ Preview Report
                  </>
                )}
              </button>

              <button
                onClick={handleGenerate}
                disabled={isGenerating || isPreviewing}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors font-medium flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    📥 Generate & Download
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Info Panel */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Information</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Preview shows first 50 records</li>
              <li>• Full report includes all data</li>
              {template.can_be_scheduled && <li>• This report can be scheduled</li>}
              <li>• Reports are logged in history</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportBuilder;
