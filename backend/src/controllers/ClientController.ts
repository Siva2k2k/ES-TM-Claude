import { Request, Response } from 'express';
import { ClientService } from '@/services/ClientService';
import { ValidationError, ConflictError } from '@/utils/errors';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    full_name: string;
    hourly_rate: number;
    is_active: boolean;
    is_approved_by_super_admin: boolean;
  };
}

export class ClientController {
  static async createClient(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const result = await ClientService.createClient(req.body, req.user as any);

      if (result.error) {
        // Service may return error message for non-exception validation
        res.status(400).json({ success: false, message: result.error });
        return;
      }

      res.status(201).json({
        success: true,
        data: result.client,
        message: 'Client created successfully'
      });
    } catch (error: any) {
      console.error('Error in createClient:', error);
      if (error instanceof ValidationError) {
        res.status(400).json({ success: false, message: error.message });
        return;
      }
      if (error instanceof ConflictError) {
        res.status(409).json({ success: false, message: error.message });
        return;
      }
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async getAllClients(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const includeInactive = req.query.includeInactive === 'true';
      const result = await ClientService.getAllClients(req.user as any, includeInactive);

      if (result.error) {
        res.status(400).json({ success: false, message: result.error });
        return;
      }

      res.status(200).json({
        success: true,
        data: result.clients,
        message: 'Clients fetched successfully'
      });
    } catch (error) {
      console.error('Error in getAllClients:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async getClientById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const { clientId } = req.params;
      const result = await ClientService.getClientById(clientId, req.user as any);

      if (result.error) {
        res.status(404).json({ success: false, message: result.error });
        return;
      }

      res.status(200).json({
        success: true,
        data: result.client,
        message: 'Client fetched successfully'
      });
    } catch (error) {
      console.error('Error in getClientById:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async updateClient(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const { clientId } = req.params;
      const result = await ClientService.updateClient(clientId, req.body, req.user as any);

      if (result.error) {
        res.status(400).json({ success: false, message: result.error });
        return;
      }

      res.status(200).json({
        success: true,
        data: result.client,
        message: 'Client updated successfully'
      });
    } catch (error) {
      console.error('Error in updateClient:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async deactivateClient(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const { clientId } = req.params;
      const result = await ClientService.deactivateClient(clientId, req.user as any);

      if (result.error) {
        res.status(400).json({ success: false, message: result.error });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Client deactivated successfully'
      });
    } catch (error) {
      console.error('Error in deactivateClient:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async reactivateClient(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const { clientId } = req.params;
      const result = await ClientService.reactivateClient(clientId, req.user as any);

      if (result.error) {
        res.status(400).json({ success: false, message: result.error });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Client reactivated successfully'
      });
    } catch (error) {
      console.error('Error in reactivateClient:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async deleteClient(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const { clientId } = req.params;
      const result = await ClientService.deleteClient(clientId, req.user as any);

      if (result.error) {
        res.status(400).json({ success: false, message: result.error });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Client deleted successfully'
      });
    } catch (error) {
      console.error('Error in deleteClient:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async getClientStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const result = await ClientService.getClientStats(req.user as any);

      if (result.error) {
        res.status(400).json({ success: false, message: result.error });
        return;
      }

      res.status(200).json({
        success: true,
        data: result.stats,
        message: 'Client statistics fetched successfully'
      });
    } catch (error) {
      console.error('Error in getClientStats:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}