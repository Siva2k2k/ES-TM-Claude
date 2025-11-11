import { IUser } from '../models/User';
import { VoiceAction, ActionExecutionResult } from '../types/voice';
import { ProjectService } from './ProjectService';
import { UserService } from './UserService';
import { ClientService } from './ClientService';
import TimesheetService from './TimesheetService';
import VoiceFieldMapper from './VoiceFieldMapper';

import { logger } from '../config/logger';
import { TeamReviewApprovalService } from './TeamReviewApprovalService';
import { ProjectBillingService } from './ProjectBillingService';
import { AuditLogService } from './AuditLogService';
import { DefaulterService } from './DefaulterService';

// Helper function to convert IUser to AuthUser
function toAuthUser(user: IUser): {
  id: string;
  email: string;
  role: 'super_admin' | 'management' | 'manager' | 'lead' | 'employee';
  full_name: string;
  hourly_rate: number;
  is_active: boolean;
  is_approved_by_super_admin: boolean;
} {
  return {
    id: user._id.toString(),
    email: user.email,
    role: user.role as 'super_admin' | 'management' | 'manager' | 'lead' | 'employee',
    full_name: user.full_name,
    hourly_rate: user.hourly_rate,
    is_active: user.is_active,
    is_approved_by_super_admin: user.is_approved_by_super_admin
  };
}

// Helper function to validate ID format (MongoDB ObjectId or UUID)
function isValidId(id: string | undefined | null): boolean {
  if (!id || typeof id !== 'string') return false;
  const mongoIdPattern = /^[0-9a-fA-F]{24}$/;
  const uuidPattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  return mongoIdPattern.test(id) || uuidPattern.test(id);
}

/**
 * Role-Based Service Dispatcher for Voice Commands
 * Routes intent execution to appropriate service methods based on user role
 */
class RoleBasedServiceDispatcher {
  /**
   * Execute intent with role-based service routing
   */
  async executeIntent(action: VoiceAction, user: IUser): Promise<ActionExecutionResult> {
    const authUser = toAuthUser(user);
    const { intent, data } = action;

    logger.info('Executing role-based intent', {
      intent,
      userRole: user.role,
      userId: user._id
    });

    // Route to role-specific handlers
    switch (intent) {
      case 'create_user':
        return this.handleCreateUser(data, authUser);
      
      case 'create_project':
        return this.handleCreateProject(data, authUser);
      
      case 'create_client':
        return this.handleCreateClient(data, authUser);
      
      case 'update_user':
        return this.handleUpdateUser(data, authUser);
      
      case 'delete_user':
        return this.handleDeleteUser(data, authUser);
      
      case 'approve_user':
        return this.handleApproveUser(data, authUser);
      
      case 'add_entries':
        return this.handleAddEntries(data, authUser);
      
      case 'update_entries':
        return this.handleUpdateEntries(data, authUser);

      // Project Management
      case 'add_project_member':
        return this.handleAddProjectMember(data, authUser);

      case 'remove_project_member':
        return this.handleRemoveProjectMember(data, authUser);

      case 'add_task':
        return this.handleAddTask(data, authUser);

      case 'create_task':
        return this.handleAddTask(data, authUser);

      case 'update_project':
        return this.handleUpdateProject(data, authUser);

      case 'update_task':
        return this.handleUpdateTask(data, authUser);

      case 'delete_project':
        return this.handleDeleteProject(data, authUser);

      // Client Management
      case 'update_client':
        return this.handleUpdateClient(data, authUser);

      case 'delete_client':
        return this.handleDeleteClient(data, authUser);

      // Timesheet Management
      case 'create_timesheet':
        return this.handleCreateTimesheet(data, authUser);

      case 'delete_timesheet':
        return this.handleDeleteTimesheet(data, authUser);

      case 'delete_entries':
        return this.handleDeleteEntries(data, authUser);

      case 'copy_entry':
        return this.handleCopyEntry(data, authUser);

      // Team Review
      case 'approve_project_week':
        return this.handleApproveProjectWeek(data, authUser);

      case 'reject_user':
        return this.handleRejectUser(data, authUser);

      case 'reject_project_week':
        return this.handleRejectProjectWeek(data, authUser);

      case 'send_reminder':
        return this.handleSendReminder(data, authUser);

      // Billing & Audit
      case 'export_project_billing':
        return this.handleExportProjectBilling(data, authUser);

      case 'export_user_billing':
        return this.handleExportUserBilling(data, authUser);

      case 'get_audit_logs':
        return this.handleGetAuditLogs(data, authUser);

      default:
        throw new Error(`Intent '${intent}' not supported by role-based dispatcher`);
    }
  }

