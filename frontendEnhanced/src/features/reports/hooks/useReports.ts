/**
 * useReports Hook
 * Custom hook for reports state management
 */

import { useState, useCallback } from 'react';
import { ReportsService } from '../services/reportsService';
import type {
  ReportTemplate,
  GeneratedReport,
  ReportGenerationRequest,
} from '../types/reports.types';

export interface UseReportsReturn {
  templates: ReportTemplate[];
  generatedReports: GeneratedReport[];
  isLoading: boolean;
  error: string | null;
  loadTemplates: () => Promise<void>;
  loadGeneratedReports: () => Promise<void>;
  createTemplate: (template: Partial<ReportTemplate>) => Promise<{ error?: string }>;
  deleteTemplate: (templateId: string) => Promise<{ error?: string }>;
  generateReport: (request: ReportGenerationRequest) => Promise<{ error?: string }>;
  downloadReport: (reportId: string) => Promise<{ error?: string }>;
}

/**
 * Custom hook for managing reports
 * Complexity: 7
 */
export const useReports = (): UseReportsReturn => {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load report templates
   */
  const loadTemplates = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await ReportsService.getTemplates();

      if (result.error) {
        setError(result.error);
      } else {
        setTemplates(result.templates || []);
      }
    } catch (err) {
      console.error('[useReports] Error loading templates:', err);
      setError('Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Load generated reports
   */
  const loadGeneratedReports = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await ReportsService.getGeneratedReports();

      if (result.error) {
        setError(result.error);
      } else {
        setGeneratedReports(result.reports || []);
      }
    } catch (err) {
      console.error('[useReports] Error loading generated reports:', err);
      setError('Failed to load generated reports');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Create new template
   */
  const createTemplate = useCallback(async (
    template: Partial<ReportTemplate>
  ): Promise<{ error?: string }> => {
    try {
      setError(null);

      const result = await ReportsService.createTemplate(template);

      if (result.error) {
        setError(result.error);
        return { error: result.error };
      }

      // Add to local state
      if (result.template) {
        setTemplates(prev => [...prev, result.template!]);
      }

      return {};
    } catch (err) {
      console.error('[useReports] Error creating template:', err);
      const errorMsg = 'Failed to create template';
      setError(errorMsg);
      return { error: errorMsg };
    }
  }, []);

  /**
   * Delete template
   */
  const deleteTemplate = useCallback(async (templateId: string): Promise<{ error?: string }> => {
    try {
      setError(null);

      const result = await ReportsService.deleteTemplate(templateId);

      if (!result.success) {
        const errorMsg = result.error || 'Failed to delete template';
        setError(errorMsg);
        return { error: errorMsg };
      }

      // Remove from local state
      setTemplates(prev => prev.filter(t => t.id !== templateId));

      return {};
    } catch (err) {
      console.error('[useReports] Error deleting template:', err);
      const errorMsg = 'Failed to delete template';
      setError(errorMsg);
      return { error: errorMsg };
    }
  }, []);

  /**
   * Generate report
   */
  const generateReport = useCallback(async (
    request: ReportGenerationRequest
  ): Promise<{ error?: string }> => {
    try {
      setError(null);

      const result = await ReportsService.generateReport(request);

      if (result.error) {
        setError(result.error);
        return { error: result.error };
      }

      // Add to generated reports
      if (result.report) {
        setGeneratedReports(prev => [result.report!, ...prev]);
      }

      return {};
    } catch (err) {
      console.error('[useReports] Error generating report:', err);
      const errorMsg = 'Failed to generate report';
      setError(errorMsg);
      return { error: errorMsg };
    }
  }, []);

  /**
   * Download report
   */
  const downloadReport = useCallback(async (reportId: string): Promise<{ error?: string }> => {
    try {
      setError(null);

      const result = await ReportsService.downloadReport(reportId);

      if (!result.success) {
        const errorMsg = result.error || 'Failed to download report';
        setError(errorMsg);
        return { error: errorMsg };
      }

      return {};
    } catch (err) {
      console.error('[useReports] Error downloading report:', err);
      const errorMsg = 'Failed to download report';
      setError(errorMsg);
      return { error: errorMsg };
    }
  }, []);

  return {
    templates,
    generatedReports,
    isLoading,
    error,
    loadTemplates,
    loadGeneratedReports,
    createTemplate,
    deleteTemplate,
    generateReport,
    downloadReport,
  };
};
