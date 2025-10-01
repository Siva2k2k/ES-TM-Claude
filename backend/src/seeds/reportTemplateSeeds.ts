// @ts-nocheck - Temporarily disable type checking for Mongoose compatibility issues
import { ReportTemplate } from '../models/ReportTemplate';

/**
 * Report Template Seed Data
 * Creates initial report templates with role-based access
 */
export const REPORT_TEMPLATE_SEEDS = [
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
      { name: 'month', type: 'select', required: true },
      { name: 'year', type: 'select', required: true }
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
    default_schedule: {
      frequency: 'monthly',
      enabled: false,
      day_of_month: 1,
      time: '09:00'
    },
    icon: 'DollarSign',
    color: 'green',
    featured: true,
    sort_order: 1,
    is_active: true
  },

  {
    template_id: 'employee-timesheet-summary',
    name: 'My Timesheet Summary',
    description: 'Personal timesheet history with submitted, approved, and rejected timesheets',
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
      { name: 'date_range', type: 'date', required: true },
      { name: 'status', type: 'multi-select', options: ['draft', 'submitted', 'approved', 'rejected'], required: false }
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
    featured: true,
    sort_order: 2,
    is_active: true
  },

  {
    template_id: 'employee-performance',
    name: 'My Performance Report',
    description: 'Personal productivity metrics, task completion rate, and performance trends',
    category: 'personal',
    allowed_roles: ['employee', 'lead', 'manager', 'management', 'super_admin'],
    required_permissions: [],
    data_source: {
      collection: 'timesheets',
      include_related: ['time_entries', 'projects', 'tasks']
    },
    available_formats: ['pdf', 'excel'],
    default_format: 'pdf',
    default_filters: { period: 'quarterly' },
    available_filters: [
      { name: 'date_range', type: 'date', required: true }
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
    featured: true,
    sort_order: 3,
    is_active: true
  },

  {
    template_id: 'employee-attendance',
    name: 'My Leave & Attendance',
    description: 'Personal attendance record, leave balance, and work hours summary',
    category: 'personal',
    allowed_roles: ['employee', 'lead', 'manager', 'management', 'super_admin'],
    required_permissions: [],
    data_source: {
      collection: 'timesheets',
      include_related: []
    },
    available_formats: ['pdf', 'excel'],
    default_format: 'pdf',
    default_filters: { period: 'monthly' },
    available_filters: [
      { name: 'date_range', type: 'date', required: true }
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
    icon: 'Calendar',
    color: 'indigo',
    featured: false,
    sort_order: 4,
    is_active: true
  },

  // ========================================
  // LEAD REPORTS (Team)
  // ========================================
  {
    template_id: 'lead-team-timesheet',
    name: 'Team Timesheet Summary',
    description: 'Team members\' timesheet status, pending approvals, and utilization rates',
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
      { name: 'date_range', type: 'date', required: true },
      { name: 'status', type: 'multi-select', options: ['draft', 'submitted', 'approved'], required: false }
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
    color: 'blue',
    featured: true,
    sort_order: 10,
    is_active: true
  },

  {
    template_id: 'lead-team-performance',
    name: 'Team Performance Dashboard',
    description: 'Team productivity metrics, completion rates, and efficiency trends',
    category: 'team',
    allowed_roles: ['lead', 'manager', 'management', 'super_admin'],
    required_permissions: ['team_reports'],
    data_source: {
      collection: 'timesheets',
      include_related: ['users', 'projects', 'time_entries']
    },
    available_formats: ['pdf', 'excel'],
    default_format: 'pdf',
    default_filters: { period: 'monthly' },
    available_filters: [
      { name: 'date_range', type: 'date', required: true }
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
    icon: 'Activity',
    color: 'green',
    featured: true,
    sort_order: 11,
    is_active: true
  },

  {
    template_id: 'lead-team-attendance',
    name: 'Team Attendance Report',
    description: 'Team member attendance summary, leave patterns, and availability calendar',
    category: 'team',
    allowed_roles: ['lead', 'manager', 'management', 'super_admin'],
    required_permissions: ['team_reports'],
    data_source: {
      collection: 'timesheets',
      include_related: ['users']
    },
    available_formats: ['excel', 'pdf'],
    default_format: 'excel',
    default_filters: { period: 'monthly' },
    available_filters: [
      { name: 'date_range', type: 'date', required: true }
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
    icon: 'Calendar',
    color: 'orange',
    featured: false,
    sort_order: 12,
    is_active: true
  },

  // ========================================
  // MANAGER REPORTS (Project & Financial)
  // ========================================
  {
    template_id: 'manager-project-performance',
    name: 'Project Performance Report',
    description: 'All managed projects status, budget utilization, timeline adherence, and risk indicators',
    category: 'project',
    allowed_roles: ['manager', 'management', 'super_admin'],
    required_permissions: ['project_reports'],
    data_source: {
      collection: 'projects',
      include_related: ['timesheets', 'users', 'clients']
    },
    available_formats: ['pdf', 'excel'],
    default_format: 'pdf',
    default_filters: { status: ['active', 'completed'] },
    available_filters: [
      { name: 'date_range', type: 'date', required: true },
      { name: 'status', type: 'multi-select', options: ['active', 'completed', 'on-hold'], required: false },
      { name: 'projects', type: 'multi-select', required: false }
    ],
    data_access_rules: {
      manager: {
        can_access_own_data: true,
        can_access_team_data: true,
        can_access_project_data: true,
        can_access_org_data: false,
        additional_filters: { manager_only: true }
      }
    },
    can_be_scheduled: true,
    icon: 'Target',
    color: 'blue',
    featured: true,
    sort_order: 20,
    is_active: true
  },

  {
    template_id: 'manager-project-financial',
    name: 'Project Financial Report',
    description: 'Project-wise revenue, budget vs actual costs, billable hours, and project margins',
    category: 'financial',
    allowed_roles: ['manager', 'management', 'super_admin'],
    required_permissions: ['financial_reports'],
    data_source: {
      collection: 'billing_snapshots',
      include_related: ['projects', 'clients', 'timesheets']
    },
    available_formats: ['excel', 'pdf'],
    default_format: 'excel',
    default_filters: { period: 'monthly' },
    available_filters: [
      { name: 'date_range', type: 'date', required: true },
      { name: 'projects', type: 'multi-select', required: false }
    ],
    data_access_rules: {
      manager: {
        can_access_own_data: true,
        can_access_team_data: true,
        can_access_project_data: true,
        can_access_org_data: false,
        additional_filters: { manager_only: true }
      }
    },
    can_be_scheduled: true,
    icon: 'DollarSign',
    color: 'green',
    featured: true,
    sort_order: 21,
    is_active: true
  },

  {
    template_id: 'manager-resource-allocation',
    name: 'Team Resource Allocation',
    description: 'Team distribution across projects, capacity planning, and over/under-utilized members',
    category: 'project',
    allowed_roles: ['manager', 'management', 'super_admin'],
    required_permissions: ['project_reports'],
    data_source: {
      collection: 'timesheets',
      include_related: ['users', 'projects']
    },
    available_formats: ['excel', 'pdf'],
    default_format: 'excel',
    default_filters: { period: 'weekly' },
    available_filters: [
      { name: 'date_range', type: 'date', required: true }
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
    icon: 'Users',
    color: 'purple',
    featured: true,
    sort_order: 22,
    is_active: true
  },

  {
    template_id: 'manager-team-billing',
    name: 'Team Billing Summary',
    description: 'Team-generated revenue, billable vs non-billable hours, and efficiency rates',
    category: 'financial',
    allowed_roles: ['manager', 'management', 'super_admin'],
    required_permissions: ['financial_reports'],
    data_source: {
      collection: 'billing_snapshots',
      include_related: ['users', 'timesheets']
    },
    available_formats: ['excel', 'pdf'],
    default_format: 'excel',
    default_filters: { period: 'monthly' },
    available_filters: [
      { name: 'date_range', type: 'date', required: true }
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
    featured: false,
    sort_order: 23,
    is_active: true
  },

  // ========================================
  // MANAGEMENT REPORTS (Executive)
  // ========================================
  {
    template_id: 'management-financial-dashboard',
    name: 'Executive Financial Dashboard',
    description: 'Company-wide revenue, profitability, client billing summary, and financial KPIs',
    category: 'executive',
    allowed_roles: ['management', 'super_admin'],
    required_permissions: ['executive_reports'],
    data_source: {
      collection: 'billing_snapshots',
      include_related: ['clients', 'projects', 'users']
    },
    available_formats: ['pdf', 'excel'],
    default_format: 'pdf',
    default_filters: { period: 'quarterly' },
    available_filters: [
      { name: 'date_range', type: 'date', required: true },
      { name: 'breakdown', type: 'select', options: ['monthly', 'quarterly', 'yearly'], required: false }
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
    icon: 'BarChart3',
    color: 'indigo',
    featured: true,
    sort_order: 30,
    is_active: true
  },

  {
    template_id: 'management-org-utilization',
    name: 'Organizational Utilization Report',
    description: 'Company-wide resource utilization, billable vs non-billable hours, and capacity planning',
    category: 'executive',
    allowed_roles: ['management', 'super_admin'],
    required_permissions: ['executive_reports'],
    data_source: {
      collection: 'timesheets',
      include_related: ['users', 'projects']
    },
    available_formats: ['excel', 'pdf'],
    default_format: 'excel',
    default_filters: { period: 'monthly' },
    available_filters: [
      { name: 'date_range', type: 'date', required: true },
      { name: 'department', type: 'multi-select', required: false }
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
    icon: 'PieChart',
    color: 'cyan',
    featured: true,
    sort_order: 31,
    is_active: true
  },

  {
    template_id: 'management-client-billing',
    name: 'Client Billing & Revenue Report',
    description: 'All clients billing details, revenue by client, payment tracking, and profitability analysis',
    category: 'executive',
    allowed_roles: ['management', 'super_admin'],
    required_permissions: ['executive_reports'],
    data_source: {
      collection: 'billing_snapshots',
      include_related: ['clients', 'projects']
    },
    available_formats: ['excel', 'pdf'],
    default_format: 'excel',
    default_filters: { period: 'monthly' },
    available_filters: [
      { name: 'date_range', type: 'date', required: true },
      { name: 'clients', type: 'multi-select', required: false }
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
    icon: 'Building',
    color: 'blue',
    featured: true,
    sort_order: 32,
    is_active: true
  },

  {
    template_id: 'management-workforce-analytics',
    name: 'Workforce Analytics',
    description: 'All employees productivity, department-wise performance, and workforce cost analysis',
    category: 'executive',
    allowed_roles: ['management', 'super_admin'],
    required_permissions: ['executive_reports'],
    data_source: {
      collection: 'users',
      include_related: ['timesheets', 'projects']
    },
    available_formats: ['excel', 'pdf'],
    default_format: 'excel',
    default_filters: { period: 'quarterly' },
    available_filters: [
      { name: 'date_range', type: 'date', required: true },
      { name: 'roles', type: 'multi-select', options: ['employee', 'lead', 'manager'], required: false }
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
    icon: 'Users',
    color: 'purple',
    featured: true,
    sort_order: 33,
    is_active: true
  },

  {
    template_id: 'management-portfolio-analysis',
    name: 'All Projects Portfolio Report',
    description: 'All projects status, portfolio health metrics, budget utilization, and risk assessment',
    category: 'executive',
    allowed_roles: ['management', 'super_admin'],
    required_permissions: ['executive_reports'],
    data_source: {
      collection: 'projects',
      include_related: ['clients', 'users', 'timesheets']
    },
    available_formats: ['pdf', 'excel'],
    default_format: 'pdf',
    default_filters: { status: ['active'] },
    available_filters: [
      { name: 'date_range', type: 'date', required: false },
      { name: 'status', type: 'multi-select', options: ['active', 'on-hold', 'completed'], required: false }
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
    icon: 'Target',
    color: 'teal',
    featured: true,
    sort_order: 34,
    is_active: true
  },

  // ========================================
  // SYSTEM REPORTS (Super Admin)
  // ========================================
  {
    template_id: 'admin-audit-logs',
    name: 'System Audit Logs Report',
    description: 'All user activities, data modifications, and critical system events',
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
      { name: 'date_range', type: 'date', required: true },
      { name: 'event_type', type: 'multi-select', required: false },
      { name: 'user', type: 'select', required: false }
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
  },

  {
    template_id: 'admin-user-access',
    name: 'User Access Report',
    description: 'User roles, permissions, access patterns, and security incidents',
    category: 'system',
    allowed_roles: ['super_admin'],
    required_permissions: ['system_reports'],
    data_source: {
      collection: 'users',
      include_related: ['audit_logs']
    },
    available_formats: ['excel', 'csv'],
    default_format: 'excel',
    default_filters: {},
    available_filters: [
      { name: 'role', type: 'multi-select', options: ['employee', 'lead', 'manager', 'management', 'super_admin'], required: false },
      { name: 'is_active', type: 'select', options: [true, false], required: false }
    ],
    data_access_rules: {
      super_admin: {
        can_access_own_data: true,
        can_access_team_data: true,
        can_access_project_data: true,
        can_access_org_data: true
      }
    },
    can_be_scheduled: false,
    icon: 'Shield',
    color: 'orange',
    featured: false,
    sort_order: 41,
    is_active: true
  }
];

/**
 * Seed report templates into database
 */
export async function seedReportTemplates(createdBy: string): Promise<void> {
  try {
    console.log('🌱 Seeding report templates...');

    for (const template of REPORT_TEMPLATE_SEEDS) {
      await ReportTemplate.findOneAndUpdate(
        { template_id: template.template_id },
        { $set: { ...template, created_by: createdBy } },
        { upsert: true, new: true }
      );
    }

    console.log(`✅ Successfully seeded ${REPORT_TEMPLATE_SEEDS.length} report templates`);
  } catch (error) {
    console.error('❌ Error seeding report templates:', error);
    throw error;
  }
}
