/**
 * Status utility functions
 * Centralized status colors, icons, and labels
 * Reduces duplicate status mapping code across components
 */

/**
 * Timesheet status types
 */
import { BillingStatus, ProjectStatus } from './constants';

export type TimesheetStatus = 
  | 'draft' 
  | 'submitted' 
  | 'lead_approved'
  | 'lead_rejected'
  | 'manager_approved'
  | 'manager_rejected'
  | 'management_pending'
  | 'management_rejected'
  | 'approved' 
  | 'rejected' 
  | 'pending'
  | 'frozen'
  | 'billed';

/**
 * Project status types
 *  ACTIVE: 'active',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
  ON_HOLD: 'on_hold',
  CANCELLED: 'cancelled',
 */

/**
 * User status types
 */
export type UserStatus = 'active' | 'inactive' | 'pending' | 'suspended';

/**
 * Billing status types
 * DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  PAID: 'paid',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled'
 */


/**
 * Get Tailwind CSS classes for timesheet status badge
 * @param status - Timesheet status
 * @returns Tailwind CSS classes
 */
export function getTimesheetStatusColor(status: TimesheetStatus | string): string {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800 border-gray-300',
    submitted: 'bg-blue-100 text-blue-800 border-blue-300',
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    lead_approved: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    lead_rejected: 'bg-orange-100 text-orange-800 border-orange-300',
    manager_approved: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    manager_rejected: 'bg-red-100 text-red-800 border-red-300',
    management_pending: 'bg-purple-100 text-purple-800 border-purple-300',
    management_rejected: 'bg-red-100 text-red-800 border-red-300',
    frozen: 'bg-blue-100 text-blue-800 border-blue-300',
    billed: 'bg-green-100 text-green-800 border-green-300',
    approved: 'bg-green-100 text-green-800 border-green-300',
    rejected: 'bg-red-100 text-red-800 border-red-300'
  };

  return colors[status.toLowerCase()] || colors.draft;
}

/**
 * Get Tailwind CSS classes for project status badge
 * @param status - Project status
 * @returns Tailwind CSS classes
 */
export function getProjectStatusColor(status: ProjectStatus | string): string {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800 border-green-300',
    archived: 'bg-gray-100 text-gray-800 border-gray-300',
    completed: 'bg-blue-100 text-blue-800 border-blue-300',
    on_hold: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    cancelled: 'bg-red-100 text-red-800 border-red-300'
  };

  return colors[status.toLowerCase()] || colors.active;
}

/**
 * Get Tailwind CSS classes for user status badge
 * @param status - User status
 * @returns Tailwind CSS classes
 */
export function getUserStatusColor(status: UserStatus | string): string {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800 border-green-300',
    inactive: 'bg-gray-100 text-gray-800 border-gray-300',
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    suspended: 'bg-red-100 text-red-800 border-red-300'
  };

  return colors[status.toLowerCase()] || colors.active;
}

/**
 * Get Tailwind CSS classes for billing status badge
 * @param status - Billing status
 * @returns Tailwind CSS classes
 */
export function getBillingStatusColor(status: BillingStatus | string): string {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800 border-gray-300',
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    approved: 'bg-blue-100 text-blue-800 border-blue-300',
    paid: 'bg-green-100 text-green-800 border-green-300',
    overdue: 'bg-red-100 text-red-800 border-red-300',
    cancelled: 'bg-gray-100 text-gray-800 border-gray-300'
  };

  return colors[status.toLowerCase()] || colors.draft;
}

/**
 * Get human-readable label for timesheet status
 * @param status - Timesheet status
 * @returns Formatted status label
 */
export function getTimesheetStatusLabel(status: TimesheetStatus | string): string {
  const labels: Record<string, string> = {
    draft: 'Draft',
    submitted: 'Submitted',
    pending: 'Pending',
    lead_approved: 'Lead Approved',
    lead_rejected: 'Lead Rejected',
    manager_approved: 'Manager Approved',
    manager_rejected: 'Manager Rejected',
    management_pending: 'Management Pending',
    management_rejected: 'Management Rejected',
    frozen: 'Frozen',
    billed: 'Billed',
    approved: 'Approved',
    rejected: 'Rejected'
  };

  return labels[status.toLowerCase()] || status;
}

/**
 * Get human-readable label for project status
 * @param status - Project status
 * @returns Formatted status label
 */
