import { Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { NotificationService } from '@/services/NotificationService';
import { NotificationType, NotificationPriority } from '@/models/Notification';
import { AuthRequest } from '@/middleware/auth';

export class NotificationController {
  /**
   * Get notifications for the authenticated user
   */
  static async getNotifications(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
        return;
      }

      const userId = req.user?.id || req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      const {
        type,
        read,
        priority,
        limit = 20,
        offset = 0
      } = req.query as any;

      const filters = {
        recipient_id: userId.toString(),
        type: type ? (Array.isArray(type) ? type : type.split(',')) : undefined,
        read: read !== undefined ? read === 'true' : undefined,
        priority: priority ? (Array.isArray(priority) ? priority : priority.split(',')) : undefined,
        limit: parseInt(limit as string) || 20,
        offset: parseInt(offset as string) || 0
      };

      const result = await NotificationService.getNotifications(filters);

      res.json({
        success: true,
        data: {
          notifications: result.notifications,
          pagination: {
            total: result.total,
            unread: result.unread,
            limit: filters.limit,
            offset: filters.offset,
            has_more: result.total > (filters.offset + filters.limit)
          }
        }
      });

    } catch (error: any) {
      console.error('Error in getNotifications:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch notifications'
      });
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
        return;
      }

      const userId = req.user?.id || req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      const { notification_id } = req.params;

      const success = await NotificationService.markAsRead(notification_id, userId.toString());

      if (success) {
        res.json({
          success: true,
          message: 'Notification marked as read'
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Notification not found'
        });
      }

    } catch (error: any) {
      console.error('Error in markAsRead:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to mark notification as read'
      });
    }
  }

  /**
   * Mark notification as clicked
   */
  static async markAsClicked(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
        return;
      }

      const userId = req.user?.id || req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      const { notification_id } = req.params;

      const success = await NotificationService.markAsClicked(notification_id, userId.toString());

      if (success) {
        res.json({
          success: true,
          message: 'Notification marked as clicked'
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Notification not found'
        });
      }

    } catch (error: any) {
      console.error('Error in markAsClicked:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to mark notification as clicked'
      });
    }
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      const count = await NotificationService.markAllAsRead(userId.toString());

      res.json({
        success: true,
        message: `${count} notifications marked as read`,
        data: { marked_count: count }
      });

    } catch (error: any) {
      console.error('Error in markAllAsRead:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to mark all notifications as read'
      });
    }
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      const result = await NotificationService.getNotifications({
        recipient_id: userId.toString(),
        read: false,
        limit: 0 // Just get count
      });

      res.json({
        success: true,
        data: {
          unread_count: result.unread
        }
      });

    } catch (error: any) {
      console.error('Error in getUnreadCount:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get unread count'
      });
    }
  }

  /**
   * Create notification (admin only)
   */
  static async createNotification(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
        return;
      }

      const senderId = req.user?.id || req.user?.id;
      if (!senderId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      const {
        recipient_id,
        type,
        title,
        message,
        action_url,
        priority,
        data
      } = req.body;

      const notification = await NotificationService.create({
        recipient_id,
        sender_id: senderId.toString(),
        type,
        title,
        message,
        action_url,
        priority,
        data
      });

      res.status(201).json({
        success: true,
        message: 'Notification created successfully',
        data: { notification }
      });

    } catch (error: any) {
      console.error('Error in createNotification:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create notification'
      });
    }
  }
}

// Validation schemas
export const getNotificationsValidation = [
  query('type').optional().isString().withMessage('Type must be a string'),
  query('read').optional().isBoolean().withMessage('Read must be boolean'),
  query('priority').optional().isString().withMessage('Priority must be a string'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be a non-negative integer')
];

export const createNotificationValidation = [
  body('recipient_id').isMongoId().withMessage('Valid recipient ID is required'),
  body('type').isIn(Object.values(NotificationType)).withMessage('Valid notification type is required'),
  body('title').isLength({ min: 1, max: 200 }).withMessage('Title must be 1-200 characters'),
  body('message').isLength({ min: 1, max: 500 }).withMessage('Message must be 1-500 characters'),
  body('action_url').optional().isURL().withMessage('Action URL must be valid'),
  body('priority').optional().isIn(Object.values(NotificationPriority)).withMessage('Valid priority is required'),
  body('data').optional().isObject().withMessage('Data must be an object')
];