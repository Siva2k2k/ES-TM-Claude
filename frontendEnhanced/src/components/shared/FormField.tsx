import React from 'react';
import { UseFormReturn, FieldError } from 'react-hook-form';
import { AlertCircle, CheckCircle } from 'lucide-react';

/**
 * Form Field Wrapper Component
 * Integrates with React Hook Form for consistent field rendering
 * Phase 4: Forms & Validation
 */

export interface FormFieldProps {
  name: string;
  label: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'date';
  placeholder?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  error?: FieldError | string;
  success?: boolean;
  successMessage?: string;
  className?: string;
  inputClassName?: string;
  form: UseFormReturn<any>;
  showValidation?: boolean;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  maxLength?: number;
  autoComplete?: string;
}

/**
 * Reusable form field component with label, error display, and validation feedback
 */
export const FormField: React.FC<FormFieldProps> = ({
  name,
  label,
  type = 'text',
  placeholder,
  description,
  required = false,
  disabled = false,
  icon,
  error,
  success = false,
  successMessage,
  className = '',
  inputClassName = '',
  form,
  showValidation = true,
  min,
  max,
  step,
  maxLength,
  autoComplete,
}) => {
  const { register, formState } = form;
  const fieldError = error || formState.errors[name];
  const errorMessage = typeof fieldError === 'string'
    ? fieldError
    : fieldError?.message?.toString();

  const hasError = !!errorMessage;
  const showSuccess = showValidation && success && !hasError;

  return (
    <div className={className}>
      {/* Label */}
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* Input Container */}
      <div className="relative">
        {/* Icon */}
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {icon}
          </div>
        )}

        {/* Input */}
        <input
          id={name}
          type={type}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          min={min}
          max={max}
          step={step}
          maxLength={maxLength}
          {...register(name)}
          className={`
            block w-full py-2 px-3 border rounded-lg
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            transition-colors
            ${icon ? 'pl-10' : ''}
            ${hasError ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'}
            ${showSuccess ? 'border-green-300 focus:ring-green-500 focus:border-green-500' : ''}
            ${disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white'}
            ${inputClassName}
          `}
        />

        {/* Validation Icons */}
        {showValidation && (hasError || showSuccess) && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            {hasError && <AlertCircle className="h-5 w-5 text-red-500" />}
            {showSuccess && <CheckCircle className="h-5 w-5 text-green-500" />}
          </div>
        )}
      </div>

      {/* Description */}
      {description && !hasError && !showSuccess && (
        <p className="mt-1 text-xs text-gray-500">{description}</p>
      )}

      {/* Error Message */}
      {hasError && (
        <p className="mt-1 text-sm text-red-600 flex items-center">
          <AlertCircle className="h-4 w-4 mr-1" />
          {errorMessage}
        </p>
      )}

      {/* Success Message */}
      {showSuccess && successMessage && (
        <p className="mt-1 text-sm text-green-600 flex items-center">
          <CheckCircle className="h-4 w-4 mr-1" />
          {successMessage}
        </p>
      )}
    </div>
  );
};

/**
 * Textarea variant of FormField
 */
export const FormTextarea: React.FC<Omit<FormFieldProps, 'type'> & {
  rows?: number;
}> = ({
  name,
  label,
  placeholder,
  description,
  required = false,
  disabled = false,
  error,
  success = false,
  successMessage,
  className = '',
  inputClassName = '',
  form,
  showValidation = true,
  rows = 3,
  maxLength,
}) => {
  const { register, formState } = form;
  const fieldError = error || formState.errors[name];
  const errorMessage = typeof fieldError === 'string'
    ? fieldError
    : fieldError?.message?.toString();

  const hasError = !!errorMessage;
  const showSuccess = showValidation && success && !hasError;

  return (
    <div className={className}>
      {/* Label */}
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* Textarea */}
      <textarea
        id={name}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        maxLength={maxLength}
        {...register(name)}
        className={`
          block w-full py-2 px-3 border rounded-lg
          focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          transition-colors resize-y
          ${hasError ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'}
          ${showSuccess ? 'border-green-300 focus:ring-green-500 focus:border-green-500' : ''}
          ${disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white'}
          ${inputClassName}
        `}
      />

      {/* Description */}
      {description && !hasError && !showSuccess && (
        <p className="mt-1 text-xs text-gray-500">{description}</p>
      )}

      {/* Error Message */}
      {hasError && (
        <p className="mt-1 text-sm text-red-600 flex items-center">
          <AlertCircle className="h-4 w-4 mr-1" />
          {errorMessage}
        </p>
      )}

      {/* Success Message */}
      {showSuccess && successMessage && (
        <p className="mt-1 text-sm text-green-600 flex items-center">
          <CheckCircle className="h-4 w-4 mr-1" />
          {successMessage}
        </p>
      )}
    </div>
  );
};

/**
 * Select/Dropdown variant of FormField
 */
export const FormSelect: React.FC<Omit<FormFieldProps, 'type'> & {
  options: Array<{ value: string; label: string }>;
}> = ({
  name,
  label,
  placeholder,
  description,
  required = false,
  disabled = false,
  icon,
  error,
  success = false,
  successMessage,
  className = '',
  inputClassName = '',
  form,
  showValidation = true,
  options,
}) => {
  const { register, formState } = form;
  const fieldError = error || formState.errors[name];
  const errorMessage = typeof fieldError === 'string'
    ? fieldError
    : fieldError?.message?.toString();

  const hasError = !!errorMessage;
  const showSuccess = showValidation && success && !hasError;

  return (
    <div className={className}>
      {/* Label */}
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* Select Container */}
      <div className="relative">
        {/* Icon */}
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {icon}
          </div>
        )}

        {/* Select */}
        <select
          id={name}
          disabled={disabled}
          {...register(name)}
          className={`
            block w-full py-2 px-3 border rounded-lg
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            transition-colors
            ${icon ? 'pl-10' : ''}
            ${hasError ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'}
            ${showSuccess ? 'border-green-300 focus:ring-green-500 focus:border-green-500' : ''}
            ${disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white'}
            ${inputClassName}
          `}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Validation Icons */}
        {showValidation && (hasError || showSuccess) && (
          <div className="absolute inset-y-0 right-8 flex items-center pointer-events-none">
            {hasError && <AlertCircle className="h-5 w-5 text-red-500" />}
            {showSuccess && <CheckCircle className="h-5 w-5 text-green-500" />}
          </div>
        )}
      </div>

      {/* Description */}
      {description && !hasError && !showSuccess && (
        <p className="mt-1 text-xs text-gray-500">{description}</p>
      )}

      {/* Error Message */}
      {hasError && (
        <p className="mt-1 text-sm text-red-600 flex items-center">
          <AlertCircle className="h-4 w-4 mr-1" />
          {errorMessage}
        </p>
      )}

      {/* Success Message */}
      {showSuccess && successMessage && (
        <p className="mt-1 text-sm text-green-600 flex items-center">
          <CheckCircle className="h-4 w-4 mr-1" />
          {successMessage}
        </p>
      )}
    </div>
  );
};
