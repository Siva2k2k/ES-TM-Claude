import { useState } from 'react';
import * as React from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from './store/contexts/AuthContext';
import LoginForm from './components/forms/LoginForm';
import { ManagementDashboard } from './pages/NewManagementDashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';
import TimesheetStatusView from './components/TimesheetStatusView';
import TeamReview from './components/TeamReview';
import { EmployeeTimesheet } from './components/EmployeeTimesheet';
import { UserManagement } from './components/UserManagement';
import { ProjectManagement } from './components/ProjectManagement';
import { BillingManagement } from './components/BillingManagement';
import { EnhancedBillingManagement } from './components/EnhancedBillingManagement';
import { EnhancedBillingDashboard } from './components/billing/EnhancedBillingDashboard';
import { BillingRateManagement } from './components/billing/BillingRateManagement';
import { EnhancedInvoiceWorkflow } from './components/billing/EnhancedInvoiceWorkflow';
import BillingManagementNew from './components/billing/BillingManagement';
import ProjectBillingView from './components/billing/ProjectBillingView';
import TaskBillingView from './components/billing/TaskBillingView';
import BillingOthersView from './components/billing/BillingOthersView';
import { AuditLogs } from './components/AuditLogs';
import { Reports } from './components/Reports';
import { EnhancedReports } from './components/EnhancedReports';
import ReportsHub from './components/ReportsHub';
import { ClientManagement } from './components/ClientManagement';
import { RoleSpecificDashboard } from './components/RoleSpecificDashboard';
import NotificationsPage from './pages/NotificationsPage';
import {
  Users,
  Clock,
  FileText,
  ChevronDown,
  LogOut,
  Shield,
  Building2,
  Menu,
  Home,
  CheckSquare,
  TrendingUp,
  Activity,
  UserCheck,
  Settings,
  User,
  Trash2
} from 'lucide-react';
import { SettingsModal } from './components/settings/SettingsModal';
import { NotificationBell } from './components/notifications/NotificationBell';
import { GlobalSearch } from './components/search/GlobalSearch';
import { DeletedItemsView } from './components/admin/DeletedItemsView';
import ResetPassword from './components/auth/ResetPassword';
import { ForcePasswordChange } from './components/auth/ForcePasswordChange';

interface SubItem {
  id: string;
  label: string;
}

interface NavigationItem {
  id: string;
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any;
  subItems: SubItem[];
}

