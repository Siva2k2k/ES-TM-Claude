import { Router } from 'express';
import {
  BillingRateController,
  createBillingRateValidation,
  updateBillingRateValidation,
  getBillingRatesValidation,
  calculateEffectiveRateValidation
} from '@/controllers/BillingRateController';
import { requireAuth, requireManagement } from '@/middleware/auth';

const router = Router();

// Apply authentication to all billing rate routes
router.use(requireAuth);

/**
 * @route POST /api/v1/billing-rates
 * @desc Create a new billing rate
 * @access Private (Management+)
 */
router.post('/', requireManagement, createBillingRateValidation, BillingRateController.createBillingRate);

/**
 * @route PUT /api/v1/billing-rates/:rateId
 * @desc Update a billing rate
 * @access Private (Management+)
 */
router.put('/:rateId', requireManagement, updateBillingRateValidation, BillingRateController.updateBillingRate);

/**
 * @route GET /api/v1/billing-rates
 * @desc Get billing rates with filtering
 * @access Private (Management+)
 */
router.get('/', requireManagement, getBillingRatesValidation, BillingRateController.getBillingRates);

/**
 * @route POST /api/v1/billing-rates/calculate
 * @desc Calculate effective billing rate
 * @access Private (Management+)
 */
router.post('/calculate', requireManagement, calculateEffectiveRateValidation, BillingRateController.calculateEffectiveRate);

/**
 * @route POST /api/v1/billing-rates/preview
 * @desc Preview billing rate calculation
 * @access Private (Management+)
 */
router.post('/preview', requireManagement, BillingRateController.previewRateCalculation);

export default router;