  /**
   * Role-based user creation
   * - super_admin: Direct creation with immediate activation
   * - management/manager: Creates user for approval workflow
   * - others: Permission denied
   */
  private async handleCreateUser(data: any, authUser: any): Promise<ActionExecutionResult> {
    // Map and validate fields first
    const mappingResult = await VoiceFieldMapper.mapUserCreation(data);

    if (!mappingResult.success) {
      return {
        intent: 'create_user',
        success: false,
        error: 'Validation failed: ' + mappingResult.errors?.map(e => e.message).join(', '),
        fieldErrors: mappingResult.errors
      };
    }

    const mappedData = mappingResult.data;

    // Role-based service routing
    switch (authUser.role) {
      case 'super_admin': {
        // Direct user creation with immediate activation
        const adminResult = await UserService.createUser(mappedData, authUser);
        
        if (adminResult.error) {
          return {
            intent: 'create_user',
            success: false,
            error: adminResult.error
          };
        }

        return {
          intent: 'create_user',
          success: true,
          data: adminResult.user,
          affectedEntities: [{
            type: 'user',
            id: adminResult.user._id.toString(),
            name: adminResult.user.full_name
          }]
        };
      }

      case 'management': {
        // Create user for approval workflow
        const approvalResult = await UserService.createUserForApproval(mappedData, authUser);
        
        if (approvalResult.error) {
          return {
            intent: 'create_user',
            success: false,
            error: approvalResult.error
          };
        }

        return {
          intent: 'create_user',
          success: true,
          data: {
            ...approvalResult.user,
            pendingApproval: true,
            message: 'User created and submitted for Super Admin approval'
          },
          affectedEntities: [{
            type: 'user',
            id: approvalResult.user._id.toString(),
            name: approvalResult.user.full_name
          }]
        };
      }

      default:
        return {
          intent: 'create_user',
          success: false,
          error: `Role '${authUser.role}' is not authorized to create users`
        };
    }
  }

  /**
   * Role-based project creation
   * - super_admin/management: Full project creation
   * - manager: Limited project creation with specific validations
   * - others: Permission denied
   */
  private async handleCreateProject(data: any, authUser: any): Promise<ActionExecutionResult> {
    const mappingResult = await VoiceFieldMapper.mapProjectCreation(data);

    if (!mappingResult.success) {
      return {
        intent: 'create_project',
        success: false,
        error: 'Validation failed: ' + mappingResult.errors?.map(e => e.message).join(', '),
        fieldErrors: mappingResult.errors
      };
    }

    const mappedData = mappingResult.data;

    // Role-based validation and service calls
    switch (authUser.role) {
      case 'super_admin':
      case 'management': {
        // Full project creation privileges
        const result = await ProjectService.createProject(mappedData, authUser);
        
        if (result.error) {
          return {
            intent: 'create_project',
            success: false,
            error: result.error
          };
        }

        return {
          intent: 'create_project',
          success: true,
          data: result.project,
          affectedEntities: [{
            type: 'project',
            id: result.project._id.toString(),
            name: result.project.name
          }]
        };
      }

      default:
        return {
          intent: 'create_project',
          success: false,
          error: `Role '${authUser.role}' is not authorized to create projects`
        };
    }
  }

  /**
   * Role-based client creation
   * - super_admin/management: Full client creation
   * - manager: Limited client creation
   * - others: Permission denied
   */
  private async handleCreateClient(data: any, authUser: any): Promise<ActionExecutionResult> {
    const mappingResult = await VoiceFieldMapper.mapClientCreation(data);

    if (!mappingResult.success) {
      return {
        intent: 'create_client',
        success: false,
        error: 'Validation failed: ' + mappingResult.errors?.map(e => e.message).join(', '),
        fieldErrors: mappingResult.errors
      };
    }

    const mappedData = mappingResult.data;

    // All authorized roles use the same service but with different validations
    if (!['super_admin', 'management'].includes(authUser.role)) {
      return {
        intent: 'create_client',
        success: false,
        error: `Role '${authUser.role}' is not authorized to create clients`
      };
    }

    const result = await ClientService.createClient(mappedData, authUser);
    
    if (result.error) {
      return {
        intent: 'create_client',
        success: false,
        error: result.error
      };
    }

    return {
      intent: 'create_client',
      success: true,
      data: result.client,
      affectedEntities: [{
        type: 'client',
        id: result.client._id.toString(),
        name: result.client.name
      }]
    };
  }

  /**
   * Role-based user updates
   * Different validation rules based on role
   */
  private async handleUpdateUser(data: any, authUser: any): Promise<ActionExecutionResult> {
    // Map and validate fields first
    const mappingResult = await VoiceFieldMapper.mapUpdateUser(data);

    if (!mappingResult.success) {
      return {
        intent: 'update_user',
        success: false,
        error: 'Field validation failed',
        fieldErrors: mappingResult.errors
      };
    }

    const mappedData = mappingResult.data;

    switch (authUser.role) {
      case 'super_admin':
      case 'management': {
        // Super admin can update any user field
        const result = await UserService.updateUser(
          mappedData.userId,
          {
            email: mappedData.email,
            role: mappedData.role,
            hourly_rate: mappedData.hourly_rate,
            full_name: mappedData.full_name
          },
          authUser
        );

        if (!result.success) {
          return {
            intent: 'update_user',
            success: false,
            error: result.error || 'Failed to update user'
          };
        }

        return {
          intent: 'update_user',
          success: true,
          data: { message: 'User updated successfully' },
          affectedEntities: [{
            type: 'user',
            id: mappedData.userId
          }]
        };
      }

      case 'manager': {
        // Management can update limited fields, no role changes
        const limitedResult = await UserService.updateUser(
          mappedData.userId,
          {
            email: mappedData.email,
            hourly_rate: mappedData.hourly_rate,
            full_name: mappedData.full_name
            // Role updates not allowed for management
          },
          authUser
        );

        if (!limitedResult.success) {
          return {
            intent: 'update_user',
            success: false,
            error: limitedResult.error || 'Failed to update user'
          };
        }

        return {
          intent: 'update_user',
          success: true,
          data: { message: 'User updated successfully (limited permissions)' },
          affectedEntities: [{
            type: 'user',
            id: mappedData.userId
          }]
        };
      }

      default:
        return {
          intent: 'update_user',
          success: false,
          error: `Role '${authUser.role}' is not authorized to update users`
        };
    }
  }

