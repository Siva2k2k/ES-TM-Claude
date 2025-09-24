import type { UserRole } from '../types';

// Detailed permission definitions based on role requirements
export interface RolePermissionMap {
  [key: string]: string[];
}

export const PERMISSIONS = {
  // User Management
  USER_CRUD: 'user_crud',
  USER_APPROVE: 'user_approve',
  USER_ACTIVATE_DEACTIVATE: 'user_activate_deactivate',
  USER_DEFINE_BILLING: 'user_define_billing',
  USER_SET_SALARY: 'user_set_salary',
  USER_CREATE_SUBMIT_APPROVAL: 'user_create_submit_approval',

  // Project Management
  PROJECT_VIEW_ALL: 'project_view_all',
  PROJECT_VIEW_TASKS: 'project_view_tasks',
  PROJECT_TASK_ACTIONS: 'project_task_actions',
  PROJECT_CREATE: 'project_create',
  PROJECT_SET_CLIENTS_MANAGERS: 'project_set_clients_managers',
  PROJECT_ANALYTICS: 'project_analytics',

  // Timesheet Management
  TIMESHEET_CALENDAR_MONTHLY: 'timesheet_calendar_monthly',
  TIMESHEET_VIEW_ALL_HOURS: 'timesheet_view_all_hours',
  TIMESHEET_LIST_ALL: 'timesheet_list_all',
  TIMESHEET_DASHBOARD: 'timesheet_dashboard',
  TIMESHEET_VIEW_ALL: 'timesheet_view_all',
  TIMESHEET_APPROVE_VERIFY_MANAGER: 'timesheet_approve_verify_manager',
  TIMESHEET_VERIFY_APPROVED: 'timesheet_verify_approved',
  TIMESHEET_STATUS: 'timesheet_status',
  TIMESHEET_VIEW_ONLY: 'timesheet_view_only', // Super Admin viewing capability

  // Reports & Analytics
  REPORTS_ALL: 'reports_all',
  REPORTS_EXPORT: 'reports_export',

  // Billing
  BILLING_WEEKLY_SNAPSHOTS: 'billing_weekly_snapshots',
  BILLING_POLICY: 'billing_policy',
  BILLING_MONTHLY_APPROVAL: 'billing_monthly_approval',
  BILLING_PROVISIONS: 'billing_provisions',
  BILLING_VIEW_ONLY: 'billing_view_only', // Super Admin viewing capability

  // Audit Logs
  AUDIT_VIEW: 'audit_view',
  AUDIT_PERIODIC_DELETION: 'audit_periodic_deletion',

  // General
  TEAM_MANAGEMENT: 'team_management',
  TASK_MANAGEMENT: 'task_management',
  TIMESHEET_ENTRY: 'timesheet_entry',
  TASK_COMPLETION: 'task_completion',
  PROJECT_PARTICIPATION: 'project_participation'
} as const;

