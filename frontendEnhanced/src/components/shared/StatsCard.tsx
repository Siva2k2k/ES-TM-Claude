import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

/**
 * Stats Card Component
 * Displays metrics with icon, value, and optional trend
 * Phase 4: Forms & Validation
 */

export interface StatsCardProps {
  icon: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive?: boolean;
    label?: string;
  };
  onClick?: () => void;
  loading?: boolean;
  className?: string;
}

/**
 * Reusable stats card for dashboard metrics
 */
export const StatsCard: React.FC<StatsCardProps> = ({
  icon: Icon,
  iconColor = 'text-blue-600',
  iconBgColor = 'bg-blue-100',
  title,
  value,
  subtitle,
  trend,
  onClick,
  loading = false,
  className = '',
}) => {
  const isClickable = !!onClick;

  return (
    <div
      className={`
        bg-white rounded-lg border border-gray-200 p-6
        ${isClickable ? 'cursor-pointer hover:shadow-md hover:border-blue-300 transition-all' : ''}
        ${loading ? 'animate-pulse' : ''}
        ${className}
      `}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      <div className="flex items-center justify-between">
        {/* Icon */}
        <div className={`p-3 rounded-lg ${iconBgColor}`}>
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>

        {/* Trend Indicator */}
        {trend && !loading && (
          <div className="flex items-center">
            {trend.isPositive ? (
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
            )}
            <span
              className={`text-sm font-medium ${
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {trend.value > 0 ? '+' : ''}{trend.value}%
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="mt-4">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        {loading ? (
          <div className="h-8 bg-gray-200 rounded mt-2 w-24" />
        ) : (
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        )}
        {subtitle && !loading && (
          <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        )}
        {trend?.label && !loading && (
          <p className="text-xs text-gray-500 mt-1">{trend.label}</p>
        )}
      </div>
    </div>
  );
};

/**
 * Compact stats card variant (smaller padding)
 */
export const CompactStatsCard: React.FC<StatsCardProps> = (props) => {
  const { icon: Icon, iconColor, iconBgColor, title, value, loading, className } = props;

  return (
    <div
      className={`
        bg-white rounded-lg border border-gray-200 p-4
        ${loading ? 'animate-pulse' : ''}
        ${className || ''}
      `}
    >
      <div className="flex items-center">
        <div className={`p-2 rounded-lg ${iconBgColor || 'bg-blue-100'}`}>
          <Icon className={`h-5 w-5 ${iconColor || 'text-blue-600'}`} />
        </div>
        <div className="ml-3 flex-1">
          <p className="text-xs font-medium text-gray-600">{title}</p>
          {loading ? (
            <div className="h-6 bg-gray-200 rounded mt-1 w-16" />
          ) : (
            <p className="text-lg font-bold text-gray-900">{value}</p>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Stats card with custom children
 */
export const CustomStatsCard: React.FC<{
  icon: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  title: string;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}> = ({
  icon: Icon,
  iconColor = 'text-blue-600',
  iconBgColor = 'bg-blue-100',
  title,
  children,
  onClick,
  className = '',
}) => {
  const isClickable = !!onClick;

  return (
    <div
      className={`
        bg-white rounded-lg border border-gray-200 p-6
        ${isClickable ? 'cursor-pointer hover:shadow-md hover:border-blue-300 transition-all' : ''}
        ${className}
      `}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      <div className="flex items-center mb-4">
        <div className={`p-3 rounded-lg ${iconBgColor}`}>
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
        <h3 className="ml-3 text-sm font-medium text-gray-600">{title}</h3>
      </div>
      {children}
    </div>
  );
};

/**
 * Stats grid container for organizing multiple stats cards
 */
export const StatsGrid: React.FC<{
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}> = ({ children, columns = 4, className = '' }) => {
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={`grid ${gridClasses[columns]} gap-4 ${className}`}>
      {children}
    </div>
  );
};
