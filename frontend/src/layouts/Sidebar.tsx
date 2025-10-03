import * as React from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  Home,
  Users,
  Clock,
  Building2,
  FileText,
  TrendingUp,
  Activity,
  UserCheck,
  ChevronDown,
  ChevronRight,
  Settings,
  LogOut,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { usePermissions } from '../hooks/usePermissions';
import { useAuth } from '../store/contexts/AuthContext';
import { SettingsModal } from '../components/settings/SettingsModal';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path?: string;
  children?: NavSubItem[];
  requiredPermission?: string;
}

export interface NavSubItem {
  id: string;
  label: string;
  path: string;
}

export interface SidebarProps {
  collapsed: boolean;
  onToggle?: () => void;
  className?: string;
}

/**
 * Sidebar Component
 * Navigation sidebar with role-based menu items
 * Supports collapsible state and nested navigation
 */
export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggle,
  className,
}) => {
  const location = useLocation();
  const permissions = usePermissions();
  const { currentUser, signOut } = useAuth();
  const [expandedItems, setExpandedItems] = React.useState<Set<string>>(new Set());
  const [showSettings, setShowSettings] = React.useState(false);
  const [showProfileMenu, setShowProfileMenu] = React.useState(false);
  const profileMenuRef = React.useRef<HTMLDivElement>(null);

  // Close profile menu when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    }

    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showProfileMenu]);

  // Define navigation items based on permissions
  const navigationItems: NavItem[] = React.useMemo(() => {
    const items: NavItem[] = [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: Home,
        path: '/dashboard',
      },
    ];

    // Timesheet navigation
    items.push({
      id: 'timesheet',
      label: 'My Timesheet',
      icon: Clock,
      children: [
        { id: 'timesheet-list', label: 'List View', path: '/timesheets' },
        { id: 'timesheet-calendar', label: 'Calendar View', path: '/timesheets/calendar' },
      ],
    });

    // Team Review (Lead+)
    if (permissions.canApproveTimesheets) {
      items.push({
        id: 'team-review',
        label: 'Team Review',
        icon: Users,
        path: '/team-review',
      });
    }

    // Projects
    items.push({
      id: 'projects',
      label: permissions.canManageProjects ? 'Project Management' : 'My Projects',
      icon: Building2,
      path: '/projects',
    });

    // User Management (Manager+)
    if (permissions.canManageUsers) {
      items.push({
        id: 'users',
        label: 'User Management',
        icon: Users,
        path: '/users',
      });
    }

    // Client Management (Manager+)
    if (permissions.canManageClients) {
      items.push({
        id: 'clients',
        label: 'Client Management',
        icon: UserCheck,
        path: '/clients',
      });
    }

    // Billing (Manager+)
    if (permissions.canManageBilling) {
      items.push({
        id: 'billing',
        label: 'Billing',
        icon: FileText,
        path: '/billing',
      });
    }

    // Reports
    items.push({
      id: 'reports',
      label: 'Reports',
      icon: TrendingUp,
      path: '/reports',
    });

    // Audit Logs (Management+)
    if (permissions.canViewAuditLogs) {
      items.push({
        id: 'audit',
        label: 'Audit Logs',
        icon: Activity,
        path: '/audit-logs',
      });
    }

    return items;
  }, [permissions]);

  const toggleExpanded = (itemId: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const isItemActive = (item: NavItem) => {
    if (item.path) {
      return isActive(item.path);
    }
    if (item.children) {
      return item.children.some((child) => isActive(child.path));
    }
    return false;
  };

  return (
    <aside
      className={cn(
        'bg-white border-r border-slate-200 h-full flex flex-col transition-all duration-300',
        collapsed ? 'w-16' : 'w-64',
        className
      )}
    >
      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <div className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const hasChildren = item.children && item.children.length > 0;
            const isExpanded = expandedItems.has(item.id);
            const active = isItemActive(item);

            return (
              <div key={item.id}>
                {/* Main Item */}
                {item.path && !hasChildren ? (
                  <Link
                    to={item.path}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      'hover:bg-slate-100',
                      active
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md'
                        : 'text-slate-700'
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className={cn('h-5 w-5 flex-shrink-0', active && 'text-white')} />
                    {!collapsed && <span className="flex-1">{item.label}</span>}
                  </Link>
                ) : (
                  <button
                    onClick={() => hasChildren && toggleExpanded(item.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      'hover:bg-slate-100',
                      active
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md'
                        : 'text-slate-700'
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className={cn('h-5 w-5 flex-shrink-0', active && 'text-white')} />
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left">{item.label}</span>
                        {hasChildren && (
                          isExpanded ? (
                            <ChevronDown className={cn('h-4 w-4', active && 'text-white')} />
                          ) : (
                            <ChevronRight className={cn('h-4 w-4', active && 'text-white')} />
                          )
                        )}
                      </>
                    )}
                  </button>
                )}

                {/* Sub Items */}
                {hasChildren && !collapsed && isExpanded && (
                  <div className="mt-1 ml-4 space-y-1">
                    {item.children!.map((subItem) => (
                      <Link
                        key={subItem.id}
                        to={subItem.path}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                          isActive(subItem.path)
                            ? 'bg-blue-50 text-blue-700 font-medium border-l-2 border-blue-500'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        )}
                      >
                        {subItem.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* Footer - User Profile & Progress */}
      <div className="border-t border-slate-200">
        {!collapsed && (
          <div className="p-4">
            {/* Current Week Progress */}
            <div className="px-3 py-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg mb-3">
              <div className="text-xs font-medium text-slate-600 mb-1">Current Week</div>
              <div className="text-sm font-bold text-slate-900">40.5 hours logged</div>
              <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: '81%' }}
                />
              </div>
            </div>
          </div>
        )}
        
        {/* User Profile Section */}
        <div className="relative">
          {!collapsed ? (
            /* Expanded Profile Section */
            <div className="p-4 pt-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                    {currentUser?.full_name ? currentUser.full_name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {currentUser?.full_name || 'User'}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {currentUser?.role || 'Employee'}
                    </p>
                  </div>
                </div>
                
                {/* Profile Menu Button */}
                <div className="relative" ref={profileMenuRef}>
                  <button
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="p-1 rounded-lg hover:bg-slate-100 transition-colors"
                    aria-label="User menu"
                  >
                    <ChevronDown 
                      size={16} 
                      className={cn(
                        "text-slate-400 transition-transform duration-200",
                        showProfileMenu && "rotate-180"
                      )} 
                    />
                  </button>
                  
                  {/* Profile Dropdown Menu */}
                  {showProfileMenu && (
                    <div className="absolute bottom-full right-0 mb-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
                      <button
                        onClick={() => {
                          setShowSettings(true);
                          setShowProfileMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center space-x-2"
                      >
                        <Settings size={16} />
                        <span>Settings</span>
                      </button>
                      <div className="border-t border-slate-100 my-1" />
                      <button
                        onClick={() => {
                          signOut();
                          setShowProfileMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                      >
                        <LogOut size={16} />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Collapsed Profile Section */
            <div className="p-2" ref={profileMenuRef}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-slate-100 transition-colors relative"
                aria-label="User menu"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                  {currentUser?.full_name ? currentUser.full_name.charAt(0).toUpperCase() : 'U'}
                </div>
                
                {/* Collapsed Profile Dropdown Menu */}
                {showProfileMenu && (
                  <div className="absolute bottom-full left-full ml-2 mb-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {currentUser?.full_name || 'User'}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {currentUser?.role || 'Employee'}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowSettings(true);
                        setShowProfileMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center space-x-2"
                    >
                      <Settings size={16} />
                      <span>Settings</span>
                    </button>
                    <div className="border-t border-slate-100 my-1" />
                    <button
                      onClick={() => {
                        signOut();
                        setShowProfileMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                    >
                      <LogOut size={16} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal 
          isOpen={showSettings} 
          onClose={() => setShowSettings(false)} 
        />
      )}
    </aside>
  );
};

export default Sidebar;
