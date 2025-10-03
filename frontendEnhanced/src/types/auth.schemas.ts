import { z } from 'zod';

/**
 * Authentication and User Validation Schemas
 * Centralized Zod schemas for all authentication-related forms
 * Phase 4: Forms & Validation
 */

// ============================================================================
// LOGIN SCHEMAS
// ============================================================================

export const loginFormSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

export type LoginFormData = z.infer<typeof loginFormSchema>;

// ============================================================================
// PASSWORD RESET SCHEMAS
// ============================================================================

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .toLowerCase()
    .trim(),
});

export type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/, 'Password must contain at least one special character'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type ResetPasswordData = z.infer<typeof resetPasswordSchema>;

// ============================================================================
// PASSWORD CHANGE SCHEMAS
// ============================================================================

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/, 'Password must contain at least one special character'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: 'New password must be different from current password',
  path: ['newPassword'],
}).refine((data) => {
  // Check for repeating characters (e.g., "aaa" or "111")
  return !/(.)\1{2,}/.test(data.newPassword);
}, {
  message: 'Password cannot contain repeating characters',
  path: ['newPassword'],
});

export type PasswordChangeData = z.infer<typeof passwordChangeSchema>;

// ============================================================================
// PROFILE UPDATE SCHEMAS
// ============================================================================

export const profileUpdateSchema = z.object({
  full_name: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be less than 100 characters')
    .trim()
    .refine((name) => {
      // Ensure name contains at least first and last name
      const parts = name.split(' ').filter(Boolean);
      return parts.length >= 1;
    }, {
      message: 'Please enter your full name',
    }),
  hourly_rate: z
    .number()
    .min(0.01, 'Hourly rate must be at least $0.01')
    .max(10000, 'Hourly rate cannot exceed $10,000')
    .optional()
    .nullable(),
});

export type ProfileUpdateData = z.infer<typeof profileUpdateSchema>;

// ============================================================================
// PASSWORD STRENGTH VALIDATION
// ============================================================================

export interface PasswordRequirement {
  label: string;
  met: boolean;
  regex?: RegExp;
}

export interface PasswordStrength {
  score: number; // 0-5
  text: string; // 'Very Weak' | 'Weak' | 'Fair' | 'Good' | 'Very Strong'
  color: string; // Tailwind class
  requirements: PasswordRequirement[];
}

/**
 * Calculate password strength and return detailed breakdown
 */
export function calculatePasswordStrength(password: string): PasswordStrength {
  const requirements: PasswordRequirement[] = [
    {
      label: 'At least 12 characters',
      met: password.length >= 12,
    },
    {
      label: 'Contains uppercase letter',
      met: /[A-Z]/.test(password),
      regex: /[A-Z]/,
    },
    {
      label: 'Contains lowercase letter',
      met: /[a-z]/.test(password),
      regex: /[a-z]/,
    },
    {
      label: 'Contains number',
      met: /\d/.test(password),
      regex: /\d/,
    },
    {
      label: 'Contains special character',
      met: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password),
      regex: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/,
    },
    {
      label: 'No repeating characters',
      met: !/(.)\1{2,}/.test(password),
    },
  ];

  const metCount = requirements.filter(req => req.met).length;

  let score = 0;
  let text = '';
  let color = '';

  if (password.length === 0) {
    score = 0;
    text = 'Enter password';
    color = 'text-gray-500';
  } else if (metCount <= 2) {
    score = 1;
    text = 'Very Weak';
    color = 'text-red-600';
  } else if (metCount === 3) {
    score = 2;
    text = 'Weak';
    color = 'text-orange-600';
  } else if (metCount === 4) {
    score = 3;
    text = 'Fair';
    color = 'text-yellow-600';
  } else if (metCount === 5) {
    score = 4;
    text = 'Good';
    color = 'text-blue-600';
  } else {
    score = 5;
    text = 'Very Strong';
    color = 'text-green-600';
  }

  return { score, text, color, requirements };
}

/**
 * Check if password meets minimum strength requirements
 */
export function isPasswordStrong(password: string): boolean {
  const strength = calculatePasswordStrength(password);
  return strength.score >= 4; // Require at least 'Good' strength
}

/**
 * Get password strength bar width percentage
 */
export function getPasswordStrengthWidth(score: number): string {
  const widthMap: Record<number, string> = {
    0: 'w-0',
    1: 'w-1/5',
    2: 'w-2/5',
    3: 'w-3/5',
    4: 'w-4/5',
    5: 'w-full',
  };
  return widthMap[score] || 'w-0';
}

/**
 * Get password strength bar color
 */
export function getPasswordStrengthColor(score: number): string {
  const colorMap: Record<number, string> = {
    0: 'bg-gray-300',
    1: 'bg-red-500',
    2: 'bg-orange-500',
    3: 'bg-yellow-500',
    4: 'bg-blue-500',
    5: 'bg-green-500',
  };
  return colorMap[score] || 'bg-gray-300';
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate email format (additional helper beyond Zod)
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check if passwords match
 */
export function doPasswordsMatch(password: string, confirmPassword: string): boolean {
  return password === confirmPassword && password.length > 0;
}

/**
 * Sanitize email input
 */
export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Sanitize name input
 */
export function sanitizeName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/[^a-zA-Z\s'-]/g, ''); // Allow only letters, spaces, hyphens, apostrophes
}

/**
 * Format hourly rate for display
 */
export function formatHourlyRate(rate: number | null | undefined): string {
  if (!rate) return 'Not set';
  return `$${rate.toFixed(2)}/hr`;
}

/**
 * Parse hourly rate from string input
 */
export function parseHourlyRate(value: string): number | null {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}
