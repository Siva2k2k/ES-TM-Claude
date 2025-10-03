import * as React from 'react';
import { cn } from '../../utils/cn';

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  label?: string;
  description?: string;
  error?: string;
  onChange?: (checked: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Switch Component
 * Toggle switch with label and description
 */
const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  (
    {
      className,
      label,
      description,
      error,
      onChange,
      id,
      checked,
      disabled,
      size = 'md',
      ...props
    },
    ref
  ) => {
    const switchId = id || label?.toLowerCase().replace(/\s+/g, '-');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e.target.checked);
    };

    const sizes = {
      sm: {
        track: 'h-4 w-7',
        thumb: 'h-3 w-3',
        translate: 'translate-x-3',
      },
      md: {
        track: 'h-5 w-9',
        thumb: 'h-4 w-4',
        translate: 'translate-x-4',
      },
      lg: {
        track: 'h-6 w-11',
        thumb: 'h-5 w-5',
        translate: 'translate-x-5',
      },
    };

    return (
      <div className={cn('flex items-start gap-3', className)}>
        <div className="flex items-center h-5">
          <div className="relative">
            <input
              id={switchId}
              ref={ref}
              type="checkbox"
              role="switch"
              checked={checked}
              disabled={disabled}
              onChange={handleChange}
              className="sr-only peer"
              aria-describedby={error ? `${switchId}-error` : undefined}
              {...props}
            />
            <div
              className={cn(
                sizes[size].track,
                'rounded-full transition-colors duration-200 ease-in-out cursor-pointer',
                'peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:ring-offset-2',
                'peer-checked:bg-blue-600 peer-checked:border-blue-600',
                'peer-disabled:opacity-50 peer-disabled:cursor-not-allowed',
                checked ? 'bg-blue-600' : 'bg-slate-200',
                error && 'ring-2 ring-red-500'
              )}
              onClick={() => {
                if (!disabled) {
                  const input = document.getElementById(switchId) as HTMLInputElement;
                  input?.click();
                }
              }}
            >
              <div
                className={cn(
                  sizes[size].thumb,
                  'bg-white rounded-full shadow-lg transform transition-transform duration-200 ease-in-out',
                  'ml-0.5 mt-0.5',
                  checked && sizes[size].translate
                )}
              />
            </div>
          </div>
        </div>
        {(label || description) && (
          <div className="flex-1">
            {label && (
              <label
                htmlFor={switchId}
                className={cn(
                  'text-sm font-medium text-slate-700 cursor-pointer select-none block',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                {label}
                {props.required && <span className="text-red-500 ml-1">*</span>}
              </label>
            )}
            {description && (
              <p className="text-sm text-slate-500 mt-0.5">{description}</p>
            )}
            {error && (
              <p id={`${switchId}-error`} className="text-sm text-red-600 mt-1">
                {error}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);
Switch.displayName = 'Switch';

export { Switch };