  /**
   * Role-based user deletion
   */
  private async handleDeleteUser(data: any, authUser: any): Promise<ActionExecutionResult> {
    if (!['super_admin', 'management'].includes(authUser.role)) {
      return {
        intent: 'delete_user',
        success: false,
        error: `Role '${authUser.role}' is not authorized to delete users`
      };
    }

    // Map and validate fields first
    const mappingResult = await VoiceFieldMapper.mapDeleteUser(data);

    if (!mappingResult.success) {
      return {
        intent: 'delete_user',
        success: false,
        error: 'Field validation failed',
        fieldErrors: mappingResult.errors
      };
    }

    const mappedData = mappingResult.data;

    const result = await UserService.softDeleteUser(
      mappedData.userId,
      mappedData.reason,
      authUser
    );

    if (!result.success) {
      return {
        intent: 'delete_user',
        success: false,
        error: result.error || 'Failed to delete user'
      };
    }

    return {
      intent: 'delete_user',
      success: true,
      affectedEntities: [{
        type: 'user',
        id: mappedData.userId
      }]
    };
  }

  /**
   * Role-based user approval (Super Admin only)
   */
  private async handleApproveUser(data: any, authUser: any): Promise<ActionExecutionResult> {
    if (authUser.role !== 'super_admin') {
      return {
        intent: 'approve_user',
        success: false,
        error: 'Only Super Admin can approve users'
      };
    }

    // Validate user ID
    if (!isValidId(data.userId)) {
      return {
        intent: 'approve_user',
        success: false,
        error: 'Invalid user ID format (must be ObjectId or UUID)'
      };
    }

    const result = await UserService.approveUser(data.userId, authUser);

    if (!result.success) {
      return {
        intent: 'approve_user',
        success: false,
        error: result.error || 'Failed to approve user'
      };
    }

    return {
      intent: 'approve_user',
      success: true,
      data: { weekStart: data.weekStart },
      affectedEntities: [{
        type: 'user',
        id: data.userId
      }]
    };
  }

  /**
   * Role-based timesheet entry creation
   */
  private async handleAddEntries(data: any, authUser: any): Promise<ActionExecutionResult> {
    // Map and validate fields first
    const mappingResult = await VoiceFieldMapper.mapAddEntries(data);

    if (!mappingResult.success) {
      return {
        intent: 'add_entries',
        success: false,
        error: 'Field validation failed',
        fieldErrors: mappingResult.errors
      };
    }

    const mappedData = mappingResult.data;

    // Role-based validation
    if (mappedData.user_id && mappedData.user_id.toString() !== authUser.id && authUser.role === 'employee') {
      return {
        intent: 'add_entries',
        success: false,
        error: 'You can only add entries for your own timesheet'
      };
    }

    const createdEntries = [];

    for (const entry of mappedData.entries) {
      const timeEntry = await TimesheetService.addTimeEntry(
        mappedData.timesheet_id,
        {
          project_id: entry.project_id,
          task_id: entry.task_id,
          date: entry.date,
          hours: entry.hours,
          task_type: entry.task_type,
          custom_task_description: entry.custom_task_description,
          entry_type: entry.entry_type,
          description: entry.description,
          is_billable: entry.is_billable
        },
        authUser
      );

      if (timeEntry.entry) {
        createdEntries.push(timeEntry.entry);
      }
    }

    return {
      intent: 'add_entries',
      success: true,
      data: { ...createdEntries[0] },
      affectedEntities: createdEntries.map((e: any) => ({
        type: 'time_entry',
        id: e._id.toString()
      }))
    };
  }

