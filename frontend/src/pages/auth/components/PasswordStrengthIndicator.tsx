import React from 'react';
import { Check, X } from 'lucide-react';

/**
 * PasswordStrengthIndicator Component
 * Visual indicator for password strength with requirement checklist
 */

interface PasswordStrengthIndicatorProps {
  password: string;
  showRequirements?: boolean;
}

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const requirements: PasswordRequirement[] = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'One number', test: (p) => /[0-9]/.test(p) },
  { label: 'One special character', test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

export function PasswordStrengthIndicator({
  password,
  showRequirements = true,
}: PasswordStrengthIndicatorProps) {
  // Calculate strength score
  const calculateStrength = (): { score: number; label: string; color: string } => {
    if (!password) {
      return { score: 0, label: 'Too weak', color: 'bg-gray-300' };
    }

    let score = 0;
    requirements.forEach((req) => {
      if (req.test(password)) score++;
    });

    if (score <= 2) {
      return { score: (score / 5) * 100, label: 'Weak', color: 'bg-red-500' };
    } else if (score === 3) {
      return { score: (score / 5) * 100, label: 'Fair', color: 'bg-orange-500' };
    } else if (score === 4) {
      return { score: (score / 5) * 100, label: 'Good', color: 'bg-yellow-500' };
    } else {
      return { score: 100, label: 'Strong', color: 'bg-green-500' };
    }
  };

  const strength = calculateStrength();

  return (
    <div className="space-y-3">
      {/* Strength Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600 dark:text-gray-400">Password Strength</span>
          <span className={`font-medium ${
            strength.label === 'Strong' ? 'text-green-600' :
            strength.label === 'Good' ? 'text-yellow-600' :
            strength.label === 'Fair' ? 'text-orange-600' :
            'text-red-600'
          }`}>
            {strength.label}
          </span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${strength.color}`}
            style={{ width: `${strength.score}%` }}
          />
        </div>
      </div>

      {/* Requirements Checklist */}
      {showRequirements && password && (
        <div className="space-y-1.5">
          {requirements.map((req, index) => {
            const met = req.test(password);
            return (
              <div
                key={index}
                className={`flex items-center gap-2 text-sm ${
                  met ? 'text-green-600 dark:text-green-400' : 'text-slate-500 dark:text-gray-500'
                }`}
              >
                {met ? (
                  <Check className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <X className="w-4 h-4 flex-shrink-0" />
                )}
                <span>{req.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default PasswordStrengthIndicator;
