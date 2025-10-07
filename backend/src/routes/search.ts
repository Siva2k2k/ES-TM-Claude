import express from 'express';
import { SearchController } from '../controllers/SearchController';
import { requireAuth } from '../middleware/auth';
import { query } from 'express-validator';

const router = express.Router();

// Validation middleware
const searchValidation = [
  query('q').notEmpty().withMessage('Search query is required'),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('offset').optional().isInt({ min: 0 }),
  query('category').optional().isString(),
  query('type').optional().isString()
];

const quickActionsValidation = [
  query('limit').optional().isInt({ min: 1, max: 20 })
];

// Global search
router.get('/', requireAuth, searchValidation, SearchController.search);

// Get quick actions/shortcuts
router.get('/quick-actions', requireAuth, quickActionsValidation, SearchController.getQuickActions);

// Search suggestions/autocomplete
router.get('/suggestions', requireAuth, SearchController.getSuggestions);

// Initialize search index (admin use)
router.post('/index/initialize', requireAuth, SearchController.initializeIndex);

export default router;