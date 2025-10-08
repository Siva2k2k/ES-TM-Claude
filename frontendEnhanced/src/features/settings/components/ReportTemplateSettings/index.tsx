/**
 * Report Template Settings Component
 * Custom report templates management
 * Cognitive Complexity: 8
 */
import React, { useState, useEffect } from 'react';
import { Plus, FileText, Loader2 } from 'lucide-react';
import { usePermissions } from '../../../../core/hooks/usePermissions';
import { SettingsService } from '../../services/settingsService';
import type { ReportTemplate } from '../../types/settings.types';
import type { SettingsChangeHandlers } from '../SettingsModal/types';
import { TemplateList } from './TemplateList';
import { TemplateForm } from './TemplateForm';
import { Button } from '../../../../components/ui';

export const ReportTemplateSettings: React.FC<SettingsChangeHandlers> = ({
  onSettingsChange,
  onSettingsSaved,
}) => {
  const permissions = usePermissions();
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await SettingsService.getReportTemplates();
      if (result.error) {
        setError(result.error);
      } else if (result.templates) {
        setTemplates(result.templates);
      }
    } catch (err) {
      setError('Failed to load report templates');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async (templateData: Partial<ReportTemplate>) => {
    onSettingsChange();

    const result = await SettingsService.createReportTemplate(templateData);

    if (result.error) {
      setError(result.error);
      return false;
    }

    if (result.template) {
      setTemplates((prev) => [...prev, result.template!]);
      setShowCreateForm(false);
      onSettingsSaved();
      return true;
    }

    return false;
  };

  const handleDeleteTemplate = async (templateId: string) => {
    onSettingsChange();

    const result = await SettingsService.deleteReportTemplate(templateId);

    if (result.error) {
      setError(result.error);
      return false;
    }

    if (result.success) {
      setTemplates((prev) => prev.filter((t) => t.id !== templateId));
      onSettingsSaved();
      return true;
    }

    return false;
  };

  // Permission check
  if (!permissions.canCreateCustomReports) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-text-tertiary dark:text-dark-text-tertiary mb-4" />
        <h3 className="text-lg font-medium text-text-primary dark:text-dark-text-primary mb-2">
          Access Denied
        </h3>
        <p className="text-text-secondary dark:text-dark-text-secondary">
          You don't have permission to manage report templates.
        </p>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600 dark:text-primary-400" />
        <span className="ml-3 text-text-secondary dark:text-dark-text-secondary">
          Loading templates...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-text-primary dark:text-dark-text-primary flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Report Templates
          </h3>
          <p className="text-sm text-text-secondary dark:text-dark-text-secondary mt-1">
            Create and manage custom report templates
          </p>
        </div>
        {!showCreateForm && (
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-3 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-lg">
          <p className="text-error-700 dark:text-error-300 text-sm">{error}</p>
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <TemplateForm
          onSubmit={handleCreateTemplate}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* Templates List */}
      {templates.length === 0 && !showCreateForm ? (
        <div className="text-center py-12 bg-surface-secondary dark:bg-dark-700 rounded-lg">
          <FileText className="mx-auto h-12 w-12 text-text-tertiary dark:text-dark-text-tertiary mb-4" />
          <h3 className="text-lg font-medium text-text-primary dark:text-dark-text-primary mb-2">
            No Templates Yet
          </h3>
          <p className="text-text-secondary dark:text-dark-text-secondary mb-4">
            Create your first custom report template
          </p>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        </div>
      ) : (
        <TemplateList templates={templates} onDelete={handleDeleteTemplate} />
      )}
    </div>
  );
};
