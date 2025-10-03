/**
 * Centralized validation utilities
 * Reduces code duplication across form components
 * All validation functions return true if valid, error message string if invalid
 */

/**
 * Email validation using RFC 5322 compliant regex
 */
export function validateEmail(email: string): true | string {
  if (!email || !email.trim()) {
    return 'Email is required';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return 'Please enter a valid email address';
  }

  return true;
}

/**
 * Name validation (2-100 characters)
 */
export function validateName(name: string, fieldName = 'Name'): true | string {
  if (!name || !name.trim()) {
    return `${fieldName} is required`;
  }

  const trimmed = name.trim();

  if (trimmed.length < 2) {
    return `${fieldName} must be at least 2 characters long`;
  }

  if (trimmed.length > 100) {
    return `${fieldName} must be less than 100 characters`;
  }

  return true;
}

/**
 * Phone number validation (basic)
 */
export function validatePhone(phone: string): true | string {
  if (!phone || !phone.trim()) {
    return true; // Phone is optional in most cases
  }

  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length < 10) {
    return 'Phone number must be at least 10 digits';
  }

  if (cleaned.length > 15) {
    return 'Phone number must be less than 15 digits';
  }

  return true;
}

/**
 * Password strength validation
 */
export function validatePassword(password: string): true | string {
  if (!password) {
    return 'Password is required';
  }

  if (password.length < 8) {
    return 'Password must be at least 8 characters long';
  }

  if (password.length > 128) {
    return 'Password must be less than 128 characters';
  }

  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter';
  }

  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter';
  }

  // Check for at least one number
  if (!/\d/.test(password)) {
    return 'Password must contain at least one number';
  }

  // Check for at least one special character
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return 'Password must contain at least one special character';
  }

  return true;
}

/**
 * Password confirmation validation
 */
export function validatePasswordConfirmation(
  password: string,
  confirmation: string
): true | string {
  if (!confirmation) {
    return 'Please confirm your password';
  }

  if (password !== confirmation) {
    return 'Passwords do not match';
  }

  return true;
}

/**
 * Date validation (ensures date is valid and not in the future)
 */
export function validateDate(date: string | Date, allowFuture = false): true | string {
  if (!date) {
    return 'Date is required';
  }

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return 'Please enter a valid date';
  }

  if (!allowFuture && dateObj > new Date()) {
    return 'Date cannot be in the future';
  }

  return true;
}

/**
 * Number validation (positive numbers only)
 */
export function validatePositiveNumber(
  value: number | string,
  fieldName = 'Value'
): true | string {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) {
    return `${fieldName} must be a valid number`;
  }

  if (num < 0) {
    return `${fieldName} must be a positive number`;
  }

  return true;
}

/**
 * Hours validation (0-24 hours)
 */
export function validateHours(hours: number | string): true | string {
  const result = validatePositiveNumber(hours, 'Hours');
  if (result !== true) return result;

  const num = typeof hours === 'string' ? parseFloat(hours) : hours;

  if (num > 24) {
    return 'Hours cannot exceed 24 hours per day';
  }

  return true;
}

/**
 * URL validation
 */
export function validateUrl(url: string, required = false): true | string {
  if (!url || !url.trim()) {
    return required ? 'URL is required' : true;
  }

  try {
    new URL(url);
    return true;
  } catch {
    return 'Please enter a valid URL';
  }
}

/**
 * String length validation
 */
export function validateLength(
  value: string,
  min: number,
  max: number,
  fieldName = 'Field'
): true | string {
  if (!value || !value.trim()) {
    return `${fieldName} is required`;
  }

  const length = value.trim().length;

  if (length < min) {
    return `${fieldName} must be at least ${min} characters`;
  }

  if (length > max) {
    return `${fieldName} must be less than ${max} characters`;
  }

  return true;
}

/**
 * Required field validation
 */
export function validateRequired(value: unknown, fieldName = 'Field'): true | string {
  if (value === null || value === undefined) {
    return `${fieldName} is required`;
  }

  if (typeof value === 'string' && !value.trim()) {
    return `${fieldName} is required`;
  }

  if (Array.isArray(value) && value.length === 0) {
    return `${fieldName} is required`;
  }

  return true;
}
