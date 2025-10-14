/**
 * Phase 7: Team Review Controller
 * Handles HTTP requests for project-wise timesheet approval
 * SonarQube compliant
 */

import { Request, Response } from 'express';
import { TeamReviewService } from '../services/TeamReviewService';
import { TeamReviewServiceV2 } from '../services/TeamReviewServiceV2';
import { TeamReviewApprovalService } from '../services/TeamReviewApprovalService';
import { ApprovalHistory } from '../models/ApprovalHistory';
import { Timesheet } from '../models/Timesheet';
import { TimeEntry } from '../models/TimeEntry';
import { logger } from '../config/logger';
import { UserRole } from '@/models/User';
import mongoose from 'mongoose';
import type { ProjectWeekFilters } from '../types/teamReview';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    full_name: string;
    hourly_rate: number;
    is_active: boolean;
    is_approved_by_super_admin: boolean;
  };
}

export class TeamReviewController {
  /**
   * Get project-wise timesheet groups (LEGACY/V1)
   * GET /api/v1/timesheets/projects/groups
   */
  static async getProjectTimesheetGroupsLegacy(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const projects = await TeamReviewService.getProjectTimesheetGroups(userId, userRole);

      res.status(200).json({ projects });
    } catch (error) {
      logger.error('Error fetching project groups:', error);
      res.status(500).json({ error: 'Failed to fetch project timesheet groups' });
    }
  }

  /**
   * Approve timesheet for a specific project
   * POST /api/v1/timesheets/:timesheetId/approve
   */
  static async approveTimesheet(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { timesheetId } = req.params;
      const { project_id } = req.body;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!project_id) {
        res.status(400).json({ error: 'Project ID is required' });
        return;
      }

      const result = await TeamReviewApprovalService.approveTimesheetForProject(
        timesheetId,
        project_id,
        userId,
        userRole
      );

      res.status(200).json(result);
    } catch (error) {
      logger.error('Error approving timesheet:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to approve timesheet' });
    }
  }

  /**
   * Reject timesheet for a specific project
   * POST /api/v1/timesheets/:timesheetId/reject
   */
  static async rejectTimesheet(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { timesheetId } = req.params;
      const { project_id, reason } = req.body;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!project_id) {
        res.status(400).json({ error: 'Project ID is required' });
        return;
      }

      if (!reason || reason.trim().length < 10) {
        res.status(400).json({ error: 'Rejection reason must be at least 10 characters' });
        return;
      }

      const result = await TeamReviewApprovalService.rejectTimesheetForProject(
        timesheetId,
        project_id,
        userId,
        userRole,
        reason
      );

      res.status(200).json(result);
    } catch (error) {
      logger.error('Error rejecting timesheet:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to reject timesheet' });
    }
  }

  /**
   * Bulk verify timesheets (Management only)
   * POST /api/v1/timesheets/bulk/verify
   */
  static async bulkVerify(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { timesheet_ids } = req.body;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (userRole !== 'management' && userRole !== 'super_admin') {
        res.status(403).json({ error: 'Only Management can bulk verify timesheets' });
        return;
      }

      if (!Array.isArray(timesheet_ids) || timesheet_ids.length === 0) {
        res.status(400).json({ error: 'Timesheet IDs array is required' });
        return;
      }

      const result = await TeamReviewApprovalService.bulkVerifyTimesheets(timesheet_ids, userId);

      res.status(200).json({
        success: true,
        processed_count: result.processed_count,
        failed_count: result.failed_count
      });
    } catch (error) {
      logger.error('Error bulk verifying timesheets:', error);
      res.status(500).json({ error: 'Failed to bulk verify timesheets' });
    }
  }

  /**
   * Bulk mark timesheets as billed (Management only)
   * POST /api/v1/timesheets/bulk/bill
   */
  static async bulkBill(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { timesheet_ids } = req.body;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (userRole !== 'management' && userRole !== 'super_admin') {
        res.status(403).json({ error: 'Only Management can bulk bill timesheets' });
        return;
      }

      if (!Array.isArray(timesheet_ids) || timesheet_ids.length === 0) {
        res.status(400).json({ error: 'Timesheet IDs array is required' });
        return;
      }

      const result = await TeamReviewApprovalService.bulkBillTimesheets(timesheet_ids, userId);

      res.status(200).json({
        success: true,
        processed_count: result.processed_count,
        failed_count: result.failed_count
      });
    } catch (error) {
      logger.error('Error bulk billing timesheets:', error);
      res.status(500).json({ error: 'Failed to bulk bill timesheets' });
    }
  }

  /**
   * Get timesheet with approval history
   * GET /api/v1/timesheets/:timesheetId/history
   */
  static async getTimesheetHistory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { timesheetId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const timesheet = await Timesheet.findById(timesheetId)
        .populate('user_id', 'name email role')
        .lean() as any;

      if (!timesheet) {
        res.status(404).json({ error: 'Timesheet not found' });
        return;
      }

      const entries = await TimeEntry.find({
        timesheet_id: new mongoose.Types.ObjectId(timesheetId),
        deleted_at: null
      })
        .populate('project_id', 'name')
        .populate('task_id', 'name')
        .lean() as any[];

      const history = await ApprovalHistory.find({
        timesheet_id: new mongoose.Types.ObjectId(timesheetId)
      })
        .populate('project_id', 'name')
        .populate('approver_id', 'name email role')
        .sort({ created_at: -1 })
        .lean() as any[];

      res.status(200).json({
        timesheet,
        entries,
        approval_history: history
      });
    } catch (error) {
      logger.error('Error fetching timesheet history:', error);
      res.status(500).json({ error: 'Failed to fetch timesheet history' });
    }
  }

  /**
   * Get project-week groups (V2 with pagination and filters)
   * GET /api/v1/timesheets/project-weeks
   */
  static async getProjectWeekGroups(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Check role permission
      if (!['management', 'super_admin', 'manager', 'lead'].includes(userRole)) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      // Extract filters from query params
      const filters: ProjectWeekFilters = {
        project_id: req.query.project_id as string | string[],
        week_start: req.query.week_start as string,
        week_end: req.query.week_end as string,
        status: (req.query.status as any) || 'pending',
        sort_by: (req.query.sort_by as any) || 'week_date',
        sort_order: (req.query.sort_order as any) || 'desc',
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        search: req.query.search as string
      };

      const result = await TeamReviewServiceV2.getProjectWeekGroups(
        userId,
        userRole,
        filters
      );

      res.status(200).json(result);
    } catch (error) {
      logger.error('Error fetching project-week groups:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to fetch project-week groups'
      });
    }
  }

  /**
   * Approve all timesheets for a project-week
   * POST /api/v1/timesheets/project-week/approve
   */
  static async approveProjectWeek(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Check role permission
      if (!['management', 'super_admin', 'manager', 'lead'].includes(userRole)) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      const { project_id, week_start, week_end } = req.body;

      if (!project_id || !week_start || !week_end) {
        res.status(400).json({
          error: 'project_id, week_start, and week_end are required'
        });
        return;
      }

      const result = await TeamReviewApprovalService.approveProjectWeek(
        project_id,
        week_start,
        week_end,
        userId,
        userRole
      );

      res.status(200).json(result);
    } catch (error) {
      logger.error('Error approving project-week:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to approve project-week'
      });
    }
  }

  /**
   * Reject all timesheets for a project-week
   * POST /api/v1/timesheets/project-week/reject
   */
  static async rejectProjectWeek(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Check role permission
      if (!['management', 'super_admin', 'manager', 'lead'].includes(userRole)) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      const { project_id, week_start, week_end, reason } = req.body;

      if (!project_id || !week_start || !week_end) {
        res.status(400).json({
          error: 'project_id, week_start, and week_end are required'
        });
        return;
      }

      if (!reason || reason.trim().length < 10) {
        res.status(400).json({
          error: 'Rejection reason must be at least 10 characters'
        });
        return;
      }

      const result = await TeamReviewApprovalService.rejectProjectWeek(
        project_id,
        week_start,
        week_end,
        userId,
        userRole,
        reason
      );

      res.status(200).json(result);
    } catch (error) {
      logger.error('Error rejecting project-week:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to reject project-week'
      });
    }
  }
}

export default TeamReviewController;
