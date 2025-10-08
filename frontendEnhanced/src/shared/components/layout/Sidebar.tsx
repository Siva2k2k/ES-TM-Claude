/**
 * Sidebar Component
 * Modern collapsible navigation sidebar
 * Cognitive Complexity: 8
 */
import React, { useState } from 'react';
import {
  Home,
  Clock,
  FolderKanban,
  Users,
  FileText,
  TrendingUp,
  Settings,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { cn } from '../../utils/cn';

export interface SidebarProps {
  open: boolean;
  mobileOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: number;
  children?: NavItem[];
}

const navigationItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <Home className="h-5 w-5" />,
    path: '/dashboard',
  },
  {
    id: 'timesheets',
    label: 'Timesheets',
    icon: <Clock className="h-5 w-5" />,
    path: '/timesheets',
    children: [
      { id: 'my-timesheets', label: 'My Timesheets', icon: null, path: '/timesheets/my' },
      { id: 'calendar', label: 'Calendar View', icon: null, path: '/timesheets/calendar' },
      { id: 'status', label: 'Status & Approval', icon: null, path: '/timesheets/status' },
    ],
  },
  {
    id: 'projects',
    label: 'Projects',
    icon: <FolderKanban className="h-5 w-5" />,
    path: '/projects',
    children: [
      { id: 'all-projects', label: 'All Projects', icon: null, path: '/projects/all' },
      { id: 'my-projects', label: 'My Projects', icon: null, path: '/projects/my' },
      { id: 'tasks', label: 'Tasks', icon: null, path: '/projects/tasks' },
    ],
  },
  {
    id: 'team',
    label: 'Team',
    icon: <Users className="h-5 w-5" />,
    path: '/team',
    children: [
      { id: 'team-review', label: 'Team Review', icon: null, path: '/team/review' },
      { id: 'approvals', label: 'Approvals', icon: null, path: '/team/approvals', badge: 3 },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: <FileText className="h-5 w-5" />,
    path: '/reports',
    children: [
      { id: 'dashboard', label: 'Report Dashboard', icon: null, path: '/reports/dashboard' },
      { id: 'analytics', label: 'Analytics', icon: null, path: '/reports/analytics' },
      { id: 'history', label: 'History', icon: null, path: '/reports/history' },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: <TrendingUp className="h-5 w-5" />,
    path: '/analytics',
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ open, mobileOpen, onClose }) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set([]));
  const [activeItem, setActiveItem] = useState('dashboard');

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleItemClick = (item: NavItem) => {
    setActiveItem(item.id);
    if (item.children) {
      toggleExpanded(item.id);
    } else {
      onClose(); // Close mobile sidebar after navigation
    }
  };

  const NavItemComponent = ({ item, level = 0 }: { item: NavItem; level?: number }) => {
    const isActive = activeItem === item.id;
    const isExpanded = expandedItems.has(item.id);
    const hasChildren = item.children && item.children.length > 0;

    return (
      <div>
        <button
          onClick={() => handleItemClick(item)}
          className={cn(
            'w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200',
            'text-gray-700 dark:text-gray-300',
            isActive
              ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
              : 'hover:bg-gray-100 dark:hover:bg-gray-700',
            level > 0 && 'ml-4 text-sm',
            !open && level === 0 && 'justify-center'
          )}
        >
          <div className="flex items-center gap-3 min-w-0">
            {item.icon && (
              <span className={cn('flex-shrink-0', !open && 'mx-auto')}>
                {item.icon}
              </span>
            )}
            {open && (
              <span className="font-medium truncate">{item.label}</span>
            )}
          </div>

          {open && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {item.badge && item.badge > 0 && (
                <span className={cn(
                  'px-2 py-0.5 rounded-full text-xs font-semibold',
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                )}>
                  {item.badge}
                </span>
              )}
              {hasChildren && (
                isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
              )}
            </div>
          )}
        </button>

        {hasChildren && isExpanded && open && (
          <div className="mt-1 space-y-1">
            {item.children!.map(child => (
              <NavItemComponent key={child.id} item={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-16 bottom-0 z-30 hidden md:block',
          'bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm',
          'border-r border-gray-200 dark:border-gray-700',
          'transition-all duration-300 ease-in-out',
          open ? 'w-64' : 'w-16'
        )}
      >
        <nav className="h-full overflow-y-auto p-4 space-y-2">
          {navigationItems.map(item => (
            <NavItemComponent key={item.id} item={item} />
          ))}

          {/* Settings at Bottom */}
          <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
                !open && 'justify-center'
              )}
            >
              <Settings className="h-5 w-5 flex-shrink-0" />
              {open && <span className="font-medium">Settings</span>}
            </button>
          </div>
        </nav>
      </aside>

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-16 bottom-0 z-40 md:hidden w-64',
          'bg-white dark:bg-gray-800',
          'border-r border-gray-200 dark:border-gray-700',
          'transform transition-transform duration-300 ease-in-out',  
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <nav className="h-full overflow-y-auto p-4 space-y-2">
          {navigationItems.map(item => (
            <NavItemComponent key={item.id} item={item} />
          ))}

          <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
              <Settings className="h-5 w-5" />
              <span className="font-medium">Settings</span>
            </button>
          </div>
        </nav>
      </aside>
    </>
  );
};
