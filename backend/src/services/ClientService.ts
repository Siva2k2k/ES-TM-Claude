// @ts-nocheck - Temporarily disable type checking for Mongoose compatibility issues
import Client, { IClient } from '@/models/Client';
import { Project, ProjectMember } from '@/models/Project';
import { UserRole } from '@/models/User';
import { ValidationError, AuthorizationError, ConflictError } from '@/utils/errors';
import { AuditLogService } from '@/services/AuditLogService';

interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  hourly_rate: number;
  is_active: boolean;
  is_approved_by_super_admin: boolean;
}

interface ClientWithProjects extends IClient {
  projects?: Array<{
    id: string;
    name: string;
    status: string;
    start_date: string;
    end_date?: string;
    is_billable: boolean;
  }>;
  total_projects?: number;
  active_projects?: number;
}

export class ClientService {
  private static requireClientManagementRole(user: AuthUser): void {
    if (!['management', 'super_admin'].includes(user.role)) {
      throw new AuthorizationError('Management role required for client management operations');
    }
  }

  private static requireClientViewRole(user: AuthUser): void {
    if (!['management', 'super_admin', 'manager', 'lead', 'employee'].includes(user.role)) {
      throw new AuthorizationError('Valid role required to view clients');
    }
  }

  private static validateClientData(data: Partial<IClient>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!data.name || data.name.trim().length < 2) {
      errors.push('Client name must be at least 2 characters long');
    }

    // Name should not be numeric only
    if (data.name && /^\d+$/.test(data.name.trim())) {
      errors.push('Client name cannot be only numbers');
    }

    if (data.name && data.name.trim().length > 100) {
      errors.push('Client name cannot exceed 100 characters');
    }

