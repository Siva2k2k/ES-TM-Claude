/**
 * ProjectForm Component
 *
 * Form for creating and editing projects with validation.
 * Uses React Hook Form + Zod for robust form handling.
 *
 * Features:
 * - Create/edit projects
 * - Client and manager selection
 * - Budget and date management
 * - Real-time validation
 * - Status management
 *
 * Cognitive Complexity: 7 (Target: <15)
 */

import React, { useEffect, useState } from 'react';
import { Controller } from 'react-hook-form';
import { Building2, Calendar, DollarSign, User, AlertTriangle, Save, X } from 'lucide-react';
import { useProjectForm } from '../../hooks/useProjectForm';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select, type SelectOption } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { Checkbox } from '../ui/Checkbox';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../ui/Card';
import { Alert, AlertTitle, AlertDescription } from '../ui/Alert';
import { ProjectFormData } from '../../types/project.schemas';

export interface ProjectFormProps {
  /** Project ID for editing (undefined for create) */
  projectId?: string;
  /** Initial form data */
  initialData?: Partial<ProjectFormData>;
  /** Available clients */
  clients?: Array<{ id: string; name: string }>;
  /** Available managers */
  managers?: Array<{ id: string; name: string; email: string }>;
  /** Success callback */
  onSuccess?: (projectId: string) => void;
  /** Cancel callback */
  onCancel?: () => void;
}

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' }
];

export const ProjectForm: React.FC<ProjectFormProps> = ({
  projectId,
  initialData,
  clients = [],
  managers = [],
  onSuccess,
  onCancel
}) => {
  const { form, isSubmitting, error, submitProject } = useProjectForm({
    projectId,
    defaultValues: initialData,
    onSuccess
  });

  const { control, watch, formState: { errors } } = form;
  const startDate = watch('start_date');
  const budget = watch('budget');

  // Map clients and managers to select options
  const clientOptions: SelectOption[] = clients.map(c => ({
    value: c.id,
    label: c.name
  }));

  const managerOptions: SelectOption[] = managers.map(m => ({
    value: m.id,
    label: `${m.name} (${m.email})`
  }));

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          {projectId ? 'Edit Project' : 'Create New Project'}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Project Name */}
        <Controller
          name="name"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              label="Project Name *"
              placeholder="Enter project name"
              error={errors.name?.message}
              icon={Building2}
            />
          )}
        />

        {/* Client Selection */}
        <Controller
          name="client_id"
          control={control}
          render={({ field }) => (
            <Select
              {...field}
              label="Client *"
              options={clientOptions}
              placeholder="Select a client"
              error={errors.client_id?.message}
            />
          )}
        />

        {/* Primary Manager */}
        <Controller
          name="primary_manager_id"
          control={control}
          render={({ field }) => (
            <Select
              {...field}
              label="Primary Manager *"
              options={managerOptions}
              placeholder="Select primary manager"
              error={errors.primary_manager_id?.message}
              icon={User}
            />
          )}
        />

        {/* Status */}
        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <Select
              {...field}
              label="Status"
              options={STATUS_OPTIONS}
              error={errors.status?.message}
            />
          )}
        />

        {/* Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Controller
            name="start_date"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="date"
                label="Start Date *"
                error={errors.start_date?.message}
                icon={Calendar}
              />
            )}
          />
          <Controller
            name="end_date"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="date"
                label="End Date"
                error={errors.end_date?.message}
                icon={Calendar}
                min={startDate}
              />
            )}
          />
        </div>

        {/* Budget */}
        <Controller
          name="budget"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              type="number"
              label="Budget ($)"
              placeholder="0.00"
              step="0.01"
              min="0"
              error={errors.budget?.message}
              icon={DollarSign}
              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
            />
          )}
        />

        {budget > 0 && (
          <div className="text-sm text-gray-600">
            Budget: ${budget.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        )}

        {/* Description */}
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <Textarea
              {...field}
              label="Description"
              placeholder="Enter project description..."
              rows={4}
              error={errors.description?.message}
            />
          )}
        />

        {/* Billable Checkbox */}
        <Controller
          name="is_billable"
          control={control}
          render={({ field }) => (
            <Checkbox
              checked={field.value}
              onCheckedChange={field.onChange}
              label="Billable Project"
            />
          )}
        />
      </CardContent>

      <CardFooter className="flex justify-between border-t pt-6">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          icon={Save}
          onClick={submitProject}
          disabled={isSubmitting}
          loading={isSubmitting}
        >
          {projectId ? 'Update Project' : 'Create Project'}
        </Button>
      </CardFooter>
    </Card>
  );
};
