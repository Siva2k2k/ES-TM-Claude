import React from 'react';
import { Link } from 'react-router-dom';
import { Menu, Sun, Moon, Monitor, LogOut, Settings, User, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { useTheme } from '../store/ThemeContext';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Avatar from '@radix-ui/react-avatar';

interface HeaderProps {
  onMenuClick: () => void;
  onSidebarToggle: () => void;
  sidebarCollapsed: boolean;
}

export function Header({ onMenuClick, onSidebarToggle, sidebarCollapsed }: HeaderProps) {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="h-4 w-4" />;
      case 'dark':
        return <Moon className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  return (
    <header className="bg-card border-b border-border px-4 lg:px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left side - Menu button and title */}
        <div className="flex items-center space-x-4">
          {/* Mobile menu button */}
          <button
            onClick={onMenuClick}
            className="p-2 rounded-lg hover:bg-accent lg:hidden"
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          
          {/* Desktop sidebar toggle button */}
          <button
            onClick={onSidebarToggle}
            className="hidden lg:flex p-2 rounded-lg hover:bg-accent transition-colors"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </button>
          
          <h1 className="text-xl font-semibold text-foreground">
            Dashboard
          </h1>
        </div>

        {/* Right side - Theme toggle and user menu */}
        <div className="flex items-center space-x-4">
          {/* Theme toggle */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                className="p-2 rounded-lg hover:bg-accent transition-colors"
                aria-label="Toggle theme"
              >
                {getThemeIcon()}
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="min-w-[8rem] bg-popover border border-border rounded-md p-1 shadow-md animate-in fade-in-80"
                sideOffset={5}
              >
                <DropdownMenu.Item
                  className="flex items-center px-2 py-2 text-sm cursor-pointer rounded-sm hover:bg-accent outline-none"
                  onClick={() => setTheme('light')}
                >
                  <Sun className="h-4 w-4 mr-2" />
                  Light
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className="flex items-center px-2 py-2 text-sm cursor-pointer rounded-sm hover:bg-accent outline-none"
                  onClick={() => setTheme('dark')}
                >
                  <Moon className="h-4 w-4 mr-2" />
                  Dark
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className="flex items-center px-2 py-2 text-sm cursor-pointer rounded-sm hover:bg-accent outline-none"
                  onClick={() => setTheme('system')}
                >
                  <Monitor className="h-4 w-4 mr-2" />
                  System
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>

          {/* User menu */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="flex items-center space-x-2 p-2 rounded-lg hover:bg-accent transition-colors">
                <Avatar.Root className="inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-muted">
                  <Avatar.Image
                    className="h-full w-full rounded-full object-cover"
                    src={user?.avatar}
                    alt={`${user?.firstName} ${user?.lastName}`}
                  />
                  <Avatar.Fallback className="text-sm font-medium bg-primary text-primary-foreground">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </Avatar.Fallback>
                </Avatar.Root>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-foreground">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {user?.role}
                  </p>
                </div>
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="min-w-[12rem] bg-popover border border-border rounded-md p-1 shadow-md animate-in fade-in-80"
                sideOffset={5}
                align="end"
              >
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  {user?.email}
                </div>
                <DropdownMenu.Separator className="h-px bg-border my-1" />
                <DropdownMenu.Item asChild>
                  <Link 
                    to="/profile" 
                    className="flex items-center px-2 py-2 text-sm cursor-pointer rounded-sm hover:bg-accent outline-none"
                  >
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </Link>
                </DropdownMenu.Item>
                <DropdownMenu.Item className="flex items-center px-2 py-2 text-sm cursor-pointer rounded-sm hover:bg-accent outline-none">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="h-px bg-border my-1" />
                <DropdownMenu.Item
                  className="flex items-center px-2 py-2 text-sm cursor-pointer rounded-sm hover:bg-destructive hover:text-destructive-foreground outline-none"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>
    </header>
  );
}

export default Header;