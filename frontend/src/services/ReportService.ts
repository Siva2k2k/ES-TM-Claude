import { backendApi, BackendApiError } from '../lib/backendApi';

export type ReportCategory = 'personal' | 'team' | 'project' | 'financial' | 'executive' | 'system';
export type ReportFormat = 'pdf' | 'excel' | 'csv';

export interface ReportTemplate {
  id: string;
  template_id: string;
  name: string;
  description: string;
  category: ReportCategory;
  allowed_roles: string[];
  available_formats: ReportFormat[];
  default_format: ReportFormat;
  icon?: string;
  color?: string;
  featured: boolean;
  sort_order: number;
  can_be_scheduled: boolean;
  available_filters: {
    name: string;
    type: 'date' | 'select' | 'multi-select' | 'text' | 'number';
    options?: any[];
    required: boolean;
  }[];
}

export interface ReportRequest {
  template_id: string;
  date_range: {
    start: string;
    end: string;
  };
  filters?: Record<string, any>;
  format: ReportFormat;
  custom_fields?: string[];
}

export interface ReportPreview {
  template: ReportTemplate;
  data: any[];
  metadata: {
    generated_at: string;
    generated_by: string;
    report_name: string;
    date_range: { start: string; end: string };
    total_records: number;
  };
  preview: boolean;
  full_count: number;
}

export interface ReportHistoryItem {
  id: string;
  template_id: string;
  template_name: string;
  generated_at: string;
  generated_by: string;
  format: string;
  status: 'completed' | 'failed' | 'processing';
  file_path?: string;
  error?: string;
}

export interface LiveAnalytics {
  timesheet: {
    total_hours: number;
    total_timesheets: number;
    submitted: number;
    approved: number;
    pending: number;
  };
  billing?: {
    total_revenue: number;
    total_hours_billed: number;
    total_snapshots: number;
  } | null;
  weekly_trend: Array<{
    _id: number;
    hours: number;
    count: number;
  }>;
  generated_at: string;
  period: string;
  user_scope: string;
}

/**
 * Report Service - Frontend API for report management
 */
export class ReportService {
  /**
   * Get all available report templates for current user
   */
  static async getTemplates(): Promise<{
    templates: ReportTemplate[];
    count: number;
    error?: string;
  }> {
    try {
      const response = await backendApi.get<{
        success: boolean;
        templates: ReportTemplate[];
        count: number;
        error?: string;
      }>('/reports/templates');

      if (response.success) {
        return { templates: response.templates, count: response.count };
      } else {
        return { templates: [], count: 0, error: response.error };
      }
    } catch (error) {
      console.error('Error fetching report templates:', error);
      if (error instanceof Error) {
        return { templates: [], count: 0, error: error.message };
      }
      return { templates: [], count: 0, error: 'Failed to fetch report templates' };
    }
  }

  /**
   * Get report templates by category
   */
  static async getTemplatesByCategory(category: ReportCategory): Promise<{
    templates: ReportTemplate[];
    count: number;
    error?: string;
  }> {
    try {
      const response = await backendApi.get<{
        success: boolean;
        templates: ReportTemplate[];
        count: number;
        error?: string;
      }>(`/reports/templates/${category}`);

      if (response.success) {
        return { templates: response.templates, count: response.count };
      } else {
        return { templates: [], count: 0, error: response.error };
      }
    } catch (error) {
      console.error('Error fetching templates by category:', error);
      if (error instanceof Error) {
        return { templates: [], count: 0, error: error.message };
      }
      return { templates: [], count: 0, error: 'Failed to fetch templates' };
    }
  }