  /**
   * Role-based timesheet entry updates
   */
  private async handleUpdateEntries(data: any, authUser: any): Promise<ActionExecutionResult> {
    // Map and validate fields first
    const mappingResult = await VoiceFieldMapper.mapUpdateEntries(data);

    if (!mappingResult.success) {
      return {
        intent: 'update_entries',
        success: false,
        error: 'Field validation failed',
        fieldErrors: mappingResult.errors
      };
    }

    const mappedData = mappingResult.data;

    // Role-based validation for entry updates
    if (authUser.role === 'employee' && mappedData.user_id && mappedData.user_id.toString() !== authUser.id) {
      return {
        intent: 'update_entries',
        success: false,
        error: 'Employees can only update their own entries'
      };
    }

    const result = await TimesheetService.updateTimesheetEntries(
      mappedData.timesheet_id,
      [{
        project_id: mappedData.project_id,
        task_id: mappedData.task_id,
        date: mappedData.date,
        hours: mappedData.hours,
        description: mappedData.description,
        entry_type: mappedData.entry_type,
        is_billable: mappedData.is_billable
      }],
      authUser
    );

    if (result.error) {
      return {
        intent: 'update_entries',
        success: false,
        error: result.error
      };
    }

    return {
      intent: 'update_entries',
      success: true,
      data: { weekStart: mappedData.week_start },
      affectedEntities: [{
        type: 'time_entry',
        id: mappedData.entry_id || 'updated_entry'
      }]
    };
  }

  /**
   * PROJECT MANAGEMENT HANDLERS
   */

  /**
   * Add member to project
   */
  private async handleAddProjectMember(data: any, authUser: any): Promise<ActionExecutionResult> {
    if (!['super_admin', 'management', 'manager'].includes(authUser.role)) {
      return {
        intent: 'add_project_member',
        success: false,
        error: `Role '${authUser.role}' is not authorized to add project members`
      };
    }

    // Map and validate fields first
    const mappingResult = await VoiceFieldMapper.mapAddProjectMember(data);

    if (!mappingResult.success) {
      return {
        intent: 'add_project_member',
        success: false,
        error: 'Field validation failed',
        fieldErrors: mappingResult.errors
      };
    }

    const mappedData = mappingResult.data;

    // Ensure required fields are present
    if (!mappedData?.project_id || !mappedData?.user_id) {
      return {
        intent: 'add_project_member',
        success: false,
        error: 'Missing required project or user information after field mapping'
      };
    }

    // Convert ObjectIds to strings for the service call
    const projectIdStr = mappedData.project_id.toString();
    const userIdStr = mappedData.user_id.toString();

    const result = await ProjectService.addProjectMember(
      projectIdStr,
      userIdStr,
      mappedData.role,
      mappedData.is_primary_manager,
      authUser
    );

    if (result.error) {
      return {
        intent: 'add_project_member',
        success: false,
        error: result.error
      };
    }

    return {
      intent: 'add_project_member',
      success: true,
      data: { success: true },
      affectedEntities: [
        { type: 'project', id: projectIdStr },
        { type: 'user', id: userIdStr }
      ]
    };
  }

  /**
   * Remove member from project
   */
  private async handleRemoveProjectMember(data: any, authUser: any): Promise<ActionExecutionResult> {
    if (!['super_admin', 'management', 'manager'].includes(authUser.role)) {
      return {
        intent: 'remove_project_member',
        success: false,
        error: `Role '${authUser.role}' is not authorized to remove project members`
      };
    }

    // Map and validate fields first
    const mappingResult = await VoiceFieldMapper.mapRemoveProjectMember(data);

    if (!mappingResult.success) {
      return {
        intent: 'remove_project_member',
        success: false,
        error: 'Field validation failed',
        fieldErrors: mappingResult.errors
      };
    }

    const mappedData = mappingResult.data;

    // Ensure required fields are present
    if (!mappedData?.project_id || !mappedData?.user_id) {
      return {
        intent: 'remove_project_member',
        success: false,
        error: 'Missing required project or user information after field mapping'
      };
    }

    // Convert ObjectIds to strings for the service call
    let projectIdStr: string;
    let userIdStr: string;
    
    try {
      projectIdStr = mappedData.project_id.toString();
      userIdStr = mappedData.user_id.toString();
    } catch (error) {
      return {
        intent: 'remove_project_member',
        success: false,
        error: `Failed to convert IDs to strings: ${error instanceof Error ? error.message : 'Unknown error'}. Project: ${typeof mappedData.project_id}, User: ${typeof mappedData.user_id}`
      };
    }

    const result = await ProjectService.removeProjectMember(
      projectIdStr,
      userIdStr,
      authUser
    );

    if (result.error) {
      return {
        intent: 'remove_project_member',
        success: false,
        error: result.error
      };
    }

    return {
      intent: 'remove_project_member',
      success: true,
      data: { message: 'Project member removed successfully' },
      affectedEntities: [
        { type: 'project', id: projectIdStr },
        { type: 'user', id: userIdStr }
      ]
    };
  }

