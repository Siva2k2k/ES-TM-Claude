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
    switch (authUser.role) {
      case 'super_admin':   
      case 'management': {
        // Super admin can update any user field
        const result = await UserService.updateUser(
          data.userId,
          {
            email: data.email,
            role: data.role?.toLowerCase(),
            hourly_rate: data.hourlyRate,
            full_name: data.userName || data.fullName
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
            id: data.userId
          }]
        };
      }

      case 'manager': {
        // Management can update limited fields, no role changes
        const limitedResult = await UserService.updateUser(
          data.userId,
          {
            email: data.email,
            hourly_rate: data.hourlyRate,
            full_name: data.userName || data.fullName
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
            id: data.userId
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

    const result = await UserService.softDeleteUser(
      data.userId,
      data.reason || 'Voice command deletion',
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
        id: data.userId
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
    // All roles can add entries, but with different validations
    const entries = data.entries || [data];
    const createdEntries = [];

    for (const entry of entries) {
      // Role-based validation
      if (authUser.role === 'employee' && entry.userId && entry.userId !== authUser.id) {
        return {
          intent: 'add_entries',
          success: false,
          error: 'Employees can only add entries for themselves'
        };
      }

      const timeEntry = await TimesheetService.addTimeEntry(
        entry.timesheetId || data.timesheetId,
        {
          project_id: entry.projectId,
          task_id: entry.taskId,
          date: entry.date,
          hours: entry.hours,
          task_type: entry.taskType,
          custom_task_description: entry.customTaskDescription,
          entry_type: entry.entryType,
          description: entry.description,
          is_billable: entry.isBillable || true
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
    // Role-based validation for entry updates
    if (authUser.role === 'employee' && data.userId && data.userId !== authUser.id) {
      return {
        intent: 'update_entries',
        success: false,
        error: 'Employees can only update their own entries'
      };
    }

    const result = await TimesheetService.updateTimesheetEntries(
      data.timesheetId,
      [{
        project_id: data.projectId,
        task_id: data.taskId,
        date: data.date,
        hours: data.hours,
        description: data.description,
        entry_type: data.entryType,
        is_billable: data.isBillable || true
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
      data: { weekStart: data.weekStart },
      affectedEntities: [{
        type: 'time_entry',
        id: data.entryId || 'updated_entry'
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

    const result = await ProjectService.addProjectMember(
      data.projectId,
      data.userId,
      data.role?.toLowerCase() || 'employee',
      false, // isPrimaryManager
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
        { type: 'project', id: data.projectId },
        { type: 'user', id: data.userId }
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

    const result = await ProjectService.removeProjectMember(
      data.projectId,
      data.userId,
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
      affectedEntities: [
        { type: 'project', id: data.projectId },
        { type: 'user', id: data.userId }
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

    const result = await ProjectService.createTask(
      {
        project_id: data.projectId,
        name: data.taskName,
        description: data.description,
        status: 'pending',
        is_billable: true
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
        id: data.projectId
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

    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.description) updateData.description = data.description;
    if (data.clientId) updateData.client_id = data.clientId;
    if (data.budget) updateData.budget = data.budget;
    if (data.startDate) updateData.start_date = data.startDate;
    if (data.endDate) updateData.end_date = data.endDate;
    if (data.status) updateData.status = data.status;

    const result = await ProjectService.updateProject(
      data.projectId,
      updateData,
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
        id: data.projectId
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

    const result = await ProjectService.updateTask(
      data.taskId,
      {
        name: data.taskName,
        description: data.description
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
        id: data.projectId
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

    const result = await ProjectService.deleteProject(
      data.projectId,
      data.reason || 'Deleted via voice command',
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
        id: data.projectId
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

    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.email) updateData.email = data.email;
    if (data.phone) updateData.phone = data.phone;
    if (data.address) updateData.address = data.address;
    if (data.contactPerson) updateData.contact_person = data.contactPerson;

    const result = await ClientService.updateClient(
      data.clientId,
      updateData,
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
        id: data.clientId
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

    const result = await ClientService.deleteClient(
      data.clientId,
      data.reason || 'Deleted via voice command',
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
        id: data.clientId
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
    // All authenticated users can create timesheets for themselves
    // Managers+ can create for others
    if (authUser.role === 'employee' && data.userId && data.userId !== authUser.id) {
      return {
        intent: 'create_timesheet',
        success: false,
        error: 'Employees can only create timesheets for themselves'
      };
    }

    const result = await TimesheetService.createTimesheet(
      data.userId || authUser.id,
      data.weekStart,
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

    const result = await TimesheetService.deleteTimesheet(
      data.timesheetId,
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
        id: data.timesheetId
      }]
    };
  }

  /**
   * Delete timesheet entries
   */
  private async handleDeleteEntries(data: any, authUser: any): Promise<ActionExecutionResult> {
    // Employees can delete own entries, managers+ can delete any
    if (authUser.role === 'employee' && data.userId && data.userId !== authUser.id) {
      return {
        intent: 'delete_entries',
        success: false,
        error: 'Employees can only delete their own entries'
      };
    }

    // Use the deleteTimesheet method since removeTimesheetEntry doesn't exist
    const result = await TimesheetService.deleteTimesheet(
      data.timesheetId,
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
        id: data.entryId
      }]
    };
  }

  /**
   * Copy timesheet entry
   */
  private async handleCopyEntry(data: any, authUser: any): Promise<ActionExecutionResult> {
    // All users can copy their own entries
    if (authUser.role === 'employee' && data.userId && data.userId !== authUser.id) {
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

    const defaulterService = new DefaulterService();
    const result = await defaulterService.notifyDefaulters(
      data.projectId,
      data.weekStart
    );

    return {
      intent: 'send_reminder',
      success: true,
      data: {
        notifiedCount: result || 0,
        projectId: data.projectId,
        weekStart: data.weekStart
      },
      affectedEntities: data.projectId ? [{
        type: 'project',
        id: data.projectId
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

    const projectIds = data.projectIds || (data.projectId ? [data.projectId] : []);

    const result = await ProjectBillingService.buildProjectBillingData({
      projectIds,
      clientIds: data.clientIds || [],
      startDate: data.startDate,
      endDate: data.endDate,
      view: 'custom'
    });

    return {
      intent: 'export_project_billing',
      success: true,
      data: {
        billingData: result,
        recordCount: result?.length || 0,
        startDate: data.startDate,
        endDate: data.endDate,
        fileName: `project_billing_${new Date().toISOString().split('T')[0]}.csv`
      },
      affectedEntities: projectIds.map((id: string) => ({
        type: 'project',
        id
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

    const userIds = data.userIds || (data.userId ? [data.userId] : []);

    const result = await ProjectBillingService.buildProjectBillingData({
      projectIds: data.projectIds || [],
      clientIds: data.clientIds || [],
      startDate: data.startDate,
      endDate: data.endDate,
      view: 'custom'
    });

    return {
      intent: 'export_user_billing',
      success: true,
      data: {
        billingData: result,
        recordCount: result?.length || 0,
        startDate: data.startDate,
        endDate: data.endDate,
        fileName: `user_billing_${new Date().toISOString().split('T')[0]}.csv`
      },
      affectedEntities: userIds.map((id: string) => ({
        type: 'user',
        id
      }))
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

    const filters: any = {
      limit: data.limit || 50,
      offset: data.offset || 0
    };

    if (data.startDate) filters.startDate = data.startDate;
    if (data.endDate) filters.endDate = data.endDate;
    if (data.actorId) filters.actorId = data.actorId;
    if (data.tableName) filters.tableName = data.tableName;
    if (data.recordId) filters.recordId = data.recordId;
    if (data.actions) filters.actions = data.actions;

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