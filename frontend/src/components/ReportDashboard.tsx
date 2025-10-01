import React, { useState, useEffect, useCallback } from 'react';
import { ReportService, ReportTemplate, ReportCategory } from '../services/ReportService';
import { useAuth } from '../store/contexts/AuthContext';
import { showError } from '../utils/toast';

interface ReportDashboardProps {
  onSelectTemplate?: (template: ReportTemplate) => void;
}

const ReportDashboard: React.FC<ReportDashboardProps> = ({ onSelectTemplate }) => {
  const { currentUser } = useAuth();
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const categories: Array<{ value: ReportCategory | 'all'; label: string; icon: string }> = [
    { value: 'all', label: 'All Reports', icon: '📊' },
    { value: 'personal', label: 'Personal', icon: '👤' },
    { value: 'team', label: 'Team', icon: '👥' },
    { value: 'project', label: 'Project', icon: '🎯' },
    { value: 'financial', label: 'Financial', icon: '💰' },
    { value: 'executive', label: 'Executive', icon: '📈' },
    { value: 'system', label: 'System', icon: '🔒' }
  ];

  useEffect(() => {
    loadTemplates();
  }, []);

  const filterTemplates = useCallback(() => {
    let filtered = templates;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query)
      );
    }

    setFilteredTemplates(filtered);
  }, [templates, selectedCategory, searchQuery]);

  useEffect(() => {
    filterTemplates();
  }, [filterTemplates]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const result = await ReportService.getTemplates();

      if (result.error) {
        showError(result.error);
        setTemplates([]);
      } else {
        setTemplates(result.templates);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      showError('Failed to load report templates');
    } finally {
      setLoading(false);
    }
  };



  const handleTemplateClick = (template: ReportTemplate) => {
    if (onSelectTemplate) {
      onSelectTemplate(template);
    }
  };

  const getFeaturedTemplates = () => {
    return filteredTemplates.filter(t => t.featured).slice(0, 3);
  };

  const getCategoryColor = (category: ReportCategory): string => {
    const colorMap: Record<ReportCategory, string> = {
      personal: 'bg-blue-100 text-blue-800 border-blue-300',
      team: 'bg-green-100 text-green-800 border-green-300',
      project: 'bg-purple-100 text-purple-800 border-purple-300',
      financial: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      executive: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      system: 'bg-red-100 text-red-800 border-red-300'
    };
    return colorMap[category] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const featuredTemplates = getFeaturedTemplates();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Generate and manage reports based on your role
            </p>
          </div>
          {currentUser && (
            <div className="text-right">
              <p className="text-sm text-gray-500">Your Role</p>
              <p className="text-lg font-semibold text-blue-600 capitalize">
                {currentUser.role.replace('_', ' ')}
              </p>
            </div>
          )}
        </div>

        {/* Search and Filter */}
        <div className="flex gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as ReportCategory | 'all')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>
                {cat.icon} {cat.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Featured Reports */}
      {featuredTemplates.length > 0 && selectedCategory === 'all' && !searchQuery && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <span className="mr-2">⭐</span>
            Featured Reports
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {featuredTemplates.map(template => (
              <div
                key={template.id}
                onClick={() => handleTemplateClick(template)}
                className="bg-white rounded-lg p-4 border-2 border-blue-200 hover:border-blue-400 cursor-pointer transition-all hover:shadow-md"
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-3xl">{template.icon || ReportService.getCategoryIcon(template.category)}</span>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getCategoryColor(template.category)}`}>
                    {template.category}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{template.name}</h3>
                <p className="text-sm text-gray-600 line-clamp-2">{template.description}</p>
                <div className="mt-3 flex gap-1">
                  {template.available_formats.map(format => (
                    <span key={format} className="text-xs px-2 py-1 bg-gray-100 rounded">
                      {ReportService.getFormatIcon(format)} {format.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Templates by Category */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            {selectedCategory === 'all' ? 'All Available Reports' : `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Reports`}
          </h2>
          <span className="text-sm text-gray-500">
            {filteredTemplates.length} report{filteredTemplates.length !== 1 ? 's' : ''} available
          </span>
        </div>

        {filteredTemplates.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-gray-500">No reports found matching your criteria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map(template => (
              <div
                key={template.id}
                onClick={() => handleTemplateClick(template)}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-md cursor-pointer transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-4xl">{template.icon || ReportService.getCategoryIcon(template.category)}</span>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getCategoryColor(template.category)}`}>
                      {template.category}
                    </span>
                    {template.featured && (
                      <span className="text-xs text-yellow-600">⭐ Featured</span>
                    )}
                  </div>
                </div>

                <h3 className="font-semibold text-gray-900 mb-2">{template.name}</h3>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{template.description}</p>

                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1">
                    {template.available_formats.map(format => (
                      <span key={format} className="text-xs px-2 py-1 bg-gray-100 rounded">
                        {ReportService.getFormatIcon(format)} {format.toUpperCase()}
                      </span>
                    ))}
                  </div>

                  {template.can_be_scheduled && (
                    <div className="flex items-center text-xs text-gray-500">
                      <span className="mr-1">🔄</span>
                      Can be scheduled
                    </div>
                  )}

                  <div className="pt-2 border-t border-gray-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTemplateClick(template);
                      }}
                      className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Generate Report
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {categories.slice(1).map(cat => {
          const count = templates.filter(t => t.category === cat.value).length;
          if (count === 0) return null;
          return (
            <div
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value as ReportCategory)}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                selectedCategory === cat.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{cat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{count}</p>
                </div>
                <span className="text-3xl">{cat.icon}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ReportDashboard;
