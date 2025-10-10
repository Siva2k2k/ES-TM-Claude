import { z } from 'zod';

/**
 * Billing & Invoice Management Validation Schemas
 * Schemas for billing rates, invoices, and financial operations
 */

// Invoice status enum
export const invoiceStatuses = ['draft', 'pending', 'sent', 'paid', 'overdue', 'cancelled'] as const;
export type InvoiceStatus = typeof invoiceStatuses[number];

// Payment method enum
export const paymentMethods = ['bank_transfer', 'credit_card', 'check', 'cash', 'other'] as const;
export type PaymentMethod = typeof paymentMethods[number];

// ObjectId validation helper
const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID format');

// Billing rate schema (hourly rate for project/role)
export const billingRateSchema = z.object({
  project_id: objectIdSchema,
  role: z.string()
    .min(1, 'Role is required')
    .max(50, 'Role name too long'),
  hourly_rate: z.number()
    .min(0, 'Rate cannot be negative')
    .max(10000, 'Rate exceeds maximum allowed (10,000)'),
  effective_date: z.date({
    required_error: 'Effective date is required',
    invalid_type_error: 'Invalid date format'
  }),
  currency: z.string()
    .length(3, 'Currency code must be 3 characters (e.g., USD)')
    .default('USD'),
  notes: z.string()
    .max(500, 'Notes too long')
    .optional()
    .or(z.literal(''))
});

// Create/update billing rate
export const createBillingRateSchema = billingRateSchema;
export const updateBillingRateSchema = billingRateSchema.partial().extend({
  id: objectIdSchema
});

// Invoice line item schema
const invoiceLineItemSchema = z.object({
  description: z.string()
    .min(1, 'Description is required')
    .max(500, 'Description too long'),
  quantity: z.number()
    .min(0, 'Quantity cannot be negative')
    .max(10000, 'Quantity exceeds maximum'),
  unit_price: z.number()
    .min(0, 'Unit price cannot be negative')
    .max(100000, 'Unit price exceeds maximum'),
  amount: z.number()
    .min(0, 'Amount cannot be negative')
});

// Create invoice schema
export const createInvoiceSchema = z.object({
  project_id: objectIdSchema,
  client_id: objectIdSchema,
  invoice_number: z.string()
    .min(1, 'Invoice number is required')
    .max(50, 'Invoice number too long')
    .regex(/^[A-Z0-9-]+$/, 'Invoice number can only contain uppercase letters, numbers, and hyphens'),
  period_start: z.date({
    required_error: 'Period start date is required',
    invalid_type_error: 'Invalid date format'
  }),
  period_end: z.date({
    required_error: 'Period end date is required',
    invalid_type_error: 'Invalid date format'
  }),
  issue_date: z.date({
    required_error: 'Issue date is required',
    invalid_type_error: 'Invalid date format'
  }),
  due_date: z.date({
    required_error: 'Due date is required',
    invalid_type_error: 'Invalid date format'
  }),
  line_items: z.array(invoiceLineItemSchema)
    .min(1, 'At least one line item is required')
    .max(100, 'Maximum 100 line items per invoice'),
  subtotal: z.number().min(0, 'Subtotal cannot be negative'),
  tax_rate: z.number()
    .min(0, 'Tax rate cannot be negative')
    .max(100, 'Tax rate cannot exceed 100%')
    .default(0),
  tax_amount: z.number().min(0, 'Tax amount cannot be negative'),
  total_amount: z.number().min(0, 'Total amount cannot be negative'),
  currency: z.string()
    .length(3, 'Currency code must be 3 characters')
    .default('USD'),
  notes: z.string()
    .max(2000, 'Notes too long')
    .optional()
    .or(z.literal('')),
  terms: z.string()
    .max(2000, 'Terms too long')
    .optional()
    .or(z.literal(''))
}).refine((data) => data.period_end >= data.period_start, {
  message: 'Period end date must be after or equal to period start date',
  path: ['period_end']
}).refine((data) => data.due_date >= data.issue_date, {
  message: 'Due date must be after or equal to issue date',
  path: ['due_date']
}).refine((data) => {
  // Validate line items total matches subtotal
  const calculatedSubtotal = data.line_items.reduce((sum, item) => sum + item.amount, 0);
  return Math.abs(calculatedSubtotal - data.subtotal) < 0.01; // Allow for rounding errors
}, {
  message: 'Subtotal must match sum of line item amounts',
  path: ['subtotal']
}).refine((data) => {
  // Validate total calculation
  const calculatedTotal = data.subtotal + data.tax_amount;
  return Math.abs(calculatedTotal - data.total_amount) < 0.01;
}, {
  message: 'Total amount must equal subtotal + tax amount',
  path: ['total_amount']
});

// Update invoice schema
export const updateInvoiceSchema = createInvoiceSchema.partial().extend({
  id: objectIdSchema,
  status: z.enum(invoiceStatuses).optional()
});

// Invoice payment schema
export const invoicePaymentSchema = z.object({
  invoice_id: objectIdSchema,
  payment_date: z.date({
    required_error: 'Payment date is required',
    invalid_type_error: 'Invalid date format'
  }),
  amount_paid: z.number()
    .min(0.01, 'Payment amount must be greater than 0'),
  payment_method: z.enum(paymentMethods),
  transaction_reference: z.string()
    .max(200, 'Transaction reference too long')
    .optional()
    .or(z.literal('')),
  notes: z.string()
    .max(500, 'Notes too long')
    .optional()
    .or(z.literal(''))
});

// Billing filter schema
export const billingFilterSchema = z.object({
  project_id: objectIdSchema.optional(),
  client_id: objectIdSchema.optional(),
  start_date: z.date().optional(),
  end_date: z.date().optional(),
  is_billable: z.boolean().optional(),
  invoiced: z.boolean().optional(),
  search: z.string().max(200).optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sort_by: z.enum(['date', 'hours', 'amount', 'project_name']).default('date'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
}).refine((data) => {
  if (data.start_date && data.end_date) {
    return data.end_date >= data.start_date;
  }
  return true;
}, {
  message: 'End date must be after or equal to start date',
  path: ['end_date']
});

// Invoice filter schema
export const invoiceFilterSchema = z.object({
  project_id: objectIdSchema.optional(),
  client_id: objectIdSchema.optional(),
  status: z.enum(invoiceStatuses).optional(),
  start_date: z.date().optional(),
  end_date: z.date().optional(),
  search: z.string().max(200).optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sort_by: z.enum(['invoice_number', 'issue_date', 'due_date', 'total_amount']).default('issue_date'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

// Type exports
export type BillingRateInput = z.infer<typeof billingRateSchema>;
export type CreateBillingRateInput = z.infer<typeof createBillingRateSchema>;
export type UpdateBillingRateInput = z.infer<typeof updateBillingRateSchema>;
export type InvoiceLineItem = z.infer<typeof invoiceLineItemSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type InvoicePaymentInput = z.infer<typeof invoicePaymentSchema>;
export type BillingFilterInput = z.infer<typeof billingFilterSchema>;
export type InvoiceFilterInput = z.infer<typeof invoiceFilterSchema>;
