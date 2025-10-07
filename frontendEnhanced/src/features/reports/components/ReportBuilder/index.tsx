/**
 * ReportBuilder Component
 * Interface for building and generating reports
 */

import React, { useState } from 'react';
import { FileText, Download, Loader2 } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import type { ReportCategory, ReportFormat, ReportGenerationRequest } from '../../types/reports.types';

export interface ReportBuilderProps {
  onGenerate: (request: ReportGenerationRequest) => Promise<{ error?: string }>;
  isGenerating?: boolean;
  className?: string;
}

/**
 * Report builder component
 * Complexity: 6
 * LOC: ~150
 */
export const ReportBuilder: React.FC<ReportBuilderProps> = ({
  onGenerate,
  isGenerating = false,
  className = '',
}) => {
  const [category, setCategory] = useState<ReportCategory>('timesheet');
  const [format, setFormat] = useState<ReportFormat>('pdf');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setError('');

    if (!startDate || !endDate) {
      setError('Please select date range');
      return;
    }

    const request: ReportGenerationRequest = {
      category,
      fields: ['*'], // All fields
      filters: {
        start_date: startDate,
        end_date: endDate,
      },
      format,
    };

    const result = await onGenerate(request);

    if (result.error) {
      setError(result.error);
    }
  };

  return (
    <div className={`bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-border p-6 ${className}`}>
      <h3 className="text-lg font-medium text-text-primary dark:text-dark-text-primary mb-4 flex items-center">
        <FileText className="h-5 w-5 mr-2 text-primary-600 dark:text-primary-400" />
        Generate Report
      </h3>

      {error && (
        <div className="mb-4 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-lg p-3">
          <p className="text-error-700 dark:text-error-300 text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-primary dark:text-dark-text-primary mb-2">
            Report Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ReportCategory)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md bg-white dark:bg-dark-700 text-text-primary dark:text-dark-text-primary"
          >
            <option value="timesheet">Timesheet Report</option>
            <option value="project">Project Report</option>
            <option value="user">User Report</option>
            <option value="billing">Billing Report</option>
            <option value="analytics">Analytics Report</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-primary dark:text-dark-text-primary mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md bg-white dark:bg-dark-700 text-text-primary dark:text-dark-text-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary dark:text-dark-text-primary mb-2">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md bg-white dark:bg-dark-700 text-text-primary dark:text-dark-text-primary"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary dark:text-dark-text-primary mb-2">
            Format
          </label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as ReportFormat)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md bg-white dark:bg-dark-700 text-text-primary dark:text-dark-text-primary"
          >
            <option value="pdf">PDF</option>
            <option value="excel">Excel</option>
            <option value="csv">CSV</option>
          </select>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Generate Report
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
