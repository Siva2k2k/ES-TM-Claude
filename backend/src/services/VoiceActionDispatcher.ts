import { VoiceAction, ActionExecutionResult } from '../types/voice';
import { IUser } from '../models/User';
import IntentConfigService from './IntentConfigService';
import AuditLogService from './AuditLogService';
import logger from '../config/logger';
import { format, startOfWeek } from 'date-fns';

class VoiceActionDispatcher {
  /**
   * Execute voice actions after user confirmation
   */
  async executeActions(actions: VoiceAction[], user: IUser): Promise<ActionExecutionResult[]> {
    const results: ActionExecutionResult[] = [];

    for (const action of actions) {
      try {
        const result = await this.executeAction(action, user);
        results.push(result);
      } catch (error: any) {
        logger.error('Action execution failed', {
          intent: action.intent,
          error: error.message,
          userId: user._id
        });

        results.push({
          intent: action.intent,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Execute a single action
   */
  private async executeAction(action: VoiceAction, user: IUser): Promise<ActionExecutionResult> {
    logger.info('Executing voice action', {
      intent: action.intent,
      userId: user._id,
      data: action.data
    });

    // Get intent definition from database to get redirect URL template
    const intentDef = await IntentConfigService.getIntentDefinition(action.intent);

    let result: ActionExecutionResult;

    switch (action.intent) {
      // PROJECT MANAGEMENT
      case 'create_project':
        result = await this.createProject(action.data, user);
        break;
      case 'add_project_member':
        result = await this.addProjectMember(action.data, user);
        break;
      case 'remove_project_member':
        result = await this.removeProjectMember(action.data, user);
        break;
      case 'add_task':
        result = await this.addTask(action.data, user);
        break;
      case 'update_project':
        result = await this.updateProject(action.data, user);
        break;
      case 'update_task':
        result = await this.updateTask(action.data, user);
        break;
      case 'delete_project':
        result = await this.deleteProject(action.data, user);
        break;

      // USER MANAGEMENT
      case 'create_user':
        result = await this.createUser(action.data, user);
        break;
      case 'update_user':
        result = await this.updateUser(action.data, user);
        break;
      case 'delete_user':
        result = await this.deleteUser(action.data, user);
        break;

      // CLIENT MANAGEMENT
      case 'create_client':
        result = await this.createClient(action.data, user);
        break;
      case 'update_client':
        result = await this.updateClient(action.data, user);
        break;
      case 'delete_client':
        result = await this.deleteClient(action.data, user);
        break;

      // TIMESHEET MANAGEMENT
      case 'create_timesheet':
        result = await this.createTimesheet(action.data, user);
        break;
      case 'add_entries':
        result = await this.addEntries(action.data, user);
        break;
      case 'update_entries':
        result = await this.updateEntries(action.data, user);
        break;
      case 'delete_timesheet':
        result = await this.deleteTimesheet(action.data, user);
        break;
      case 'delete_entries':
        result = await this.deleteEntries(action.data, user);
        break;
      case 'copy_entry':
        result = await this.copyEntry(action.data, user);
        break;

      // TEAM REVIEW
      case 'approve_user':
        result = await this.approveUser(action.data, user);
        break;
      case 'approve_project_week':
        result = await this.approveProjectWeek(action.data, user);
        break;
      case 'reject_user':
        result = await this.rejectUser(action.data, user);
        break;
      case 'reject_project_week':
        result = await this.rejectProjectWeek(action.data, user);
        break;
      case 'send_reminder':
        result = await this.sendReminder(action.data, user);
        break;

      // BILLING
      case 'export_project_billing':
        result = await this.exportProjectBilling(action.data, user);
        break;
      case 'export_user_billing':
        result = await this.exportUserBilling(action.data, user);
        break;

      // AUDIT
      case 'get_audit_logs':
        result = await this.getAuditLogs(action.data, user);
        break;

      default:
        throw new Error(`Unknown intent: ${action.intent}`);
    }

    // Generate redirect URL from template if available
    if (intentDef?.redirectUrlTemplate && result.success) {
      result.redirectUrl = this.generateRedirectUrl(
        intentDef.redirectUrlTemplate,
        result.data,
        result.affectedEntities
      );
    }

    // Log to audit trail
    await AuditLogService.log({
      user_id: user._id,
      action: `voice_${action.intent}`,
      entity_type: this.getEntityType(action.intent),
      entity_id: result.affectedEntities?.[0]?.id,
      changes: {
        voiceCommand: true,
        data: action.data,
        result: result.success
      }
    });

    return result;
  }

  /**
   * Generate redirect URL from template
   */
  private generateRedirectUrl(
    template: string,
    data: any,
    affectedEntities?: Array<{ type: string; id: string; name?: string }>
  ): string {
    let url = template;

    // Replace {projectId}
    if (template.includes('{projectId}')) {
      const projectId = data._id?.toString() || affectedEntities?.find(e => e.type === 'project')?.id;
      url = url.replace('{projectId}', projectId || '');
    }

    // Replace {userId}
    if (template.includes('{userId}')) {
      const userId = data._id?.toString() || affectedEntities?.find(e => e.type === 'user')?.id;
      url = url.replace('{userId}', userId || '');
    }

    // Replace {clientId}
    if (template.includes('{clientId}')) {
      const clientId = data._id?.toString() || affectedEntities?.find(e => e.type === 'client')?.id;
      url = url.replace('{clientId}', clientId || '');
    }

    // Replace {timesheetId}
    if (template.includes('{timesheetId}')) {
      const timesheetId = data._id?.toString() || affectedEntities?.find(e => e.type === 'timesheet')?.id;
      url = url.replace('{timesheetId}', timesheetId || '');
    }

    // Replace {weekStart}
    if (template.includes('{weekStart}')) {
      const weekStart = data.weekStart || data.week_start || '';
      url = url.replace('{weekStart}', weekStart);
    }

    return url;
  }

  // Implementation methods for each intent
  private async createProject(data: any, user: IUser): Promise<ActionExecutionResult> {
    const ProjectService = (await import('./ProjectService')).default;

    const project = await ProjectService.createProject({
      name: data.projectName,
      description: data.description,
      client_id: data.clientId,
      primary_manager_id: data.managerId,
      start_date: data.startDate,
      end_date: data.endDate,
      status: data.status?.toLowerCase(),
      budget: data.budget
    }, user);

    return {
      intent: 'create_project',
      success: true,
      data: project,
      affectedEntities: [{
        type: 'project',
        id: project._id.toString(),
        name: project.name
      }]
    };
  }

  private async addProjectMember(data: any, user: IUser): Promise<ActionExecutionResult> {
    const ProjectService = (await import('./ProjectService')).default;

    const member = await ProjectService.addProjectMember(
      data.projectId,
      {
        user_id: data.userId,
        role: data.role
      },
      user
    );

    return {
      intent: 'add_project_member',
      success: true,
      data: member,
      affectedEntities: [{
        type: 'project',
        id: data.projectId
      }]
    };
  }

  private async removeProjectMember(data: any, user: IUser): Promise<ActionExecutionResult> {
    const ProjectService = (await import('./ProjectService')).default;

    await ProjectService.removeProjectMember(
      data.projectId,
      data.userId,
      user
    );

    return {
      intent: 'remove_project_member',
      success: true,
      affectedEntities: [{
        type: 'project',
        id: data.projectId
      }]
    };
  }

  private async addTask(data: any, user: IUser): Promise<ActionExecutionResult> {
    const ProjectService = (await import('./ProjectService')).default;

    const task = await ProjectService.createTask(
      data.projectId,
      {
        name: data.taskName,
        assigned_to: data.assignedMemberId,
        description: data.description,
        estimated_hours: data.estimatedHours,
        status: data.status?.toLowerCase(),
        is_billable: data.isBillable
      },
      user
    );

    return {
      intent: 'add_task',
      success: true,
      data: task,
      affectedEntities: [{
        type: 'task',
        id: task._id.toString(),
        name: task.name
      }, {
        type: 'project',
        id: data.projectId
      }]
    };
  }

  private async updateProject(data: any, user: IUser): Promise<ActionExecutionResult> {
    const ProjectService = (await import('./ProjectService')).default;

    const project = await ProjectService.updateProject(
      data.projectId,
      {
        description: data.description,
        client_id: data.clientId,
        primary_manager_id: data.managerId,
        start_date: data.startDate,
        end_date: data.endDate,
        status: data.status?.toLowerCase(),
        budget: data.budget
      },
      user
    );

    return {
      intent: 'update_project',
      success: true,
      data: project,
      affectedEntities: [{
        type: 'project',
        id: project._id.toString()
      }]
    };
  }

  private async updateTask(data: any, user: IUser): Promise<ActionExecutionResult> {
    const ProjectService = (await import('./ProjectService')).default;

    const task = await ProjectService.updateTask(
      data.projectId,
      data.taskId,
      {
        assigned_to: data.assignedMemberId,
        description: data.description,
        estimated_hours: data.estimatedHours
      },
      user
    );

    return {
      intent: 'update_task',
      success: true,
      data: task,
      affectedEntities: [{
        type: 'task',
        id: task._id.toString()
      }, {
        type: 'project',
        id: data.projectId
      }]
    };
  }

  private async deleteProject(data: any, user: IUser): Promise<ActionExecutionResult> {
    const ProjectService = (await import('./ProjectService')).default;

    await ProjectService.deleteProject(
      data.projectId,
      data.reason,
      user
    );

    return {
      intent: 'delete_project',
      success: true,
      affectedEntities: [{
        type: 'project',
        id: data.projectId
      }]
    };
  }

  // USER MANAGEMENT
  private async createUser(data: any, user: IUser): Promise<ActionExecutionResult> {
    const UserService = (await import('./UserService')).default;

    const newUser = await UserService.createUser({
      name: data.userName,
      email: data.email,
      role: data.role.toLowerCase(),
      hourly_rate: data.hourlyRate
    }, user);

    return {
      intent: 'create_user',
      success: true,
      data: newUser,
      affectedEntities: [{
        type: 'user',
        id: newUser._id.toString(),
        name: newUser.name
      }]
    };
  }

  private async updateUser(data: any, user: IUser): Promise<ActionExecutionResult> {
    const UserService = (await import('./UserService')).default;

    const updatedUser = await UserService.updateUser(
      data.userId,
      {
        email: data.email,
        role: data.role?.toLowerCase(),
        hourly_rate: data.hourlyRate
      },
      user
    );

    return {
      intent: 'update_user',
      success: true,
      data: updatedUser,
      affectedEntities: [{
        type: 'user',
        id: updatedUser._id.toString()
      }]
    };
  }

  private async deleteUser(data: any, user: IUser): Promise<ActionExecutionResult> {
    const UserService = (await import('./UserService')).default;

    await UserService.deleteUser(
      data.userId,
      data.reason,
      user
    );

    return {
      intent: 'delete_user',
      success: true,
      affectedEntities: [{
        type: 'user',
        id: data.userId
      }]
    };
  }

  // CLIENT MANAGEMENT
  private async createClient(data: any, user: IUser): Promise<ActionExecutionResult> {
    const ClientService = (await import('./ClientService')).default;

    const client = await ClientService.createClient({
      name: data.clientName,
      contact_person: data.contactPerson,
      contact_email: data.contactEmail,
      is_active: data.isActive ?? true
    }, user);

    return {
      intent: 'create_client',
      success: true,
      data: client,
      affectedEntities: [{
        type: 'client',
        id: client._id.toString(),
        name: client.name
      }]
    };
  }

  private async updateClient(data: any, user: IUser): Promise<ActionExecutionResult> {
    const ClientService = (await import('./ClientService')).default;

    const client = await ClientService.updateClient(
      data.clientId,
      {
        contact_person: data.contactPerson,
        contact_email: data.contactEmail,
        is_active: data.isActive
      },
      user
    );

    return {
      intent: 'update_client',
      success: true,
      data: client,
      affectedEntities: [{
        type: 'client',
        id: client._id.toString()
      }]
    };
  }

  private async deleteClient(data: any, user: IUser): Promise<ActionExecutionResult> {
    const ClientService = (await import('./ClientService')).default;

    await ClientService.deleteClient(
      data.clientId,
      data.reason,
      user
    );

    return {
      intent: 'delete_client',
      success: true,
      affectedEntities: [{
        type: 'client',
        id: data.clientId
      }]
    };
  }

  // TIMESHEET MANAGEMENT
  private async createTimesheet(data: any, user: IUser): Promise<ActionExecutionResult> {
    const TimesheetService = (await import('./TimesheetService')).default;

    const timesheet = await TimesheetService.createTimesheet({
      user_id: user._id,
      week_start: data.weekStart,
      week_end: data.weekEnd
    }, user);

    return {
      intent: 'create_timesheet',
      success: true,
      data: timesheet,
      affectedEntities: [{
        type: 'timesheet',
        id: timesheet._id.toString()
      }]
    };
  }

  private async addEntries(data: any, user: IUser): Promise<ActionExecutionResult> {
    const TimesheetService = (await import('./TimesheetService')).default;

    const entries = data.entries || [data];
    const createdEntries = [];

    for (const entry of entries) {
      const timeEntry = await TimesheetService.addEntry({
        user_id: user._id,
        project_id: entry.projectId,
        task_id: entry.taskId,
        date: entry.date,
        hours: entry.hours,
        task_type: entry.taskType,
        custom_task_description: entry.customTaskDescription,
        entry_type: entry.entryType,
        description: entry.description
      }, user);

      createdEntries.push(timeEntry);
    }

    // Get week start from first entry date
    const firstDate = new Date(entries[0].date);
    const weekStart = format(startOfWeek(firstDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');

    return {
      intent: 'add_entries',
      success: true,
      data: { ...createdEntries[0], weekStart },
      affectedEntities: createdEntries.map((e: any) => ({
        type: 'time_entry',
        id: e._id.toString()
      }))
    };
  }

  private async updateEntries(data: any, user: IUser): Promise<ActionExecutionResult> {
    const TimesheetService = (await import('./TimesheetService')).default;

    const entry = await TimesheetService.updateEntry(
      data.entryId,
      {
        hours: data.hours,
        description: data.description,
        entry_type: data.entryType
      },
      user
    );

    return {
      intent: 'update_entries',
      success: true,
      data: { ...entry, weekStart: data.weekStart },
      affectedEntities: [{
        type: 'time_entry',
        id: entry._id.toString()
      }]
    };
  }

  private async deleteTimesheet(data: any, user: IUser): Promise<ActionExecutionResult> {
    const TimesheetService = (await import('./TimesheetService')).default;

    await TimesheetService.deleteTimesheet(
      data.timesheetId,
      user
    );

    return {
      intent: 'delete_timesheet',
      success: true,
      affectedEntities: [{
        type: 'timesheet',
        id: data.timesheetId
      }]
    };
  }

  private async deleteEntries(data: any, user: IUser): Promise<ActionExecutionResult> {
    const TimesheetService = (await import('./TimesheetService')).default;

    await TimesheetService.deleteEntry(
      data.entryId,
      user
    );

    return {
      intent: 'delete_entries',
      success: true,
      data: { weekStart: data.weekStart },
      affectedEntities: [{
        type: 'time_entry',
        id: data.entryId
      }]
    };
  }

  private async copyEntry(data: any, user: IUser): Promise<ActionExecutionResult> {
    const TimesheetService = (await import('./TimesheetService')).default;

    const copiedEntries = await TimesheetService.copyEntry(
      data.entryId,
      data.weekDates,
      user
    );

    // Get week start
    const firstDate = new Date(data.weekDates[0]);
    const weekStart = format(startOfWeek(firstDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');

    return {
      intent: 'copy_entry',
      success: true,
      data: { weekStart },
      affectedEntities: copiedEntries.map((e: any) => ({
        type: 'time_entry',
        id: e._id.toString()
      }))
    };
  }

  // TEAM REVIEW (simplified implementations - adjust based on your actual service methods)
  private async approveUser(data: any, user: IUser): Promise<ActionExecutionResult> {
    const TeamReviewApprovalService = (await import('./TeamReviewApprovalService')).default;

    await TeamReviewApprovalService.approveUserTimesheet(
      data.userId,
      data.projectId,
      data.weekStart,
      data.weekEnd,
      user
    );

    return {
      intent: 'approve_user',
      success: true,
      data: { weekStart: data.weekStart },
      affectedEntities: [{
        type: 'timesheet',
        id: data.userId
      }]
    };
  }

  private async approveProjectWeek(data: any, user: IUser): Promise<ActionExecutionResult> {
    const TeamReviewApprovalService = (await import('./TeamReviewApprovalService')).default;

    await TeamReviewApprovalService.approveProjectWeek(
      data.projectId,
      data.weekStart,
      data.weekEnd,
      user
    );

    return {
      intent: 'approve_project_week',
      success: true,
      data: { weekStart: data.weekStart },
      affectedEntities: [{
        type: 'project',
        id: data.projectId
      }]
    };
  }

  private async rejectUser(data: any, user: IUser): Promise<ActionExecutionResult> {
    const TeamReviewApprovalService = (await import('./TeamReviewApprovalService')).default;

    await TeamReviewApprovalService.rejectUserTimesheet(
      data.userId,
      data.projectId,
      data.weekStart,
      data.weekEnd,
      data.reason,
      user
    );

    return {
      intent: 'reject_user',
      success: true,
      data: { weekStart: data.weekStart },
      affectedEntities: [{
        type: 'timesheet',
        id: data.userId
      }]
    };
  }

  private async rejectProjectWeek(data: any, user: IUser): Promise<ActionExecutionResult> {
    const TeamReviewApprovalService = (await import('./TeamReviewApprovalService')).default;

    await TeamReviewApprovalService.rejectProjectWeek(
      data.projectId,
      data.weekStart,
      data.weekEnd,
      data.reason,
      user
    );

    return {
      intent: 'reject_project_week',
      success: true,
      data: { weekStart: data.weekStart },
      affectedEntities: [{
        type: 'project',
        id: data.projectId
      }]
    };
  }

  private async sendReminder(data: any, user: IUser): Promise<ActionExecutionResult> {
    const DefaulterService = (await import('./DefaulterService')).default;

    await DefaulterService.sendReminderNotifications(
      data.projectId,
      data.weekStart,
      data.weekEnd,
      user
    );

    return {
      intent: 'send_reminder',
      success: true,
      data: { weekStart: data.weekStart },
      affectedEntities: [{
        type: 'project',
        id: data.projectId
      }]
    };
  }

  // BILLING
  private async exportProjectBilling(data: any, user: IUser): Promise<ActionExecutionResult> {
    const ProjectBillingService = (await import('./ProjectBillingService')).default;

    const file = await ProjectBillingService.exportBilling({
      start_date: data.startDate,
      end_date: data.endDate,
      project_id: data.projectId,
      client_id: data.clientId,
      format: data.format.toLowerCase()
    }, user);

    return {
      intent: 'export_project_billing',
      success: true,
      data: { fileUrl: file.url, fileName: file.name }
    };
  }

  private async exportUserBilling(data: any, user: IUser): Promise<ActionExecutionResult> {
    const ProjectBillingService = (await import('./ProjectBillingService')).default;

    const file = await ProjectBillingService.exportUserBilling({
      start_date: data.startDate,
      end_date: data.endDate,
      user_id: data.userId,
      client_id: data.clientId,
      format: data.format.toLowerCase()
    }, user);

    return {
      intent: 'export_user_billing',
      success: true,
      data: { fileUrl: file.url, fileName: file.name }
    };
  }

  // AUDIT
  private async getAuditLogs(data: any, user: IUser): Promise<ActionExecutionResult> {
    const logs = await AuditLogService.getLogs({
      start_date: data.startDate,
      end_date: data.endDate
    }, user);

    return {
      intent: 'get_audit_logs',
      success: true,
      data: logs
    };
  }

  /**
   * Get entity type for audit logging
   */
  private getEntityType(intent: string): string {
    if (intent.includes('project')) return 'project';
    if (intent.includes('user')) return 'user';
    if (intent.includes('client')) return 'client';
    if (intent.includes('timesheet') || intent.includes('entries')) return 'timesheet';
    if (intent.includes('task')) return 'task';
    if (intent.includes('billing')) return 'billing';
    return 'voice_command';
  }
}

export default new VoiceActionDispatcher();
