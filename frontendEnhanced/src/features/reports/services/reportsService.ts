/**
 * Reports Service
 * Handles all reports-related API calls
 */

import type {
  ReportTemplate,
  ReportGenerationRequest,
  GeneratedReport,
  ReportSchedule,
  ReportStats,
} from '../types/reports.types';

/**
 * Reports service class
 * Manages reports API interactions
 */
export class ReportsService {
  private static readonly baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

  /**
   * Get authorization headers with access token
   */
  private static getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('accessToken');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  // ============================================================================
  // REPORT TEMPLATES
  // ============================================================================

  /**
   * Get all report templates
   */
  static async getTemplates(): Promise<{ templates?: ReportTemplate[]; error?: string }> {
    try {
      const response = await fetch(`${this.baseURL}/reports/templates`, {
        headers: this.getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        return { error: result.error || 'Failed to fetch templates' };
      }

      return { templates: result.data || result.templates || [] };
    } catch (error) {
      console.error('[ReportsService] Error fetching templates:', error);
      return { error: 'Failed to fetch templates' };
    }
  }

  /**
   * Create report template
   */
  static async createTemplate(
    template: Partial<ReportTemplate>
  ): Promise<{ template?: ReportTemplate; error?: string }> {
    try {
      const response = await fetch(`${this.baseURL}/reports/templates`, {
        method: 'POST',
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(template),
      });

      const result = await response.json();

      if (!response.ok) {
        return { error: result.error || 'Failed to create template' };
      }

      return { template: result.data || result.template };
    } catch (error) {
      console.error('[ReportsService] Error creating template:', error);
      return { error: 'Failed to create template' };
    }
  }

  /**
   * Update report template
   */
  static async updateTemplate(
    templateId: string,
    updates: Partial<ReportTemplate>
  ): Promise<{ template?: ReportTemplate; error?: string }> {
    try {
      const response = await fetch(`${this.baseURL}/reports/templates/${templateId}`, {
        method: 'PUT',
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      const result = await response.json();

      if (!response.ok) {
        return { error: result.error || 'Failed to update template' };
      }

      return { template: result.data || result.template };
    } catch (error) {
      console.error('[ReportsService] Error updating template:', error);
      return { error: 'Failed to update template' };
    }
  }

  /**
   * Delete report template
   */
  static async deleteTemplate(templateId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseURL}/reports/templates/${templateId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to delete template' };
      }

      return { success: true };
    } catch (error) {
      console.error('[ReportsService] Error deleting template:', error);
      return { success: false, error: 'Failed to delete template' };
    }
  }

  // ============================================================================
  // REPORT GENERATION
  // ============================================================================

  /**
   * Generate report
   */
  static async generateReport(
    request: ReportGenerationRequest
  ): Promise<{ report?: GeneratedReport; error?: string }> {
    try {
      const response = await fetch(`${this.baseURL}/reports/generate`, {
        method: 'POST',
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const result = await response.json();

      if (!response.ok) {
        return { error: result.error || 'Failed to generate report' };
      }

      return { report: result.data || result.report };
    } catch (error) {
      console.error('[ReportsService] Error generating report:', error);
      return { error: 'Failed to generate report' };
    }
  }

  /**
   * Get generated reports
   */
  static async getGeneratedReports(): Promise<{ reports?: GeneratedReport[]; error?: string }> {
    try {
      const response = await fetch(`${this.baseURL}/reports/generated`, {
        headers: this.getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        return { error: result.error || 'Failed to fetch generated reports' };
      }

      return { reports: result.data || result.reports || [] };
    } catch (error) {
      console.error('[ReportsService] Error fetching generated reports:', error);
      return { error: 'Failed to fetch generated reports' };
    }
  }

  /**
   * Download report
   */
  static async downloadReport(reportId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseURL}/reports/generated/${reportId}/download`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const result = await response.json();
        return { success: false, error: result.error || 'Failed to download report' };
      }

      // Create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${reportId}.${response.headers.get('content-type')?.includes('pdf') ? 'pdf' : 'xlsx'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      console.error('[ReportsService] Error downloading report:', error);
      return { success: false, error: 'Failed to download report' };
    }
  }

  // ============================================================================
  // REPORT SCHEDULES
  // ============================================================================

  /**
   * Get report schedules
   */
  static async getSchedules(): Promise<{ schedules?: ReportSchedule[]; error?: string }> {
    try {
      const response = await fetch(`${this.baseURL}/reports/schedules`, {
        headers: this.getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        return { error: result.error || 'Failed to fetch schedules' };
      }

      return { schedules: result.data || result.schedules || [] };
    } catch (error) {
      console.error('[ReportsService] Error fetching schedules:', error);
      return { error: 'Failed to fetch schedules' };
    }
  }

  /**
   * Create report schedule
   */
  static async createSchedule(
    schedule: Partial<ReportSchedule>
  ): Promise<{ schedule?: ReportSchedule; error?: string }> {
    try {
      const response = await fetch(`${this.baseURL}/reports/schedules`, {
        method: 'POST',
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(schedule),
      });

      const result = await response.json();

      if (!response.ok) {
        return { error: result.error || 'Failed to create schedule' };
      }

      return { schedule: result.data || result.schedule };
    } catch (error) {
      console.error('[ReportsService] Error creating schedule:', error);
      return { error: 'Failed to create schedule' };
    }
  }

  /**
   * Delete report schedule
   */
  static async deleteSchedule(scheduleId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseURL}/reports/schedules/${scheduleId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to delete schedule' };
      }

      return { success: true };
    } catch (error) {
      console.error('[ReportsService] Error deleting schedule:', error);
      return { success: false, error: 'Failed to delete schedule' };
    }
  }

  // ============================================================================
  // REPORT STATISTICS
  // ============================================================================

  /**
   * Get report statistics
   */
  static async getReportStats(
    category: string,
    filters: Record<string, unknown>
  ): Promise<{ stats?: ReportStats; error?: string }> {
    try {
      const params = new URLSearchParams();
      params.append('category', category);

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });

      const response = await fetch(`${this.baseURL}/reports/stats?${params.toString()}`, {
        headers: this.getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        return { error: result.error || 'Failed to fetch statistics' };
      }

      return { stats: result.data || result.stats };
    } catch (error) {
      console.error('[ReportsService] Error fetching statistics:', error);
      return { error: 'Failed to fetch statistics' };
    }
  }
}
