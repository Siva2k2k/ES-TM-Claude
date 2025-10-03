import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  helperText?: string;
  indeterminate?: boolean;
}

/**
 * Checkbox Component
 * Accessible checkbox with label and error states
 */
const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, error, helperText, id, indeterminate, ...props }, ref) => {
    const checkboxId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useImperativeHandle(ref, () => inputRef.current!);

    React.useEffect(() => {
      if (inputRef.current) {
        inputRef.current.indeterminate = indeterminate || false;
      }
    }, [indeterminate]);

    return (
      <div className="flex flex-col">
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <div className="relative">
              <input
                id={checkboxId}
                ref={inputRef}
                type="checkbox"
                className={cn(
                  'peer h-4 w-4 rounded border-slate-300 text-blue-600',
                  'focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  'transition-colors cursor-pointer',
                  error && 'border-red-500',
                  'sr-only'
                )}
                aria-invalid={error ? 'true' : 'false'}
                aria-describedby={
                  error
                    ? `${checkboxId}-error`
                    : helperText
                    ? `${checkboxId}-helper`
                    : undefined
                }
                {...props}
              />
              <div
                className={cn(
                  'h-4 w-4 rounded border-2 border-slate-300 bg-white',
                  'peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:ring-offset-2',
                  'peer-checked:bg-blue-600 peer-checked:border-blue-600',
                  'peer-indeterminate:bg-blue-600 peer-indeterminate:border-blue-600',
                  'peer-disabled:opacity-50 peer-disabled:cursor-not-allowed',
                  'transition-all duration-200',
                  'flex items-center justify-center',
                  error && 'border-red-500',
                  className
                )}
              >
                <Check
                  className={cn(
                    'h-3 w-3 text-white opacity-0',
                    'peer-checked:opacity-100',
                    'transition-opacity'
                  )}
                  strokeWidth={3}
                />
                {indeterminate && (
                  <div className="h-0.5 w-2.5 bg-white rounded" />
                )}
              </div>
            </div>
          </div>
          {label && (
            <label
              htmlFor={checkboxId}
              className="ml-2 text-sm font-medium text-slate-700 cursor-pointer select-none"
            >
              {label}
              {props.required && <span className="text-red-500 ml-1">*</span>}
            </label>
          )}
        </div>
        {error && (
          <p id={`${checkboxId}-error`} className="mt-1 text-sm text-red-600 ml-6">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${checkboxId}-helper`} className="mt-1 text-sm text-slate-500 ml-6">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
Checkbox.displayName = 'Checkbox';

export { Checkbox };
