import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Lock, Shield, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';

interface ResetPasswordPageProps {
  token?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface PasswordStrength {
  score: number;
  text: string;
  color: string;
  requirements: Array<{ label: string; met: boolean }>;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({
  token,
  onSuccess,
  onCancel
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  useEffect(() => {
    // Get token from URL if not provided as prop
    if (!token) {
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get('token');
      if (!urlToken) {
        setError('Invalid or missing reset token');
        setTokenValid(false);
        return;
      }
    }
    setTokenValid(true);
  }, [token]);

  const calculatePasswordStrength = (password: string): PasswordStrength => {
    const requirements = [
      { label: 'At least 12 characters', met: password.length >= 12 },
      { label: 'Contains uppercase letter', met: /[A-Z]/.test(password) },
      { label: 'Contains lowercase letter', met: /[a-z]/.test(password) },
      { label: 'Contains number', met: /\d/.test(password) },
      { label: 'Contains special character', met: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password) },
      { label: 'No repeating characters', met: !/(.)\1{2,}/.test(password) }
    ];

    const metCount = requirements.filter(req => req.met).length;
    let score = 0;
    let text = '';
    let color = '';

    if (metCount === 0) {
      score = 0;
      text = 'Enter password';
      color = 'text-gray-500';
    } else if (metCount <= 2) {
      score = 1;
      text = 'Very Weak';
      color = 'text-red-600';
    } else if (metCount <= 3) {
      score = 2;
      text = 'Weak';
      color = 'text-orange-600';
    } else if (metCount <= 4) {
      score = 3;
      text = 'Fair';
      color = 'text-yellow-600';
    } else if (metCount <= 5) {
      score = 4;
      text = 'Good';
      color = 'text-blue-600';
    } else {
      score = 5;
      text = 'Very Strong';
      color = 'text-green-600';
    }

    return { score, text, color, requirements };
  };

  const passwordStrength = calculatePasswordStrength(newPassword);
  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;
  const canSubmit = newPassword && confirmPassword && passwordsMatch && passwordStrength.score >= 4;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canSubmit || !tokenValid) return;

    const resetToken = token || new URLSearchParams(window.location.search).get('token');
    if (!resetToken) {
      setError('Invalid reset token');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: resetToken,
          newPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to reset password');
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
      }, 3000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const PasswordStrengthBar = () => (
    <div className="mt-2">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium">Password Strength</span>
        <span className={`text-sm font-medium ${passwordStrength.color}`}>
          {passwordStrength.text}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${
            passwordStrength.score === 0 ? 'bg-gray-300 w-0' :
            passwordStrength.score === 1 ? 'bg-red-500 w-1/5' :
            passwordStrength.score === 2 ? 'bg-orange-500 w-2/5' :
            passwordStrength.score === 3 ? 'bg-yellow-500 w-3/5' :
            passwordStrength.score === 4 ? 'bg-blue-500 w-4/5' :
            'bg-green-500 w-full'
          }`}
        />
      </div>
    </div>
  );

  const PasswordRequirements = () => (
    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
      <h4 className="text-sm font-medium text-gray-700 mb-2">Password Requirements:</h4>
      <div className="space-y-1">
        {passwordStrength.requirements.map((req, index) => (
          <div key={index} className="flex items-center text-sm">
            {req.met ? (
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
            ) : (
              <div className="w-4 h-4 border border-gray-300 rounded-full mr-2" />
            )}
            <span className={req.met ? 'text-green-600' : 'text-gray-500'}>
              {req.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  if (tokenValid === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Invalid Reset Link</h2>
            <p className="text-gray-600 mb-6">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
            <button
              onClick={onCancel}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
          <div className="text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Password Reset Successful</h2>
            <p className="text-gray-600 mb-6">
              Your password has been reset successfully. You can now log in with your new password.
            </p>
            <button
              onClick={onSuccess}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center p-6 border-b border-gray-200">
          <Shield className="w-6 h-6 text-blue-600 mr-3" />
          <h2 className="text-xl font-semibold text-gray-900">Set New Password</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                <span className="text-red-800">{error}</span>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter new password"
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
              {newPassword && <PasswordStrengthBar />}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`block w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    confirmPassword && !passwordsMatch
                      ? 'border-red-300'
                      : 'border-gray-300'
                  }`}
                  placeholder="Confirm new password"
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
              {confirmPassword && !passwordsMatch && (
                <p className="mt-1 text-sm text-red-600">Passwords do not match</p>
              )}
              {confirmPassword && passwordsMatch && (
                <p className="mt-1 text-sm text-green-600">Passwords match</p>
              )}
            </div>

            {newPassword && <PasswordRequirements />}
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              <ArrowLeft className="w-4 h-4 inline mr-2" />
              Back to Login
            </button>
            <button
              type="submit"
              disabled={!canSubmit || loading}
              className={`flex-1 px-4 py-2 rounded-lg text-white font-medium transition-colors ${
                canSubmit && !loading
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};