  /**
   * Add task to project
   */
  private async handleAddTask(data: any, authUser: any): Promise<ActionExecutionResult> {
    if (!['super_admin', 'management', 'manager'].includes(authUser.role)) {
      return {
        intent: 'add_task',
        success: false,
        error: `Role '${authUser.role}' is not authorized to add tasks`
      };
    }

    // Map and validate fields using VoiceFieldMapper
    const mappingResult = await VoiceFieldMapper.mapTaskCreation(data);

    if (!mappingResult.success) {
      return {
        intent: 'add_task',
        success: false,
        error: 'Field validation failed',
        fieldErrors: mappingResult.errors
      };
    }

    const mappedData = mappingResult.data;

    const result = await ProjectService.createTask(
      {
        project_id: mappedData.project_id,
        name: mappedData.name,
        description: mappedData.description,
        assigned_to_user_id: mappedData.assigned_to_user_id,
        status: mappedData.status || 'pending',
        estimated_hours: mappedData.estimated_hours,
        is_billable: mappedData.is_billable ?? true
      },
      authUser
    );

    if (result.error) {
      return {
        intent: 'add_task',
        success: false,
        error: result.error
      };
    }

    return {
      intent: 'add_task',
      success: true,
      data: result.task,
      affectedEntities: [{
        type: 'project',
        id: mappedData.project_id.toString()
      }]
    };
  }

  /**
   * Update project details
   */
  private async handleUpdateProject(data: any, authUser: any): Promise<ActionExecutionResult> {
    if (!['super_admin', 'management'].includes(authUser.role)) {
      return {
        intent: 'update_project',
        success: false,
        error: `Role '${authUser.role}' is not authorized to update projects`
      };
    }

    // Map and validate fields first
    const mappingResult = await VoiceFieldMapper.mapUpdateProject(data);

    if (!mappingResult.success) {
      return {
        intent: 'update_project',
        success: false,
        error: 'Field validation failed',
        fieldErrors: mappingResult.errors
      };
    }

    const mappedData = mappingResult.data;

    const result = await ProjectService.updateProject(
      mappedData.project_id,
      mappedData,
      authUser
    );

    if (result.error) {
      return {
        intent: 'update_project',
        success: false,
        error: result.error
      };
    }

    return {
      intent: 'update_project',
      success: true,
      data: { message: 'Project updated successfully' },
      affectedEntities: [{
        type: 'project',
        id: mappedData.project_id.toString()
      }]
    };
  }

  /**
   * Update task details
   */
  private async handleUpdateTask(data: any, authUser: any): Promise<ActionExecutionResult> {
    if (!['super_admin', 'management', 'manager'].includes(authUser.role)) {
      return {
        intent: 'update_task',
        success: false,
        error: `Role '${authUser.role}' is not authorized to update tasks`
      };
    }

    // Map and validate fields first
    const mappingResult = await VoiceFieldMapper.mapUpdateTask(data);

    if (!mappingResult.success) {
      return {
        intent: 'update_task',
        success: false,
        error: 'Field validation failed',
        fieldErrors: mappingResult.errors
      };
    }

    const mappedData = mappingResult.data;

    const result = await ProjectService.updateTask(
      mappedData.task_id,
      {
        name: mappedData.name,
        description: mappedData.description,
        status: mappedData.status,
        estimated_hours: mappedData.estimated_hours,
        assigned_to_user_id: mappedData.assigned_to_user_id,
        is_billable: mappedData.is_billable
      },
      authUser
    );

    if (result.error) {
      return {
        intent: 'update_task',
        success: false,
        error: result.error
      };
    }

    return {
      intent: 'update_task',
      success: true,
      data: { success: true },
      affectedEntities: [{
        type: 'project',
        id: mappedData.project_id?.toString() || 'unknown'
      }]
    };
  }

  /**
   * Delete project
   */
  private async handleDeleteProject(data: any, authUser: any): Promise<ActionExecutionResult> {
    if (!['super_admin', 'management'].includes(authUser.role)) {
      return {
        intent: 'delete_project',
        success: false,
        error: `Role '${authUser.role}' is not authorized to delete projects`
      };
    }

    // Map and validate fields first
    const mappingResult = await VoiceFieldMapper.mapDeleteProject(data);

    if (!mappingResult.success) {
      return {
        intent: 'delete_project',
        success: false,
        error: 'Field validation failed',
        fieldErrors: mappingResult.errors
      };
    }

    const mappedData = mappingResult.data;

    const result = await ProjectService.deleteProject(
      mappedData.project_id,
      mappedData.reason,
      authUser
    );

    if (result.error) {
      return {
        intent: 'delete_project',
        success: false,
        error: result.error
      };
    }

    return {
      intent: 'delete_project',
      success: true,
      affectedEntities: [{
        type: 'project',
        id: mappedData.project_id.toString()
      }]
    };
  }

  /**
   * CLIENT MANAGEMENT HANDLERS
   */

  /**
   * Update client details
   */
  private async handleUpdateClient(data: any, authUser: any): Promise<ActionExecutionResult> {
    if (!['super_admin', 'management'].includes(authUser.role)) {
      return {
        intent: 'update_client',
        success: false,
        error: `Role '${authUser.role}' is not authorized to update clients`
      };
    }

    // Map and validate fields first
    const mappingResult = await VoiceFieldMapper.mapUpdateClient(data);

    if (!mappingResult.success) {
      return {
        intent: 'update_client',
        success: false,
        error: 'Field validation failed',
        fieldErrors: mappingResult.errors
      };
    }

    const mappedData = mappingResult.data;

    const result = await ClientService.updateClient(
      mappedData.client_id,
      mappedData,
      authUser
    );

    if (result.error) {
      return {
        intent: 'update_client',
        success: false,
        error: result.error
      };
    }

    return {
      intent: 'update_client',
      success: true,
      data: result.client,
      affectedEntities: [{
        type: 'client',
        id: mappedData.client_id.toString()
      }]
    };
  }

