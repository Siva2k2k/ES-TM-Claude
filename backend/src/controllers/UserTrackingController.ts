import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { UserWeekSummary, IUserWeekSummary } from '../models/UserWeekSummary';
import { User, IUser } from '../models/User';
import { Timesheet } from '../models/Timesheet';
import { Project } from '../models/Project';
import UserWeekAggregationService from '../services/UserWeekAggregationService';
import logger from '../config/logger';

export interface IUserTrackingFilters {
  userId?: mongoose.Types.ObjectId;
  userIds?: mongoose.Types.ObjectId[];
  startDate?: Date;
  endDate?: Date;
  weeks?: number;
  status?: string[];
}

export class UserTrackingController {

  /**
   * Get dashboard overview for managers/management
   */
  async getDashboardOverview(req: Request, res: Response): Promise<void> {
    try {
      const { role } = req.user!;
      const { weeks = 4 } = req.query;
      
      let userIds: mongoose.Types.ObjectId[] = [];
      
      // Get users based on role
      if (role === 'management') {
        // Management can see all users
        const users = await User.find({ 
          is_active: true, 
          deleted_at: null,
          role: { $in: ['employee', 'lead', 'manager'] }
        }).select('_id');
        userIds = users.map(u => u._id);
      } else if (role === 'manager') {
        // Managers can see their direct reports
        const users = await User.find({ 
          manager_id: req.user!._id,
          is_active: true, 
          deleted_at: null 
        }).select('_id');
        userIds = users.map(u => u._id);
      } else {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (Number(weeks) * 7));

      // Get aggregate metrics
      const overview = await this.calculateDashboardMetrics(userIds, startDate);
      
      res.json({
        success: true,
        data: overview
      });

    } catch (error) {
      logger.error('Error in getDashboardOverview:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get user list with performance summary
   */
  async getUserList(req: Request, res: Response): Promise<void> {
    try {
      const { role } = req.user!;
      const { weeks = 4, page = 1, limit = 20, search } = req.query;
      
      let userQuery: any = { 
        is_active: true, 
        deleted_at: null 
      };
      
      // Apply role-based filtering
      if (role === 'management') {
        userQuery.role = { $in: ['employee', 'lead', 'manager'] };
      } else if (role === 'manager') {
        userQuery.manager_id = req.user!._id;
      } else {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      // Apply search filter
      if (search) {
        userQuery.$or = [
          { full_name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }

      const skip = (Number(page) - 1) * Number(limit);
      const users = await User.find(userQuery)
        .populate('manager_id', 'full_name')
        .sort({ full_name: 1 })
        .skip(skip)
        .limit(Number(limit));

      const total = await User.countDocuments(userQuery);

      // Get performance data for each user
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (Number(weeks) * 7));

      const userList = await Promise.all(
        users.map(async (user) => {
          const performance = await this.getUserPerformanceSummary(user._id, startDate);
          return {
            id: user.id,
            full_name: user.full_name,
            email: user.email,
            role: user.role,
            manager: user.manager_id,
            ...performance
          };
        })
      );

      res.json({
        success: true,
        data: {
          users: userList,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit))
          }
        }
      });

    } catch (error) {
      logger.error('Error in getUserList:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get detailed user analytics
   */
  async getUserAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { weeks = 12 } = req.query;
      
      // Check permissions
      if (!await this.canAccessUser(req.user!, new mongoose.Types.ObjectId(userId))) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (Number(weeks) * 7));

      const analytics = await this.getDetailedUserAnalytics(
        new mongoose.Types.ObjectId(userId), 
        startDate
      );

      res.json({
        success: true,
        data: analytics
      });

    } catch (error) {
      logger.error('Error in getUserAnalytics:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get utilization trends
   */
  async getUtilizationTrends(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { weeks = 12 } = req.query;
      
      if (!await this.canAccessUser(req.user!, new mongoose.Types.ObjectId(userId))) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      const trends = await UserWeekAggregationService.getUserPerformanceTrends(
        new mongoose.Types.ObjectId(userId),
        Number(weeks)
      );

      res.json({
        success: true,
        data: trends
      });

    } catch (error) {
      logger.error('Error in getUtilizationTrends:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get team performance ranking
   */
  async getTeamRanking(req: Request, res: Response): Promise<void> {
    try {
      const { role } = req.user!;
      const { weeks = 4 } = req.query;
      
      let managerIds: mongoose.Types.ObjectId[] = [];
      
      if (role === 'management') {
        // Get all managers
        const managers = await User.find({ 
          role: { $in: ['manager', 'lead'] },
          is_active: true, 
          deleted_at: null 
        }).select('_id');
        managerIds = managers.map(m => m._id);
      } else if (role === 'manager') {
        managerIds = [req.user!._id];
      } else {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      const ranking = await UserWeekAggregationService.getTeamPerformanceRanking(
        managerIds,
        Number(weeks)
      );

      res.json({
        success: true,
        data: ranking
      });

    } catch (error) {
      logger.error('Error in getTeamRanking:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get project performance breakdown
   */
  async getProjectPerformance(req: Request, res: Response): Promise<void> {
    try {
      const { role } = req.user!;
      const { weeks = 4, projectId } = req.query;
      
      let userIds: mongoose.Types.ObjectId[] = [];
      
      // Get users based on role
      if (role === 'management') {
        const users = await User.find({ 
          is_active: true, 
          deleted_at: null,
          role: { $in: ['employee', 'lead', 'manager'] }
        }).select('_id');
        userIds = users.map(u => u._id);
      } else if (role === 'manager') {
        const users = await User.find({ 
          manager_id: req.user!._id,
          is_active: true, 
          deleted_at: null 
        }).select('_id');
        userIds = users.map(u => u._id);
      } else {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (Number(weeks) * 7));

      const projectPerformance = await this.getProjectPerformanceData(
        userIds, 
        startDate,
        projectId ? new mongoose.Types.ObjectId(String(projectId)) : undefined
      );

      res.json({
        success: true,
        data: projectPerformance
      });

    } catch (error) {
      logger.error('Error in getProjectPerformance:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Trigger aggregation for specific timesheet or user
   */
  async triggerAggregation(req: Request, res: Response): Promise<void> {
    try {
      const { timesheetId, userId, projectId, weeks } = req.body;
      
      let result;
      
      if (timesheetId) {
        result = await UserWeekAggregationService.aggregateTimesheet(
          new mongoose.Types.ObjectId(timesheetId)
        );
      } else if (projectId) {
        // Recalculate all timesheets for a specific project (useful when project gets management approval)
        result = await UserWeekAggregationService.recalculateTimesheetsForProject(
          new mongoose.Types.ObjectId(projectId)
        );
      } else if (userId) {
        // Recalculate all timesheets for a specific user
        result = await UserWeekAggregationService.recalculateTimesheetsForUser(
          new mongoose.Types.ObjectId(userId),
          weeks
        );
      } else {
        // Aggregate recent weeks
        result = await UserWeekAggregationService.aggregateTimesheets({
          recalculateExisting: true
        });
      }

      res.json({
        success: true,
        data: { processed: result }
      });

    } catch (error) {
      logger.error('Error in triggerAggregation:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get aggregation statistics and status
   */
  async getAggregationStats(req: Request, res: Response): Promise<void> {
    try {
      const { weeks = 4 } = req.query;
      
      const stats = await UserWeekAggregationService.getAggregationStats(Number(weeks));
      
      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Error in getAggregationStats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Helper method to calculate dashboard metrics
   */
  private async calculateDashboardMetrics(userIds: mongoose.Types.ObjectId[], startDate: Date) {
    const summaries = await UserWeekSummary.find({
      user_id: { $in: userIds },
      week_start_date: { $gte: startDate },
      status: { $nin: ['draft'] }
    }).populate('user_id', 'full_name role');

    const totalUsers = userIds.length;
    const totalSummaries = summaries.length;
    
    if (totalSummaries === 0) {
      return {
        overview: {
          total_users: totalUsers,
          active_users: 0,
          avg_utilization: 0,
          avg_punctuality: 0,
          avg_quality: 0
        },
        trends: [],
        top_performers: [],
        alerts: []
      };
    }

    // Calculate averages
    const avgUtilization = summaries.reduce((sum, s) => sum + s.utilization_metrics.utilization_percentage, 0) / totalSummaries;
    const avgPunctuality = summaries.reduce((sum, s) => sum + s.punctuality_metrics.punctuality_score, 0) / totalSummaries;
    const avgQuality = summaries.reduce((sum, s) => sum + s.quality_metrics.quality_score, 0) / totalSummaries;

    // Get weekly trends
    const weeklyTrends = await this.calculateWeeklyTrends(userIds, startDate);

    // Get top performers
    const topPerformers = await this.getTopPerformers(userIds, startDate, 5);

    // Generate alerts
    const alerts = await this.generateAlerts(summaries);

    return {
      overview: {
        total_users: totalUsers,
        active_users: new Set(summaries.map(s => s.user_id.toString())).size,
        avg_utilization: Math.round(avgUtilization),
        avg_punctuality: Math.round(avgPunctuality),
        avg_quality: Math.round(avgQuality)
      },
      trends: weeklyTrends,
      top_performers: topPerformers,
      alerts
    };
  }

  /**
   * Helper method to get user performance summary
   */
  private async getUserPerformanceSummary(userId: mongoose.Types.ObjectId, startDate: Date) {
    const summaries = await UserWeekSummary.find({
      user_id: userId,
      week_start_date: { $gte: startDate },
      status: { $nin: ['draft'] }
    });

    if (summaries.length === 0) {
      return {
        avg_utilization: 0,
        avg_punctuality: 0,
        avg_quality: 0,
        total_hours: 0,
        weeks_tracked: 0
      };
    }

    return {
      avg_utilization: Math.round(summaries.reduce((sum, s) => sum + s.utilization_metrics.utilization_percentage, 0) / summaries.length),
      avg_punctuality: Math.round(summaries.reduce((sum, s) => sum + s.punctuality_metrics.punctuality_score, 0) / summaries.length),
      avg_quality: Math.round(summaries.reduce((sum, s) => sum + s.quality_metrics.quality_score, 0) / summaries.length),
      total_hours: summaries.reduce((sum, s) => sum + s.total_worked_hours, 0),
      weeks_tracked: summaries.length
    };
  }

  /**
   * Helper method to get detailed user analytics
   */
  private async getDetailedUserAnalytics(userId: mongoose.Types.ObjectId, startDate: Date) {
    const user = await User.findById(userId).populate('manager_id', 'full_name');
    const summaries = await UserWeekSummary.find({
      user_id: userId,
      week_start_date: { $gte: startDate },
      status: { $nin: ['draft'] }
    }).sort({ week_start_date: 1 });

    // Calculate trends and breakdowns
    const utilizationTrend = summaries.map(s => ({
      week: s.week_start_date,
      utilization: s.utilization_metrics.utilization_percentage,
      billable_hours: s.billable_hours,
      total_hours: s.total_worked_hours
    }));

    const projectBreakdown = this.aggregateProjectBreakdown(summaries);
    const performanceScores = this.calculatePerformanceScores(summaries);

    return {
      user: {
        id: user?.id,
        full_name: user?.full_name,
        email: user?.email,
        role: user?.role,
        manager: user?.manager_id
      },
      summary: await this.getUserPerformanceSummary(userId, startDate),
      trends: {
        utilization: utilizationTrend,
        punctuality: summaries.map(s => ({
          week: s.week_start_date,
          score: s.punctuality_metrics.punctuality_score,
          on_time: s.punctuality_metrics.is_on_time
        })),
        quality: summaries.map(s => ({
          week: s.week_start_date,
          score: s.quality_metrics.quality_score,
          rejections: s.quality_metrics.rejection_count
        }))
      },
      project_breakdown: projectBreakdown,
      performance_scores: performanceScores
    };
  }

  /**
   * Helper method to check user access permissions
   */
  private async canAccessUser(currentUser: any, targetUserId: mongoose.Types.ObjectId): Promise<boolean> {
    if (currentUser.role === 'management') return true;
    if (currentUser.role === 'super_admin') return true;
    
    if (currentUser.role === 'manager') {
      const targetUser = await User.findById(targetUserId);
      return targetUser?.manager_id?.toString() === currentUser._id.toString();
    }
    
    return currentUser._id.toString() === targetUserId.toString();
  }

  /**
   * Additional helper methods for calculations
   */
  private async calculateWeeklyTrends(userIds: mongoose.Types.ObjectId[], startDate: Date) {
    return UserWeekSummary.aggregate([
      {
        $match: {
          user_id: { $in: userIds },
          week_start_date: { $gte: startDate },
          status: { $nin: ['draft'] }
        }
      },
      {
        $group: {
          _id: '$week_start_date',
          avg_utilization: { $avg: '$utilization_metrics.utilization_percentage' },
          avg_punctuality: { $avg: '$punctuality_metrics.punctuality_score' },
          avg_quality: { $avg: '$quality_metrics.quality_score' },
          total_hours: { $sum: '$total_worked_hours' },
          user_count: { $addToSet: '$user_id' }
        }
      },
      {
        $addFields: {
          user_count: { $size: '$user_count' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
  }

  private async getTopPerformers(userIds: mongoose.Types.ObjectId[], startDate: Date, limit: number) {
    return UserWeekSummary.aggregate([
      {
        $match: {
          user_id: { $in: userIds },
          week_start_date: { $gte: startDate },
          status: { $nin: ['draft'] }
        }
      },
      {
        $group: {
          _id: '$user_id',
          avg_utilization: { $avg: '$utilization_metrics.utilization_percentage' },
          avg_punctuality: { $avg: '$punctuality_metrics.punctuality_score' },
          avg_quality: { $avg: '$quality_metrics.quality_score' },
          total_hours: { $sum: '$total_worked_hours' }
        }
      },
      {
        $addFields: {
          overall_score: {
            $multiply: [
              { $add: ['$avg_utilization', '$avg_punctuality', '$avg_quality'] },
              0.333
            ]
          }
        }
      },
      { $sort: { overall_score: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          user_id: '$_id',
          full_name: '$user.full_name',
          role: '$user.role',
          avg_utilization: { $round: ['$avg_utilization', 1] },
          avg_punctuality: { $round: ['$avg_punctuality', 1] },
          avg_quality: { $round: ['$avg_quality', 1] },
          overall_score: { $round: ['$overall_score', 1] },
          total_hours: '$total_hours'
        }
      }
    ]);
  }

  private async generateAlerts(summaries: IUserWeekSummary[]) {
    const alerts = [];
    
    // Low utilization alert
    const lowUtilization = summaries.filter(s => s.utilization_metrics.utilization_percentage < 70);
    if (lowUtilization.length > 0) {
      alerts.push({
        type: 'warning',
        title: 'Low Utilization',
        message: `${lowUtilization.length} users have utilization below 70%`,
        count: lowUtilization.length
      });
    }

    // Late submissions alert
    const lateSubmissions = summaries.filter(s => !s.punctuality_metrics.is_on_time);
    if (lateSubmissions.length > 0) {
      alerts.push({
        type: 'info',
        title: 'Late Submissions',
        message: `${lateSubmissions.length} timesheets submitted late`,
        count: lateSubmissions.length
      });
    }

    // Quality issues alert
    const qualityIssues = summaries.filter(s => s.quality_metrics.rejection_count > 0);
    if (qualityIssues.length > 0) {
      alerts.push({
        type: 'error',
        title: 'Quality Issues',
        message: `${qualityIssues.length} timesheets had rejections`,
        count: qualityIssues.length
      });
    }

    return alerts;
  }

  private aggregateProjectBreakdown(summaries: IUserWeekSummary[]) {
    const projectMap = new Map();
    
    summaries.forEach(summary => {
      summary.project_breakdown.forEach(project => {
        const key = project.project_id.toString();
        const existing = projectMap.get(key) || {
          project_id: project.project_id,
          project_name: project.project_name,
          total_hours: 0,
          billable_hours: 0,
          weeks_worked: 0,
          is_training: project.is_training
        };
        
        existing.total_hours += project.total_hours;
        existing.billable_hours += project.billable_hours;
        existing.weeks_worked += 1;
        
        projectMap.set(key, existing);
      });
    });
    
    return Array.from(projectMap.values()).sort((a, b) => b.total_hours - a.total_hours);
  }

  private calculatePerformanceScores(summaries: IUserWeekSummary[]) {
    if (summaries.length === 0) return {};
    
    return {
      utilization: Math.round(summaries.reduce((sum, s) => sum + s.utilization_metrics.utilization_percentage, 0) / summaries.length),
      punctuality: Math.round(summaries.reduce((sum, s) => sum + s.punctuality_metrics.punctuality_score, 0) / summaries.length),
      quality: Math.round(summaries.reduce((sum, s) => sum + s.quality_metrics.quality_score, 0) / summaries.length),
      consistency: Math.round(summaries.reduce((sum, s) => sum + s.performance_metrics.consistency_score, 0) / summaries.length),
      project_diversity: Math.round(summaries.reduce((sum, s) => sum + s.performance_metrics.project_diversity_score, 0) / summaries.length)
    };
  }

  private async getProjectPerformanceData(
    userIds: mongoose.Types.ObjectId[], 
    startDate: Date, 
    projectId?: mongoose.Types.ObjectId
  ) {
    const matchConditions: any = {
      user_id: { $in: userIds },
      week_start_date: { $gte: startDate },
      status: { $nin: ['draft'] }
    };

    if (projectId) {
      matchConditions['project_breakdown.project_id'] = projectId;
    }

    return UserWeekSummary.aggregate([
      { $match: matchConditions },
      { $unwind: '$project_breakdown' },
      {
        $match: projectId 
          ? { 'project_breakdown.project_id': projectId }
          : {}
      },
      {
        $group: {
          _id: '$project_breakdown.project_id',
          project_name: { $first: '$project_breakdown.project_name' },
          total_hours: { $sum: '$project_breakdown.total_hours' },
          billable_hours: { $sum: '$project_breakdown.billable_hours' },
          user_count: { $addToSet: '$user_id' },
          weeks_count: { $sum: 1 },
          is_training: { $first: '$project_breakdown.is_training' }
        }
      },
      {
        $addFields: {
          user_count: { $size: '$user_count' },
          avg_hours_per_week: { $divide: ['$total_hours', '$weeks_count'] },
          utilization_rate: { 
            $multiply: [
              { $divide: ['$billable_hours', '$total_hours'] },
              100
            ]
          }
        }
      },
      { $sort: { total_hours: -1 } }
    ]);
  }
}

export default new UserTrackingController();