const App: React.FC = () => {
  const { currentUserRole, currentUser, isAuthenticated, isLoading, signOut, requirePasswordChange, setRequirePasswordChange } = useAuth();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [activeSubSection, setActiveSubSection] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState<Set<string>>(new Set());
  const [showTimesheetPopup, setShowTimesheetPopup] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  // Ensure dropdown stays open when there's an active sub-section
  React.useEffect(() => {
    if (activeSubSection && activeSection) {
      setOpenDropdowns(prev => {
        const newSet = new Set(prev);
        newSet.add(activeSection); // Add current section but keep others open
        return newSet;
      });
    }
  }, [activeSection, activeSubSection]);

  // Close timesheet popup when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showTimesheetPopup && !target.closest('[data-timesheet-menu]')) {
        setShowTimesheetPopup(false);
      }
    };

    if (showTimesheetPopup) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTimesheetPopup]);

  // Handle navigation to create timesheet from list view
  React.useEffect(() => {
    const handleNavigateToCreate = () => {
      setActiveSection('timesheet');
      setActiveSubSection('timesheet-create');
      setOpenDropdowns(prev => {
        const newSet = new Set(prev);
        newSet.add('timesheet');
        return newSet;
      });
    };

    window.addEventListener('navigate-to-create', handleNavigateToCreate);
    return () => window.removeEventListener('navigate-to-create', handleNavigateToCreate);
  }, []);

  // Handle navigation to notifications page
  React.useEffect(() => {
    const handleNavigateToNotifications = () => {
      setActiveSection('notifications');
      setActiveSubSection('');
    };

    const handleNavigateToDashboard = () => {
      setActiveSection('dashboard');
      setActiveSubSection('');
    };

    window.addEventListener('navigate-to-notifications', handleNavigateToNotifications);
    window.addEventListener('navigate-to-dashboard', handleNavigateToDashboard);
    
    return () => {
      window.removeEventListener('navigate-to-notifications', handleNavigateToNotifications);
      window.removeEventListener('navigate-to-dashboard', handleNavigateToDashboard);
    };
  }, []);

  // Handle search navigation events
  React.useEffect(() => {
    const handleSearchNavigate = (event: CustomEvent) => {
      const { section, subsection } = event.detail;
      
      if (subsection) {
        setActiveSection(section);
        setActiveSubSection(subsection);
        // Open dropdown if it has sub-items
        setOpenDropdowns(prev => {
          const newSet = new Set(prev);
          newSet.add(section);
          return newSet;
        });
      } else {
        setActiveSection(section);
        setActiveSubSection('');
      }
    };

    window.addEventListener('search-navigate', handleSearchNavigate as EventListener);
    return () => window.removeEventListener('search-navigate', handleSearchNavigate as EventListener);
  }, []);

  // Handle URL-based routing for reset-password
  React.useEffect(() => {
    const checkUrlForResetPassword = () => {
      const path = window.location.pathname;
      const urlParams = new URLSearchParams(window.location.search);
      const hasToken = urlParams.has('token');
      
      if (path === '/reset-password' && hasToken) {
        setShowResetPassword(true);
      }
    };

    // Check on mount
    checkUrlForResetPassword();
    
    // Listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', checkUrlForResetPassword);
    return () => window.removeEventListener('popstate', checkUrlForResetPassword);
  }, []);

  // Handle click outside user dropdown
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showUserDropdown && !target.closest('[data-user-menu]')) {
        setShowUserDropdown(false);
      }
    };

    if (showUserDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserDropdown]);

  // Show loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-4">
            <Shield className="h-16 w-16 text-blue-600 mx-auto" />
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-pulse"></div>
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            TimeTracker Pro
          </h1>
          <p className="text-slate-600">
            {isAuthenticated ? 'Loading your workspace...' : 'Checking authentication...'}
          </p>
          <div className="mt-4 text-xs text-slate-500">
            Session restoration in progress
          </div>
        </div>
      </div>
    );
  }

  // Show reset password component if URL indicates password reset
  if (showResetPassword) {
    return (
      <ResetPassword 
        onComplete={() => {
          setShowResetPassword(false);
          // Clear the URL and redirect to home/login
          window.history.replaceState({}, document.title, '/');
        }} 
      />
    );
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return <LoginForm />;
  }

  // Show force password change if required (for new users with temporary passwords)
  if (requirePasswordChange) {
    return (
      <ForcePasswordChange
        onPasswordChanged={() => {
          setRequirePasswordChange(false);
          // After password change, the user can continue to dashboard
        }}
        userEmail={currentUser?.email || ''}
      />
    );
  }

  const getNavigationItems = (): NavigationItem[] => {
    const baseItems: NavigationItem[] = [
      { 
        id: 'dashboard', 
        label: 'Dashboard', 
        icon: Home,
        subItems: []
      },
    ];

    // Super Admin - Full system access
    if (currentUserRole === 'super_admin') {
      baseItems.push(
        { id: 'users', label: 'User Management', icon: Users, subItems: [] },
        { id: 'projects', label: 'Project Management', icon: Building2, subItems: [] },
        { id: 'clients', label: 'Client Management', icon: UserCheck, subItems: [] },
        {
          id: 'timesheet',
          label: 'Timesheet Overview',
          icon: Clock,
          subItems: [
            { id: 'timesheet-view', label: 'View Data (Read-Only)' },
            { id: 'timesheet-reports', label: 'Timesheet Reports' }
          ]
        },
        { id: 'reports', label: 'Reports & Analytics', icon: TrendingUp, subItems: [] },
        { id: 'billing', label: 'Billing Management', icon: FileText, subItems: [
          { id: 'billing-projects', label: '🎯 Project Billing' },
          { id: 'billing-tasks', label: '🎯 Task Billing' },
          { id: 'billing-others', label: 'Others' }
        ]},
        { id: 'audit', label: 'Audit Logs', icon: Activity, subItems: [
          { id: 'audit-logs', label: 'View Logs' },
          { id: 'audit-cleanup', label: 'Data Cleanup' }
        ]},
        { id: 'deleted-items', label: 'Deleted Items', icon: Trash2, subItems: [] }
      );
    }

    // Management - Mid-level privileges
    else if (currentUserRole === 'management') {
      baseItems.push(
        { id: 'users', label: 'User Management', icon: Users, subItems: []},
        { id: 'projects', label: 'Project Management', icon: Building2, subItems: []},
        { id: 'clients', label: 'Client Management', icon: UserCheck, subItems: [] },
        { id: 'timesheet-team', label: 'Team Review', icon: Users, subItems: [] },
        { id: 'reports', label: 'Reports & Analytics', icon: TrendingUp, subItems: [] },
        { id: 'billing', label: 'Billing Management', icon: FileText, subItems: [
          { id: 'billing-projects', label: '🎯 Project Billing' },
          { id: 'billing-tasks', label: '🎯 Task Billing' },
          { id: 'billing-others', label: 'Others' }
        ]},
        { id: 'deleted-items', label: 'Deleted Items', icon: Trash2, subItems: [] }
      );
    }

    // Manager - Team management
    else if (currentUserRole === 'manager') {
      baseItems.push(
        { id: 'users', label: 'Team Management', icon: Users, subItems: [] },
        { id: 'projects', label: 'Project Management', icon: Building2, subItems: [] },
        { id: 'clients', label: 'Client Management', icon: UserCheck, subItems: [] },
        {
          id: 'timesheet',
          label: 'My Timesheet',
          icon: Clock,
          subItems: [
            { id: 'timesheet-list', label: 'List View' },
            { id: 'timesheet-calendar', label: 'Calendar View' }
          ]
        },
        { id: 'timesheet-team', label: 'Team Review', icon: Users, subItems: [] },
        { id: 'reports', label: 'Reports & Analytics', icon: TrendingUp, subItems: [] }
      );
    }

    // Lead - Team leadership with review capabilities
    else if (currentUserRole === 'lead') {
      baseItems.push(
        { id: 'tasks', label: 'My Tasks', icon: CheckSquare, subItems: [] },
        { id: 'projects', label: 'My Projects', icon: Building2, subItems: [] },
        {
          id: 'timesheet',
          label: 'My Timesheet',
          icon: Clock,
          subItems: [
            { id: 'timesheet-list', label: 'List View' },
            { id: 'timesheet-calendar', label: 'Calendar View' }
          ]
        },
        { id: 'timesheet-team', label: 'Team Review', icon: Users, subItems: [] },
        { id: 'timesheet-status', label: 'My Status', icon: Activity, subItems: [] },
        { id: 'reports', label: 'My Reports', icon: TrendingUp, subItems: [] }
      );
    }

    // Employee - Individual contributor
    else if (currentUserRole === 'employee') {
      baseItems.push(
        { id: 'tasks', label: 'My Tasks', icon: CheckSquare, subItems: [] },
        { id: 'projects', label: 'My Projects', icon: Building2, subItems: [] },
        {
          id: 'timesheet',
          label: 'My Timesheet',
          icon: Clock,
          subItems: [
            { id: 'timesheet-list', label: 'List View' },
            { id: 'timesheet-calendar', label: 'Calendar View' }
          ]
        },
        { id: 'timesheet-status', label: 'My Status', icon: Activity, subItems: [] },
        { id: 'reports', label: 'My Reports', icon: TrendingUp, subItems: [] }
      );
    }

    return baseItems;
  };

  const navigationItems = getNavigationItems();

  const handleNavigation = (itemId: string, subItemId?: string) => {
    const item = navigationItems.find(nav => nav.id === itemId);
    const hasSubItems = item?.subItems && item.subItems.length > 0;
    
    if (subItemId) {
      // Clicking on a sub-item
      setActiveSection(itemId);
      setActiveSubSection(subItemId);
    } else if (hasSubItems) {
      // Clicking on main item with sub-items
      const isCurrentlyOpen = openDropdowns.has(itemId);
      
      if (isCurrentlyOpen) {
        // If dropdown is open, just toggle it closed
        setOpenDropdowns(prev => {
          const newSet = new Set(prev);
          newSet.delete(itemId);
          return newSet;
        });
      } else {
        // If dropdown is closed, navigate to first sub-item and open dropdown
        // Keep other dropdowns open (no auto-close behavior)
        const firstSubItem = item.subItems[0];
        setActiveSection(itemId);
        setActiveSubSection(firstSubItem.id);
        setOpenDropdowns(prev => {
          const newSet = new Set(prev);
          newSet.add(itemId);
          return newSet;
        });
      }
    } else {
      // Clicking on main item without sub-items
      setActiveSection(itemId);
      setActiveSubSection('');
      // Don't close other dropdowns when navigating to non-dropdown items
    }
  };

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await signOut();
      console.log('User signed out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const renderContent = () => {
    // Handle specific sub-sections
    if (activeSubSection) {
      switch (activeSubSection) {
        // User Management Sub-sections
        case 'users-create':
          return <UserManagement defaultTab="all" />;
        case 'users-pending':
          return <UserManagement defaultTab="pending" />;
        
        // Project Management Sub-sections
        // No project sub-sections needed - handled within component
        
        // Timesheet Sub-sections
        case 'timesheet-calendar':
          // Calendar view for all users
          return <EmployeeTimesheet viewMode="calendar" />;
        case 'projects-overview':
          return <ProjectManagement defaultTab="overview" />;
        case 'projects-tasks':
          return <ProjectManagement defaultTab="tasks" />;
        case 'timesheet-list':
          // List view for individual users
          return <EmployeeTimesheet viewMode="list" />;
        case 'timesheet-create':
          // Create form view
          return <EmployeeTimesheet viewMode="create" />;
        case 'team-calendar':
        case 'team-list':
        case 'team-approval':
        case 'team-verification':
        case 'team-overview':
        case 'timesheet-team':
        case 'timesheet-approval':
        case 'timesheet-verification':
          return <TeamReview />;
        
        // Primary Billing Views
        case 'billing-projects':
          return <ProjectBillingView />;
        case 'billing-tasks':
          return <TaskBillingView />;
        case 'billing-others':
          return <BillingOthersView />;
        
        // Secondary Billing Sub-sections (keep for direct access)
        case 'billing-enhanced-dashboard':
          return <EnhancedBillingDashboard />;
        case 'billing-invoice-workflow':
          return <EnhancedInvoiceWorkflow />;
        case 'billing-rate-management':
          return <BillingRateManagement />;
        
        // Legacy Billing Sub-sections (fallback to enhanced billing management)
        case 'billing-view':
        case 'billing-reports':
        case 'billing-snapshots':
        case 'billing-approval':
        case 'billing-provisions':
        case 'billing-dashboard':
        case 'billing-summaries':
          return <EnhancedBillingManagement />;
        
        // Timesheet Status Sub-sections
        case 'timesheet-view':
        case 'timesheet-reports':
          return <TimesheetStatusView />;
        
        // Audit Sub-sections
        case 'audit-logs':
        case 'audit-cleanup':
          return <AuditLogs />;
        
        default:
          break;
      }
    }

    // Handle timesheet sections first
    if (activeSection === 'timesheet' || activeSection === 'timesheet-status' || activeSection === 'timesheet-team') {
      if (activeSection === 'timesheet') {
        // Default to list view for main timesheet
        return <EmployeeTimesheet viewMode="list" />;
      } else if (activeSection === 'timesheet-team') {
        // Team Review section - use the new TeamReview component
        return <TeamReview />;
      } else {
        return <TimesheetStatusView />;
      }
    }

    // Handle specific management sections
    switch (activeSection) {
      case 'users':
        return <UserManagement />;
      case 'projects':
        return <ProjectManagement />;
      case 'clients':
        return <ClientManagement />;
      case 'billing':
        return <EnhancedBillingManagement />;
      case 'audit':
        return <AuditLogs />;
      case 'deleted-items':
        return <DeletedItemsView />;
      case 'reports':
        return <ReportsHub />;
      case 'notifications':
        return <NotificationsPage />;
      case 'tasks':
        // Handle My Tasks section for employee and lead
        if (currentUserRole === 'employee' || currentUserRole === 'lead') {
          return <EmployeeDashboard activeSection="tasks" setActiveSection={setActiveSection} />;
        }
        return <EmployeeDashboard activeSection={activeSection} setActiveSection={setActiveSection} />;
      case 'dashboard':
      default:
        // Return appropriate dashboard based on role
        return <RoleSpecificDashboard />;
    }
  };

  const notifications = [
    { id: 1, title: 'Timesheet Approved', message: 'Your timesheet for week of Feb 5 has been approved', time: '2 hours ago', type: 'success' },
    { id: 2, title: 'New Task Assigned', message: 'Payment Gateway Setup task has been assigned to you', time: '4 hours ago', type: 'info' },
    { id: 3, title: 'Project Deadline', message: 'E-commerce Platform milestone due in 2 days', time: '1 day ago', type: 'warning' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm shadow-lg border-b border-slate-200/50 dark:border-gray-700/50 fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-18">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 rounded-lg text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex-shrink-0">
                <div className="flex items-center">
                  <div className="relative">
                    <Shield className="h-6 w-6 md:h-8 md:w-8 text-blue-600 dark:text-blue-400" />
                    <div className="absolute -top-1 -right-1 w-2 h-2 md:w-3 md:h-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"></div>
                  </div>
                  <div className="ml-3">
                    <span className="text-l md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                      TimeTracker Pro
                    </span>
                    <div className="text-[10px] md:text-xs text-slate-500 dark:text-gray-400 font-medium">Enterprise Edition</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              {/* Search */}
              <div className="hidden md:block">
                <GlobalSearch className="w-64" />
              </div>

              {/* Notifications */}
              <NotificationBell />

              {/* User Info */}
              <div className="flex items-center space-x-3 px-3 py-2 bg-slate-50 dark:bg-gray-700 rounded-lg">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">
                    {currentUser?.full_name?.charAt(0) || 'U'}
                  </span>
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-slate-900 dark:text-gray-100">{currentUser?.full_name}</p>
                  <p className="text-xs text-slate-500 dark:text-gray-400 capitalize">{currentUserRole.replace('_', ' ')}</p>
                </div>
              </div>

              {/* Sign Out Button */}
              <button
                onClick={handleSignOut}
                className="p-2 text-slate-400 dark:text-gray-400 hover:text-slate-600 dark:hover:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex pt-18">
        {/* Mobile Overlay */}
        {!sidebarCollapsed && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
            onClick={() => setSidebarCollapsed(true)}
          />
        )}

        {/* Sidebar */}
        <nav className={`
          ${sidebarCollapsed ? 'w-16 -translate-x-full lg:translate-x-0' : 'w-72 translate-x-0'}
          bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm shadow-xl min-h-screen border-r border-slate-200/50 dark:border-gray-700/50
          transition-all duration-300 fixed top-18 bottom-0 overflow-y-auto scrollbar-hide z-40
        `}>
          <div className="p-4">
            
            
            <div className="space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                const hasSubItems = item.subItems && item.subItems.length > 0;
                const isDropdownOpen = openDropdowns.has(item.id);
                
                return (
                  <div
                    key={item.id}
                    className="relative"
                  >
                    <button
                      onClick={() => {
                        // If collapsed and has sub-items, toggle popup instead
                        if (sidebarCollapsed && hasSubItems) {
                          if (item.id === 'timesheet') {
                            setShowTimesheetPopup(!showTimesheetPopup);
                          }
                        } else {
                          handleNavigation(item.id);
                        }
                      }}
                      data-timesheet-menu={item.id === 'timesheet' ? '' : undefined}
                      className={`w-full flex items-center justify-center ${sidebarCollapsed ? 'px-2' : 'px-4'} py-3 text-sm font-medium rounded-xl transition-all group relative ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                          : 'text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 hover:text-slate-900 dark:hover:text-white'
                      }`}
                      title={sidebarCollapsed ? item.label : ''}
                    >
                      <Icon className={`w-5 h-5 ${sidebarCollapsed ? '' : 'mr-3'} ${isActive ? 'text-white' : ''}`} />
                      {!sidebarCollapsed && (
                        <>
                          <span className="flex-1 text-left">{item.label}</span>
                          {hasSubItems && (
                            <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''} ${isActive ? 'text-white' : ''}`} />
                          )}
                        </>
                      )}
                      {/* Tooltip for collapsed state */}
                      {sidebarCollapsed && (
                        <span className="absolute left-full ml-2 px-2 py-1 bg-slate-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                          {item.label}
                        </span>
                      )}
                    </button>

                    {/* Popup menu for collapsed sidebar with sub-items */}
                    {sidebarCollapsed && hasSubItems && item.id === 'timesheet' && showTimesheetPopup && (
                      <div
                        data-timesheet-menu
                        className="absolute left-full ml-2 top-0 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-slate-200 dark:border-gray-700 py-2 min-w-[200px] z-50 animate-in slide-in-from-left-2 duration-200">
                        {item.subItems.map((subItem) => (
                          <button
                            key={subItem.id}
                            onClick={() => {
                              handleNavigation(item.id, subItem.id);
                              setShowTimesheetPopup(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-sm transition-all duration-200 ${
                              activeSubSection === subItem.id
                                ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium'
                                : 'text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-700 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            {subItem.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Sub Items */}
                    {!sidebarCollapsed && hasSubItems && isDropdownOpen && (
                      <div className="mt-2 ml-4 space-y-1 animate-in slide-in-from-top-2 duration-200">
                        {item.subItems.map((subItem) => (
                          <button
                            key={subItem.id}
                            onClick={() => handleNavigation(item.id, subItem.id)}
                            className={`w-full text-left px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
                              activeSubSection === subItem.id
                                ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-l-2 border-blue-500 font-medium'
                                : 'text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-700 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            {subItem.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* User Profile Section */}
            {!sidebarCollapsed && currentUser && (
              <div className="mt-6 px-3">
                <div className="relative" data-user-menu>
                  <button
                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <User size={16} className="text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-slate-900 text-sm">
                        {currentUser.full_name}
                      </div>
                      <div className="text-xs text-slate-500 capitalize">
                        {currentUser.role?.replace('_', ' ')}
                      </div>
                    </div>
                    <ChevronDown
                      size={16}
                      className={`text-slate-400 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {/* User Dropdown Menu */}
                  {showUserDropdown && (
                    <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-lg border border-slate-200 py-2">
                      <button
                        onClick={() => {
                          setShowSettings(true);
                          setShowUserDropdown(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <Settings size={14} />
                        Settings
                      </button>
                      <button
                        onClick={() => {
                          signOut();
                          setShowUserDropdown(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <LogOut size={14} />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Sidebar Footer */}
            {!sidebarCollapsed && (
              <div className="mt-8 pt-4 border-t border-slate-200">
                <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl">
                  <div className="text-xs font-medium text-slate-600 mb-1">Current Week</div>
                  <div className="text-sm font-bold text-slate-900">40.5 hours logged</div>
                  <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                    <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full" style={{ width: '81%' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Main Content */}
        <main className={`flex-1 p-4 md:p-8 overflow-auto ${sidebarCollapsed ? 'ml-0 md:ml-16' : 'ml-0 md:ml-72'} transition-all duration-300 w-full`}>
          {renderContent()}
        </main>
      </div>

      {/* Click outside to close notifications */}
      {showNotifications && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowNotifications(false);
          }}
        />
      )}

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
      />

      {/* Toast Notifications */}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
};

export default App;