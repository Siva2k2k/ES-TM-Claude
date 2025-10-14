import { Router } from 'express';
import { ClientController } from '@/controllers/ClientController';
import { requireAuth } from '@/middleware/auth';
import { body } from 'express-validator';
import { validate } from '@/middleware/validation';

const router = Router();

// Apply authentication middleware to all client routes
router.use(requireAuth);

// Client management routes
router.post('/', [
	body('name').exists().withMessage('Name is required').isString().withMessage('Name must be a string').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters').custom(value => /[A-Za-z]/.test(value)).withMessage('Name must contain at least one letter'),
	body('contact_email').optional().isEmail().withMessage('Invalid contact email'),
	body('contact_person').optional().isString().withMessage('Contact person must be a string').isLength({ max: 100 }).withMessage('Contact person cannot exceed 100 characters'),
	validate
], ClientController.createClient);
router.get('/', ClientController.getAllClients);
router.get('/stats', ClientController.getClientStats);
router.get('/:clientId', ClientController.getClientById);
router.put('/:clientId', ClientController.updateClient);
router.patch('/:clientId/deactivate', ClientController.deactivateClient);
router.patch('/:clientId/reactivate', ClientController.reactivateClient);
router.delete('/:clientId', ClientController.deleteClient);

export default router;