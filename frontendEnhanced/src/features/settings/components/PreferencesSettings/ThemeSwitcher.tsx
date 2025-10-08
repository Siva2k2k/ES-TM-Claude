/**
 * Theme Switcher Component
 * Visual theme selection (Light/Dark/System)
 * Cognitive Complexity: 3
 */
import React from 'react';
import { Sun, Moon, Laptop } from 'lucide-react';

interface ThemeSwitcherProps {
  value: 'light' | 'dark' | 'system';
  onChange: (theme: 'light' | 'dark' | 'system') => void;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ value, onChange }) => {
  const themes = [
    {
      value: 'light' as const,
      label: 'Light',
      icon: Sun,
      description: 'Light theme',
    },
    {
      value: 'dark' as const,
      label: 'Dark',
      icon: Moon,
      description: 'Dark theme',
    },
    {
      value: 'system' as const,
      label: 'System',
      icon: Laptop,
      description: 'Follow system preference',
    },
  ];

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-text-primary dark:text-dark-text-primary">
        Theme
      </h4>
      <div className="grid grid-cols-3 gap-3">
        {themes.map((theme) => {
          const Icon = theme.icon;
          const isActive = value === theme.value;

          return (
            <button
              key={theme.value}
              type="button"
              onClick={() => onChange(theme.value)}
              className={`relative flex flex-col items-center p-4 rounded-lg border-2 transition-all ${
                isActive
                  ? 'border-primary-500 dark:border-primary-400 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-border-primary dark:border-dark-border-primary bg-surface-primary dark:bg-dark-800 hover:border-primary-300 dark:hover:border-primary-600'
              }`}
            >
              <Icon
                className={`h-8 w-8 mb-2 ${
                  isActive
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-text-secondary dark:text-dark-text-secondary'
                }`}
              />
              <span
                className={`text-sm font-medium ${
                  isActive
                    ? 'text-primary-700 dark:text-primary-300'
                    : 'text-text-primary dark:text-dark-text-primary'
                }`}
              >
                {theme.label}
              </span>
              <span className="text-xs text-text-tertiary dark:text-dark-text-tertiary mt-1">
                {theme.description}
              </span>

              {/* Active indicator */}
              {isActive && (
                <div className="absolute top-2 right-2 w-2 h-2 bg-primary-500 dark:bg-primary-400 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