  /**
   * Generate and download report
   */
  static async generateReport(request: ReportRequest): Promise<{
    success: boolean;
    blob?: Blob;
    filename?: string;
    error?: string;
  }> {
    try {
      // Convert dates to ISO8601 format as required by backend validation
      const requestPayload = {
        ...request,
        date_range: {
          start: new Date(request.date_range.start).toISOString(),
          end: new Date(request.date_range.end).toISOString()
        }
      };

      // Use backendApi with manual fetch for blob response
      const token = localStorage.getItem('accessToken');
      const baseURL = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1').replace(/\/+$/, '');
      console.log("Sending report request payload:", requestPayload);
      const response = await fetch(`${baseURL}/reports/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        let errorMessage = 'Failed to generate report';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        return { success: false, error: errorMessage };
      }

      // Check content type
      const contentType = response.headers.get('content-type');
      console.log('Report response content-type:', contentType);

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      
      // Map format to proper file extension
      const extensionMap: Record<string, string> = {
        'excel': 'xlsx',
        'csv': 'csv',
        'pdf': 'pdf'
      };
      const fileExtension = extensionMap[request.format] || request.format;
      
      let filename = `report_${Date.now()}.${fileExtension}`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }

      const blob = await response.blob();
      console.log('Report blob size:', blob.size, 'type:', blob.type);

      // Validate blob content
      if (blob.size === 0) {
        return { success: false, error: 'Empty file received' };
      }

      return { success: true, blob, filename };
    } catch (error) {
      console.error('Error generating report:', error);
      if (error instanceof Error) {
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Failed to generate report' };
    }
  }

  /**
   * Download generated report blob
   */
  static downloadReport(blob: Blob, filename: string): void {
    try {
      console.log('Downloading file:', filename, 'Size:', blob.size, 'Type:', blob.type);
      
      // Create blob URL
      const url = window.URL.createObjectURL(blob);
      
      // Create download link
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      
      // Add to DOM, click, then remove
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 100);
      
      console.log('Download initiated successfully');
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback: try opening in new window
      try {
        const url = window.URL.createObjectURL(blob);
        window.open(url);
      } catch (fallbackError) {
        console.error('Fallback download also failed:', fallbackError);
      }
    }
  }

  /**
   * Preview report data without generating file
   */
  static async previewReport(request: Omit<ReportRequest, 'format'>): Promise<{
    success: boolean;
    report?: ReportPreview;
    error?: string;
  }> {
    try {
      const response = await backendApi.post<{
        success: boolean;
        report?: ReportPreview;
        error?: string;
      }>('/reports/preview', request);

      if (response.success) {
        return { success: true, report: response.report };
      } else {
        return { success: false, error: response.error };
      }
    } catch (error) {
      console.error('Error previewing report:', error);
      if (error instanceof Error) {
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Failed to preview report' };
    }
  }

  /**
   * Get report generation history
   */
  static async getReportHistory(limit: number = 50): Promise<{
    success: boolean;
    history: ReportHistoryItem[];
    count: number;
    error?: string;
  }> {
    try {
      const response = await backendApi.get<{
        success: boolean;
        history: ReportHistoryItem[];
        count: number;
        error?: string;
      }>(`/reports/history?limit=${limit}`);

      if (response.success) {
        return { success: true, history: response.history, count: response.count };
      } else {
        return { success: false, history: [], count: 0, error: response.error };
      }
    } catch (error) {
      console.error('Error fetching report history:', error);
      if (error instanceof Error) {
        return { success: false, history: [], count: 0, error: error.message };
      }
      return { success: false, history: [], count: 0, error: 'Failed to fetch history' };
    }
  }

  /**
   * Create custom report template
   */
  static async createCustomTemplate(templateData: Partial<ReportTemplate>): Promise<{
    success: boolean;
    template?: ReportTemplate;
    error?: string;
  }> {
    try {
      const response = await backendApi.post<{
        success: boolean;
        template?: ReportTemplate;
        message?: string;
        error?: string;
      }>('/reports/templates/custom', templateData);

      if (response.success) {
        return { success: true, template: response.template };
      } else {
        return { success: false, error: response.error };
      }
    } catch (error) {
      console.error('Error creating custom template:', error);
      if (error instanceof Error) {
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Failed to create custom template' };
    }
  }

  /**
   * Get live analytics data
   */
  static async getLiveAnalytics(): Promise<{
    success: boolean;
    analytics?: LiveAnalytics;
    error?: string;
  }> {
    try {
      const response = await backendApi.get<{
        success: boolean;
        analytics?: LiveAnalytics;
        error?: string;
      }>('/reports/analytics/live');

      if (response.success) {
        return { success: true, analytics: response.analytics };
      } else {
        return { success: false, error: response.error };
      }
    } catch (error) {
      console.error('Error fetching live analytics:', error);
      if (error instanceof Error) {
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Failed to fetch analytics' };
    }
  }

  /**
   * Get category icon
   */
  static getCategoryIcon(category: ReportCategory): string {
    const iconMap: Record<ReportCategory, string> = {
      personal: '👤',
      team: '👥',
      project: '🎯',
      financial: '💰',
      executive: '📊',
      system: '🔒'
    };
    return iconMap[category] || '📄';
  }

  /**
   * Get category color
   */
  static getCategoryColor(category: ReportCategory): string {
    const colorMap: Record<ReportCategory, string> = {
      personal: 'blue',
      team: 'green',
      project: 'purple',
      financial: 'emerald',
      executive: 'indigo',
      system: 'red'
    };
    return colorMap[category] || 'gray';
  }

  /**
   * Format date for report request
   */
  static formatDateForRequest(date: Date): string {
    return date.toISOString();
  }

  /**
   * Get default date range (last 30 days)
   */
  static getDefaultDateRange(): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return { start, end };
  }

  /**
   * Get format icon
   */
  static getFormatIcon(format: ReportFormat): string {
    const iconMap: Record<ReportFormat, string> = {
      pdf: '📄',
      excel: '📊',
      csv: '📋'
    };
    return iconMap[format] || '📁';
  }
}

export default ReportService;
