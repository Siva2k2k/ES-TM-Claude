/**
 * Template Form Component
 * Form for creating new report templates
 * Cognitive Complexity: 6
 */
import React, { useState } from 'react';
import { Save, X } from 'lucide-react';
import { Button, Input, Label, Select } from '../../../../components/ui';
import type { ReportTemplate } from '../../types/settings.types';

interface TemplateFormProps {
  onSubmit: (data: Partial<ReportTemplate>) => Promise<boolean>;
  onCancel: () => void;
}

export const TemplateForm: React.FC<TemplateFormProps> = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'custom' as ReportTemplate['category'],
    format: 'pdf' as 'pdf' | 'excel' | 'csv',
    access_level: 'personal' as ReportTemplate['access_level'],
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const success = await onSubmit({
      name: formData.name,
      description: formData.description,
      category: formData.category,
      template_data: {
        fields: ['date', 'hours', 'project', 'task'],
        filters: {},
        format: formData.format,
      },
      access_level: formData.access_level,
      is_active: true,
    });

    if (success) {
      setFormData({
        name: '',
        description: '',
        category: 'custom',
        format: 'pdf',
        access_level: 'personal',
      });
    }

    setSaving(false);
  };

  const categoryOptions = [
    { value: 'timesheet', label: 'Timesheet Reports' },
    { value: 'project', label: 'Project Reports' },
    { value: 'user', label: 'User Reports' },
    { value: 'analytics', label: 'Analytics Reports' },
    { value: 'custom', label: 'Custom Reports' },
  ];

  const formatOptions = [
    { value: 'pdf', label: 'PDF' },
    { value: 'excel', label: 'Excel' },
    { value: 'csv', label: 'CSV' },
  ];

  const accessLevelOptions = [
    { value: 'personal', label: 'Personal (Only Me)' },
    { value: 'team', label: 'Team' },
    { value: 'organization', label: 'Organization' },
    { value: 'system', label: 'System-wide' },
  ];

  return (
    <form onSubmit={handleSubmit} className="bg-surface-secondary dark:bg-dark-700 border border-border-primary dark:border-dark-border-primary rounded-lg p-6">
      <h4 className="text-md font-medium text-text-primary dark:text-dark-text-primary mb-4">
        Create New Template
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <Label htmlFor="template-name">Template Name *</Label>
          <Input
            id="template-name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Weekly Hours Report"
            required
          />
        </div>

        <div>
          <Label htmlFor="template-category">Category *</Label>
          <Select
            id="template-category"
            value={formData.category}
            onChange={(value) => setFormData({ ...formData, category: value as ReportTemplate['category'] })}
            options={categoryOptions}
          />
        </div>

        <div>
          <Label htmlFor="template-format">Export Format *</Label>
          <Select
            id="template-format"
            value={formData.format}
            onChange={(value) => setFormData({ ...formData, format: value as 'pdf' | 'excel' | 'csv' })}
            options={formatOptions}
          />
        </div>

        <div>
          <Label htmlFor="template-access">Access Level *</Label>
          <Select
            id="template-access"
            value={formData.access_level}
            onChange={(value) => setFormData({ ...formData, access_level: value as ReportTemplate['access_level'] })}
            options={accessLevelOptions}
          />
        </div>
      </div>

      <div className="mb-4">
        <Label htmlFor="template-description">Description (Optional)</Label>
        <Input
          id="template-description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Brief description of this template"
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t border-border-primary dark:border-dark-border-primary">
        <Button type="button" onClick={onCancel} variant="outline" disabled={saving}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button type="submit" disabled={saving || !formData.name}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Creating...' : 'Create Template'}
        </Button>
      </div>
    </form>
  );
};
