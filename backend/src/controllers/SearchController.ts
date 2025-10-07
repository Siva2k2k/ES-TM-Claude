import { Response } from 'express';
import { query, validationResult } from 'express-validator';
import { SearchService, SearchOptions } from '@/services/SearchService';
import { SearchCategory, SearchItemType } from '@/models/SearchIndex';
import { AuthRequest } from '@/middleware/auth';

export class SearchController {
  /**
   * Perform global search
   */
  static async search(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
        return;
      }

      const {
        q: query,
        categories,
        types,
        limit = 10
      } = req.query as any;

      if (!query || query.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: 'Search query is required'
        });
        return;
      }

      const userId = req.user?.id;
      const userRole = req.user?.role;
      
      const searchOptions: SearchOptions = {
        query: query.trim(),
        categories: categories ? categories.split(',') : undefined,
        types: types ? types.split(',') : undefined,
        limit: parseInt(limit as string) || 10,
        user_id: userId,
        user_role: userRole
      };

      const results = await SearchService.search(searchOptions);

      res.json({
        success: true,
        data: {
          query: searchOptions.query,
          results,
          total: results.length
        }
      });

    } catch (error: any) {
      console.error('Error in search:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Search failed'
      });
    }
  }

  /**
   * Get quick actions for shortcuts
   */
  static async getQuickActions(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userRole = req.user?.role;
      const quickActions = await SearchService.getQuickActions(userRole);

      res.json({
        success: true,
        data: { quick_actions: quickActions }
      });

    } catch (error: any) {
      console.error('Error in getQuickActions:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get quick actions'
      });
    }
  }

  /**
   * Get search suggestions (categories and recent searches)
   */
  static async getSuggestions(req: AuthRequest, res: Response): Promise<void> {
    try {
      const suggestions = {
        categories: Object.values(SearchCategory).map(category => ({
          value: category,
          label: category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          description: this.getCategoryDescription(category)
        })),
        quick_searches: [
          'create timesheet',
          'my timesheets', 
          'project billing',
          'users',
          'settings',
          'reports'
        ]
      };

      res.json({
        success: true,
        data: suggestions
      });

    } catch (error: any) {
      console.error('Error in getSuggestions:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get suggestions'
      });
    }
  }

  /**
   * Initialize search index (admin only)
   */
  static async initializeIndex(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Check if user is admin
      if (req.user?.role !== 'super_admin' && req.user?.role !== 'management') {
        res.status(403).json({
          success: false,
          error: 'Only administrators can initialize search index'
        });
        return;
      }

      await SearchService.initializeSearchIndex();

      res.json({
        success: true,
        message: 'Search index initialized successfully'
      });

    } catch (error: any) {
      console.error('Error in initializeIndex:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to initialize search index'
      });
    }
  }

  /**
   * Get category description
   */
  private static getCategoryDescription(category: SearchCategory): string {
    const descriptions: Record<SearchCategory, string> = {
      [SearchCategory.NAVIGATION]: 'Main pages and navigation items',
      [SearchCategory.USERS]: 'User profiles and management',
      [SearchCategory.PROJECTS]: 'Project information and management',
      [SearchCategory.TASKS]: 'Task assignments and tracking',
      [SearchCategory.TIMESHEETS]: 'Timesheet creation and management',
      [SearchCategory.REPORTS]: 'Analytics and reporting features',
      [SearchCategory.SETTINGS]: 'System and user preferences',
      [SearchCategory.BILLING]: 'Billing and financial information'
    };
    
    return descriptions[category] || 'Search category';
  }
}

// Validation schemas
export const searchValidation = [
  query('q')
    .notEmpty()
    .withMessage('Search query is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be 1-100 characters'),
  query('categories')
    .optional()
    .isString()
    .withMessage('Categories must be a comma-separated string'),
  query('types')
    .optional()
    .isString()
    .withMessage('Types must be a comma-separated string'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
];