export const rolePermissions: RolePermissionMap = {
  super_admin: [
    // User Management - Full CRUD
    PERMISSIONS.USER_CRUD,
    PERMISSIONS.USER_APPROVE,
    PERMISSIONS.USER_ACTIVATE_DEACTIVATE,
    PERMISSIONS.USER_DEFINE_BILLING,
    PERMISSIONS.USER_SET_SALARY,
    
    // Project Management - Full access
    PERMISSIONS.PROJECT_VIEW_ALL,
    PERMISSIONS.PROJECT_VIEW_TASKS,
    PERMISSIONS.PROJECT_TASK_ACTIONS,
    PERMISSIONS.PROJECT_CREATE,
    PERMISSIONS.PROJECT_SET_CLIENTS_MANAGERS,
    PERMISSIONS.PROJECT_ANALYTICS,
    
    // Timesheet Management - View Only (No Approvals)
    PERMISSIONS.TIMESHEET_CALENDAR_MONTHLY,
    PERMISSIONS.TIMESHEET_VIEW_ALL_HOURS,
    PERMISSIONS.TIMESHEET_LIST_ALL,
    PERMISSIONS.TIMESHEET_DASHBOARD,
    PERMISSIONS.TIMESHEET_VIEW_ALL,
    PERMISSIONS.TIMESHEET_STATUS,
    PERMISSIONS.TIMESHEET_VIEW_ONLY,
    
    // Reports & Analytics - Full access
    PERMISSIONS.REPORTS_ALL,
    PERMISSIONS.REPORTS_EXPORT,
    
    // Billing - View Only (No Approvals)
    PERMISSIONS.BILLING_WEEKLY_SNAPSHOTS,
    PERMISSIONS.BILLING_POLICY,
    PERMISSIONS.BILLING_VIEW_ONLY,
    
    // Audit Logs - Full control
    PERMISSIONS.AUDIT_VIEW,
    PERMISSIONS.AUDIT_PERIODIC_DELETION
  ],
  
  management: [
    // User Management - Create and submit for approval
    PERMISSIONS.USER_CREATE_SUBMIT_APPROVAL,
    
    // Project Management - Create and manage
    PERMISSIONS.PROJECT_CREATE,
    PERMISSIONS.PROJECT_SET_CLIENTS_MANAGERS,
    PERMISSIONS.PROJECT_VIEW_ALL,
    PERMISSIONS.PROJECT_VIEW_TASKS,
    PERMISSIONS.PROJECT_ANALYTICS,
    
    // Timesheet Management - Full approval authority
    PERMISSIONS.TIMESHEET_CALENDAR_MONTHLY,
    PERMISSIONS.TIMESHEET_VIEW_ALL_HOURS,
    PERMISSIONS.TIMESHEET_LIST_ALL,
    PERMISSIONS.TIMESHEET_DASHBOARD,
    PERMISSIONS.TIMESHEET_VIEW_ALL,
    PERMISSIONS.TIMESHEET_APPROVE_VERIFY_MANAGER,
    PERMISSIONS.TIMESHEET_VERIFY_APPROVED,
    PERMISSIONS.TIMESHEET_STATUS,
    
    // Reports & Analytics - Same as Super Admin
    PERMISSIONS.REPORTS_ALL,
    PERMISSIONS.REPORTS_EXPORT,
    
    // Billing - Full approval authority
    PERMISSIONS.BILLING_WEEKLY_SNAPSHOTS,
    PERMISSIONS.BILLING_MONTHLY_APPROVAL,
    PERMISSIONS.BILLING_PROVISIONS
  ],
  
  manager: [
    PERMISSIONS.TEAM_MANAGEMENT,
    PERMISSIONS.PROJECT_PARTICIPATION,
    PERMISSIONS.PROJECT_VIEW_ALL,
    PERMISSIONS.PROJECT_CREATE,
    PERMISSIONS.PROJECT_VIEW_TASKS,
    PERMISSIONS.PROJECT_TASK_ACTIONS,
    PERMISSIONS.TIMESHEET_APPROVE_VERIFY_MANAGER,
    PERMISSIONS.REPORTS_ALL
  ],
  
  lead: [
    PERMISSIONS.TEAM_MANAGEMENT,
    PERMISSIONS.PROJECT_PARTICIPATION,
    PERMISSIONS.PROJECT_VIEW_TASKS,
    PERMISSIONS.TIMESHEET_VERIFY_APPROVED,
    PERMISSIONS.TASK_MANAGEMENT
  ],
  
  employee: [
    PERMISSIONS.TIMESHEET_ENTRY,
    PERMISSIONS.TASK_COMPLETION,
    PERMISSIONS.PROJECT_PARTICIPATION,
    PERMISSIONS.PROJECT_VIEW_TASKS
  ]
};

/**
 * Permission checking utility class
 */
export class PermissionService {
  /**
   * Check if a role has a specific permission
   */
  static hasPermission(role: UserRole, permission: string): boolean {
    const permissions = rolePermissions[role] || [];
    return permissions.includes(permission);
  }

  /**
   * Check if a role has any of the specified permissions
   */
  static hasAnyPermission(role: UserRole, permissions: string[]): boolean {
    return permissions.some(permission => this.hasPermission(role, permission));
  }

  /**
   * Check if a role has all of the specified permissions
   */
  static hasAllPermissions(role: UserRole, permissions: string[]): boolean {
    return permissions.every(permission => this.hasPermission(role, permission));
  }

  /**
   * Get all permissions for a role
   */
  static getRolePermissions(role: UserRole): string[] {
    return rolePermissions[role] || [];
  }

  /**
   * Check if user can manage other users
   */
  static canManageUsers(role: UserRole): boolean {
    return this.hasAnyPermission(role, [
      PERMISSIONS.USER_CRUD,
      PERMISSIONS.USER_CREATE_SUBMIT_APPROVAL
    ]);
  }

  /**
   * Check if user can approve users
   */
  static canApproveUsers(role: UserRole): boolean {
    return this.hasPermission(role, PERMISSIONS.USER_APPROVE);
  }

  /**
   * Check if user can manage projects
   */
  static canManageProjects(role: UserRole): boolean {
    return this.hasAnyPermission(role, [
      PERMISSIONS.PROJECT_CREATE,
      PERMISSIONS.PROJECT_VIEW_ALL
    ]);
  }

  /**
   * Check if user can manage timesheets
   */
  static canManageTimesheets(role: UserRole): boolean {
    return this.hasAnyPermission(role, [
      PERMISSIONS.TIMESHEET_LIST_ALL,
      PERMISSIONS.TIMESHEET_APPROVE_VERIFY_MANAGER,
      PERMISSIONS.TIMESHEET_VERIFY_APPROVED
    ]);
  }

  /**
   * Check if user can access billing features
   */
  static canAccessBilling(role: UserRole): boolean {
    return this.hasAnyPermission(role, [
      PERMISSIONS.BILLING_WEEKLY_SNAPSHOTS,
      PERMISSIONS.BILLING_PROVISIONS,
      PERMISSIONS.BILLING_MONTHLY_APPROVAL
    ]);
  }

  /**
   * Check if user can access audit logs
   */
  static canAccessAuditLogs(role: UserRole): boolean {
    return this.hasPermission(role, PERMISSIONS.AUDIT_VIEW);
  }

  /**
   * Check if user can export reports
   */
  static canExportReports(role: UserRole): boolean {
    return this.hasPermission(role, PERMISSIONS.REPORTS_EXPORT);
  }
}

export default PermissionService;