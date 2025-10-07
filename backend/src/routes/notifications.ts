import express from 'express';
import { NotificationController } from '../controllers/NotificationController';
import { requireAuth } from '../middleware/auth';
import { query, param } from 'express-validator';

const router = express.Router();

// Validation middleware
const getNotificationsValidation = [
  query('type').optional().isString(),
  query('read').optional().isBoolean(),
  query('priority').optional().isString(),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 })
];

const notificationIdValidation = [
  param('notification_id').isMongoId().withMessage('Invalid notification ID')
];

// Get user notifications
router.get('/', requireAuth, getNotificationsValidation, NotificationController.getNotifications);

// Mark notification as read
router.patch('/:notification_id/read', requireAuth, notificationIdValidation, NotificationController.markAsRead);

// Mark all notifications as read
router.patch('/mark-all-read', requireAuth, NotificationController.markAllAsRead);

// Get unread count
router.get('/unread-count', requireAuth, NotificationController.getUnreadCount);

// Mark notification as clicked (for analytics)
router.patch('/:notification_id/clicked', requireAuth, notificationIdValidation, NotificationController.markAsClicked);

// Create notification (admin/system use)
router.post('/', requireAuth, NotificationController.createNotification);

export default router;