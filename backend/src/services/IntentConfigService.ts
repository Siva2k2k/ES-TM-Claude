import IntentDefinition, { IIntentDefinition } from '../models/IntentDefinition';
import UserVoicePreferences, { IUserVoicePreferences } from '../models/UserVoicePreferences';
import { IUser } from '../models/User';
import logger from '../config/logger';
import { Types } from 'mongoose';

class IntentConfigService {
  /**
   * Get all active intent definitions
   */
  async getAllIntents(): Promise<IIntentDefinition[]> {
    return await IntentDefinition.find({ isActive: true }).sort({ category: 1, intent: 1 });
  }

  /**
   * Get intents by category
   */
  async getIntentsByCategory(category: string): Promise<IIntentDefinition[]> {
    return await IntentDefinition.find({ category, isActive: true }).sort({ intent: 1 });
  }

  /**
   * Get intents allowed for a specific role
   */
  async getIntentsForRole(role: string): Promise<IIntentDefinition[]> {
    return await IntentDefinition.find({
      isActive: true,
      allowedRoles: role
    }).sort({ category: 1, intent: 1 });
  }

  /**
   * Get allowed and disallowed intents for a user
   */
  async getIntentsForUser(user: IUser): Promise<{
    allowed: IIntentDefinition[];
    disallowed: IIntentDefinition[];
  }> {
    // Get all active intents
    const allIntents = await IntentDefinition.find({ isActive: true });

    // Get user preferences
    const userPreferences = await this.getUserVoicePreferences(user._id);

    // Filter based on role and user preferences
    const allowed: IIntentDefinition[] = [];
    const disallowed: IIntentDefinition[] = [];

    for (const intent of allIntents) {
      // Check if role is allowed
      const roleAllowed = intent.allowedRoles.includes(user.role as any);

      // Check user-specific overrides
      let isAllowed = roleAllowed;

      if (userPreferences) {
        if (userPreferences.disabledIntents.includes(intent.intent)) {
          isAllowed = false;
        } else if (userPreferences.enabledIntents.includes(intent.intent)) {
          isAllowed = true; // User-specific enable override
        }
      }

      if (isAllowed) {
        allowed.push(intent);
      } else {
        disallowed.push(intent);
      }
    }

    return { allowed, disallowed };
  }

  /**
   * Get intent definition by intent name
   */
  async getIntentDefinition(intent: string): Promise<IIntentDefinition | null> {
    return await IntentDefinition.findOne({ intent, isActive: true });
  }

  /**
   * Get multiple intent definitions
   */
  async getIntentDefinitions(intents: string[]): Promise<IIntentDefinition[]> {
    return await IntentDefinition.find({
      intent: { $in: intents },
      isActive: true
    });
  }

  /**
   * Create a new intent definition
   */
  async createIntent(intentData: Partial<IIntentDefinition>): Promise<IIntentDefinition> {
    const intent = new IntentDefinition(intentData);
    await intent.save();

    logger.info('Intent definition created', { intent: intent.intent });

    return intent;
  }

  /**
   * Update an intent definition
   */
  async updateIntent(
    intent: string,
    updates: Partial<IIntentDefinition>
  ): Promise<IIntentDefinition | null> {
    const updated = await IntentDefinition.findOneAndUpdate(
      { intent },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (updated) {
      logger.info('Intent definition updated', { intent });
    }

    return updated;
  }

  /**
   * Deactivate an intent definition
   */
  async deactivateIntent(intent: string): Promise<boolean> {
    const result = await IntentDefinition.updateOne({ intent }, { $set: { isActive: false } });

    if (result.modifiedCount > 0) {
      logger.info('Intent definition deactivated', { intent });
      return true;
    }

    return false;
  }

  /**
   * Delete an intent definition
   */
  async deleteIntent(intent: string): Promise<boolean> {
    const result = await IntentDefinition.deleteOne({ intent });

    if (result.deletedCount > 0) {
      logger.info('Intent definition deleted', { intent });
      return true;
    }

    return false;
  }

  /**
   * Get user voice preferences
   */
  async getUserVoicePreferences(userId: Types.ObjectId): Promise<IUserVoicePreferences | null> {
    return await UserVoicePreferences.findOne({ user_id: userId });
  }

  /**
   * Create or update user voice preferences
   */
  async updateUserVoicePreferences(
    userId: Types.ObjectId,
    preferences: Partial<IUserVoicePreferences>
  ): Promise<IUserVoicePreferences> {
    const updated = await UserVoicePreferences.findOneAndUpdate(
      { user_id: userId },
      { $set: preferences },
      { upsert: true, new: true, runValidators: true }
    );

    logger.info('User voice preferences updated', { userId });

    return updated;
  }

  /**
   * Enable intent for user
   */
  async enableIntentForUser(userId: Types.ObjectId, intent: string): Promise<void> {
    await UserVoicePreferences.findOneAndUpdate(
      { user_id: userId },
      {
        $addToSet: { enabledIntents: intent },
        $pull: { disabledIntents: intent }
      },
      { upsert: true }
    );

    logger.info('Intent enabled for user', { userId, intent });
  }

  /**
   * Disable intent for user
   */
  async disableIntentForUser(userId: Types.ObjectId, intent: string): Promise<void> {
    await UserVoicePreferences.findOneAndUpdate(
      { user_id: userId },
      {
        $addToSet: { disabledIntents: intent },
        $pull: { enabledIntents: intent }
      },
      { upsert: true }
    );

    logger.info('Intent disabled for user', { userId, intent });
  }

  /**
   * Add command to user history
   */
  async addCommandToHistory(
    userId: Types.ObjectId,
    command: string,
    intent: string,
    success: boolean
  ): Promise<void> {
    await UserVoicePreferences.findOneAndUpdate(
      { user_id: userId },
      {
        $push: {
          commandHistory: {
            $each: [{ command, intent, timestamp: new Date(), success }],
            $slice: -50 // Keep only last 50 entries
          }
        }
      },
      { upsert: true }
    );
  }

  /**
   * Get user command history
   */
  async getUserCommandHistory(userId: Types.ObjectId, limit = 20): Promise<any[]> {
    const preferences = await UserVoicePreferences.findOne({ user_id: userId });

    if (!preferences || !preferences.commandHistory) {
      return [];
    }

    return preferences.commandHistory
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get intent statistics
   */
  async getIntentStatistics(): Promise<any> {
    const totalIntents = await IntentDefinition.countDocuments({ isActive: true });
    const byCategory = await IntentDefinition.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const byRole = await IntentDefinition.aggregate([
      { $match: { isActive: true } },
      { $unwind: '$allowedRoles' },
      { $group: { _id: '$allowedRoles', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    return {
      total: totalIntents,
      byCategory,
      byRole
    };
  }
}

export default new IntentConfigService();
