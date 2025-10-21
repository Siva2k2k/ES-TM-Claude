import * as React from 'react';
import { Link } from 'react-router-dom';
import {
  Menu,
  LogOut,
  Shield,
  User,
  Settings,
  Moon,
  Sun,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useAuth } from '../store/contexts/AuthContext';
import { NotificationBell } from '../components/notifications/NotificationBell';
import { GlobalSearch } from '../components/search/GlobalSearch';

export interface HeaderProps {
  onMenuClick?: () => void;
  onSidebarToggle?: () => void;
  sidebarCollapsed?: boolean;
  className?: string;
}

/**
 * Header Component
 * Application header with search, notifications, and user menu
 */
export const Header: React.FC<HeaderProps> = ({ onMenuClick, onSidebarToggle, sidebarCollapsed, className }) => {
  const { currentUser, currentUserRole, signOut } = useAuth();
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const [theme, setTheme] = React.useState<'light' | 'dark'>('light');

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
    // TODO: Implement theme switching logic
  };

  return (
    <header
      className={cn(
        'bg-white/95 backdrop-blur-sm shadow-md border-b border-slate-200 sticky top-0 z-40',
        className
      )}
    >
      <div className="flex items-center justify-between h-14 md:h-16 px-3 sm:px-4 md:px-6">
        {/* Left Section */}
        <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
          {/* Mobile Menu Toggle */}
          <button
            onClick={onMenuClick}
            className="p-1.5 md:p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors flex-shrink-0 lg:hidden"
            aria-label="Toggle mobile menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Desktop Sidebar Toggle */}
          <button
            onClick={onSidebarToggle}
            className="hidden lg:block p-1.5 md:p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors flex-shrink-0"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="relative">
              <Shield className="h-5 w-5 md:h-8 md:w-8 text-blue-600" />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 md:w-3 md:h-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full" />
            </div>
            {/* Mobile: Show compact text */}
            <div className="block md:hidden ">
              <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                TimeTracker
              </span>
              <div className="text-xs text-slate-500 font-medium -mt-0.5">
                Pro
              </div>
            </div>
            {/* Desktop: Show full text */}
            <div className="hidden md:block">
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                TimeTracker Pro
              </span>
              <div className="text-xs text-slate-500 font-medium -mt-1">
                Enterprise Edition
              </div>
            </div>
          </Link>
        </div>

        {/* Center Section - Search */}
        <div className="hidden md:flex flex-1 max-w-md mx-4">
          <GlobalSearch className="w-full" />
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-0.5 sm:gap-1 md:gap-2 flex-shrink-0">
          {/* Search (mobile) */}
          <GlobalSearch className="md:hidden" />

          {/* Theme Toggle - Hidden on small screens */}
          <button
            onClick={toggleTheme}
            className="hidden sm:flex p-1.5 md:p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? (
              <Moon className="w-4 h-4 md:w-5 md:h-5" />
            ) : (
              <Sun className="w-4 h-4 md:w-5 md:h-5" />
            )}
          </button>

          <NotificationBell className="ml-0.5 sm:ml-1" />

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 md:py-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <div className="w-7 h-7 md:w-8 md:h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xs md:text-sm font-bold">
                  {currentUser?.full_name?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-slate-900 truncate max-w-20 md:max-w-none">
                  {currentUser?.full_name || 'User'}
                </p>
                <p className="text-xs text-slate-500 capitalize">
                  {currentUserRole?.replace('_', ' ')}
                </p>
              </div>
            </button>

            {/* User Menu Dropdown */}
            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 z-50">
                  <div className="p-3 border-b border-slate-100">
                    <p className="font-medium text-slate-900">
                      {currentUser?.full_name}
                    </p>
                    <p className="text-sm text-slate-500">{currentUser?.email}</p>
                  </div>
                  <div className="py-2">
                    <Link
                      to="/profile"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <User className="w-4 h-4" />
                      My Profile
                    </Link>
                    <Link
                      to="/settings"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </Link>
                  </div>
                  <div className="border-t border-slate-100 py-2">
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors w-full"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
