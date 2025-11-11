import { Types } from 'mongoose';
import Client from '../models/Client';
import User from '../models/User';
import Project from '../models/Project';
import Task from '../models/Task';
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

interface EntityConfig {
  model: any;
  nameField: string;
  searchFields: string[];
  additionalFilters?: Record<string, any>;
  entityName: string;
}

interface NameResolverResult {
  success: boolean;
  id?: Types.ObjectId;
  error?: FieldMappingError;
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
   * Universal name-to-ID resolver for any entity type
   * @param identifier - Name, email, or ID string to resolve
   * @param entityType - Type of entity ('client', 'user', 'project', 'manager')
   * @param fieldName - Name of the field being mapped (for error reporting)
   * @returns Promise with resolution result
   */
  async resolveNameToId(
    identifier: string, 
    entityType: 'client' | 'user' | 'project' | 'manager' | 'task',
    fieldName: string = `${entityType}_id`
  ): Promise<NameResolverResult> {
    try {
      const entityConfig = this.getEntityConfig(entityType);
      
      // Check if already an ObjectId
      if (Types.ObjectId.isValid(identifier) && identifier.length === 24) {
        const entity = await entityConfig.model.findOne({ 
          _id: identifier, 
          ...entityConfig.additionalFilters 
        });
        
        if (entity) {
          return { success: true, id: entity._id as Types.ObjectId };
        }
      }

      // Try exact matches on all search fields
      for (const searchField of entityConfig.searchFields) {
        const entity = await entityConfig.model.findOne({
          [searchField]: { $regex: new RegExp(`^${this.escapeRegex(identifier)}$`, 'i') },
          ...entityConfig.additionalFilters
        });

        if (entity) {
          logger.info(`${entityConfig.entityName} resolved`, { 
            input: identifier, 
            matched: entity[entityConfig.nameField], 
            id: entity._id,
            matchedField: searchField
          });
          return { success: true, id: entity._id as Types.ObjectId };
        }
      }

      // Try fuzzy matching on all search fields
      const fuzzyQueries = entityConfig.searchFields.map(field => ({
        [field]: { $regex: new RegExp(this.escapeRegex(identifier), 'i') }
      }));

      const fuzzyMatches = await entityConfig.model.find({
        $or: fuzzyQueries,
        ...entityConfig.additionalFilters
      }).limit(5);

      if (fuzzyMatches.length === 1) {
        logger.info(`${entityConfig.entityName} fuzzy matched`, { 
          input: identifier, 
          matched: fuzzyMatches[0][entityConfig.nameField] 
        });
        return { success: true, id: fuzzyMatches[0]._id as Types.ObjectId };
      }

      // Get suggestions for error message
      const allEntities = await entityConfig.model.find({ 
        ...entityConfig.additionalFilters 
      })
        .select(entityConfig.nameField)
        .limit(10)
        .lean();

      return {
        success: false,
        error: {
          field: fieldName,
          message: `${entityConfig.entityName} '${identifier}' not found`,
          suggestions: fuzzyMatches.length > 0
            ? fuzzyMatches.map(e => e[entityConfig.nameField])
            : allEntities.map(e => e[entityConfig.nameField]),
          receivedValue: identifier
        }
      };

    } catch (error) {
      logger.error(`Error resolving ${entityType} ID`, { identifier, error });
      return {
        success: false,
        error: {
          field: fieldName,
          message: `Failed to resolve ${entityType}`,
          receivedValue: identifier
        }
      };
    }
  }

