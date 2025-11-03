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
        name: user.name,
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
      // Import dynamically to avoid circular dependencies
      const ProjectService = (await import('./ProjectService')).default;
      const projects = await ProjectService.getProjectsForUser(user._id.toString());

      return projects.map((p: any) => ({
        id: p._id.toString(),
        name: p.name,
        client: p.client?.name
      }));
    } catch (error) {
      logger.error('Failed to fetch projects list', { error });
      return [];
    }
  }

  private async getUsersList(user: IUser) {
    try {
      const UserService = (await import('./UserService')).default;
      const users = await UserService.getAllUsers();

      return users.map((u: any) => ({
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        role: u.role
      }));
    } catch (error) {
      logger.error('Failed to fetch users list', { error });
      return [];
    }
  }

  private async getClientsList(user: IUser) {
    try {
      const ClientService = (await import('./ClientService')).default;
      const clients = await ClientService.getAllClients();

      return clients.map((c: any) => ({
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
      const ProjectService = (await import('./ProjectService')).default;
      const projects = await ProjectService.getProjectsForUser(user._id.toString());
      const tasksByProject: Record<string, Array<{ id: string; name: string; assignedTo?: string }>> = {};

      for (const project of projects) {
        try {
          const tasks = await ProjectService.getProjectTasks(project._id.toString());
          tasksByProject[project.name] = tasks.map((t: any) => ({
            id: t._id.toString(),
            name: t.name,
            assignedTo: t.assigned_to?.name
          }));
        } catch (error) {
          logger.warn('Failed to fetch tasks for project', { projectId: project._id, error });
          tasksByProject[project.name] = [];
        }
      }

      return tasksByProject;
    } catch (error) {
      logger.error('Failed to fetch tasks list', { error });
      return {};
    }
  }

  private async getTimesheetsList(user: IUser) {
    try {
      const TimesheetService = (await import('./TimesheetService')).default;
      const timesheets = await TimesheetService.getTimesheetsForUser(user._id.toString());

      return timesheets.map((t: any) => ({
        weekStart: format(new Date(t.week_start), 'yyyy-MM-dd'),
        weekEnd: format(new Date(t.week_end), 'yyyy-MM-dd'),
        status: t.status
      }));
    } catch (error) {
      logger.error('Failed to fetch timesheets list', { error });
      return [];
    }
  }

  private async getProjectWeekGroups(user: IUser) {
    try {
      // This would fetch project-week groups for team review
      // Implementation depends on your TeamReviewService structure
      const TeamReviewApprovalService = (await import('./TeamReviewApprovalService')).default;

      // Placeholder - implement based on your service methods
      // const groups = await TeamReviewApprovalService.getProjectWeekGroups();

      return [];
    } catch (error) {
      logger.error('Failed to fetch project week groups', { error });
      return [];
    }
  }
}

export default new VoiceContextService();
