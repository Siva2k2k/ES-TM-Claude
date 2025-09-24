import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, User, Shield, Users, Star, Briefcase } from 'lucide-react';
import { useAuth } from '../store/contexts/AuthContext';
import { UserService } from '../services/UserService';
import type { UserRole } from '../types';

interface RoleOption {
  value: UserRole;
  label: string;
  description: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
}

const roleOptions: RoleOption[] = [
  {
    value: 'super_admin',
    label: 'Super Admin',
    description: 'Full system access & control',
    icon: Star,
    color: 'text-red-700',
    bgColor: 'bg-red-50 border-red-200'
  },
  {
    value: 'management',
    label: 'Management',
    description: 'Executive oversight & approval',
    icon: Shield,
    color: 'text-purple-700',
    bgColor: 'bg-purple-50 border-purple-200'
  },
  {
    value: 'manager',
    label: 'Manager',
    description: 'Team & project management',
    icon: Users,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50 border-blue-200'
  },
  {
    value: 'lead',
    label: 'Lead',
    description: 'Team leadership & coordination',
    icon: Briefcase,
    color: 'text-green-700',
    bgColor: 'bg-green-50 border-green-200'
  },
  {
    value: 'employee',
    label: 'Employee',
    description: 'Individual contributor',
    icon: User,
    color: 'text-slate-700',
    bgColor: 'bg-slate-50 border-slate-200'
  }
];

interface RoleSwitcherProps {
  onRoleChange?: (role: UserRole) => void;
  className?: string;
}

const RoleSwitcher: React.FC<RoleSwitcherProps> = ({ onRoleChange, className = '' }) => {
  const { currentUserRole, setCurrentUserRole, setCurrentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentRole = roleOptions.find(role => role.value === currentUserRole);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle role switching with proper state management
  const handleRoleSwitch = async (newRole: UserRole) => {
    if (newRole === currentUserRole || isTransitioning) return;

    setIsTransitioning(true);
    
    try {
      // Find a user with the new role from Supabase
      const usersResult = await UserService.getAllUsers();
      const newUser = usersResult.users?.find(user => user.role === newRole);
      
      // Update auth context
      setCurrentUserRole(newRole);
      
      if (newUser) {
        setCurrentUser(newUser);
      }

      // Call optional callback
      onRoleChange?.(newRole);

      // Close dropdown
      setIsOpen(false);

      // Show success feedback
      console.log(`Successfully switched to ${newRole} role`);
      
    } catch (error) {
      console.error('Error switching roles:', error);
    } finally {
      // Add a small delay for better UX
      setTimeout(() => setIsTransitioning(false), 300);
    }
  };

  const toggleDropdown = () => {
    if (!isTransitioning) {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Current Role Button */}
      <button
        onClick={toggleDropdown}
        disabled={isTransitioning}
        className={`
          flex items-center space-x-3 px-4 py-3 rounded-xl border transition-all duration-200
          ${isTransitioning 
            ? 'opacity-50 cursor-not-allowed' 
            : 'hover:shadow-md hover:scale-105 active:scale-95'
          }
          ${currentRole?.bgColor || 'bg-white border-slate-200'}
          ${isOpen ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}
        `}
      >
        {/* Role Icon */}
        <div className={`
          w-10 h-10 rounded-full flex items-center justify-center
          ${currentRole?.color === 'text-red-700' ? 'bg-red-100' :
            currentRole?.color === 'text-purple-700' ? 'bg-purple-100' :
            currentRole?.color === 'text-blue-700' ? 'bg-blue-100' :
            currentRole?.color === 'text-green-700' ? 'bg-green-100' :
            'bg-slate-100'
          }
        `}>
          {currentRole?.icon && (
            <currentRole.icon className={`w-5 h-5 ${currentRole.color}`} />
          )}
        </div>

        {/* Role Info */}
        <div className="flex-1 text-left min-w-0">
          <div className={`font-semibold text-sm ${currentRole?.color || 'text-slate-700'}`}>
            {currentRole?.label || 'Unknown Role'}
          </div>
          <div className="text-xs text-slate-500 truncate">
            {currentRole?.description || 'No description'}
          </div>
        </div>

        {/* Dropdown Arrow */}
        <ChevronDown 
          className={`
            w-4 h-4 text-slate-400 transition-transform duration-200
            ${isOpen ? 'rotate-180' : ''}
            ${isTransitioning ? 'animate-pulse' : ''}
          `} 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Switch Role</h3>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                Demo Mode
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Select a role to simulate different user permissions
            </p>
          </div>

          {/* Role Options */}
          <div className="max-h-64 overflow-y-auto">
            {roleOptions.map((role) => {
              const isSelected = role.value === currentUserRole;
              const IconComponent = role.icon;

              return (
                <button
                  key={role.value}
                  onClick={() => handleRoleSwitch(role.value)}
                  disabled={isSelected || isTransitioning}
                  className={`
                    w-full px-4 py-3 text-left transition-all duration-150
                    flex items-center space-x-3 group
                    ${isSelected 
                      ? `${role.bgColor} ${role.color} cursor-default` 
                      : 'hover:bg-slate-50 text-slate-700 cursor-pointer'
                    }
                    ${isTransitioning ? 'opacity-50' : ''}
                    disabled:cursor-not-allowed
                  `}
                >
                  {/* Role Icon */}
                  <div className={`
                    w-8 h-8 rounded-lg flex items-center justify-center transition-colors
                    ${isSelected 
                      ? role.color.replace('text-', 'bg-').replace('700', '100') 
                      : 'bg-slate-100 group-hover:bg-slate-200'
                    }
                  `}>
                    <IconComponent 
                      className={`w-4 h-4 ${isSelected ? role.color : 'text-slate-600'}`} 
                    />
                  </div>

                  {/* Role Details */}
                  <div className="flex-1 min-w-0">
                    <div className={`
                      font-medium text-sm
                      ${isSelected ? role.color : 'text-slate-900 group-hover:text-slate-900'}
                    `}>
                      {role.label}
                      {isSelected && (
                        <span className="ml-2 text-xs font-normal opacity-75">
                          (Current)
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">
                      {role.description}
                    </div>
                  </div>

                  {/* Selection Indicator */}
                  {isSelected && (
                    <div className={`w-2 h-2 rounded-full ${role.color.replace('text-', 'bg-')}`} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 bg-slate-50 border-t border-slate-200">
            <p className="text-xs text-slate-500 text-center">
              Role changes take effect immediately
            </p>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isTransitioning && (
        <div className="absolute inset-0 bg-white bg-opacity-75 rounded-xl flex items-center justify-center z-10">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

export default RoleSwitcher;
