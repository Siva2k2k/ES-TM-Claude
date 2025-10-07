/**
 * Billing Dashboard Component
 * Overview dashboard for billing management
 * Cognitive Complexity: 5
 * File Size: ~140 LOC
 */
import React from 'react';
import {
  DollarSign,
  TrendingUp,
  Users,
  FileText,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Badge } from '../../../../shared/components/ui';

interface BillingDashboardProps {
  // Props will be added as we integrate with real data
}

export const BillingDashboard: React.FC<BillingDashboardProps> = () => {
  // Mock data - will be replaced with actual data from hooks
  const metrics = {
    thisMonth: {
      revenue: 125000,
      hours: 850,
      utilization: 78,
      projects: 12,
    },
    lastMonth: {
      revenue: 98000,
      hours: 720,
      utilization: 72,
      projects: 10,
    },
    pending: {
      invoices: 5,
      amount: 45000,
    },
  };

  const revenueChange = ((metrics.thisMonth.revenue - metrics.lastMonth.revenue) / metrics.lastMonth.revenue) * 100;
  const hoursChange = ((metrics.thisMonth.hours - metrics.lastMonth.hours) / metrics.lastMonth.hours) * 100;

  const metricCards = [
    {
      title: 'Revenue This Month',
      value: `$${(metrics.thisMonth.revenue / 1000).toFixed(0)}K`,
      change: revenueChange,
      icon: DollarSign,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      title: 'Billable Hours',
      value: `${metrics.thisMonth.hours}h`,
      change: hoursChange,
      icon: Clock,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      title: 'Utilization Rate',
      value: `${metrics.thisMonth.utilization}%`,
      change: metrics.thisMonth.utilization - metrics.lastMonth.utilization,
      icon: TrendingUp,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    },
    {
      title: 'Active Projects',
      value: metrics.thisMonth.projects.toString(),
      change: metrics.thisMonth.projects - metrics.lastMonth.projects,
      icon: Users,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Billing Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Overview of billing metrics and revenue
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((metric, index) => {
          const Icon = metric.icon;
          const isPositive = metric.change >= 0;

          return (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {metric.title}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">
                      {metric.value}
                    </p>
                    <div className="flex items-center mt-2">
                      <span
                        className={`text-sm font-medium ${
                          isPositive
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {isPositive ? '+' : ''}
                        {metric.change.toFixed(1)}%
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                        vs last month
                      </span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-lg ${metric.bgColor}`}>
                    <Icon className={`h-6 w-6 ${metric.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pending Invoices Alert */}
      {metrics.pending.invoices > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {metrics.pending.invoices} pending invoice{metrics.pending.invoices > 1 ? 's' : ''}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total amount: ${(metrics.pending.amount / 1000).toFixed(0)}K
                </p>
              </div>
              <Badge variant="warning">Action Required</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6">
            <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400 mb-3" />
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
              View All Invoices
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Manage and track invoices
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6">
            <DollarSign className="h-8 w-8 text-green-600 dark:text-green-400 mb-3" />
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
              Billing Rates
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Manage team billing rates
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6">
            <TrendingUp className="h-8 w-8 text-purple-600 dark:text-purple-400 mb-3" />
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
              Revenue Report
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Generate detailed reports
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
