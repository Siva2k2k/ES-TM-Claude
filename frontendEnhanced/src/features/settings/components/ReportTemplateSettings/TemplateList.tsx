/**
 * Template List Component
 * Displays list of report templates with delete action
 * Cognitive Complexity: 4
 */
import React from 'react';
import { Trash2, FileText, Calendar } from 'lucide-react';
import { Button, Badge } from '../../../../components/ui';
import type { ReportTemplate } from '../../types/settings.types';

interface TemplateListProps {
  templates: ReportTemplate[];
  onDelete: (templateId: string) => Promise<boolean>;
}

export const TemplateList: React.FC<TemplateListProps> = ({ templates, onDelete }) => {
  const handleDelete = async (template: ReportTemplate) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${template.name}"? This action cannot be undone.`
    );

    if (confirmed) {
      await onDelete(template.id);
    }
  };

  const categoryColors: Record<ReportTemplate['category'], string> = {
    timesheet: 'default',
    project: 'info',
    user: 'warning',
    analytics: 'success',
    custom: 'secondary',
  };

  return (
    <div className="space-y-3">
      {templates.map((template) => (
        <div
          key={template.id}
          className="bg-surface-primary dark:bg-dark-800 border border-border-primary dark:border-dark-border-primary rounded-lg p-4 hover:border-primary-300 dark:hover:border-primary-600 transition-colors"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-text-secondary dark:text-dark-text-secondary flex-shrink-0" />
                <h4 className="text-sm font-medium text-text-primary dark:text-dark-text-primary truncate">
                  {template.name}
                </h4>
                <Badge variant={categoryColors[template.category]} size="sm">
                  {template.category}
                </Badge>
              </div>

              {template.description && (
                <p className="text-sm text-text-secondary dark:text-dark-text-secondary mb-2 line-clamp-2">
                  {template.description}
                </p>
              )}

              <div className="flex items-center gap-4 text-xs text-text-tertiary dark:text-dark-text-tertiary">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(template.created_at).toLocaleDateString()}
                </span>
                <span>Format: {template.template_data.format.toUpperCase()}</span>
                <span className="capitalize">Access: {template.access_level}</span>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(template)}
              className="ml-4 flex-shrink-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};