  /**
   * Delete client
   */
  private async handleDeleteClient(data: any, authUser: any): Promise<ActionExecutionResult> {
    if (!['super_admin', 'management'].includes(authUser.role)) {
      return {
        intent: 'delete_client',
        success: false,
        error: `Role '${authUser.role}' is not authorized to delete clients`
      };
    }

    // Map and validate fields first
    const mappingResult = await VoiceFieldMapper.mapDeleteClient(data);

    if (!mappingResult.success) {
      return {
        intent: 'delete_client',
        success: false,
        error: 'Field validation failed',
        fieldErrors: mappingResult.errors
      };
    }

    const mappedData = mappingResult.data;

    const result = await ClientService.deleteClient(
      mappedData.client_id,
      mappedData.reason,
      authUser
    );

    if (result.error) {
      return {
        intent: 'delete_client',
        success: false,
        error: result.error
      };
    }

    return {
      intent: 'delete_client',
      success: true,
      affectedEntities: [{
        type: 'client',
        id: mappedData.client_id.toString()
      }]
    };
  }

  /**
   * TIMESHEET MANAGEMENT HANDLERS
   */

  /**
   * Create timesheet
   */
  private async handleCreateTimesheet(data: any, authUser: any): Promise<ActionExecutionResult> {
    // Map and validate fields first
    const mappingResult = await VoiceFieldMapper.mapCreateTimesheet(data);

    if (!mappingResult.success) {
      return {
        intent: 'create_timesheet',
        success: false,
        error: 'Field validation failed',
        fieldErrors: mappingResult.errors
      };
    }

    const mappedData = mappingResult.data;

    // All authenticated users can create timesheets for themselves
    // Managers+ can create for others
    if (authUser.role === 'employee' && mappedData.user_id && mappedData.user_id.toString() !== authUser.id) {
      return {
        intent: 'create_timesheet',
        success: false,
        error: 'Employees can only create timesheets for themselves'
      };
    }

    const result = await TimesheetService.createTimesheet(
      mappedData.user_id || authUser.id,
      mappedData.week_start,
      authUser
    );

    if (result.error) {
      return {
        intent: 'create_timesheet',
        success: false,
        error: result.error
      };
    }

    return {
      intent: 'create_timesheet',
      success: true,
      data: result.timesheet,
      affectedEntities: [{
        type: 'timesheet',
        id: result.timesheet?._id?.toString() || ''
      }]
    };
  }

  /**
   * Delete timesheet
   */
  private async handleDeleteTimesheet(data: any, authUser: any): Promise<ActionExecutionResult> {
    if (!['super_admin', 'management', 'manager'].includes(authUser.role)) {
      return {
        intent: 'delete_timesheet',
        success: false,
        error: `Role '${authUser.role}' is not authorized to delete timesheets`
      };
    }

    // Map and validate fields first
    const mappingResult = await VoiceFieldMapper.mapDeleteTimesheet(data);

    if (!mappingResult.success) {
      return {
        intent: 'delete_timesheet',
        success: false,
        error: 'Field validation failed',
        fieldErrors: mappingResult.errors
      };
    }

    const mappedData = mappingResult.data;

    const result = await TimesheetService.deleteTimesheet(
      mappedData.timesheet_id,
      authUser
    );

    if (result.error) {
      return {
        intent: 'delete_timesheet',
        success: false,
        error: result.error
      };
    }

    return {
      intent: 'delete_timesheet',
      success: true,
      affectedEntities: [{
        type: 'timesheet',
        id: mappedData.timesheet_id.toString()
      }]
    };
  }

  /**
   * Delete timesheet entries
   */
  private async handleDeleteEntries(data: any, authUser: any): Promise<ActionExecutionResult> {
    // Map and validate fields first
    const mappingResult = await VoiceFieldMapper.mapDeleteEntries(data);

    if (!mappingResult.success) {
      return {
        intent: 'delete_entries',
        success: false,
        error: 'Field validation failed',
        fieldErrors: mappingResult.errors
      };
    }

    const mappedData = mappingResult.data;

    // Employees can delete own entries, managers+ can delete any
    if (authUser.role === 'employee' && mappedData.user_id && mappedData.user_id.toString() !== authUser.id) {
      return {
        intent: 'delete_entries',
        success: false,
        error: 'Employees can only delete their own entries'
      };
    }

    // Use the deleteTimesheet method since removeTimesheetEntry doesn't exist
    const result = await TimesheetService.deleteTimesheet(
      mappedData.timesheet_id,
      authUser
    );

    if (result.error) {
      return {
        intent: 'delete_entries',
        success: false,
        error: result.error
      };
    }

    return {
      intent: 'delete_entries',
      success: true,
      affectedEntities: [{
        type: 'time_entry',
        id: mappedData.entry_id || 'deleted_entry'
      }]
    };
  }

