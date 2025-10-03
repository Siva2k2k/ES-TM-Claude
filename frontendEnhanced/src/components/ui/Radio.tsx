import * as React from 'react';
import { cn } from '../../utils/cn';

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  name: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  options: RadioOption[];
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

/**
 * RadioGroup Component
 * Accessible radio button group with label and error states
 */
const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  (
    {
      name,
      value,
      defaultValue,
      onChange,
      options,
      label,
      error,
      helperText,
      required,
      orientation = 'vertical',
      className,
    },
    ref
  ) => {
    const [selectedValue, setSelectedValue] = React.useState(value || defaultValue || '');

    React.useEffect(() => {
      if (value !== undefined) {
        setSelectedValue(value);
      }
    }, [value]);

    const handleChange = (optionValue: string) => {
      if (value === undefined) {
        setSelectedValue(optionValue);
      }
      onChange?.(optionValue);
    };

    const groupId = name?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div ref={ref} className={cn('w-full', className)}>
        {label && (
          <label className="block text-sm font-medium text-slate-700 mb-2">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div
          role="radiogroup"
          aria-labelledby={label ? `${groupId}-label` : undefined}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            error
              ? `${groupId}-error`
              : helperText
              ? `${groupId}-helper`
              : undefined
          }
          className={cn(
            'space-y-3',
            orientation === 'horizontal' && 'flex flex-wrap gap-4 space-y-0'
          )}
        >
          {options.map((option) => {
            const isSelected = selectedValue === option.value;
            const radioId = `${name}-${option.value}`;

            return (
              <div key={option.value} className="flex items-start">
                <div className="flex items-center h-5">
                  <div className="relative">
                    <input
                      id={radioId}
                      name={name}
                      type="radio"
                      value={option.value}
                      checked={isSelected}
                      disabled={option.disabled}
                      onChange={() => handleChange(option.value)}
                      className="sr-only"
                    />
                    <div
                      className={cn(
                        'h-4 w-4 rounded-full border-2 border-slate-300 bg-white',
                        'transition-all duration-200',
                        'flex items-center justify-center',
                        isSelected && 'border-blue-600 bg-white',
                        option.disabled && 'opacity-50 cursor-not-allowed',
                        !option.disabled && 'cursor-pointer',
                        error && 'border-red-500'
                      )}
                      onClick={() => !option.disabled && handleChange(option.value)}
                    >
                      {isSelected && (
                        <div className="h-2 w-2 rounded-full bg-blue-600 animate-in zoom-in duration-200" />
                      )}
                    </div>
                  </div>
                </div>
                <label
                  htmlFor={radioId}
                  className={cn(
                    'ml-2 text-sm cursor-pointer select-none',
                    option.disabled && 'opacity-50 cursor-not-allowed'
                  )}
                  onClick={() => !option.disabled && handleChange(option.value)}
                >
                  <div className="font-medium text-slate-700">{option.label}</div>
                  {option.description && (
                    <div className="text-slate-500 text-xs mt-0.5">
                      {option.description}
                    </div>
                  )}
                </label>
              </div>
            );
          })}
        </div>
        {error && (
          <p id={`${groupId}-error`} className="mt-2 text-sm text-red-600">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${groupId}-helper`} className="mt-2 text-sm text-slate-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
RadioGroup.displayName = 'RadioGroup';

export { RadioGroup };
