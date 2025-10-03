import { logger } from '@/config/logger';

/**
 * Shared Report Field Mapper
 * Provides consistent field mapping and value extraction across all report generators
 */
export class ReportFieldMapper {
  /**
   * Get standardized headers based on template ID
   */
  static getHeaders(templateId: string): string[] {
    const headerMap: Record<string, string[]> = {
      'employee-payslip': ['Month', 'Year', 'Total Hours', 'Billable Hours', 'Hourly Rate', 'Gross Pay', 'Deductions', 'Net Pay'],
      'employee-timesheet-summary': ['Week Start', 'Week End', 'Total Hours', 'Status', 'Submitted At'],
      'employee-performance': ['Period', 'Total Hours', 'Projects', 'Tasks Completed', 'Productivity Score'],
      'employee-attendance': ['Date', 'Hours Worked', 'Status', 'Leave Type'],
      'lead-team-timesheet': ['Employee', 'Email', 'Week Start', 'Total Hours', 'Status'],
      'lead-team-performance': ['Employee', 'Total Hours', 'Projects', 'Productivity Score'],
      'lead-team-attendance': ['Employee', 'Present Days', 'Absent Days', 'Leave Days'],
      'manager-project-performance': ['Project', 'Client', 'Status', 'Budget', 'Hours Spent', 'Utilization %'],
      'manager-project-financial': ['Project', 'Revenue', 'Cost', 'Margin', 'ROI %'],
      'manager-resource-allocation': ['Employee', 'Allocated Hours', 'Utilization %'],
      'manager-team-billing': ['Employee', 'Billable Hours', 'Revenue', 'Rate'],
      'management-financial-dashboard': ['Period', 'Revenue', 'Cost', 'Profit', 'Margin %'],
      'management-org-utilization': ['Department', 'Employees', 'Utilization %'],
      'management-client-billing': ['Client', 'Projects', 'Revenue', 'Hours Billed'],
      'management-workforce-analytics': ['Department', 'Employees', 'Total Hours', 'Productivity'],
      'management-portfolio-analysis': ['Project', 'Status', 'Budget', 'Timeline'],
      'admin-audit-logs': ['Date', 'User', 'Action', 'Entity', 'Details'],
      'admin-user-access': ['User', 'Email', 'Role', 'Status', 'Last Login'],
      'default': ['ID', 'Name', 'Value', 'Status', 'Date']
    };

    const headers = headerMap[templateId] || headerMap['default'];
    logger.info(`Field Mapper - Template: ${templateId}, Headers: ${JSON.stringify(headers)}`);
    return headers;
  }

  /**
   * Extract field value from record with intelligent mapping
   */
  static getFieldValue(record: any, header: string): any {
    // Field mapping for common header-to-field translations
    const fieldMappings: Record<string, string[]> = {
      'ID': ['_id', 'id'],
      'Name': ['name', 'full_name', 'user_name'],
      'Value': ['value', 'total_hours', 'amount'],
      'Status': ['status'],
      'Date': ['date', 'created_at', 'updated_at', 'week_start_date'],
      'Email': ['email'],
      'Employee': ['user_id', 'employee_id', 'full_name'],
      'Week Start': ['week_start_date'],
      'Week End': ['week_end_date'],
      'Total Hours': ['total_hours'],
      'Submitted At': ['submitted_at'],
      'User': ['user_id', 'full_name'],
      'Project': ['project_id', 'project_name'],
      'Client': ['client_id', 'client_name'],
      'Budget': ['budget', 'total_budget'],
      'Hours Spent': ['hours_spent', 'total_hours'],
      'Revenue': ['revenue', 'total_revenue'],
      'Cost': ['cost', 'total_cost'],
      'Margin': ['margin', 'profit_margin'],
      'Period': ['period', 'month', 'week_start_date']
    };

    // Get possible field names for this header
    const possibleFields = fieldMappings[header] || [header.toLowerCase().replace(/ /g, '_')];
    
    // Try each possible field name
    for (const fieldName of possibleFields) {
      if (record.hasOwnProperty(fieldName) && record[fieldName] !== undefined) {
        return record[fieldName];
      }
    }

    // Try nested object lookup for populated fields
    if (header === 'Name' || header === 'Employee' || header === 'User') {
      if (record.user_id && typeof record.user_id === 'object') {
        return record.user_id.full_name || record.user_id.name || record.user_id.email;
      }
      if (record.user && typeof record.user === 'object') {
        return record.user.full_name || record.user.name || record.user.email;
      }
      if (record.employee_id && typeof record.employee_id === 'object') {
        return record.employee_id.full_name || record.employee_id.name || record.employee_id.email;
      }
      // Fallback for ObjectId
      if (record.user_id && typeof record.user_id === 'string') {
        return `User ${record.user_id.substring(0, 8)}...`;
      }
    }

    if (header === 'Project') {
      if (record.project_id && typeof record.project_id === 'object') {
        return record.project_id.name || record.project_id.title;
      }
    }

    if (header === 'Client') {
      if (record.client_id && typeof record.client_id === 'object') {
        return record.client_id.name || record.client_id.company_name;
      }
      if (record.project_id && typeof record.project_id === 'object' && record.project_id.client_id) {
        return record.project_id.client_id.name || record.project_id.client_id.company_name;
      }
    }

    return null;
  }

  /**
   * Format value for display based on header type
   */
  static formatValue(value: any, header: string): string {
    if (value === null || value === undefined) return '-';

    // Handle nested objects
    if (typeof value === 'object' && value !== null) {
      if (value.name) return value.name;
      if (value.full_name) return value.full_name;
      if (value.email) return value.email;
      if (value instanceof Date) return value.toLocaleDateString();
      return JSON.stringify(value);
    }

    // Format dates
    if (value instanceof Date) {
      return value.toLocaleDateString();
    }

    // Format currency
    if (header.includes('Pay') || header.includes('Revenue') || header.includes('Cost') || header.includes('Profit') || header.includes('Budget')) {
      if (typeof value === 'number') {
        return `$${value.toFixed(2)}`;
      }
    }

    // Format percentages
    if (header.includes('%') && typeof value === 'number') {
      return `${(value * 100).toFixed(2)}%`;
    }

    // Format hours
    if (header.includes('Hours') && typeof value === 'number') {
      return value.toFixed(2);
    }

    return String(value);
  }

  /**
   * Extract row data for all generators
   */
  static extractRowData(record: any, headers: string[]): string[] {
    return headers.map(header => {
      const value = this.getFieldValue(record, header);
      return this.formatValue(value, header);
    });
  }
}