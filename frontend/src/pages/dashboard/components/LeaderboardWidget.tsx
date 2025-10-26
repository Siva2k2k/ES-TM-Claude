import React from 'react';
import { Trophy, Medal, Award, TrendingUp } from 'lucide-react';
import { Sparkline } from './AdvancedCharts';
import * as formatting from '../../../utils/formatting';

// ============================================================================
// TYPES
// ============================================================================

export interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  value: number;
  subtitle?: string;
  avatar?: string;
  trend?: number[];
  badge?: 'gold' | 'silver' | 'bronze';
}

interface LeaderboardWidgetProps {
  title: string;
  entries: LeaderboardEntry[];
  valueLabel: string;
  valueFormat?: 'number' | 'currency' | 'hours' | 'percentage';
  maxEntries?: number;
  showSparklines?: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const formatValue = (value: number, format: string): string => {
  switch (format) {
    case 'currency':
      return formatting.formatCurrency(value, 'USD');
    case 'hours':
      return formatting.formatDuration(value, 'short');
    case 'percentage':
      return formatting.formatPercentage(value);
    case 'number':
    default:
      return value.toLocaleString();
  }
};

const getBadgeIcon = (badge: string) => {
  switch (badge) {
    case 'gold':
      return <Trophy className="w-5 h-5 text-yellow-500" />;
    case 'silver':
      return <Medal className="w-5 h-5 text-gray-400" />;
    case 'bronze':
      return <Award className="w-5 h-5 text-orange-600" />;
    default:
      return null;
  }
};

const getRankStyle = (rank: number) => {
  if (rank === 1) return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
  if (rank === 2) return 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600';
  if (rank === 3) return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
  return 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700';
};

// ============================================================================
// LEADERBOARD WIDGET COMPONENT
// ============================================================================

export const LeaderboardWidget: React.FC<LeaderboardWidgetProps> = ({
  title,
  entries,
  valueLabel,
  valueFormat = 'number',
  maxEntries = 10,
  showSparklines = false,
}) => {
  const displayEntries = entries.slice(0, maxEntries);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 border border-transparent dark:border-gray-700">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
      </div>

      {/* Leaderboard Entries */}
      <div className="p-4 space-y-2">
        {displayEntries.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No data available
          </div>
        ) : (
          displayEntries.map((entry) => (
            <div
              key={entry.id}
              className={`flex items-center justify-between p-3 rounded-lg border transition-all hover:shadow-md
                ${getRankStyle(entry.rank)}`}
            >
              {/* Rank & Badge */}
              <div className="flex items-center space-x-3 flex-1">
                <div className="flex items-center justify-center w-8 h-8">
                  {entry.badge ? (
                    getBadgeIcon(entry.badge)
                  ) : (
                    <span className="text-sm font-bold text-gray-600 dark:text-gray-400">
                      {entry.rank}
                    </span>
                  )}
                </div>

                {/* Avatar */}
                {entry.avatar ? (
                  <img
                    src={entry.avatar}
                    alt={entry.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold">
                    {entry.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </div>
                )}

                {/* Name & Subtitle */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {entry.name}
                  </p>
                  {entry.subtitle && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {entry.subtitle}
                    </p>
                  )}
                </div>
              </div>

              {/* Value & Sparkline */}
              <div className="flex items-center space-x-4">
                {showSparklines && entry.trend && entry.trend.length > 0 && (
                  <div className="hidden sm:block">
                    <Sparkline data={entry.trend} width={60} height={30} color="#3B82F6" />
                  </div>
                )}

                <div className="text-right">
                  <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {formatValue(entry.value, valueFormat)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{valueLabel}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {entries.length > maxEntries && (
        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 text-center">
          <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            View all {entries.length} entries
          </button>
        </div>
      )}
    </div>
  );
};

export default LeaderboardWidget;