  /**
   * Copy timesheet entry
   */
  private async handleCopyEntry(data: any, authUser: any): Promise<ActionExecutionResult> {
    // Map and validate fields first
    const mappingResult = await VoiceFieldMapper.mapCopyEntry(data);

    if (!mappingResult.success) {
      return {
        intent: 'copy_entry',
        success: false,
        error: 'Field validation failed',
        fieldErrors: mappingResult.errors
      };
    }

    const mappedData = mappingResult.data;

    // All users can copy their own entries
    if (authUser.role === 'employee' && mappedData.user_id && mappedData.user_id.toString() !== authUser.id) {
      return {
        intent: 'copy_entry',
        success: false,
        error: 'Employees can only copy their own entries'
      };
    }

    // NOTE: Copy entry functionality is not yet implemented
    // For now, return not implemented error
    return {
      intent: 'copy_entry',
      success: false,
      error: 'Copy entry functionality is not yet implemented'
    };
  }

  /**
   * TEAM REVIEW HANDLERS
   */

  /**
   * Approve project week
   */
  private async handleApproveProjectWeek(data: any, authUser: any): Promise<ActionExecutionResult> {
    if (!['super_admin', 'management', 'manager', 'lead'].includes(authUser.role)) {
      return {
        intent: 'approve_project_week',
        success: false,
        error: `Role '${authUser.role}' is not authorized to approve project weeks`
      };
    }

    // Validate project ID
    if (!isValidId(data.projectId)) {
      return {
        intent: 'approve_project_week',
        success: false,
        error: 'Invalid project ID format (must be ObjectId or UUID)'
      };
    }

    try {
      const result = await TeamReviewApprovalService.approveProjectWeek(
        data.projectId,
        data.weekStart,
        data.weekEnd,
        authUser.id,
        authUser.role
      );

      return {
        intent: 'approve_project_week',
        success: true,
        data: {
          affected_users: result.affected_users,
          affected_timesheets: result.affected_timesheets,
          projectId: data.projectId,
          weekStart: data.weekStart
        },
        affectedEntities: [{
          type: 'project',
          id: data.projectId
        }]
      };
    } catch (error: any) {
      return {
        intent: 'approve_project_week',
        success: false,
        error: error.message || 'Failed to approve project week'
      };
    }
  }

  /**
   * Reject user's timesheet
   */
  private async handleRejectUser(data: any, authUser: any): Promise<ActionExecutionResult> {
    if (!['super_admin', 'management', 'manager', 'lead'].includes(authUser.role)) {
      return {
        intent: 'reject_user',
        success: false,
        error: `Role '${authUser.role}' is not authorized to reject user timesheets`
      };
    }

    // NOTE: Reject user functionality requires implementation of rejectAllProjectsForUser method
    // For now, return not implemented
    return {
      intent: 'reject_user',
      success: false,
      error: 'Reject user functionality requires implementation of rejectAllProjectsForUser method'
    };
  }

  /**
   * Reject project week
   */
  private async handleRejectProjectWeek(data: any, authUser: any): Promise<ActionExecutionResult> {
    if (!['super_admin', 'management', 'manager', 'lead'].includes(authUser.role)) {
      return {
        intent: 'reject_project_week',
        success: false,
        error: `Role '${authUser.role}' is not authorized to reject project weeks`
      };
    }

    // Validate project ID
    if (!isValidId(data.projectId)) {
      return {
        intent: 'reject_project_week',
        success: false,
        error: 'Invalid project ID format (must be ObjectId or UUID)'
      };
    }

    try {
      const result = await TeamReviewApprovalService.rejectProjectWeek(
        data.projectId,
        data.weekStart,
        data.weekEnd,
        authUser.id,
        authUser.role,
        data.reason || 'Rejected via voice command'
      );

      return {
        intent: 'reject_project_week',
        success: true,
        data: {
          affected_users: result.affected_users,
          affected_timesheets: result.affected_timesheets,
          projectId: data.projectId,
          weekStart: data.weekStart,
          reason: data.reason
        },
        affectedEntities: [{
          type: 'project',
          id: data.projectId
        }]
      };
    } catch (error: any) {
      return {
        intent: 'reject_project_week',
        success: false,
        error: error.message || 'Failed to reject project week'
      };
    }
  }

  /**
   * Send reminder to defaulters
   */
  private async handleSendReminder(data: any, authUser: any): Promise<ActionExecutionResult> {
    if (!['super_admin', 'management', 'manager'].includes(authUser.role)) {
      return {
        intent: 'send_reminder',
        success: false,
        error: `Role '${authUser.role}' is not authorized to send reminders`
      };
    }

    // Map and validate fields first (though this intent might not need much mapping)
    const mappingResult = await VoiceFieldMapper.mapTeamReviewAction(data);

    if (!mappingResult.success) {
      return {
        intent: 'send_reminder',
        success: false,
        error: 'Field validation failed',
        fieldErrors: mappingResult.errors
      };
    }

    const mappedData = mappingResult.data;

    const defaulterService = new DefaulterService();
    const result = await defaulterService.notifyDefaulters(
      mappedData.project_id,
      mappedData.week_start
    );

    return {
      intent: 'send_reminder',
      success: true,
      data: {
        notifiedCount: result || 0,
        projectId: mappedData.project_id?.toString(),
        weekStart: mappedData.week_start
      },
      affectedEntities: mappedData.project_id ? [{
        type: 'project',
        id: mappedData.project_id.toString()
      }] : []
    };
  }

