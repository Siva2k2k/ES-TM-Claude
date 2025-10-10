import React from 'react';
import { cn } from '../../utils/cn';
import { Info } from 'lucide-react';

/**
 * Form Label Component
 * Accessible form labels with optional required indicator and tooltip
 */

interface FormLabelProps {
  htmlFor: string;
  children: React.ReactNode;
  required?: boolean;
  optional?: boolean;
  tooltip?: string;
  className?: string;
}

export function FormLabel({
  htmlFor,
  children,
  required = false,
  optional = false,
  tooltip,
  className = ''
}: FormLabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        'block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1',
        className
      )}
    >
      <span className="flex items-center gap-2">
        {children}
        {required && <span className="text-red-500">*</span>}
        {optional && <span className="text-slate-400 text-xs font-normal">(optional)</span>}
        {tooltip && (
          <div className="group relative inline-block">
            <Info className="w-4 h-4 text-slate-400 cursor-help" />
            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-48 p-2 bg-slate-900 text-white text-xs rounded shadow-lg z-10">
              {tooltip}
              <div className="absolute left-4 top-full w-2 h-2 bg-slate-900 transform rotate-45 -mt-1"></div>
            </div>
          </div>
        )}
      </span>
    </label>
  );
}

/**
 * Field Set Component
 * Groups related form fields with a legend
 */
interface FieldSetProps {
  legend: string;
  children: React.ReactNode;
  className?: string;
}

export function FieldSet({ legend, children, className = '' }: FieldSetProps) {
  return (
    <fieldset className={cn('border border-slate-200 dark:border-gray-700 rounded-lg p-4', className)}>
      <legend className="text-sm font-medium text-slate-900 dark:text-gray-100 px-2">
        {legend}
      </legend>
      <div className="mt-4 space-y-4">
        {children}
      </div>
    </fieldset>
  );
}
