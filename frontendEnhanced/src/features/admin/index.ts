/**
 * Admin Feature Barrel Export
 * Main entry point for the admin feature module
 */

// Components
export * from './components';

// Hooks
export { useUserManagement } from './hooks/useUserManagement';
export type { UseUserManagementReturn } from './hooks/useUserManagement';

export { useClientManagement } from './hooks/useClientManagement';
export type { UseClientManagementReturn } from './hooks/useClientManagement';

// Services
export { AdminService } from './services/adminService';

// Types
export * from './types/admin.types';
