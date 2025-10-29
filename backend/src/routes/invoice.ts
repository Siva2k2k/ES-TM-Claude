import { Router } from 'express';
import {
  InvoiceController,
  generateInvoiceDraftValidation,
  createInvoiceValidation,
  invoiceIdValidation,
  processApprovalValidation
} from '@/controllers/InvoiceController';
import { requireAuth, requireManagement } from '@/middleware/auth';

const router = Router();

// Apply authentication to all invoice routes
router.use(requireAuth);

/**
 * @route POST /api/v1/invoices/generate-draft
 * @desc Generate invoice draft from timesheets
 * @access Private (Management+)
 */
router.post('/generate-draft', requireManagement, generateInvoiceDraftValidation, InvoiceController.generateInvoiceDraft);

/**
 * @route POST /api/v1/invoices
 * @desc Create invoice from draft
 * @access Private (Management+)
 */
router.post('/', requireManagement, createInvoiceValidation, InvoiceController.createInvoice);

/**
 * @route GET /api/v1/invoices
 * @desc Get all invoices
 * @access Private (Management+)
 */
router.get('/', requireManagement, InvoiceController.getAllInvoices);

/**
 * @route GET /api/v1/invoices/dashboard
 * @desc Get invoice dashboard stats
 * @access Private (Management+)
 */
router.get('/dashboard', requireManagement, InvoiceController.getDashboardStats);

/**
 * @route GET /api/v1/invoices/:invoiceId/line-items
 * @desc Get invoice line items
 * @access Private (Management+)
 */
router.get('/:invoiceId/line-items', requireManagement, invoiceIdValidation, InvoiceController.getInvoiceLineItems);

/**
 * @route POST /api/v1/invoices/:invoiceId/submit
 * @desc Submit invoice for approval
 * @access Private (Management+)
 */
router.post('/:invoiceId/submit', requireManagement, invoiceIdValidation, InvoiceController.submitForApproval);

/**
 * @route POST /api/v1/invoices/:invoiceId/approve
 * @desc Approve invoice
 * @access Private (Management+)
 */
router.post('/:invoiceId/approve', requireManagement, processApprovalValidation, InvoiceController.approveInvoice);

/**
 * @route POST /api/v1/invoices/:invoiceId/reject
 * @desc Reject invoice
 * @access Private (Management+)
 */
router.post('/:invoiceId/reject', requireManagement, processApprovalValidation, InvoiceController.rejectInvoice);

/**
 * @route POST /api/v1/invoices/:invoiceId/process-approval
 * @desc Process invoice approval/rejection
 * @access Private (Management+)
 */
router.post('/:invoiceId/process-approval', requireManagement, processApprovalValidation, InvoiceController.processApproval);

/**
 * @route POST /api/v1/invoices/generate
 * @desc Generate invoice
 * @access Private (Management+)
 */
router.post('/generate', requireManagement, createInvoiceValidation, InvoiceController.generateInvoice);

export default router;
