import React from 'react';
import { Shield } from 'lucide-react';

/**
 * AuthLayout - Simple centered layout for authentication pages
 * Mobile-first responsive design
 */

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex flex-col">
      {/* Optional header with logo */}
      <div className="p-4 sm:p-6">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Shield className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
            TimeTracker Pro
          </span>
        </div>
      </div>

      {/* Main content - centered */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>

      {/* Optional footer */}
      <div className="p-4 text-center">
        <p className="text-sm text-slate-600 dark:text-gray-400">
          &copy; {new Date().getFullYear()} TimeTracker Pro. All rights reserved.
        </p>
      </div>
    </div>
  );
}

export default AuthLayout;
