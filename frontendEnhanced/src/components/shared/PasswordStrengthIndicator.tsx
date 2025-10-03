import React from 'react';
import { CheckCircle } from 'lucide-react';
import {
  PasswordStrength,
  getPasswordStrengthWidth,
  getPasswordStrengthColor,
} from '../../types/auth.schemas';

/**
 * Password Strength Indicator Component
 * Extracted from ChangePasswordModal for reusability
 * Phase 4: Forms & Validation
 */

export interface PasswordStrengthIndicatorProps {
  password: string;
  strength: PasswordStrength;
  showRequirements?: boolean;
  className?: string;
}

/**
 * Visual indicator for password strength with requirements checklist
 */
export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password,
  strength,
  showRequirements = true,
  className = '',
}) => {
  if (!password && !showRequirements) {
    return null;
  }

  return (
    <div className={className}>
      {/* Strength Bar */}
      <div className="mt-2">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-gray-700">Password Strength</span>
          <span className={`text-sm font-medium ${strength.color}`}>
            {strength.text}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor(strength.score)} ${getPasswordStrengthWidth(strength.score)}`}
          />
        </div>
      </div>

      {/* Requirements Checklist */}
      {showRequirements && password && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Password Requirements:</h4>
          <div className="space-y-1">
            {strength.requirements.map((req, index) => (
              <div key={index} className="flex items-center text-sm">
                {req.met ? (
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                ) : (
                  <div className="w-4 h-4 border border-gray-300 rounded-full mr-2 flex-shrink-0" />
                )}
                <span className={req.met ? 'text-green-600' : 'text-gray-500'}>
                  {req.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compact Requirements (no background) */}
      {showRequirements && !password && (
        <div className="mt-2 space-y-1">
          {strength.requirements.map((req, index) => (
            <div key={index} className="flex items-center text-xs text-gray-500">
              <div className="w-3 h-3 border border-gray-300 rounded-full mr-2 flex-shrink-0" />
              <span>{req.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Simplified strength bar without requirements
 */
export const PasswordStrengthBar: React.FC<{
  strength: PasswordStrength;
  className?: string;
}> = ({ strength, className = '' }) => {
  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-medium text-gray-600">Strength</span>
        <span className={`text-xs font-medium ${strength.color}`}>
          {strength.text}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all duration-300 ${getPasswordStrengthColor(strength.score)} ${getPasswordStrengthWidth(strength.score)}`}
        />
      </div>
    </div>
  );
};

/**
 * Requirements checklist only (no bar)
 */
export const PasswordRequirementsList: React.FC<{
  requirements: PasswordStrength['requirements'];
  className?: string;
}> = ({ requirements, className = '' }) => {
  return (
    <div className={`space-y-1 ${className}`}>
      {requirements.map((req, index) => (
        <div key={index} className="flex items-center text-sm">
          {req.met ? (
            <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
          ) : (
            <div className="w-4 h-4 border border-gray-300 rounded-full mr-2 flex-shrink-0" />
          )}
          <span className={req.met ? 'text-green-600' : 'text-gray-500'}>
            {req.label}
          </span>
        </div>
      ))}
    </div>
  );
};
