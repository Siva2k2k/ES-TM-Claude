import { Types } from 'mongoose';
import Client from '../models/Client';
import User from '../models/User';
import Project from '../models/Project';
import logger from '../config/logger';

interface FieldMappingError {
  field: string;
  message: string;
  suggestions?: string[];
  receivedValue?: any;
}

interface MappingResult {
  success: boolean;
  data?: Record<string, any>;
  errors?: FieldMappingError[];
}

/**
 * VoiceFieldMapper - Maps LLM-generated field values to service-compatible format
 *
 * Responsibilities:
 * 1. Convert field names (camelCase → snake_case)
 * 2. Resolve names to IDs (client name → client_id, manager name → manager_id)
 * 3. Convert types (string → ObjectId, string → Date)
 * 4. Provide detailed validation errors with suggestions
 */
class VoiceFieldMapper {
  /**
   * Map create_project intent data
   */
  async mapProjectCreation(data: Record<string, any>): Promise<MappingResult> {
    const errors: FieldMappingError[] = [];
    const mapped: Record<string, any> = {};

    // Map project name
    if (data.projectName || data.project_name || data.name) {
      mapped.name = data.projectName || data.project_name || data.name;
    } else {
      errors.push({
        field: 'name',
        message: 'Project name is required',
        receivedValue: undefined
      });
    }

    // Map description
    if (data.description) {
      mapped.description = data.description;
    }

    // Resolve client name to client_id
    if (data.clientId || data.client_id || data.clientName || data.client_name) {
      const clientIdentifier = data.clientId || data.client_id || data.clientName || data.client_name;
      const clientResult = await this.resolveClientId(clientIdentifier);

      if (clientResult.success) {
        mapped.client_id = clientResult.id;
      } else {
        errors.push(clientResult.error!);
      }
    } else {
      errors.push({
        field: 'client_id',
        message: 'Client is required',
        receivedValue: undefined
      });
    }

    // Resolve manager name to primary_manager_id
    if (data.managerId || data.manager_id || data.managerName || data.manager_name ||
        data.primaryManagerId || data.primary_manager_id) {
      const managerIdentifier = data.managerId || data.manager_id || data.managerName ||
                                data.manager_name || data.primaryManagerId || data.primary_manager_id;
      const managerResult = await this.resolveManagerId(managerIdentifier);

      if (managerResult.success) {
        mapped.primary_manager_id = managerResult.id;
      } else {
        errors.push(managerResult.error!);
      }
    } else {
      errors.push({
        field: 'primary_manager_id',
        message: 'Project manager is required',
        receivedValue: undefined
      });
    }

    // Map dates
    if (data.startDate || data.start_date) {
      const dateStr = data.startDate || data.start_date;
      mapped.start_date = this.parseDate(dateStr);

      if (!mapped.start_date) {
        errors.push({
          field: 'start_date',
          message: 'Invalid start date format',
          receivedValue: dateStr
        });
      }
    }

    if (data.endDate || data.end_date) {
      const dateStr = data.endDate || data.end_date;
      mapped.end_date = this.parseDate(dateStr);

      if (!mapped.end_date) {
        errors.push({
          field: 'end_date',
          message: 'Invalid end date format',
          receivedValue: dateStr
        });
      }
    }

    // Validate date logic
    if (mapped.start_date && mapped.end_date && mapped.start_date > mapped.end_date) {
      errors.push({
        field: 'end_date',
        message: 'End date must be after start date',
        receivedValue: data.endDate || data.end_date
      });
    }

    // Map status
    if (data.status) {
      mapped.status = data.status.toLowerCase();
    }

    // Map budget
    if (data.budget !== undefined) {
      mapped.budget = parseFloat(data.budget);
      if (isNaN(mapped.budget)) {
        errors.push({
          field: 'budget',
          message: 'Invalid budget value',
          receivedValue: data.budget
        });
      }
    }

    // Map is_billable
    if (data.isBillable !== undefined || data.is_billable !== undefined) {
      mapped.is_billable = data.isBillable ?? data.is_billable;
    }

    return {
      success: errors.length === 0,
      data: mapped,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Map create_client intent data
   */
  async mapClientCreation(data: Record<string, any>): Promise<MappingResult> {
    const errors: FieldMappingError[] = [];
    const mapped: Record<string, any> = {};

    // Map client name
    if (data.clientName || data.client_name || data.name) {
      mapped.name = data.clientName || data.client_name || data.name;
    } else {
      errors.push({
        field: 'name',
        message: 'Client name is required',
        receivedValue: undefined
      });
    }

    // Map contact person
    if (data.contactPerson || data.contact_person) {
      mapped.contact_person = data.contactPerson || data.contact_person;
    }

    // Map contact email
    if (data.contactEmail || data.contact_email) {
      mapped.contact_email = data.contactEmail || data.contact_email;
    }

    // Map phone
    if (data.phone) {
      mapped.phone = data.phone;
    }

    // Map address
    if (data.address) {
      mapped.address = data.address;
    }

    // Map is_active
    if (data.isActive !== undefined || data.is_active !== undefined) {
      mapped.is_active = data.isActive ?? data.is_active ?? true;
    } else {
      mapped.is_active = true; // Default to active
    }

    return {
      success: errors.length === 0,
      data: mapped,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Map create_user intent data
   */
  async mapUserCreation(data: Record<string, any>): Promise<MappingResult> {
    const errors: FieldMappingError[] = [];
    const mapped: Record<string, any> = {};

    // Map full name
    if (data.userName || data.user_name || data.fullName || data.full_name || data.name) {
      mapped.full_name = data.userName || data.user_name || data.fullName || data.full_name || data.name;
    } else {
      errors.push({
        field: 'full_name',
        message: 'User name is required',
        receivedValue: undefined
      });
    }

    // Map email
    if (data.email) {
      mapped.email = data.email.toLowerCase();
    } else {
      errors.push({
        field: 'email',
        message: 'Email is required',
        receivedValue: undefined
      });
    }

    // Map role
    if (data.role) {
      mapped.role = data.role.toLowerCase();
    } else {
      errors.push({
        field: 'role',
        message: 'User role is required',
        receivedValue: undefined
      });
    }

    // Map hourly rate
    if (data.hourlyRate !== undefined || data.hourly_rate !== undefined) {
      const rate = data.hourlyRate ?? data.hourly_rate;
      mapped.hourly_rate = parseFloat(rate);

      if (isNaN(mapped.hourly_rate)) {
        errors.push({
          field: 'hourly_rate',
          message: 'Invalid hourly rate',
          receivedValue: rate
        });
      }
    }

    // Map phone
    if (data.phone) {
      mapped.phone = data.phone;
    }

    return {
      success: errors.length === 0,
      data: mapped,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Resolve client identifier (name or ID) to ObjectId
   */
  private async resolveClientId(identifier: string): Promise<{ success: boolean; id?: Types.ObjectId; error?: FieldMappingError }> {
    try {
      // Check if already an ObjectId
      if (Types.ObjectId.isValid(identifier) && identifier.length === 24) {
        const client = await (Client as any).findOne({ _id: identifier, deleted_at: null });
        if (client) {
          return { success: true, id: client._id as Types.ObjectId };
        }
      }

      // Try exact name match (case-insensitive)
      let client = await (Client as any).findOne({
        name: { $regex: new RegExp(`^${this.escapeRegex(identifier)}$`, 'i') },
        deleted_at: null
      });

      if (client) {
        logger.info('Client resolved', { input: identifier, matched: client.name, id: client._id });
        return { success: true, id: client._id as Types.ObjectId };
      }

      // Try fuzzy match
      const fuzzyMatches = await (Client as any).find({
        name: { $regex: new RegExp(this.escapeRegex(identifier), 'i') },
        deleted_at: null
      }).limit(5);

      if (fuzzyMatches.length === 1) {
        logger.info('Client fuzzy matched', { input: identifier, matched: fuzzyMatches[0].name });
        return { success: true, id: fuzzyMatches[0]._id as Types.ObjectId };
      }

      // Get suggestions
      const allClients = await (Client as any).find({ deleted_at: null })
        .select('name')
        .limit(10)
        .lean();

      return {
        success: false,
        error: {
          field: 'client_id',
          message: `Client '${identifier}' not found`,
          suggestions: fuzzyMatches.length > 0
            ? fuzzyMatches.map(c => c.name)
            : allClients.map(c => c.name),
          receivedValue: identifier
        }
      };
    } catch (error) {
      logger.error('Error resolving client ID', { identifier, error });
      return {
        success: false,
        error: {
          field: 'client_id',
          message: 'Failed to resolve client',
          receivedValue: identifier
        }
      };
    }
  }

  /**
   * Resolve manager identifier (name or ID) to ObjectId
   * Note: Only returns users with "manager" role, not other management-level roles
   */
  private async resolveManagerId(identifier: string): Promise<{ success: boolean; id?: Types.ObjectId; error?: FieldMappingError }> {
    try {
      // Check if already an ObjectId
      if (Types.ObjectId.isValid(identifier) && identifier.length === 24) {
        const user = await (User as any).findOne({
          _id: identifier,
          role: 'manager', // Only actual managers, not management/lead/super_admin
          deleted_at: null
        });
        if (user) {
          return { success: true, id: user._id as Types.ObjectId };
        }
      }

      // Try exact name match (case-insensitive)
      let manager = await (User as any).findOne({
        full_name: { $regex: new RegExp(`^${this.escapeRegex(identifier)}$`, 'i') },
        role: 'manager', // Only actual managers
        deleted_at: null
      });

      if (manager) {
        logger.info('Manager resolved', { input: identifier, matched: manager.full_name, id: manager._id });
        return { success: true, id: manager._id as Types.ObjectId };
      }

      // Try fuzzy match
      const fuzzyMatches = await (User as any).find({
        full_name: { $regex: new RegExp(this.escapeRegex(identifier), 'i') },
        role: 'manager', // Only actual managers
        deleted_at: null
      }).limit(5);

      if (fuzzyMatches.length === 1) {
        logger.info('Manager fuzzy matched', { input: identifier, matched: fuzzyMatches[0].full_name });
        return { success: true, id: fuzzyMatches[0]._id as Types.ObjectId };
      }

      // Get suggestions
      const allManagers = await (User as any).find({
        role: 'manager', // Only actual managers
        deleted_at: null
      })
        .select('full_name')
        .limit(10)
        .lean();

      return {
        success: false,
        error: {
          field: 'primary_manager_id',
          message: `Manager '${identifier}' not found`,
          suggestions: fuzzyMatches.length > 0
            ? fuzzyMatches.map(u => u.full_name)
            : allManagers.map(u => u.full_name),
          receivedValue: identifier
        }
      };
    } catch (error) {
      logger.error('Error resolving manager ID', { identifier, error });
      return {
        success: false,
        error: {
          field: 'primary_manager_id',
          message: 'Failed to resolve manager',
          receivedValue: identifier
        }
      };
    }
  }

  /**
   * Resolve user identifier (name or ID) to ObjectId
   */
  private async resolveUserId(identifier: string): Promise<{ success: boolean; id?: Types.ObjectId; error?: FieldMappingError }> {
    try {
      // Check if already an ObjectId
      if (Types.ObjectId.isValid(identifier) && identifier.length === 24) {
        const user = await (User as any).findOne({ _id: identifier, deleted_at: null });
        if (user) {
          return { success: true, id: user._id as Types.ObjectId };
        }
      }

      // Try exact name match (case-insensitive)
      let user = await (User as any).findOne({
        full_name: { $regex: new RegExp(`^${this.escapeRegex(identifier)}$`, 'i') },
        deleted_at: null
      });

      if (user) {
        logger.info('User resolved', { input: identifier, matched: user.full_name, id: user._id });
        return { success: true, id: user._id as Types.ObjectId };
      }

      // Try email match
      user = await (User as any).findOne({
        email: { $regex: new RegExp(`^${this.escapeRegex(identifier)}$`, 'i') },
        deleted_at: null
      });

      if (user) {
        logger.info('User resolved by email', { input: identifier, matched: user.email, id: user._id });
        return { success: true, id: user._id as Types.ObjectId };
      }

      // Try fuzzy match
      const fuzzyMatches = await (User as any).find({
        $or: [
          { full_name: { $regex: new RegExp(this.escapeRegex(identifier), 'i') } },
          { email: { $regex: new RegExp(this.escapeRegex(identifier), 'i') } }
        ],
        deleted_at: null
      }).limit(5);

      if (fuzzyMatches.length === 1) {
        logger.info('User fuzzy matched', { input: identifier, matched: fuzzyMatches[0].full_name });
        return { success: true, id: fuzzyMatches[0]._id as Types.ObjectId };
      }

      // Get suggestions
      const allUsers = await (User as any).find({ deleted_at: null })
        .select('full_name')
        .limit(10)
        .lean();

      return {
        success: false,
        error: {
          field: 'user_id',
          message: `User '${identifier}' not found`,
          suggestions: fuzzyMatches.length > 0
            ? fuzzyMatches.map(u => u.full_name)
            : allUsers.map(u => u.full_name),
          receivedValue: identifier
        }
      };
    } catch (error) {
      logger.error('Error resolving user ID', { identifier, error });
      return {
        success: false,
        error: {
          field: 'user_id',
          message: 'Failed to resolve user',
          receivedValue: identifier
        }
      };
    }
  }

  /**
   * Parse date string to Date object
   */
  private parseDate(dateStr: string | Date): Date | null {
    if (dateStr instanceof Date) {
      return dateStr;
    }

    if (!dateStr) {
      return null;
    }

    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return null;
      }
      return date;
    } catch (error) {
      return null;
    }
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Generic mapper - routes to specific mappers based on intent
   */
  async mapFields(intent: string, data: Record<string, any>): Promise<MappingResult> {
    switch (intent) {
      case 'create_project':
        return this.mapProjectCreation(data);

      case 'create_client':
        return this.mapClientCreation(data);

      case 'create_user':
        return this.mapUserCreation(data);

      // Add more intent mappers as needed
      default:
        logger.warn('No field mapper for intent', { intent });
        return {
          success: true,
          data: data  // Pass through unchanged
        };
    }
  }
}

export default new VoiceFieldMapper();
export { FieldMappingError, MappingResult };