export function getProjectStatusLabel(status: ProjectStatus | string): string {
  const labels: Record<string, string> = {
    active: 'Active',
    inactive: 'Inactive',
    completed: 'Completed',
    on_hold: 'On Hold',
    cancelled: 'Cancelled'
  };

  return labels[status.toLowerCase()] || status;
}

/**
 * Get human-readable label for user status
 * @param status - User status
 * @returns Formatted status label
 */
export function getUserStatusLabel(status: UserStatus | string): string {
  const labels: Record<string, string> = {
    active: 'Active',
    inactive: 'Inactive',
    pending: 'Pending Approval',
    suspended: 'Suspended'
  };

  return labels[status.toLowerCase()] || status;
}

/**
 * Get human-readable label for billing status
 * @param status - Billing status
 * @returns Formatted status label
 */
export function getBillingStatusLabel(status: BillingStatus | string): string {
  const labels: Record<string, string> = {
    draft: 'Draft',
    pending: 'Pending',
    approved: 'Approved',
    paid: 'Paid',
    overdue: 'Overdue',
    cancelled: 'Cancelled'
  };

  return labels[status.toLowerCase()] || status;
}

/**
 * Get icon name for timesheet status (lucide-react icon names)
 * @param status - Timesheet status
 * @returns Icon name
 */
export function getTimesheetStatusIcon(status: TimesheetStatus | string): string {
  const icons: Record<string, string> = {
    draft: 'FileEdit',
    submitted: 'Send',
    pending: 'Clock',
    lead_approved: 'CheckCircle',
    lead_rejected: 'XCircle',
    manager_approved: 'CheckCircle',
    manager_rejected: 'XCircle',
    management_pending: 'Clock',
    management_rejected: 'XCircle',
    frozen: 'Lock',
    billed: 'DollarSign',
    approved: 'CheckCircle',
    rejected: 'XCircle'
  };

  return icons[status.toLowerCase()] || 'FileText';
}

/**
 * Get icon name for project status (lucide-react icon names)
 * @param status - Project status
 * @returns Icon name
 */
export function getProjectStatusIcon(status: ProjectStatus | string): string {
  const icons: Record<string, string> = {
    active: 'Play',
    inactive: 'Pause',
    completed: 'CheckCircle',
    on_hold: 'Clock',
    cancelled: 'XCircle'
  };

  return icons[status.toLowerCase()] || 'FolderOpen';
}

/**
 * Get priority color classes
 * @param priority - Priority level (high, medium, low)
 * @returns Tailwind CSS classes
 */
export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    high: 'bg-red-100 text-red-800 border-red-300',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    low: 'bg-green-100 text-green-800 border-green-300'
  };

  return colors[priority.toLowerCase()] || colors.medium;
}

/**
 * Get role color classes
 * @param role - User role
 * @returns Tailwind CSS classes
 */
export function getRoleColor(role: string): string {
  const colors: Record<string, string> = {
    super_admin: 'bg-purple-100 text-purple-800 border-purple-300',
    management: 'bg-blue-100 text-blue-800 border-blue-300',
    manager: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    lead: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    employee: 'bg-gray-100 text-gray-800 border-gray-300'
  };

  return colors[role.toLowerCase()] || colors.employee;
}

/**
 * Get audit action color classes
 * Used for audit logs and action tracking
 * @param action - Action type (CREATE, UPDATE, DELETE, APPROVE, REJECT, LOGIN, etc.)
 * @returns Tailwind CSS text color classes
 */
export function getActionColor(action: string): string {
  const upperAction = action.toUpperCase();

  // Destructive actions - red
  if (upperAction.includes('DELETE') || upperAction.includes('REJECT')) {
    return 'text-red-600 bg-red-50 border-red-300';
  }

  // Create/Approve actions - green
  if (upperAction.includes('CREATE') || upperAction.includes('APPROVE')) {
    return 'text-green-600 bg-green-50 border-green-300';
  }

  // Update/Edit actions - blue
  if (upperAction.includes('UPDATE') || upperAction.includes('EDIT')) {
    return 'text-blue-600 bg-blue-50 border-blue-300';
  }

  // Login/Auth actions - purple
  if (upperAction.includes('LOGIN') || upperAction.includes('LOGOUT') || upperAction.includes('AUTH')) {
    return 'text-purple-600 bg-purple-50 border-purple-300';
  }

  // Default - gray
  return 'text-gray-600 bg-gray-50 border-gray-300';
}