    if (data.contact_email && data.contact_email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.contact_email)) {
        errors.push('Invalid email format');
      }
    }

    if (data.contact_person && data.contact_person.trim().length > 100) {
      errors.push('Contact person name cannot exceed 100 characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static async createClient(
    clientData: Partial<IClient>,
    currentUser: AuthUser
  ): Promise<{ client?: IClient; error?: string }> {
    try {
      this.requireClientManagementRole(currentUser);

      const validation = this.validateClientData(clientData);
      if (!validation.isValid) {
        throw new ValidationError(validation.errors.join(', '));
      }

      // Check for duplicate client names (case-insensitive)
      const existingClient = await Client.findOne({
        name: { $regex: new RegExp(`^${clientData.name?.trim()}$`, 'i') },
        deleted_at: null
      });

      if (existingClient) {
        // return HTTP 409 conflict semantic via error message
        throw new ConflictError('A client with this name already exists');
      }

      const client = new Client({
        name: clientData.name?.trim(),
        contact_person: clientData.contact_person?.trim() || undefined,
        contact_email: clientData.contact_email?.toLowerCase().trim() || undefined,
        is_active: clientData.is_active ?? true
      });

      await client.save();

      // Log the creation for audit trail
      
      await AuditLogService.logEvent(
        'clients',
        client._id.toString(),
        'INSERT',
        currentUser.id,
        currentUser.full_name,
        {
          operation: 'client_created',
          client_name: client.name
        },
        undefined,
        undefined,
        client.toJSON()
      );

      return { client: client as IClient };
    } catch (error: any) {
      console.error('Error creating client:', error);
      if (error instanceof AuthorizationError || error instanceof ValidationError) {
        return { error: error.message };
      }
      return { error: 'Failed to create client' };
    }
  }

  static async getAllClients(
    currentUser: AuthUser,
    includeInactive: boolean = false
  ): Promise<{ clients?: ClientWithProjects[]; error?: string }> {
    try {
      this.requireClientViewRole(currentUser);

      const filter: any = { deleted_at: null };
      if (!includeInactive) {
        filter.is_active = true;
      }

      // For non-management roles, only show clients with projects they have access to
      let clientFilter = filter;
      if (['manager', 'lead', 'employee'].includes(currentUser.role)) {
        // Get projects the user has access to
        const userProjectIds = await ProjectMember.find({
          user_id: currentUser.id,
          deleted_at: null
        }).distinct('project_id');

        const projectClientIds = await Project.find({
          _id: { $in: userProjectIds },
          deleted_at: null
        }).distinct('client_id');

        clientFilter = {
          ...filter,
          _id: { $in: projectClientIds }
        };
      }

      const clients = await Client.find(clientFilter)
        .sort({ name: 1 })
        .lean();

      // Add project information for each client
      const clientsWithProjects: ClientWithProjects[] = await Promise.all(
        clients.map(async (client) => {
          const projects = await Project.find({
            client_id: client._id,
            deleted_at: null
          })
            .select('name status start_date end_date is_billable')
            .sort({ created_at: -1 })
            .lean();

          const projectData = projects.map((project) => ({
            id: project._id.toString(),
            name: project.name,
            status: project.status,
            start_date: project.start_date,
            end_date: project.end_date,
            is_billable: project.is_billable
          }));

          return {
            ...client,
            id: client._id.toString(),
            projects: projectData,
            total_projects: projects.length,
            active_projects: projects.filter(p => p.status === 'active').length
          } as ClientWithProjects;
        })
      );

      return { clients: clientsWithProjects };
    } catch (error: any) {
      console.error('Error fetching clients:', error);
      if (error instanceof AuthorizationError) {
        return { error: error.message };
      }
      return { error: 'Failed to fetch clients' };
    }
  }

  static async getClientById(
    clientId: string,
    currentUser: AuthUser
  ): Promise<{ client?: ClientWithProjects; error?: string }> {
    try {
      this.requireClientViewRole(currentUser);

      const client = await Client.findById(clientId).lean();
      if (!client || client.deleted_at) {
        return { error: 'Client not found' };
      }

      // Check if user has access to this client (for non-management roles)
      if (['manager', 'lead', 'employee'].includes(currentUser.role)) {
        const { ProjectMember } = require('@/models/ProjectMember');
        const userProjectIds = await ProjectMember.find({
          user_id: currentUser.id,
          deleted_at: null
        }).distinct('project_id');

        const hasAccess = await Project.findOne({
          _id: { $in: userProjectIds },
          client_id: clientId,
          deleted_at: null
        });

        if (!hasAccess) {
          throw new AuthorizationError('Access denied to this client');
        }
      }

      // Get client projects
      const projects = await Project.find({
        client_id: clientId,
        deleted_at: null
      })
        .select('name status start_date end_date is_billable budget')
        .sort({ created_at: -1 })
        .lean();

      const projectData = projects.map((project) => ({
        id: project._id.toString(),
        name: project.name,
        status: project.status,
        start_date: project.start_date,
        end_date: project.end_date,
        is_billable: project.is_billable,
        budget: project.budget
      }));

      const clientWithProjects: ClientWithProjects = {
        ...client,
        id: client._id.toString(),
        projects: projectData,
        total_projects: projects.length,
        active_projects: projects.filter(p => p.status === 'active').length
      };

      return { client: clientWithProjects };
    } catch (error: any) {
      console.error('Error fetching client:', error);
      if (error instanceof AuthorizationError) {
        return { error: error.message };
      }
      return { error: 'Failed to fetch client' };
    }
  }

  static async updateClient(
    clientId: string,
    updates: Partial<IClient>,
    currentUser: AuthUser
  ): Promise<{ success: boolean; client?: IClient; error?: string }> {
    try {
      this.requireClientManagementRole(currentUser);

      const validation = this.validateClientData(updates);
      if (!validation.isValid) {
        throw new ValidationError(validation.errors.join(', '));
      }

      const existingClient = await Client.findById(clientId);
      if (!existingClient || existingClient.deleted_at) {
        return { success: false, error: 'Client not found' };
      }

      // Check for duplicate names (excluding current client)
      if (updates.name && updates.name.trim() !== existingClient.name) {
        const duplicateClient = await Client.findOne({
          _id: { $ne: clientId },
          name: { $regex: new RegExp(`^${updates.name.trim()}$`, 'i') },
          deleted_at: null
        });

        if (duplicateClient) {
          return { success: false, error: 'A client with this name already exists' };
        }
      }

      const oldData = existingClient.toJSON();

      // Update client
      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name.trim();
      if (updates.contact_person !== undefined) {
        updateData.contact_person = updates.contact_person?.trim() || undefined;
      }
      if (updates.contact_email !== undefined) {
        updateData.contact_email = updates.contact_email?.toLowerCase().trim() || undefined;
      }
      if (updates.is_active !== undefined) updateData.is_active = updates.is_active;

      const updatedClient = await Client.findByIdAndUpdate(
        clientId,
        updateData,
        { new: true, runValidators: true }
      );

      // Log the update for audit trail
      await AuditLogService.logEvent(
       'clients',
        clientId,
        'UPDATE',
        currentUser.id,
        currentUser.full_name,
        {
          operation: 'client_updated',
          client_name: updatedClient?.name
        },
        oldData,
        updatedClient?.toJSON()
      );

      return { success: true, client: updatedClient as IClient };
    } catch (error: any) {
      console.error('Error updating client:', error);
      if (error instanceof AuthorizationError || error instanceof ValidationError) {
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Failed to update client' };
    }
  }

  static async deactivateClient(
    clientId: string,
    currentUser: AuthUser
  ): Promise<{ success: boolean; error?: string }> {
    try {
      this.requireClientManagementRole(currentUser);

      const client = await Client.findById(clientId);
      if (!client || client.deleted_at) {
        return { success: false, error: 'Client not found' };
      }

      // Check if client has active projects
      const activeProjects = await Project.countDocuments({
        client_id: clientId,
        status: 'active',
        deleted_at: null
      });

      if (activeProjects > 0) {
        return {
          success: false,
          error: `Cannot deactivate client with ${activeProjects} active project(s). Please complete or archive the projects first.`
        };
      }

      // Deactivate the client
      await Client.findByIdAndUpdate(clientId, {
        is_active: false,
        updated_at: new Date()
      });

      // Log the deactivation for audit trail
      await AuditLogService.logEvent(
        'clients',
        clientId,
        'UPDATE',
        currentUser.id,
        currentUser.full_name,
        {
          operation: 'client_deactivated',
          client_name: client.name
        }
      );

      return { success: true };
    } catch (error: any) {
      console.error('Error deactivating client:', error);
      if (error instanceof AuthorizationError) {
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Failed to deactivate client' };
    }
  }

  static async reactivateClient(
    clientId: string,
    currentUser: AuthUser
  ): Promise<{ success: boolean; error?: string }> {
    try {
      this.requireClientManagementRole(currentUser);

      const client = await Client.findById(clientId);
      if (!client || client.deleted_at) {
        return { success: false, error: 'Client not found' };
      }

      if (client.is_active) {
        return { success: false, error: 'Client is already active' };
      }

      // Reactivate the client
      await Client.findByIdAndUpdate(clientId, {
        is_active: true,
        updated_at: new Date()
      });

      // Log the reactivation for audit trail
      await AuditLogService.logEvent(
        'clients',
        clientId,
        'UPDATE',
        currentUser.id,
        currentUser.full_name,
        {
          operation: 'client_reactivated',
          client_name: client.name
        }
      );

      return { success: true };
    } catch (error: any) {
      console.error('Error reactivating client:', error);
      if (error instanceof AuthorizationError) {
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Failed to reactivate client' };
    }
  }

  static async deleteClient(
    clientId: string,
    currentUser: AuthUser
  ): Promise<{ success: boolean; error?: string }> {
    try {
      this.requireClientManagementRole(currentUser);

      const client = await Client.findById(clientId);
      if (!client || client.deleted_at) {
        return { success: false, error: 'Client not found' };
      }

      // Check if client has any projects
      const projectCount = await Project.countDocuments({
        client_id: clientId,
        deleted_at: null
      });

      if (projectCount > 0) {
        return {
          success: false,
          error: `Cannot delete client with ${projectCount} project(s). Please delete all projects first.`
        };
      }

      // Soft delete the client
      await Client.findByIdAndUpdate(clientId, {
        deleted_at: new Date(),
        is_active: false,
        updated_at: new Date()
      });

      // Log the deletion for audit trail
      await AuditLogService.logEvent(
        'clients',
        clientId,
        'DELETE',
        currentUser.id,
        currentUser.full_name,
        {
          operation: 'client_deleted',
          client_name: client.name
        }
      );

      return { success: true };
    } catch (error: any) {
      console.error('Error deleting client:', error);
      if (error instanceof AuthorizationError) {
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Failed to delete client' };
    }
  }

  static async getClientStats(
    currentUser: AuthUser
  ): Promise<{
    stats?: {
      total_clients: number;
      active_clients: number;
      inactive_clients: number;
      clients_with_active_projects: number;
    };
    error?: string;
  }> {
    try {
      this.requireClientViewRole(currentUser);

      // Build filter based on user role
      let clientFilter: any = { deleted_at: null };

      if (['manager', 'lead', 'employee'].includes(currentUser.role)) {
        // Get projects the user has access to
        const { ProjectMember } = require('@/models/ProjectMember');
        const userProjectIds = await ProjectMember.find({
          user_id: currentUser.id,
          deleted_at: null
        }).distinct('project_id');

        const projectClientIds = await Project.find({
          _id: { $in: userProjectIds },
          deleted_at: null
        }).distinct('client_id');

        clientFilter._id = { $in: projectClientIds };
      }

      const [totalClients, activeClients, inactiveClients] = await Promise.all([
        Client.countDocuments(clientFilter),
        Client.countDocuments({ ...clientFilter, is_active: true }),
        Client.countDocuments({ ...clientFilter, is_active: false })
      ]);

      // Count clients with active projects
      const clientsWithActiveProjects = await Project.aggregate([
        {
          $match: {
            status: 'active',
            deleted_at: null,
            ...(clientFilter._id ? { client_id: { $in: clientFilter._id } } : {})
          }
        },
        {
          $group: {
            _id: '$client_id'
          }
        },
        {
          $count: 'count'
        }
      ]);

      const stats = {
        total_clients: totalClients,
        active_clients: activeClients,
        inactive_clients: inactiveClients,
        clients_with_active_projects: clientsWithActiveProjects[0]?.count || 0
      };

      return { stats };
    } catch (error: any) {
      console.error('Error fetching client stats:', error);
      if (error instanceof AuthorizationError) {
        return { error: error.message };
      }
      return { error: 'Failed to fetch client statistics' };
    }
  }
}