import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  Users, 
  Settings, 
  Shield, 
  BarChart3, 
  FileText, 
  X 
} from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { cn } from '../utils/cn';

interface SidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  onClose: () => void;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredRoles?: string[];
}

const navigation: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Home,
  },
  {
    name: 'Profile',
    href: '/profile',
    icon: Users,
  },
  {
    name: 'Users',
    href: '/admin/users',
    icon: Users,
    requiredRoles: ['Admin', 'SuperAdmin'],
  },
  {
    name: 'Analytics',
    href: '/admin/analytics',
    icon: BarChart3,
    requiredRoles: ['Admin', 'SuperAdmin'],
  },
  {
    name: 'System Settings',
    href: '/admin/settings',
    icon: Settings,
    requiredRoles: ['SuperAdmin'],
  },
  {
    name: 'Audit Logs',
    href: '/admin/audit-logs',
    icon: FileText,
    requiredRoles: ['Admin', 'SuperAdmin'],
  },
  {
    name: 'Security',
    href: '/admin/security',
    icon: Shield,
    requiredRoles: ['SuperAdmin'],
  },
];

export function Sidebar({ isOpen, isCollapsed, onClose }: SidebarProps) {
  const { hasRole } = useAuth();

  // Filter navigation based on user roles
  const filteredNavigation = navigation.filter(item => {
    if (!item.requiredRoles) return true;
    return hasRole(item.requiredRoles);
  });

  return (
    <>
      {/* Desktop sidebar */}
      <div className={cn(
        "hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 bg-card border-r border-border transition-all duration-300 ease-in-out",
        isCollapsed ? "lg:w-16" : "lg:w-64"
      )}>
        <div className="flex flex-col flex-grow pt-5 overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0 px-4">
            {isCollapsed ? (
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">FA</span>
              </div>
            ) : (
              <h2 className="text-lg font-semibold text-foreground">
                Fullstack App
              </h2>
            )}
          </div>

          {/* Navigation */}
          <nav className="mt-8 flex-1 px-4">
            <ul className="space-y-2">
              {filteredNavigation.map((item) => (
                <li key={item.name}>
                  <NavLink
                    to={item.href}
                    className={({ isActive }) =>
                      cn(
                        'group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors relative',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                        isCollapsed && 'justify-center'
                      )
                    }
                    title={isCollapsed ? item.name : undefined}
                  >
                    <item.icon className={cn(
                      "h-5 w-5 flex-shrink-0",
                      isCollapsed ? "" : "mr-3"
                    )} />
                    {!isCollapsed && (
                      <span className="transition-opacity duration-200">{item.name}</span>
                    )}
                    {isCollapsed && (
                      <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                        {item.name}
                      </div>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

      {/* Mobile sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-card border-r border-border transform transition-transform duration-300 ease-in-out lg:hidden',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between flex-shrink-0 px-4 py-4">
          <h2 className="text-lg font-semibold text-foreground">
            Fullstack App
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-accent"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-4 flex-1 px-4">
          <ul className="space-y-2">
            {filteredNavigation.map((item) => (
              <li key={item.name}>
                <NavLink
                  to={item.href}
                  onClick={onClose} // Close mobile sidebar on navigation
                  className={({ isActive }) =>
                    cn(
                      'group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )
                  }
                >
                  <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                  {item.name}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Spacer for desktop sidebar */}
      <div className={cn(
        "hidden lg:block lg:flex-shrink-0 transition-all duration-300 ease-in-out",
        isCollapsed ? "lg:w-16" : "lg:w-64"
      )} />
    </>
  );
}

export default Sidebar;