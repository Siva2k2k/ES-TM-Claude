/**
 * Status utility functions
 * Centralized status colors, icons, and labels
 * Reduces duplicate status mapping code across components
 */

/**
 * Timesheet status types
 */
export type TimesheetStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'pending';

/**
 * Project status types
 */
export type ProjectStatus = 'active' | 'inactive' | 'completed' | 'on_hold' | 'cancelled';

/**
 * User status types
 */
export type UserStatus = 'active' | 'inactive' | 'pending' | 'suspended';

/**
 * Billing status types
 */
export type BillingStatus = 'draft' | 'pending' | 'approved' | 'paid' | 'overdue' | 'cancelled';

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
    inactive: 'bg-gray-100 text-gray-800 border-gray-300',
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
