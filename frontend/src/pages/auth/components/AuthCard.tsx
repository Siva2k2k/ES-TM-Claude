import React from 'react';
import { Shield } from 'lucide-react';

/**
 * AuthCard Component
 * Reusable card wrapper for all authentication pages
 * Provides consistent styling and branding
 */

interface AuthCardProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function AuthCard({ children, title, subtitle }: AuthCardProps) {
  return (
    <div className="w-full max-w-md">
      {/* Logo and Brand */}
      <div className="flex items-center justify-center mb-8">
        <div className="relative">
          <Shield className="h-12 w-12 text-blue-600 dark:text-blue-400" />
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full" />
        </div>
        <div className="ml-3">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
            TimeTracker Pro
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">Enterprise Edition</p>
        </div>
      </div>

      {/* Auth Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-slate-100 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-gray-100">{title}</h2>
          {subtitle && (
            <p className="mt-2 text-sm text-slate-600 dark:text-gray-400">{subtitle}</p>
          )}
        </div>

        {/* Content */}
        <div className="px-8 py-6">
          {children}
        </div>
      </div>

      {/* Footer */}
      <p className="mt-6 text-center text-xs text-slate-500 dark:text-gray-400">
        &copy; {new Date().getFullYear()} TimeTracker Pro. All rights reserved.
      </p>
    </div>
  );
}

export default AuthCard;
