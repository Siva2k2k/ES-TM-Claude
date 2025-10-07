/**
 * Billing Summary Cards Component
 * Display summary metrics for billing
 * Cognitive Complexity: 1
 */
import React from 'react';
import { Building2, Clock, DollarSign, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '../../../../shared/components/ui';
import type { BillingSummary } from '../../types/billing.types';

interface BillingSummaryCardsProps {
  summary: BillingSummary;
}

export const BillingSummaryCards: React.FC<BillingSummaryCardsProps> = ({ summary }) => {
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

  const summaryCards = [
    {
      icon: Building2,
      label: 'Total Projects',
      value: summary.total_projects.toString(),
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      icon: Clock,
      label: 'Total Hours',
      value: formatHours(summary.total_hours),
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      icon: TrendingUp,
      label: 'Billable Hours',
      value: formatHours(summary.total_billable_hours),
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    },
    {
      icon: DollarSign,
      label: 'Total Amount',
      value: formatCurrency(summary.total_amount),
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {summaryCards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className={`p-3 rounded-lg ${card.bgColor}`}>
                  <Icon className={`h-6 w-6 ${card.color}`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {card.label}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {card.value}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
