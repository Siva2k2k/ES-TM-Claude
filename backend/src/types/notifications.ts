/**
 * Notification Types
 * Types for notification service operations
 */

import mongoose from 'mongoose';
import type { NotificationType, NotificationPriority } from '../models/Notification';

/**
 * Create notification parameters
 */
export interface CreateNotificationParams {
  recipient_id: string | mongoose.Types.ObjectId;
  sender_id?: string | mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  action_url?: string;
  priority?: NotificationPriority;
  expires_at?: Date;
}

/**
 * Notification filters
 */
export interface NotificationFilters {
  recipient_id?: string;
  type?: NotificationType | NotificationType[];
  read?: boolean;
  priority?: NotificationPriority | NotificationPriority[];
  limit?: number;
  offset?: number;
}

/**
 * Notification update data
 */
export interface NotificationUpdateData {
  read?: boolean;
  read_at?: Date;
  deleted_at?: Date;
}

/**
 * Bulk notification result
 */
export interface BulkNotificationResult {
  success: boolean;
  sent_count: number;
  failed_count: number;
  recipient_ids: string[];
  errors?: string[];
}