  /**
   * Get entity configuration for different types
   */
  private getEntityConfig(entityType: 'client' | 'user' | 'project' | 'manager' | 'task'): EntityConfig {
    switch (entityType) {
      case 'client':
        return {
          model: Client,
          nameField: 'name',
          searchFields: ['name'],
          additionalFilters: { deleted_at: { $exists: false } },
          entityName: 'Client'
        };
      
      case 'user':
        return {
          model: User,
          nameField: 'full_name',
          searchFields: ['full_name', 'email'],
          additionalFilters: { is_hard_deleted: false },
          entityName: 'User'
        };
      
      case 'project':
        return {
          model: Project,
          nameField: 'name',
          searchFields: ['name'],
          additionalFilters: { is_hard_deleted: false },
          entityName: 'Project'
        };
      
      case 'manager':
        return {
          model: User,
          nameField: 'full_name',
          searchFields: ['full_name', 'email'],
          additionalFilters: { role: 'manager', is_hard_deleted: false },
          entityName: 'Manager'
        };
      
      case 'task':
        return {
          model: Task,
          nameField: 'name',
          searchFields: ['name'],
          additionalFilters: { deleted_at: { $exists: false } },
          entityName: 'Task'
        };
      
      default:
        throw new Error(`Unsupported entity type: ${entityType}`);
    }
  }
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
   * Map create_task intent data
   */
  async mapTaskCreation(data: Record<string, any>): Promise<MappingResult> {
    const errors: FieldMappingError[] = [];
    const mapped: Record<string, any> = {};

    // Map task name
    if (data.taskName || data.task_name || data.name) {
      mapped.name = data.taskName || data.task_name || data.name;
    } else {
      errors.push({
        field: 'name',
        message: 'Task name is required',
        receivedValue: undefined
      });
    }

    // Map description
    if (data.description) {
      mapped.description = data.description;
    }

    // Resolve project name to project_id
    if (data.projectId || data.project_id || data.projectName || data.project_name) {
      const projectIdentifier = data.projectId || data.project_id || data.projectName || data.project_name;
      const projectResult = await this.resolveNameToId(projectIdentifier, 'project', 'project_id');

      if (projectResult.success) {
        mapped.project_id = projectResult.id;
      } else {
        errors.push(projectResult.error!);
      }
    } else {
      errors.push({
        field: 'project_id',
        message: 'Project is required',
        receivedValue: undefined
      });
    }

    // Resolve assigned user name to assigned_to_user_id
    if (data.assignedTo || data.assigned_to || data.assignedToUserId || data.assigned_to_user_id || 
        data.assignedUser || data.assigned_user) {
      const userIdentifier = data.assignedTo || data.assigned_to || data.assignedToUserId || 
                            data.assigned_to_user_id || data.assignedUser || data.assigned_user;
      const userResult = await this.resolveNameToId(userIdentifier, 'user', 'assigned_to_user_id');

      if (userResult.success) {
        mapped.assigned_to_user_id = userResult.id;
      } else {
        errors.push(userResult.error!);
      }
    }

    // Map status
    if (data.status) {
      mapped.status = data.status.toLowerCase();
    } else {
      mapped.status = 'open'; // Default status
    }

    // Map estimated hours
    if (data.estimatedHours !== undefined || data.estimated_hours !== undefined) {
      const hours = data.estimatedHours ?? data.estimated_hours;
      mapped.estimated_hours = parseFloat(hours);

      if (isNaN(mapped.estimated_hours) || mapped.estimated_hours < 0) {
        errors.push({
          field: 'estimated_hours',
          message: 'Invalid estimated hours value',
          receivedValue: hours
        });
      }
    }

    // Map is_billable
    if (data.isBillable !== undefined || data.is_billable !== undefined) {
      mapped.is_billable = data.isBillable ?? data.is_billable;
    } else {
      mapped.is_billable = true; // Default to billable
    }

    // Note: created_by_user_id should be set by the service layer based on the authenticated user

    return {
      success: errors.length === 0,
      data: mapped,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Map add_project_member intent data
   */
  async mapAddProjectMember(data: Record<string, any>): Promise<MappingResult> {
    const errors: FieldMappingError[] = [];
    const mapped: Record<string, any> = {};

    // Resolve project name to project_id
    if (data.projectId || data.project_id || data.projectName || data.project_name) {
      const projectIdentifier = data.projectId || data.project_id || data.projectName || data.project_name;
      const projectResult = await this.resolveNameToId(projectIdentifier, 'project', 'project_id');

      if (projectResult.success) {
        mapped.project_id = projectResult.id;
      } else {
        errors.push(projectResult.error!);
      }
    } else {
      errors.push({
        field: 'project_id',
        message: 'Project is required',
        receivedValue: undefined
      });
    }

    // Resolve user name to user_id
    if (data.userId || data.user_id || data.userName || data.user_name || data.name) {
      const userIdentifier = data.userId || data.user_id || data.userName || data.user_name || data.name;
      const userResult = await this.resolveNameToId(userIdentifier, 'user', 'user_id');

      if (userResult.success) {
        mapped.user_id = userResult.id;
      } else {
        errors.push(userResult.error!);
      }
    } else {
      errors.push({
        field: 'user_id',
        message: 'User is required',
        receivedValue: undefined
      });
    }

    // Map role
    if (data.role) {
      mapped.role = data.role.toLowerCase();
    } else {
      mapped.role = 'employee'; // Default role
    }

    return {
      success: errors.length === 0,
      data: mapped,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Map remove_project_member intent data
   */
  async mapRemoveProjectMember(data: Record<string, any>): Promise<MappingResult> {
    const errors: FieldMappingError[] = [];
    const mapped: Record<string, any> = {};

    // Resolve project name to project_id
    if (data.projectId || data.project_id || data.projectName || data.project_name) {
      const projectIdentifier = data.projectId || data.project_id || data.projectName || data.project_name;
      const projectResult = await this.resolveNameToId(projectIdentifier, 'project', 'project_id');

      if (projectResult.success) {
        mapped.project_id = projectResult.id;
        logger.info('Project resolved for remove operation', {
          input: projectIdentifier,
          resolvedId: projectResult.id,
          idType: typeof projectResult.id
        });
      } else {
        errors.push(projectResult.error!);
      }
    } else {
      errors.push({
        field: 'project_id',
        message: 'Project is required',
        receivedValue: undefined
      });
    }

    // Resolve user name to user_id
    if (data.userId || data.user_id || data.userName || data.user_name || data.name) {
      const userIdentifier = data.userId || data.user_id || data.userName || data.user_name || data.name;
      const userResult = await this.resolveNameToId(userIdentifier, 'user', 'user_id');

      if (userResult.success) {
        mapped.user_id = userResult.id;
      } else {
        errors.push(userResult.error!);
      }
    } else {
      errors.push({
        field: 'user_id',
        message: 'User is required',
        receivedValue: undefined
      });
    }

    // Map role (optional for remove operations)
    if (data.role) {
      mapped.role = data.role.toLowerCase();
    }

    return {
      success: errors.length === 0,
      data: mapped,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Map update_client intent data
   */
  async mapUpdateClient(data: Record<string, any>): Promise<MappingResult> {
    const errors: FieldMappingError[] = [];
    const mapped: Record<string, any> = {};

    // Resolve client name to client_id (required for updates)
    if (data.clientId || data.client_id || data.clientName || data.client_name) {
      const clientIdentifier = data.clientId || data.client_id || data.clientName || data.client_name;
      const clientResult = await this.resolveNameToId(clientIdentifier, 'client', 'client_id');

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

    // Map updateable fields
    if (data.name) {
      mapped.name = data.name;
    }

    if (data.contactPerson || data.contact_person) {
      mapped.contact_person = data.contactPerson || data.contact_person;
    }

    if (data.contactEmail || data.contact_email) {
      mapped.contact_email = data.contactEmail || data.contact_email;
    }

    if (data.phone) {
      mapped.phone = data.phone;
    }

    if (data.address) {
      mapped.address = data.address;
    }

    if (data.isActive !== undefined || data.is_active !== undefined) {
      mapped.is_active = data.isActive ?? data.is_active;
    }

    return {
      success: errors.length === 0,
      data: mapped,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Map delete_client intent data
   */
  async mapDeleteClient(data: Record<string, any>): Promise<MappingResult> {
    const errors: FieldMappingError[] = [];
    const mapped: Record<string, any> = {};

    // Resolve client name to client_id
    if (data.clientId || data.client_id || data.clientName || data.client_name) {
      const clientIdentifier = data.clientId || data.client_id || data.clientName || data.client_name;
      const clientResult = await this.resolveNameToId(clientIdentifier, 'client', 'client_id');

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

    // Map reason (required)
    if (data.reason) {
      mapped.reason = data.reason;
    } else {
      errors.push({
        field: 'reason',
        message: 'Deletion reason is required',
        receivedValue: undefined
      });
    }

    return {
      success: errors.length === 0,
      data: mapped,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Map add_entries intent data
   */
  async mapAddEntries(data: Record<string, any>): Promise<MappingResult> {
    const errors: FieldMappingError[] = [];
    const mapped: Record<string, any> = {};

    // Resolve project name to project_id
    if (data.projectId || data.project_id || data.projectName || data.project_name) {
      const projectIdentifier = data.projectId || data.project_id || data.projectName || data.project_name;
      const projectResult = await this.resolveNameToId(projectIdentifier, 'project', 'project_id');

      if (projectResult.success) {
        mapped.project_id = projectResult.id;
      } else {
        errors.push(projectResult.error!);
      }
    } else {
      errors.push({
        field: 'project_id',
        message: 'Project is required',
        receivedValue: undefined
      });
    }

    // Resolve task name to task_id
    if (data.taskId || data.task_id || data.taskName || data.task_name) {
      const taskIdentifier = data.taskId || data.task_id || data.taskName || data.task_name;
      
      if (data.taskName || data.task_name) {
        const taskResult = await this.resolveNameToId(taskIdentifier, 'task', 'task_id');
        if (taskResult.success) {
          mapped.task_id = taskResult.id;
        } else {
          errors.push(taskResult.error!);
        }
      } else {
        if (Types.ObjectId.isValid(taskIdentifier)) {
          mapped.task_id = new Types.ObjectId(taskIdentifier);
        } else {
          errors.push({
            field: 'task_id',
            message: 'Invalid task ID format',
            receivedValue: taskIdentifier
          });
        }
      }
    } else {
      errors.push({
        field: 'task_id',
        message: 'Task is required',
        receivedValue: undefined
      });
    }

    // Map date (required)
    if (data.date) {
      mapped.date = this.parseDate(data.date);
      if (!mapped.date) {
        errors.push({
          field: 'date',
          message: 'Invalid date format',
          receivedValue: data.date
        });
      }
    } else {
      errors.push({
        field: 'date',
        message: 'Date is required',
        receivedValue: undefined
      });
    }

    // Map hours (required)
    if (data.hours !== undefined) {
      mapped.hours = parseFloat(data.hours);
      if (isNaN(mapped.hours) || mapped.hours < 0) {
        errors.push({
          field: 'hours',
          message: 'Invalid hours value',
          receivedValue: data.hours
        });
      }
    } else {
      errors.push({
        field: 'hours',
        message: 'Hours is required',
        receivedValue: undefined
      });
    }

    // Map entry type (required)
    if (data.entryType || data.entry_type) {
      mapped.entry_type = (data.entryType || data.entry_type).toLowerCase();
    } else {
      mapped.entry_type = 'project'; // Default to project
    }

    // Map optional fields
    if (data.description) {
      mapped.description = data.description;
    }

    if (data.taskType || data.task_type) {
      mapped.task_type = (data.taskType || data.task_type).toLowerCase();
    }

    if (data.isBillable !== undefined || data.is_billable !== undefined) {
      mapped.is_billable = data.isBillable ?? data.is_billable;
    } else {
      mapped.is_billable = true; // Default to billable
    }

    return {
      success: errors.length === 0,
      data: mapped,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Map update_entries intent data
   */
  async mapUpdateEntries(data: Record<string, any>): Promise<MappingResult> {
    // Similar to mapAddEntries but for updates
    return this.mapAddEntries(data);
  }

  /**
   * Map delete_entries intent data
   */
  async mapDeleteEntries(data: Record<string, any>): Promise<MappingResult> {
    const errors: FieldMappingError[] = [];
    const mapped: Record<string, any> = {};

    // Map week start date
    if (data.weekStart || data.week_start) {
      mapped.week_start = this.parseDate(data.weekStart || data.week_start);
      if (!mapped.week_start) {
        errors.push({
          field: 'week_start',
          message: 'Invalid week start date format',
          receivedValue: data.weekStart || data.week_start
        });
      }
    }

    // Resolve project name to project_id
    if (data.projectId || data.project_id || data.projectName || data.project_name) {
      const projectIdentifier = data.projectId || data.project_id || data.projectName || data.project_name;
      const projectResult = await this.resolveNameToId(projectIdentifier, 'project', 'project_id');

      if (projectResult.success) {
        mapped.project_id = projectResult.id;
      } else {
        errors.push(projectResult.error!);
      }
    }

    return {
      success: errors.length === 0,
      data: mapped,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Map update_project intent data  
   */
  async mapUpdateProject(data: Record<string, any>): Promise<MappingResult> {
    const errors: FieldMappingError[] = [];
    const mapped: Record<string, any> = {};

    // Resolve project name to project_id (required for updates)
    if (data.projectId || data.project_id || data.projectName || data.project_name) {
      const projectIdentifier = data.projectId || data.project_id || data.projectName || data.project_name;
      const projectResult = await this.resolveNameToId(projectIdentifier, 'project', 'project_id');

      if (projectResult.success) {
        mapped.project_id = projectResult.id;
      } else {
        errors.push(projectResult.error!);
      }
    } else {
      errors.push({
        field: 'project_id',
        message: 'Project is required',
        receivedValue: undefined
      });
    }

    // Map updateable fields
    if (data.name) {
      mapped.name = data.name;
    }

    if (data.description) {
      mapped.description = data.description;
    }

    return {
      success: errors.length === 0,
      data: mapped,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Map update_task intent data
   */
  async mapUpdateTask(data: Record<string, any>): Promise<MappingResult> {
    const errors: FieldMappingError[] = [];
    const mapped: Record<string, any> = {};

    // Resolve task identifier to task_id
    if (data.taskId || data.task_id || data.taskName || data.task_name) {
      const taskIdentifier = data.taskId || data.task_id || data.taskName || data.task_name;
      
      if (data.taskName || data.task_name) {
        // If it's a name, we need to resolve it
        const taskResult = await this.resolveNameToId(taskIdentifier, 'task', 'task_id');
        if (taskResult.success) {
          mapped.task_id = taskResult.id;
        } else {
          errors.push(taskResult.error!);
        }
      } else {
        // If it's already an ID, just validate it
        if (Types.ObjectId.isValid(taskIdentifier)) {
          mapped.task_id = new Types.ObjectId(taskIdentifier);
        } else {
          errors.push({
            field: 'task_id',
            message: 'Invalid task ID format',
            receivedValue: taskIdentifier
          });
        }
      }
    } else {
      errors.push({
        field: 'task_id',
        message: 'Task is required',
        receivedValue: undefined
      });
    }

    // Map updateable fields
    if (data.name || data.taskName || data.task_name) {
      mapped.name = data.name || data.taskName || data.task_name;
    }

    if (data.description) {
      mapped.description = data.description;
    }

    return {
      success: errors.length === 0,
      data: mapped,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Map delete_project intent data
   */
  async mapDeleteProject(data: Record<string, any>): Promise<MappingResult> {
    const errors: FieldMappingError[] = [];
    const mapped: Record<string, any> = {};

    // Resolve project name to project_id
    if (data.projectId || data.project_id || data.projectName || data.project_name) {
      const projectIdentifier = data.projectId || data.project_id || data.projectName || data.project_name;
      const projectResult = await this.resolveNameToId(projectIdentifier, 'project', 'project_id');

      if (projectResult.success) {
        mapped.project_id = projectResult.id;
      } else {
        errors.push(projectResult.error!);
      }
    } else {
      errors.push({
        field: 'project_id',
        message: 'Project is required',
        receivedValue: undefined
      });
    }

    // Map reason (required)
    if (data.reason) {
      mapped.reason = data.reason;
    } else {
      errors.push({
        field: 'reason',
        message: 'Deletion reason is required',
        receivedValue: undefined
      });
    }

    return {
      success: errors.length === 0,
      data: mapped,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Map update_user intent data
   */
  async mapUpdateUser(data: Record<string, any>): Promise<MappingResult> {
    const errors: FieldMappingError[] = [];
    const mapped: Record<string, any> = {};

    // Resolve user name to user_id (required for updates)
    if (data.userId || data.user_id || data.userName || data.user_name) {
      const userIdentifier = data.userId || data.user_id || data.userName || data.user_name;
      const userResult = await this.resolveNameToId(userIdentifier, 'user', 'user_id');

      if (userResult.success) {
        mapped.user_id = userResult.id;
      } else {
        errors.push(userResult.error!);
      }
    } else {
      errors.push({
        field: 'user_id',
        message: 'User is required',
        receivedValue: undefined
      });
    }

    // Map updateable fields
    if (data.email) {
      mapped.email = data.email.toLowerCase();
    }

    if (data.role) {
      mapped.role = data.role.toLowerCase();
    }

    return {
      success: errors.length === 0,
      data: mapped,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Map delete_user intent data
   */
  async mapDeleteUser(data: Record<string, any>): Promise<MappingResult> {
    const errors: FieldMappingError[] = [];
    const mapped: Record<string, any> = {};

    // Resolve user name to user_id
    if (data.userId || data.user_id || data.userName || data.user_name) {
      const userIdentifier = data.userId || data.user_id || data.userName || data.user_name;
      const userResult = await this.resolveNameToId(userIdentifier, 'user', 'user_id');

      if (userResult.success) {
        mapped.user_id = userResult.id;
      } else {
        errors.push(userResult.error!);
      }
    } else {
      errors.push({
        field: 'user_id',
        message: 'User is required',
        receivedValue: undefined
      });
    }

    // Map reason (required)
    if (data.reason) {
      mapped.reason = data.reason;
    } else {
      errors.push({
        field: 'reason',
        message: 'Deletion reason is required',
        receivedValue: undefined
      });
    }

    return {
      success: errors.length === 0,
      data: mapped,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Map create_timesheet intent data
   */
  async mapCreateTimesheet(data: Record<string, any>): Promise<MappingResult> {
    const errors: FieldMappingError[] = [];
    const mapped: Record<string, any> = {};

    // Map week start date
    if (data.weekStart || data.week_start) {
      mapped.week_start = this.parseDate(data.weekStart || data.week_start);
      if (!mapped.week_start) {
        errors.push({
          field: 'week_start',
          message: 'Invalid week start date format',
          receivedValue: data.weekStart || data.week_start
        });
      }
    } else {
      errors.push({
        field: 'week_start',
        message: 'Week start date is required',
        receivedValue: undefined
      });
    }

    return {
      success: errors.length === 0,
      data: mapped,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Map delete_timesheet intent data  
   */
  async mapDeleteTimesheet(data: Record<string, any>): Promise<MappingResult> {
    const errors: FieldMappingError[] = [];
    const mapped: Record<string, any> = {};

    // Map week start date
    if (data.weekStart || data.week_start) {
      mapped.week_start = this.parseDate(data.weekStart || data.week_start);
      if (!mapped.week_start) {
        errors.push({
          field: 'week_start',
          message: 'Invalid week start date format',
          receivedValue: data.weekStart || data.week_start
        });
      }
    } else {
      errors.push({
        field: 'week_start',
        message: 'Week start date is required',
        receivedValue: undefined
      });
    }

    return {
      success: errors.length === 0,
      data: mapped,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Map copy_entry intent data
   */
  async mapCopyEntry(data: Record<string, any>): Promise<MappingResult> {
    return {
      success: true,
      data: data  // Simplified for now
    };
  }

  /**
   * Map team review actions (approve/reject user/project)
   */
  async mapTeamReviewAction(data: Record<string, any>): Promise<MappingResult> {
    const errors: FieldMappingError[] = [];
    const mapped: Record<string, any> = {};

    // Map week start date
    if (data.weekStart || data.week_start) {
      mapped.week_start = this.parseDate(data.weekStart || data.week_start);
    }

    // Resolve project name to project_id
    if (data.projectId || data.project_id || data.projectName || data.project_name) {
      const projectIdentifier = data.projectId || data.project_id || data.projectName || data.project_name;
      const projectResult = await this.resolveNameToId(projectIdentifier, 'project', 'project_id');

      if (projectResult.success) {
        mapped.project_id = projectResult.id;
      } else {
        errors.push(projectResult.error!);
      }
    }

    return {
      success: errors.length === 0,
      data: mapped,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Map export billing intents
   */
  async mapExportBilling(data: Record<string, any>): Promise<MappingResult> {
    const errors: FieldMappingError[] = [];
    const mapped: Record<string, any> = {};

    // Map date range
    if (data.startDate || data.start_date) {
      mapped.start_date = this.parseDate(data.startDate || data.start_date);
    }

    if (data.endDate || data.end_date) {
      mapped.end_date = this.parseDate(data.endDate || data.end_date);
    }

    // Map format
    if (data.format) {
      mapped.format = data.format.toLowerCase();
    } else {
      mapped.format = 'csv'; // Default format
    }

    return {
      success: errors.length === 0,
      data: mapped,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Map get_audit_logs intent data
   */
  async mapGetAuditLogs(data: Record<string, any>): Promise<MappingResult> {
    const errors: FieldMappingError[] = [];
    const mapped: Record<string, any> = {};

    // Map date range
    if (data.startDate || data.start_date) {
      mapped.start_date = this.parseDate(data.startDate || data.start_date);
    }

    if (data.endDate || data.end_date) {
      mapped.end_date = this.parseDate(data.endDate || data.end_date);
    }

    return {
      success: errors.length === 0,
      data: mapped,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Resolve client identifier (name or ID) to ObjectId
   * @deprecated Use resolveNameToId('client') instead
   */
  private async resolveClientId(identifier: string): Promise<{ success: boolean; id?: Types.ObjectId; error?: FieldMappingError }> {
    return this.resolveNameToId(identifier, 'client', 'client_id');
  }

  /**
   * Resolve manager identifier (name or ID) to ObjectId
   * Note: Only returns users with "manager" role, not other management-level roles
   * @deprecated Use resolveNameToId('manager') instead
   */
  private async resolveManagerId(identifier: string): Promise<{ success: boolean; id?: Types.ObjectId; error?: FieldMappingError }> {
    return this.resolveNameToId(identifier, 'manager', 'primary_manager_id');
  }

  /**
   * Resolve user identifier (name or ID) to ObjectId
   * @deprecated Use resolveNameToId('user') instead
   */
  private async resolveUserId(identifier: string): Promise<{ success: boolean; id?: Types.ObjectId; error?: FieldMappingError }> {
    return this.resolveNameToId(identifier, 'user', 'user_id');
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

      case 'create_task':
        return this.mapTaskCreation(data);

      // Project Management
      case 'add_project_member':
        return this.mapAddProjectMember(data);

      case 'remove_project_member':
        return this.mapRemoveProjectMember(data);

      case 'update_project':
        return this.mapUpdateProject(data);

      case 'update_task':
        return this.mapUpdateTask(data);

      case 'delete_project':
        return this.mapDeleteProject(data);

      // User Management
      case 'update_user':
        return this.mapUpdateUser(data);

      case 'delete_user':
        return this.mapDeleteUser(data);

      // Client Management
      case 'update_client':
        return this.mapUpdateClient(data);

      case 'delete_client':
        return this.mapDeleteClient(data);

      // Timesheet Management
      case 'add_entries':
        return this.mapAddEntries(data);

      case 'update_entries':
        return this.mapUpdateEntries(data);

      case 'delete_entries':
        return this.mapDeleteEntries(data);

      case 'create_timesheet':
        return this.mapCreateTimesheet(data);

      case 'delete_timesheet':
        return this.mapDeleteTimesheet(data);

      case 'copy_entry':
        return this.mapCopyEntry(data);

      // Team Review
      case 'approve_user':
      case 'approve_project_week':
      case 'reject_user':
      case 'reject_project_week':
      case 'send_reminder':
        return this.mapTeamReviewAction(data);

      // Billing & Audit
      case 'export_project_billing':
      case 'export_user_billing':
        return this.mapExportBilling(data);

      case 'get_audit_logs':
        return this.mapGetAuditLogs(data);

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
export { FieldMappingError, MappingResult, EntityConfig, NameResolverResult };