  /**
   * BILLING & AUDIT HANDLERS
   */

  /**
   * Export project billing
   */
  private async handleExportProjectBilling(data: any, authUser: any): Promise<ActionExecutionResult> {
    if (!['super_admin', 'management'].includes(authUser.role)) {
      return {
        intent: 'export_project_billing',
        success: false,
        error: `Role '${authUser.role}' is not authorized to export project billing`
      };
    }

    // Map and validate fields first
    const mappingResult = await VoiceFieldMapper.mapExportBilling(data);

    if (!mappingResult.success) {
      return {
        intent: 'export_project_billing',
        success: false,
        error: 'Field validation failed',
        fieldErrors: mappingResult.errors
      };
    }

    const mappedData = mappingResult.data;

    const result = await ProjectBillingService.buildProjectBillingData({
      projectIds: mappedData.project_ids,
      clientIds: mappedData.client_ids,
      startDate: mappedData.start_date,
      endDate: mappedData.end_date,
      view: 'custom'
    });

    return {
      intent: 'export_project_billing',
      success: true,
      data: {
        billingData: result,
        recordCount: result?.length || 0,
        startDate: mappedData.start_date,
        endDate: mappedData.end_date,
        fileName: `project_billing_${new Date().toISOString().split('T')[0]}.csv`
      },
      affectedEntities: mappedData.project_ids.map((id: any) => ({
        type: 'project',
        id: id.toString()
      }))
    };
  }

  /**
   * Export user billing
   */
  private async handleExportUserBilling(data: any, authUser: any): Promise<ActionExecutionResult> {
    if (!['super_admin', 'management'].includes(authUser.role)) {
      return {
        intent: 'export_user_billing',
        success: false,
        error: `Role '${authUser.role}' is not authorized to export user billing`
      };
    }

    // Map and validate fields first
    const mappingResult = await VoiceFieldMapper.mapExportBilling(data);

    if (!mappingResult.success) {
      return {
        intent: 'export_user_billing',
        success: false,
        error: 'Field validation failed',
        fieldErrors: mappingResult.errors
      };
    }

    const mappedData = mappingResult.data;

    const result = await ProjectBillingService.buildProjectBillingData({
      projectIds: mappedData.project_ids,
      clientIds: mappedData.client_ids,
      startDate: mappedData.start_date,
      endDate: mappedData.end_date,
      view: 'custom'
    });

    return {
      intent: 'export_user_billing',
      success: true,
      data: {
        billingData: result,
        recordCount: result?.length || 0,
        startDate: mappedData.start_date,
        endDate: mappedData.end_date,
        fileName: `user_billing_${new Date().toISOString().split('T')[0]}.csv`
      },
      affectedEntities: mappedData.user_ids?.map((id: any) => ({
        type: 'user',
        id: id.toString()
      })) || []
    };
  }

  /**
   * Get audit logs
   */
  private async handleGetAuditLogs(data: any, authUser: any): Promise<ActionExecutionResult> {
    if (!['super_admin', 'management'].includes(authUser.role)) {
      return {
        intent: 'get_audit_logs',
        success: false,
        error: `Role '${authUser.role}' is not authorized to view audit logs`
      };
    }

    // Map and validate fields first
    const mappingResult = await VoiceFieldMapper.mapGetAuditLogs(data);

    if (!mappingResult.success) {
      return {
        intent: 'get_audit_logs',
        success: false,
        error: 'Field validation failed',
        fieldErrors: mappingResult.errors
      };
    }

    const mappedData = mappingResult.data;

    const filters: any = {
      limit: mappedData.limit || 50,
      offset: mappedData.offset || 0
    };

    if (mappedData.start_date) filters.startDate = mappedData.start_date;
    if (mappedData.end_date) filters.endDate = mappedData.end_date;
    if (mappedData.actor_id) filters.actorId = mappedData.actor_id;
    if (mappedData.table_name) filters.tableName = mappedData.table_name;
    if (mappedData.record_id) filters.recordId = mappedData.record_id;
    if (mappedData.actions) filters.actions = mappedData.actions;

    const result = await AuditLogService.getAuditLogs(filters, authUser);

    if (result.error) {
      return {
        intent: 'get_audit_logs',
        success: false,
        error: result.error
      };
    }

    return {
      intent: 'get_audit_logs',
      success: true,
      data: {
        logs: result.logs,
        totalCount: result.total,
        hasMore: result.hasMore,
        filters
      }
    };
  }
}

export default new RoleBasedServiceDispatcher();
export { RoleBasedServiceDispatcher };
