import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import VoiceLayer from '../components/voice/VoiceLayer';

/**
 * AppLayout - Main application layout with Header, Sidebar, and Content area
 * Mobile-first responsive design
 */

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-gray-900 overflow-hidden">
      {/* Header - Fixed at top */}
      <Header
        onMenuClick={() => setSidebarOpen(true)}
        onSidebarToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        sidebarCollapsed={sidebarCollapsed}
      />

      {/* Desktop Layout: Flex container for sidebar + content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Fixed, scrollable internally */}
        <Sidebar
          isOpen={sidebarOpen}
          isCollapsed={sidebarCollapsed}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main content area - Scrollable */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
        {/* Global voice layer for authenticated app pages */}
        <VoiceLayer />
      </div>
    </div>
  );
}

export default AppLayout;
