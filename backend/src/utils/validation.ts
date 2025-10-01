import mongoose from 'mongoose';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validation utilities for backend services
 */
export class ValidationUtils {
  /**
   * Validate email format
   */
  static validateEmail(email: string | undefined | null): boolean {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  /**
   * Validate string length
   */
  static validateStringLength(
    value: string | undefined | null,
    minLength: number,
    maxLength: number,
    fieldName: string
  ): string | null {
    if (!value || typeof value !== 'string') {
      return `${fieldName} is required`;
    }

    const trimmed = value.trim();
    if (trimmed.length < minLength) {
      return `${fieldName} must be at least ${minLength} characters long`;
    }
    if (trimmed.length > maxLength) {
      return `${fieldName} cannot exceed ${maxLength} characters`;
    }
    return null;
  }

  /**
   * Validate required field
   */
  static validateRequired<T>(
    value: T | undefined | null,
    fieldName: string
  ): string | null {
    if (value === undefined || value === null || value === '') {
      return `${fieldName} is required`;
    }
    return null;
  }

  /**
   * Validate number range
   */
  static validateNumberRange(
    value: number | undefined | null,
    min: number,
    max: number,
    fieldName: string,
    required: boolean = false
  ): string | null {
    if (value === undefined || value === null) {
      return required ? `${fieldName} is required` : null;
    }

    if (typeof value !== 'number' || isNaN(value)) {
      return `${fieldName} must be a valid number`;
    }

    if (value < min) {
      return `${fieldName} must be at least ${min}`;
    }
    if (value > max) {
      return `${fieldName} cannot exceed ${max}`;
    }
    return null;
  }

  /**
   * Validate date range
   */
  static validateDateRange(
    startDate: Date | string | undefined | null,
    endDate: Date | string | undefined | null,
    fieldPrefix: string = 'Date'
  ): string | null {
    if (!startDate || !endDate) {
      return null; // Optional validation
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime())) {
      return `${fieldPrefix} start date is invalid`;
    }
    if (isNaN(end.getTime())) {
      return `${fieldPrefix} end date is invalid`;
    }
    if (start > end) {
      return `${fieldPrefix} start date must be before or equal to end date`;
    }
    return null;
  }

  /**
   * Validate date is valid
   */
  static validateDate(
    date: Date | string | undefined | null,
    fieldName: string,
    required: boolean = false
  ): string | null {
    if (!date) {
      return required ? `${fieldName} is required` : null;
    }

    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return `${fieldName} is not a valid date`;
    }
    return null;
  }

  /**
   * Validate enum value
   */
  static validateEnum<T>(
    value: T | undefined | null,
    allowedValues: T[],
    fieldName: string,
    required: boolean = false
  ): string | null {
    if (value === undefined || value === null) {
      return required ? `${fieldName} is required` : null;
    }

    if (!allowedValues.includes(value)) {
      return `${fieldName} must be one of: ${allowedValues.join(', ')}`;
    }
    return null;
  }

  /**
   * Validate MongoDB ObjectId
   */
  static validateObjectId(
    id: string | undefined | null,
    fieldName: string,
    required: boolean = false
  ): string | null {
    if (!id) {
      return required ? `${fieldName} is required` : null;
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return `${fieldName} is not a valid ID`;
    }
    return null;
  }

  /**
   * Validate array
   */
  static validateArray<T>(
    array: T[] | undefined | null,
    fieldName: string,
    minLength: number = 0,
    maxLength: number = Infinity,
    required: boolean = false
  ): string | null {
    if (!array) {
      return required ? `${fieldName} is required` : null;
    }

    if (!Array.isArray(array)) {
      return `${fieldName} must be an array`;
    }

    if (array.length < minLength) {
      return `${fieldName} must contain at least ${minLength} item(s)`;
    }
    if (array.length > maxLength) {
      return `${fieldName} cannot contain more than ${maxLength} item(s)`;
    }
    return null;
  }

  /**
   * Validate hours per day (0-24)
   */
  static validateDailyHours(hours: number | undefined | null): string | null {
    return this.validateNumberRange(hours, 0, 24, 'Daily hours', true);
  }

  /**
   * Validate weekly hours (0-168)
   */
  static validateWeeklyHours(hours: number | undefined | null): string | null {
    return this.validateNumberRange(hours, 0, 168, 'Weekly hours', true);
  }

  /**
   * Combine multiple validation results
   */
  static combineValidations(...errors: (string | null)[]): ValidationResult {
    const validErrors = errors.filter((e): e is string => e !== null);
    return {
      isValid: validErrors.length === 0,
      errors: validErrors
    };
  }

  /**
   * Sanitize string input
   */
  static sanitizeString(value: string | undefined | null): string | undefined {
    if (!value || typeof value !== 'string') return undefined;
    return value.trim();
  }

  /**
   * Sanitize email
   */
  static sanitizeEmail(email: string | undefined | null): string | undefined {
    if (!email || typeof email !== 'string') return undefined;
    return email.toLowerCase().trim();
  }

  /**
   * Validate password strength
   */
  static validatePasswordStrength(password: string | undefined | null): ValidationResult {
    const errors: string[] = [];

    if (!password) {
      errors.push('Password is required');
      return { isValid: false, errors };
    }

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate timesheet week dates
   */
  static validateTimesheetWeek(
    weekStartDate: Date | string | undefined | null,
    weekEndDate: Date | string | undefined | null
  ): ValidationResult {
    const errors: string[] = [];

    if (!weekStartDate) {
      errors.push('Week start date is required');
    }
    if (!weekEndDate) {
      errors.push('Week end date is required');
    }

    if (weekStartDate && weekEndDate) {
      const start = new Date(weekStartDate);
      const end = new Date(weekEndDate);

      if (isNaN(start.getTime())) {
        errors.push('Week start date is invalid');
      }
      if (isNaN(end.getTime())) {
        errors.push('Week end date is invalid');
      }

      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        // Check if it's exactly 7 days apart
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays !== 6) {
          errors.push('Timesheet week must be exactly 7 days (start to end should be 6 days apart)');
        }

        if (start > end) {
          errors.push('Week start date must be before week end date');
        }

        // Check if start date is Monday
        if (start.getDay() !== 1) {
          errors.push('Week must start on Monday');
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate business object exists and is not null
   */
  static validateExists<T>(
    object: T | null | undefined,
    entityName: string
  ): string | null {
    if (!object) {
      return `${entityName} not found`;
    }
    return null;
  }

  /**
   * Validate boolean field
   */
  static validateBoolean(
    value: boolean | undefined | null,
    fieldName: string,
    required: boolean = false
  ): string | null {
    if (value === undefined || value === null) {
      return required ? `${fieldName} is required` : null;
    }

    if (typeof value !== 'boolean') {
      return `${fieldName} must be a boolean value`;
    }
    return null;
  }
}

export default ValidationUtils;
