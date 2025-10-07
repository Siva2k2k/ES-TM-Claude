/**
 * Project Billing Card Component
 * Expandable card showing project billing details
 * Cognitive Complexity: 4
 */
import React, { useState } from 'react';
import { ChevronDown, ChevronRight, DollarSign, Clock } from 'lucide-react';
import { Card, CardContent, Badge } from '../../../../shared/components/ui';
import { cn } from '../../../../shared/utils/cn';
import type { ProjectBillingData } from '../../types/billing.types';

interface ProjectBillingCardProps {
  project: ProjectBillingData;
}

export const ProjectBillingCard: React.FC<ProjectBillingCardProps> = ({ project }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatHours = (hours: number) => {
    return `${hours.toFixed(1)}h`;
  };

  const budgetUtilization = project.budget
    ? ((project.total_amount / project.budget) * 100).toFixed(0)
    : null;

  return (
    <Card>
      {/* Project Header */}
      <div
        className="p-4 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {isExpanded ? (
              <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
            ) : (
              <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
            )}
            <div className="min-w-0">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 truncate">
                {project.project_name}
              </h3>
              {project.client_name && (
                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                  {project.client_name}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm ml-4">
            <div className="text-center">
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {formatHours(project.total_hours)}
              </p>
              <p className="text-gray-500 dark:text-gray-400">Total</p>
            </div>
            <div className="text-center">
              <p className="font-medium text-green-600 dark:text-green-400">
                {formatHours(project.billable_hours)}
              </p>
              <p className="text-gray-500 dark:text-gray-400">Billable</p>
            </div>
            <div className="text-center">
              <p className="font-medium text-gray-600 dark:text-gray-400">
                {formatHours(project.non_billable_hours)}
              </p>
              <p className="text-gray-500 dark:text-gray-400">Non-bill</p>
            </div>
            <div className="text-center min-w-[100px]">
              <p className="font-medium text-blue-600 dark:text-blue-400">
                {formatCurrency(project.total_amount)}
              </p>
              <p className="text-gray-500 dark:text-gray-400">Amount</p>
            </div>
          </div>
        </div>

        {/* Budget Progress */}
        {project.budget && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-600 dark:text-gray-400">Budget Utilization</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {budgetUtilization}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={cn(
                  'h-2 rounded-full transition-all',
                  parseInt(budgetUtilization!) > 90
                    ? 'bg-red-500'
                    : parseInt(budgetUtilization!) > 70
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                )}
                style={{ width: `${Math.min(parseInt(budgetUtilization!), 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Expanded Resource Details */}
      {isExpanded && (
        <CardContent className="p-4">
          <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">
            Resources ({project.resources.length})
          </h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Resource
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Total Hours
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Billable
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Rate
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {project.resources.map((resource) => (
                  <tr key={resource.user_id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {resource.user_name}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge variant="secondary" size="sm">
                        {resource.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900 dark:text-gray-100">
                      {formatHours(resource.total_hours)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-green-600 dark:text-green-400 font-medium">
                      {formatHours(resource.billable_hours)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-600 dark:text-gray-400">
                      ${resource.hourly_rate}/h
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium text-blue-600 dark:text-blue-400">
                      {formatCurrency(resource.total_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      )}
    </Card>
  );
};
