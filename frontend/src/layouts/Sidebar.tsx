import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  Users,
  Building2,
  Clock,
  FileText,
  TrendingUp,
  UserCheck,
  Activity,
  Trash2,
  X,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../store/contexts/AuthContext';
import { cn } from '../utils/cn';

/**
 * Sidebar Component - Mobile-First Role-Based Navigation with React Router
 */

interface SidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  onClose: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
  subItems?: {
    id: string;
    label: string;
    path: string;
  }[];
}

export function Sidebar({ isOpen, isCollapsed, onClose }: SidebarProps) {
  const { currentUserRole } = useAuth();
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(new Set());

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Get role-based navigation items
  const getNavigationItems = (): NavItem[] => {
    const baseItems: NavItem[] = [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: Home,
        path: '/dashboard'
      },
    ];

    // Super Admin - Full system access
    if (currentUserRole === 'super_admin') {
      baseItems.push(
        { id: 'users', label: 'User Management', icon: Users, path: '/dashboard/users' },
        { id: 'projects', label: 'Project Management', icon: Building2, path: '/dashboard/projects' },
        { id: 'clients', label: 'Client Management', icon: UserCheck, path: '/dashboard/clients' },
        {
          id: 'timesheet',
          label: 'Timesheet Overview',
          icon: Clock,
          path: '/dashboard/timesheets',
          subItems: [
            { id: 'timesheet-status', label: 'View Data (Read-Only)', path: '/dashboard/timesheets/status' },
            { id: 'timesheet-reports', label: 'Timesheet Reports', path: '/dashboard/timesheets/status/reports' }
          ]
        },
        { id: 'reports', label: 'Reports & Analytics', icon: TrendingUp, path: '/dashboard/reports' },
        {
          id: 'billing',
          label: 'Billing Management',
          icon: FileText,
          path: '/dashboard/billing',
          subItems: [
            { id: 'billing-projects', label: '🎯 Project Billing', path: '/dashboard/billing/projects' },
            { id: 'billing-tasks', label: '🎯 Task Billing', path: '/dashboard/billing/tasks' },
            { id: 'billing-others', label: 'Others', path: '/dashboard/billing/others' }
          ]
        },
        {
          id: 'audit',
          label: 'Audit Logs',
          icon: Activity,
          path: '/dashboard/admin/audit-logs',
          subItems: [
            { id: 'audit-logs', label: 'View Logs', path: '/dashboard/admin/audit-logs' },
            { id: 'audit-cleanup', label: 'Data Cleanup', path: '/dashboard/admin/audit-cleanup' }
          ]
        },
        { id: 'deleted-items', label: 'Deleted Items', icon: Trash2, path: '/dashboard/admin/deleted-items' }
      );
    }

    // Management - Mid-level privileges
    else if (currentUserRole === 'management') {
      baseItems.push(
        { id: 'users', label: 'User Management', icon: Users, path: '/dashboard/users' },
        { id: 'projects', label: 'Project Management', icon: Building2, path: '/dashboard/projects' },
        { id: 'clients', label: 'Client Management', icon: UserCheck, path: '/dashboard/clients' },
        { id: 'team', label: 'Team Review', icon: Users, path: '/dashboard/team' },
        { id: 'reports', label: 'Reports & Analytics', icon: TrendingUp, path: '/dashboard/reports' },
        {
          id: 'billing',
          label: 'Billing Management',
          icon: FileText,
          path: '/dashboard/billing',
          subItems: [
            { id: 'billing-projects', label: '🎯 Project Billing', path: '/dashboard/billing/projects' },
            { id: 'billing-tasks', label: '🎯 Task Billing', path: '/dashboard/billing/tasks' },
            { id: 'billing-others', label: 'Others', path: '/dashboard/billing/others' }
          ]
        },
        { id: 'deleted-items', label: 'Deleted Items', icon: Trash2, path: '/dashboard/admin/deleted-items' }
      );
    }

    // Manager - Team management
    else if (currentUserRole === 'manager') {
      baseItems.push(
        { id: 'users', label: 'Team Management', icon: Users, path: '/dashboard/users' },
        { id: 'projects', label: 'Project Management', icon: Building2, path: '/dashboard/projects' },
        { id: 'clients', label: 'Client Management', icon: UserCheck, path: '/dashboard/clients' },
        {
          id: 'timesheet',
          label: 'My Timesheet',
          icon: Clock,
          path: '/dashboard/timesheets',
          subItems: [
            { id: 'timesheet-list', label: 'List View', path: '/dashboard/timesheets/list' },
            { id: 'timesheet-calendar', label: 'Calendar View', path: '/dashboard/timesheets/calendar' }
          ]
        },
        { id: 'team', label: 'Team Review', icon: Users, path: '/dashboard/team' },
        { id: 'reports', label: 'Reports & Analytics', icon: TrendingUp, path: '/dashboard/reports' }
      );
    }

    // Lead - Team leadership with review capabilities
    else if (currentUserRole === 'lead') {
      baseItems.push(
        { id: 'projects', label: 'My Projects', icon: Building2, path: '/dashboard/projects' },
        {
          id: 'timesheet',
          label: 'My Timesheet',
          icon: Clock,
          path: '/dashboard/timesheets',
          subItems: [
            { id: 'timesheet-list', label: 'List View', path: '/dashboard/timesheets/list' },
            { id: 'timesheet-calendar', label: 'Calendar View', path: '/dashboard/timesheets/calendar' }
          ]
        },
        { id: 'team', label: 'Team Review', icon: Users, path: '/dashboard/team' },
        { id: 'timesheet-status', label: 'My Status', icon: Activity, path: '/dashboard/timesheets/status' },
        { id: 'reports', label: 'My Reports', icon: TrendingUp, path: '/dashboard/reports' }
      );
    }

    // Employee - Individual contributor
    else if (currentUserRole === 'employee') {
      baseItems.push(
        { id: 'projects', label: 'My Projects', icon: Building2, path: '/dashboard/projects' },
        {
          id: 'timesheet',
          label: 'My Timesheet',
          icon: Clock,
          path: '/dashboard/timesheets',
          subItems: [
            { id: 'timesheet-list', label: 'List View', path: '/dashboard/timesheets/list' },
            { id: 'timesheet-calendar', label: 'Calendar View', path: '/dashboard/timesheets/calendar' }
          ]
        },
        { id: 'timesheet-status', label: 'My Status', icon: Activity, path: '/dashboard/timesheets/status' },
        { id: 'reports', label: 'My Reports', icon: TrendingUp, path: '/dashboard/reports' }
      );
    }

    return baseItems;
  };

  const navigationItems = getNavigationItems();

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Mobile header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-gray-700 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">TT</span>
          </div>
          <span className="font-semibold text-slate-900 dark:text-gray-100">TimeTracker</span>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-700"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const hasSubItems = item.subItems && item.subItems.length > 0;
            const isExpanded = expandedSections.has(item.id);

            if (hasSubItems) {
              // Item with sub-items (dropdown)
              return (
                <div key={item.id} className="space-y-1">
                  <button
                    onClick={() => toggleSection(item.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
                      'text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700'
                    )}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {!isCollapsed && (
                      <>
                        <span className="flex-1 text-left">{item.label}</span>
                        <ChevronDown
                          className={cn(
                            'w-4 h-4 transition-transform',
                            isExpanded && 'rotate-180'
                          )}
                        />
                      </>
                    )}
                  </button>

                  {/* Sub-items */}
                  {!isCollapsed && isExpanded && (
                    <div className="ml-4 space-y-1 pl-4 border-l-2 border-slate-200 dark:border-gray-700">
                      {item.subItems?.map((subItem) => (
                        <NavLink
                          key={subItem.id}
                          to={subItem.path}
                          onClick={onClose}
                          className={({ isActive }) =>
                            cn(
                              'block px-4 py-2 rounded-lg text-sm transition-all',
                              isActive
                                ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-medium'
                                : 'text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-700'
                            )
                          }
                        >
                          {subItem.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            // Simple nav item without sub-items
            return (
              <NavLink
                key={item.id}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
                    isActive
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                      : 'text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700'
                  )
                }
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Footer info */}
      {!isCollapsed && (
        <div className="p-4 border-t border-slate-200 dark:border-gray-700">
          <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl">
            <div className="text-xs font-medium text-slate-600 dark:text-gray-400 mb-1">
              Current Week
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-gray-100">
              40.5 hours logged
            </div>
            <div className="w-full bg-slate-200 dark:bg-gray-700 rounded-full h-2 mt-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full"
                style={{ width: '81%' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      <div className={cn('fixed inset-0 z-50 lg:hidden', isOpen ? 'block' : 'hidden')}>
        <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
        <div className={cn('absolute left-0 top-0 bottom-0 w-72 bg-white dark:bg-gray-800 shadow-2xl', isOpen ? 'translate-x-0' : '-translate-x-full')}>
          {sidebarContent}
        </div>
      </div>

      {/* Desktop */}
      <div className={cn('hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:z-40 bg-white dark:bg-gray-800 border-r border-slate-200 dark:border-gray-700', isCollapsed ? 'lg:w-16' : 'lg:w-64')}>
        {sidebarContent}
      </div>

      {/* Spacer */}
      <div className={cn('hidden lg:block', isCollapsed ? 'lg:w-16' : 'lg:w-64')} />
    </>
  );
}

export default Sidebar;
