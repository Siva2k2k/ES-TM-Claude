import { VoiceContext } from '../types/voice';
import { IUser } from '../models/User';
import IntentConfigService from './IntentConfigService';
import logger from '../config/logger';
import { startOfWeek, endOfWeek, format } from 'date-fns';

class VoiceContextService {
  /**
   * Get all available context for a user
   */
  async getContext(user: IUser): Promise<VoiceContext> {
    const { allowed, disallowed } = await IntentConfigService.getIntentsForUser(user);

    const context: VoiceContext = {
      user: {
        id: user._id.toString(),
        name: user.full_name,
        role: user.role,
        email: user.email
      },
      allowedIntents: allowed,
      disallowedIntents: disallowed,
      entities: {},
      currentDate: format(new Date(), 'yyyy-MM-dd'),
      currentWeek: {
        start: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        end: format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
      }
    };

    return context;
  }

  /**
   * Get context for specific intents (fetches required entities)
   */
  async getContextForIntents(user: IUser, intents: string[]): Promise<VoiceContext> {
    const baseContext = await this.getContext(user);

    // Get intent definitions from database
    const intentDefinitions = await IntentConfigService.getIntentDefinitions(intents);

    // Determine which entities are needed
    const requiredEntities = new Set<string>();
    for (const intentDef of intentDefinitions) {
      intentDef.contextRequired.forEach(entity => requiredEntities.add(entity));
    }

    // Fetch required entities
    const entities: VoiceContext['entities'] = {};

    if (requiredEntities.has('projects')) {
      entities.projects = await this.getProjectsList(user);
    }

    if (requiredEntities.has('users')) {
      entities.users = await this.getUsersList(user);
    }

    if (requiredEntities.has('clients')) {
      entities.clients = await this.getClientsList(user);
    }

    if (requiredEntities.has('tasks')) {
      entities.tasks = await this.getTasksList(user);
    }

    if (requiredEntities.has('timesheets')) {
      entities.timesheets = await this.getTimesheetsList(user);
    }

    if (requiredEntities.has('projectWeekGroups')) {
      entities.projectWeekGroups = await this.getProjectWeekGroups(user);
    }

    baseContext.entities = entities;

    logger.info('Voice context fetched', {
      userId: user._id,
      intents,
      entitiesFetched: Object.keys(entities)
    });

    return baseContext;
  }

  // Helper methods to fetch entities from existing services
  private async getProjectsList(user: IUser) {
    try {
      const { ProjectService } = await import('./ProjectService');
      const authUser = {
        id: user._id.toString(),
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        hourly_rate: user.hourly_rate || 0,
        is_active: user.is_active,
        is_approved_by_super_admin: user.is_approved_by_super_admin
      };

      const { projects, error } = await ProjectService.getAllProjects(authUser);
      if (error) {
        logger.error('Failed to fetch projects', { error });
        return [];
      }

      return projects.map(p => ({
        id: p._id.toString(),
        name: p.name,
        client: p.client?.name || 'Unknown Client'
      }));
    } catch (error) {
      logger.error('Failed to fetch projects list', { error });
      return [];
    }
  }

  private async getUsersList(user: IUser) {
    try {
      const { UserService } = await import('./UserService');
      const authUser = {
        id: user._id.toString(),
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        hourly_rate: user.hourly_rate || 0,
        is_active: user.is_active,
        is_approved_by_super_admin: user.is_approved_by_super_admin
      };

      const { users, error } = await UserService.getAllUsers(authUser);
      if (error) {
        logger.error('Failed to fetch users', { error });
        return [];
      }

      return users.map(u => ({
        id: u._id.toString(),
        name: u.full_name,
        role: u.role,
        email: u.email
      }));
    } catch (error) {
      logger.error('Failed to fetch users list', { error });
      return [];
    }
  }

  private async getClientsList(user: IUser) {
    try {
      const { ClientService } = await import('./ClientService');
      const authUser = {
        id: user._id.toString(),
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        hourly_rate: user.hourly_rate || 0,
        is_active: user.is_active,
        is_approved_by_super_admin: user.is_approved_by_super_admin
      };

      const { clients, error } = await ClientService.getAllClients(authUser);
      if (error) {
        logger.error('Failed to fetch clients', { error });
        return [];
      }

      return clients.map(c => ({
        id: c._id.toString(),
        name: c.name,
        contactPerson: c.contact_person
      }));
    } catch (error) {
      logger.error('Failed to fetch clients list', { error });
      return [];
    }
  }

  private async getTasksList(user: IUser) {
    try {
      const { ProjectService } = await import('./ProjectService');
      const authUser = {
        id: user._id.toString(),
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        hourly_rate: user.hourly_rate || 0,
        is_active: user.is_active,
        is_approved_by_super_admin: user.is_approved_by_super_admin
      };

      const { projects, error } = await ProjectService.getAllProjects(authUser);
      if (error) {
        logger.error('Failed to fetch projects for tasks', { error });
        return {};
      }

      // Group tasks by project
      const tasksRecord: Record<string, Array<{ id: string; name: string; assignedTo?: string }>> = {};
      for (const project of projects) {
        if (project.tasks && Array.isArray(project.tasks)) {
          tasksRecord[project.name] = project.tasks.map(task => ({
            id: task._id.toString(),
            name: task.name,
            assignedTo: task.assigned_to_user_id?.toString()
          }));
        }
      }

      return tasksRecord;
    } catch (error) {
      logger.error('Failed to fetch tasks list', { error });
      return {};
    }
  }

  private async getTimesheetsList(user: IUser) {
    try {
      const { TimesheetService } = await import('./TimesheetService');
      const authUser = {
        id: user._id.toString(),
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        hourly_rate: user.hourly_rate || 0,
        is_active: user.is_active,
        is_approved_by_super_admin: user.is_approved_by_super_admin
      };

      const { timesheets, error } = await TimesheetService.getAllTimesheets(authUser);
      if (error) {
        logger.error('Failed to fetch timesheets', { error });
        return [];
      }

      return timesheets.map(t => ({
        weekStart: format(new Date(t.week_start_date), 'yyyy-MM-dd'),
        weekEnd: format(new Date(t.week_end_date), 'yyyy-MM-dd'),
        status: t.status
      }));
    } catch (error) {
      logger.error('Failed to fetch timesheets list', { error });
      return [];
    }
  }

  private async getProjectWeekGroups(user: IUser) {
    try {
      const { TeamReviewServiceV2 } = await import('./TeamReviewServiceV2');

      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

      const result = await TeamReviewServiceV2.getProjectWeekGroups(
        user._id.toString(),
        user.role,
        {
          week_start: format(weekStart, 'yyyy-MM-dd'),
          week_end: format(weekEnd, 'yyyy-MM-dd')
        }
      );

      if (!result.project_weeks || result.project_weeks.length === 0) {
        logger.info('No project week groups found');
        return [];
      }

      return result.project_weeks.map(pw => ({
        projectId: pw.project_id,
        projectName: pw.project_name,
        weekStart: pw.week_start,
        weekEnd: pw.week_end
      }));
    } catch (error) {
      logger.error('Failed to fetch project week groups', { error });
      return [];
    }
  }
}

export default new VoiceContextService();
