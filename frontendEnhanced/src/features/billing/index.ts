/**
 * Billing Feature Barrel Export
 * Main entry point for the billing feature module
 * Enterprise-level billing with adjustments and rate management
 */

// Components (export specific to avoid ambiguity)
export {
  ProjectBillingView,
  BillingDashboard,
  BillingRateManagement
} from './components';

// Hooks
export * from './hooks';

// Services
export * from './services/billingService';

// Types
export * from './types/billing.types';
