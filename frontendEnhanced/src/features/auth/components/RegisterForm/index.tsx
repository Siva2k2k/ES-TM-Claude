/**
 * RegisterForm Component
 * User registration form with validation
 */

import React, { useState } from 'react';
import { UserPlus, Mail, Lock, User, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import type { RegisterRequest } from '../../types/auth.types';

export interface RegisterFormProps {
  /**
   * Callback when registration is successful
   */
  onSuccess?: () => void;
  /**
   * Callback to show login form
   */
  onShowLogin?: () => void;
  /**
   * Register function from auth context
   */
  onRegister: (data: RegisterRequest) => Promise<{ error?: string }>;
  /**
   * Loading state from auth context
   */
  isLoading?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Registration form component
 * Complexity: 7
 * LOC: ~250
 */
export const RegisterForm: React.FC<RegisterFormProps> = ({
  onSuccess,
  onShowLogin,
  onRegister,
  isLoading = false,
  className = '',
}) => {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = (): boolean => {
    // Check if all fields are filled
    if (!formData.full_name.trim()) {
      setError('Full name is required');
      return false;
    }

    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }

    if (!formData.password) {
      setError('Password is required');
      return false;
    }

    // Validate password strength
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const registerData: RegisterRequest = {
        full_name: formData.full_name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      };

      const result = await onRegister(registerData);

      if (result.error) {
        setError(result.error);
      } else {
        setShowSuccess(true);
        setTimeout(() => {
          onSuccess?.();
        }, 2000);
      }
    } catch (err) {
      console.error('[RegisterForm] Unexpected error:', err);
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-dark-800 dark:to-dark-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-dark-800 rounded-xl shadow-xl p-8 text-center max-w-md border border-gray-200 dark:border-dark-700">
          <CheckCircle className="h-16 w-16 text-success-600 dark:text-success-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary mb-2">
            Registration Successful!
          </h2>
          <p className="text-text-secondary dark:text-dark-text-secondary mb-4">
            Your account has been created. Please wait for admin approval to access the system.
          </p>
          <p className="text-sm text-text-tertiary dark:text-dark-text-tertiary">
            Redirecting to login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-dark-800 dark:to-dark-900 flex items-center justify-center p-4 ${className}`}>
      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-dark-700">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 dark:from-primary-500 dark:to-primary-600 p-6 text-white text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-white/10 p-3 rounded-full">
              <UserPlus className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-2">Create Account</h1>
          <p className="text-primary-100 dark:text-primary-200">Join TimeTracker Pro</p>
        </div>

        {/* Registration Form */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Message */}
            {error && (
              <div className="bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-lg p-4 flex items-center space-x-3">
                <AlertCircle className="h-5 w-5 text-error-600 dark:text-error-400 flex-shrink-0" />
                <p className="text-error-700 dark:text-error-300 text-sm">{error}</p>
              </div>
            )}

            {/* Full Name Field */}
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-text-primary dark:text-dark-text-primary mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-tertiary dark:text-dark-text-tertiary" />
                <Input
                  id="full_name"
                  name="full_name"
                  type="text"
                  value={formData.full_name}
                  onChange={handleChange}
                  className="pl-10"
                  placeholder="Enter your full name"
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-primary dark:text-dark-text-primary mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-tertiary dark:text-dark-text-tertiary" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="pl-10"
                  placeholder="Enter your email"
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-primary dark:text-dark-text-primary mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-tertiary dark:text-dark-text-tertiary" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="pl-10"
                  placeholder="Create a password"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <p className="text-xs text-text-tertiary dark:text-dark-text-tertiary mt-1">
                Must be at least 8 characters long
              </p>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-primary dark:text-dark-text-primary mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-tertiary dark:text-dark-text-tertiary" />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="pl-10"
                  placeholder="Confirm your password"
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              
              size="lg"
              disabled={isSubmitting}
              className="w-full mt-6"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <span>Create Account</span>
              )}
            </Button>
          </form>

          {/* Login Link */}
          {onShowLogin && (
            <div className="mt-4 text-center">
              <span className="text-sm text-text-secondary dark:text-dark-text-secondary">
                Already have an account?{' '}
              </span>
              <button
                type="button"
                onClick={onShowLogin}
                className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 hover:underline transition-colors font-medium"
              >
                Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
