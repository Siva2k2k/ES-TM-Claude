// @ts-nocheck - Temporarily disable type checking for Mongoose compatibility issues
import { ReportTemplate } from '../models/ReportTemplate';

/**
 * IMPROVED Report Template Seed Data
 * Restructured to eliminate redundant date_range filters and provide better UX
 * 
 * Key Changes:
 * 1. Removed redundant date_range filters (handled by main date picker)
 * 2. Added meaningful, context-specific filters
 * 3. Better filter categorization and labeling
 * 4. Improved user experience with clear filter purposes
 */
export const IMPROVED_REPORT_TEMPLATE_SEEDS = [
  // ========================================
  // EMPLOYEE REPORTS (Personal)
  // ========================================
  {
    template_id: 'employee-payslip',
    name: 'My Payslip',
    description: 'Monthly earnings breakdown with hours worked, billable hours, deductions, and net pay',
    category: 'personal',
    allowed_roles: ['employee', 'lead', 'manager', 'management', 'super_admin'],
    required_permissions: [],
    data_source: {
      collection: 'timesheets',
      include_related: ['users', 'billing_snapshots']
    },
    available_formats: ['pdf'],
    default_format: 'pdf',
    default_filters: { period: 'monthly' },
    available_filters: [
      { name: 'month', type: 'select', options: [
        { value: '01', label: 'January' },
        { value: '02', label: 'February' },
        { value: '03', label: 'March' },
        { value: '04', label: 'April' },
        { value: '05', label: 'May' },
        { value: '06', label: 'June' },
        { value: '07', label: 'July' },
        { value: '08', label: 'August' },
        { value: '09', label: 'September' },
        { value: '10', label: 'October' },
        { value: '11', label: 'November' },
        { value: '12', label: 'December' }
      ], required: true },
      { name: 'include_deductions', type: 'select', options: [
        { value: 'yes', label: 'Include Deductions' },
        { value: 'no', label: 'Exclude Deductions' }
      ], required: false }
    ],
    data_access_rules: {
      employee: {
        can_access_own_data: true,
        can_access_team_data: false,
        can_access_project_data: false,
        can_access_org_data: false
      }
    },
    can_be_scheduled: true,
    icon: 'DollarSign',
    color: 'green',
    featured: true,
    sort_order: 1,
    is_active: true
  },

  {
    template_id: 'employee-timesheet-summary',
    name: 'My Timesheet Summary',
    description: 'Personal timesheet records with hours worked, project allocation, and submission status',
    category: 'personal',
    allowed_roles: ['employee', 'lead', 'manager', 'management', 'super_admin'],
    required_permissions: [],
    data_source: {
      collection: 'timesheets',
      include_related: ['time_entries', 'projects']
    },
    available_formats: ['pdf', 'excel', 'csv'],
    default_format: 'pdf',
    default_filters: { period: 'monthly' },
    available_filters: [
      { name: 'status_filter', type: 'multi-select', options: [
        { value: 'draft', label: 'Draft' },
        { value: 'submitted', label: 'Submitted' },
        { value: 'approved', label: 'Approved' },
        { value: 'rejected', label: 'Rejected' }
      ], required: false },
      { name: 'projects_filter', type: 'multi-select', required: false }
    ],
    data_access_rules: {
      employee: {
        can_access_own_data: true,
        can_access_team_data: false,
        can_access_project_data: false,
        can_access_org_data: false
      }
    },
    can_be_scheduled: true,
    icon: 'Clock',
    color: 'blue',
    featured: false,
    sort_order: 2,
    is_active: true
  },

  {
    template_id: 'employee-performance',
    name: 'My Performance Report',
    description: 'Personal performance metrics, productivity analysis, and goal tracking',
    category: 'personal',
    allowed_roles: ['employee', 'lead', 'manager', 'management', 'super_admin'],
    required_permissions: [],
    data_source: {
      collection: 'timesheets',
      include_related: ['time_entries', 'projects', 'tasks']
    },
    available_formats: ['pdf', 'excel'],
    default_format: 'pdf',
    default_filters: { period: 'monthly' },
    available_filters: [
      { name: 'performance_metrics', type: 'multi-select', options: [
        { value: 'productivity', label: 'Productivity Score' },
        { value: 'efficiency', label: 'Time Efficiency' },
        { value: 'quality', label: 'Work Quality' },
        { value: 'goals', label: 'Goal Achievement' }
      ], required: false }
    ],
    data_access_rules: {
      employee: {
        can_access_own_data: true,
        can_access_team_data: false,
        can_access_project_data: false,
        can_access_org_data: false
      }
    },
    can_be_scheduled: true,
    icon: 'TrendingUp',
    color: 'purple',
    featured: false,
    sort_order: 3,
    is_active: true
  },

  // ========================================
  // LEAD REPORTS (Team)
  // ========================================
  {
    template_id: 'lead-team-timesheet',
    name: 'Team Timesheet Overview',
    description: 'Team members timesheet summary with hours, productivity, and approval status',
    category: 'team',
    allowed_roles: ['lead', 'manager', 'management', 'super_admin'],
    required_permissions: ['team_reports'],
    data_source: {
      collection: 'timesheets',
      include_related: ['users', 'time_entries']
    },
    available_formats: ['excel', 'csv', 'pdf'],
    default_format: 'excel',
    default_filters: { period: 'weekly' },
    available_filters: [
      { name: 'team_members', type: 'multi-select', required: false },
      { name: 'approval_status', type: 'select', options: [
        { value: 'all', label: 'All Statuses' },
        { value: 'pending', label: 'Pending Approval' },
        { value: 'approved', label: 'Approved' },
        { value: 'rejected', label: 'Rejected' }
      ], required: false },
      { name: 'minimum_hours', type: 'number', required: false }
    ],
    data_access_rules: {
      lead: {
        can_access_own_data: true,
        can_access_team_data: true,
        can_access_project_data: false,
        can_access_org_data: false
      }
    },
    can_be_scheduled: true,
    icon: 'Users',
    color: 'green',
    featured: true,
    sort_order: 10,
    is_active: true
  },

  // ========================================
  // MANAGER REPORTS (Project & Financial)
  // ========================================
  {
    template_id: 'manager-project-financial',
    name: 'Project Financial Report',
    description: 'Project-wise financial analysis including budget, costs, revenue, and profitability',
    category: 'financial',
    allowed_roles: ['manager', 'management', 'super_admin'],
    required_permissions: ['financial_reports'],
    data_source: {
      collection: 'billing_snapshots',
      include_related: ['projects', 'clients', 'timesheets']
    },
    available_formats: ['excel', 'pdf'],
    default_format: 'excel',
    default_filters: { groupBy: 'project' },
    available_filters: [
      { name: 'projects', type: 'multi-select', required: false },
      { name: 'clients', type: 'multi-select', required: false },
      { name: 'project_status', type: 'multi-select', options: [
        { value: 'active', label: 'Active' },
        { value: 'on-hold', label: 'On Hold' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' }
      ], required: false },
      { name: 'revenue_threshold', type: 'number', required: false }
    ],
    data_access_rules: {
      manager: {
        can_access_own_data: true,
        can_access_team_data: true,
        can_access_project_data: true,
        can_access_org_data: false
      }
    },
    can_be_scheduled: true,
    icon: 'DollarSign',
    color: 'emerald',
    featured: true,
    sort_order: 20,
    is_active: true
  },

  {
    template_id: 'manager-team-productivity',
    name: 'Team Productivity Analysis',
    description: 'Team performance metrics, utilization rates, and productivity trends',
    category: 'team',
    allowed_roles: ['manager', 'management', 'super_admin'],
    required_permissions: ['team_reports'],
    data_source: {
      collection: 'timesheets',
      include_related: ['users', 'projects', 'time_entries']
    },
    available_formats: ['excel', 'pdf'],
    default_format: 'excel',
    default_filters: { groupBy: 'user' },
    available_filters: [
      { name: 'departments', type: 'multi-select', options: [
        { value: 'engineering', label: 'Engineering' },
        { value: 'design', label: 'Design' },
        { value: 'marketing', label: 'Marketing' },
        { value: 'sales', label: 'Sales' }
      ], required: false },
      { name: 'performance_metrics', type: 'multi-select', options: [
        { value: 'utilization', label: 'Utilization Rate' },
        { value: 'efficiency', label: 'Efficiency Score' },
        { value: 'overtime', label: 'Overtime Hours' },
        { value: 'billability', label: 'Billable Ratio' }
      ], required: false },
      { name: 'min_utilization', type: 'number', required: false }
    ],
    data_access_rules: {
      manager: {
        can_access_own_data: true,
        can_access_team_data: true,
        can_access_project_data: true,
        can_access_org_data: false
      }
    },
    can_be_scheduled: true,
    icon: 'BarChart3',
    color: 'blue',
    featured: false,
    sort_order: 21,
    is_active: true
  },

  // ========================================
  // MANAGEMENT REPORTS (Executive)
  // ========================================
  {
    template_id: 'executive-financial-dashboard',
    name: 'Executive Financial Dashboard',
    description: 'High-level financial overview with revenue, costs, margins, and key performance indicators',
    category: 'executive',
    allowed_roles: ['management', 'super_admin'],
    required_permissions: ['executive_reports'],
    data_source: {
      collection: 'billing_snapshots',
      include_related: ['projects', 'clients', 'users']
    },
    available_formats: ['pdf', 'excel'],
    default_format: 'pdf',
    default_filters: { level: 'executive' },
    available_filters: [
      { name: 'reporting_period', type: 'select', options: [
        { value: 'monthly', label: 'Monthly' },
        { value: 'quarterly', label: 'Quarterly' },
        { value: 'yearly', label: 'Yearly' }
      ], required: false },
      { name: 'include_forecasts', type: 'select', options: [
        { value: 'yes', label: 'Include Forecasts' },
        { value: 'no', label: 'Actual Data Only' }
      ], required: false },
      { name: 'business_units', type: 'multi-select', options: [
        { value: 'development', label: 'Development' },
        { value: 'consulting', label: 'Consulting' },
        { value: 'support', label: 'Support' }
      ], required: false }
    ],
    data_access_rules: {
      management: {
        can_access_own_data: true,
        can_access_team_data: true,
        can_access_project_data: true,
        can_access_org_data: true
      }
    },
    can_be_scheduled: true,
    icon: 'TrendingUp',
    color: 'indigo',
    featured: true,
    sort_order: 30,
    is_active: true
  },

  // ========================================
  // SYSTEM REPORTS (Super Admin)
  // ========================================
  {
    template_id: 'admin-system-audit',
    name: 'System Audit Report',
    description: 'Comprehensive system audit including user activities, data changes, and security events',
    category: 'system',
    allowed_roles: ['super_admin'],
    required_permissions: ['system_reports'],
    data_source: {
      collection: 'audit_logs',
      include_related: ['users']
    },
    available_formats: ['csv', 'excel', 'pdf'],
    default_format: 'csv',
    default_filters: { period: 'weekly' },
    available_filters: [
      { name: 'event_types', type: 'multi-select', options: [
        { value: 'user_login', label: 'User Login' },
        { value: 'data_export', label: 'Data Export' },
        { value: 'permission_change', label: 'Permission Changes' },
        { value: 'system_error', label: 'System Errors' }
      ], required: false },
      { name: 'severity_level', type: 'select', options: [
        { value: 'all', label: 'All Levels' },
        { value: 'high', label: 'High Priority' },
        { value: 'medium', label: 'Medium Priority' },
        { value: 'low', label: 'Low Priority' }
      ], required: false },
      { name: 'users_filter', type: 'multi-select', required: false }
    ],
    data_access_rules: {
      super_admin: {
        can_access_own_data: true,
        can_access_team_data: true,
        can_access_project_data: true,
        can_access_org_data: true
      }
    },
    can_be_scheduled: true,
    icon: 'Shield',
    color: 'red',
    featured: true,
    sort_order: 40,
    is_active: true
  }
];

export default IMPROVED_REPORT_TEMPLATE_SEEDS;

// Seeding execution logic
import dotenv from 'dotenv';
import { connectDB } from '../config/database';

dotenv.config();

const seedImprovedTemplates = async () => {
  try {
    await connectDB();
    console.log('🌱 Starting improved report template seeding...');

    // Get or create a system user for created_by field
    const { User } = require('../models');
    let systemUser = await User.findOne({ email: 'system@company.com' });
    
    if (!systemUser) {
      // Try to find any existing admin user
      systemUser = await User.findOne({ role: 'super_admin' });
      
      if (!systemUser) {
        // Create a system user if none exists
        systemUser = await User.create({
          full_name: 'System Administrator',
          email: 'system@company.com',
          password: 'system-password-123',
          role: 'super_admin',
          department: 'System',
          position: 'System Administrator',
          status: 'active'
        });
        console.log('👤 Created system user for template ownership');
      } else {
        console.log('👤 Using existing admin user for template ownership');
      }
    }

    // Clear existing templates
    await ReportTemplate.deleteMany({});
    console.log('🗑️  Cleared existing report templates');

    // Add created_by field to all templates
    const templatesWithCreatedBy = IMPROVED_REPORT_TEMPLATE_SEEDS.map(template => ({
      ...template,
      created_by: systemUser._id
    }));

    // Insert improved templates
    await ReportTemplate.insertMany(templatesWithCreatedBy);
    console.log(`✅ Successfully seeded ${templatesWithCreatedBy.length} improved report templates`);
    
    // Verify no date_range filters exist
    const templatesWithDateRange = await ReportTemplate.find({
      'available_filters.name': 'date_range'
    });
    
    if (templatesWithDateRange.length === 0) {
      console.log('🎉 Verified: No redundant date_range filters found!');
    } else {
      console.warn(`⚠️  Warning: ${templatesWithDateRange.length} templates still have date_range filters`);
    }

    console.log('🎯 UX improvements applied: Eliminated confusing duplicate date fields');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding improved templates:', error);
    process.exit(1);
  }
};

// Run the seeding if this file is executed directly
if (require.main === module) {
  seedImprovedTemplates();
}