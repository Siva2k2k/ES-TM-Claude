import * as React from 'react';
import { cn } from '../../utils/cn';
import { Eye, EyeOff, X } from 'lucide-react';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
  helperText?: string;
  showCharCount?: boolean; // Show character counter for maxLength
  allowClear?: boolean; // Show clear button (x icon)
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, label, helperText, id, showCharCount, allowClear, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const [showPassword, setShowPassword] = React.useState(false);
    const inputRef = React.useRef<HTMLInputElement | null>(null);
    
    // Check if component is controlled (has value prop) or uncontrolled
    const isControlled = props.value !== undefined;
    const [internalValue, setInternalValue] = React.useState<string>(String(props.defaultValue || ''));
    
    // Get current value (controlled or uncontrolled)
    const currentValue = isControlled ? String(props.value || '') : internalValue;

    // Handle password visibility toggle
    const togglePasswordVisibility = () => {
      setShowPassword(!showPassword);
    };

    // Handle clear button
    const handleClear = () => {
      if (isControlled) {
        // For controlled components, call onChange with empty value
        if (props.onChange) {
          const syntheticEvent = {
            target: { value: '' }
          } as React.ChangeEvent<HTMLInputElement>;
          props.onChange(syntheticEvent);
        }
      } else {
        // For uncontrolled components, update internal state
        setInternalValue('');
      }
      inputRef.current?.focus();
    };

    // Handle input change
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!isControlled) {
        setInternalValue(e.target.value);
      }
      if (props.onChange) {
        props.onChange(e);
      }
    };

    // Determine actual input type (handle password toggle)
    const inputType = type === 'password' && showPassword ? 'text' : type;

    // Check if password toggle should be shown
    const showPasswordToggle = type === 'password';

    // Check if clear button should be shown
    const showClearButton = allowClear && currentValue && !props.disabled && !props.readOnly;

    // Calculate character count
    const charCount = currentValue.length;
    const maxLength = props.maxLength;
    const showCounter = showCharCount && maxLength;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1"
          >
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          <input
            id={inputId}
            type={inputType}
            className={cn(
              'flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm',
              'dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100',
              'placeholder:text-slate-400 dark:placeholder:text-gray-500',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50 dark:disabled:bg-gray-800',
              'transition-all duration-200',
              error && 'border-red-500 focus:ring-red-500',
              (showPasswordToggle || showClearButton) && 'pr-10',
              className
            )}
            ref={(node) => {
              inputRef.current = node;
              if (typeof ref === 'function') {
                ref(node);
              } else if (ref) {
                ref.current = node;
              }
            }}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={(() => {
              if (error) return `${inputId}-error`;
              if (helperText) return `${inputId}-helper`;
              return undefined;
            })()}
            {...props}
            // Override props with correct controlled/uncontrolled behavior
            value={currentValue}
            onChange={handleChange}
          />

          {/* Password Toggle Button */}
          {showPasswordToggle && (
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}

          {/* Clear Button */}
          {showClearButton && !showPasswordToggle && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              aria-label="Clear input"
              tabIndex={-1}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Character Counter */}
        {showCounter && (
          <div className="mt-1 text-xs text-right">
            <span className={cn(
              'text-slate-500 dark:text-gray-400',
              maxLength && charCount > maxLength && 'text-red-500'
            )}>
              {charCount}/{maxLength}
            </span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <p id={`${inputId}-error`} className="mt-1 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        {/* Helper Text */}
        {helperText && !error && (
          <p id={`${inputId}-helper`} className="mt-1 text-sm text-slate-500 dark:text-gray-400">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };
