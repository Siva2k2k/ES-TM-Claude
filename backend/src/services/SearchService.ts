import { SearchIndex, SearchCategory, SearchItemType } from '@/models/SearchIndex';
import { User } from '@/models/User';
import { Project } from '@/models/Project';

export interface SearchResult {
  id: string;
  title: string;
  description: string;
  category: SearchCategory;
  type: SearchItemType;
  url: string;
  icon?: string;
  score?: number;
  meta_data?: any;
}

export interface SearchOptions {
  query: string;
  categories?: SearchCategory[];
  types?: SearchItemType[];
  limit?: number;
  user_id?: string; // For permission-based filtering
  user_role?: string; // For role-based filtering
}

export class SearchService {
  /**
   * Initialize search index with default navigation items
   */
  static async initializeSearchIndex(): Promise<void> {
    const defaultItems = [
      // Dashboard & Navigation
      {
        title: 'Dashboard',
        description: 'Main dashboard with overview and analytics',
        category: SearchCategory.NAVIGATION,
        type: SearchItemType.PAGE,
        url: 'dashboard|',
        keywords: ['home', 'main', 'overview', 'analytics'],
        search_weight: 9,
        allowed_roles: ['super_admin', 'management', 'manager', 'lead', 'employee']
      },
      {
        title: 'Notification Center',
        description: 'Review approvals, timesheet updates, and project alerts',
        category: SearchCategory.NAVIGATION,
        type: SearchItemType.PAGE,
        url: '/notifications',
        keywords: ['notifications', 'alerts', 'approvals', 'updates'],
        search_weight: 8,
        allowed_roles: ['super_admin', 'management', 'manager', 'lead', 'employee']
      },
      {
        title: 'Settings',
        description: 'Access system configuration and personal preferences',
        category: SearchCategory.SETTINGS,
        type: SearchItemType.PAGE,
        url: '/settings',
        keywords: ['settings', 'configuration', 'preferences', 'account'],
        search_weight: 7,
        allowed_roles: ['super_admin', 'management', 'manager', 'lead', 'employee']
      },
      
      // Timesheet Management
      {
        title: 'Timesheet List View',
        description: 'View all timesheets in list format',
        category: SearchCategory.TIMESHEETS,
        type: SearchItemType.PAGE,
        url: 'timesheet|timesheet-list',
        keywords: ['timesheet', 'list', 'view', 'all', 'time', 'entries', 'my', 'own'],
        search_weight: 9,
        allowed_roles: ['super_admin', 'management', 'manager', 'lead', 'employee']
      },
      {
        title: 'Timesheet Calendar View',
        description: 'View timesheets in calendar format',
        category: SearchCategory.TIMESHEETS,
        type: SearchItemType.PAGE,
        url: 'timesheet|timesheet-calendar',
        keywords: ['timesheet', 'calendar', 'view', 'time', 'schedule', 'date'],
        search_weight: 9,
        allowed_roles: ['super_admin', 'management', 'manager', 'lead', 'employee']
      },
      {
        title: 'Create Timesheet',
        description: 'Create a new timesheet entry',
        category: SearchCategory.TIMESHEETS,
        type: SearchItemType.ACTION,
        url: 'timesheet|timesheet-create',
        keywords: ['timesheet', 'create', 'add', 'new', 'time', 'entry', 'log', 'submit'],
        search_weight: 9,
        allowed_roles: ['super_admin', 'management', 'manager', 'lead', 'employee']
      },
      {
        title: 'Team Review',
        description: 'Review and approve team timesheets',
        category: SearchCategory.TIMESHEETS,
        type: SearchItemType.PAGE,
        url: 'timesheet-team|',
        keywords: ['timesheet', 'team', 'review', 'approve', 'reject', 'manager', 'approval'],
        search_weight: 8
      },
      {
        title: 'Timesheet Status',
        description: 'View your timesheet status and approvals',
        category: SearchCategory.TIMESHEETS,
        type: SearchItemType.PAGE,
        url: 'timesheet-status|',
        keywords: ['timesheet', 'status', 'my', 'approval', 'submitted', 'pending'],
        search_weight: 7
      },
      
      // Project Management
      {
        title: 'Project Management',
        description: 'View and manage all projects',
        category: SearchCategory.PROJECTS,
        type: SearchItemType.PAGE,
        url: 'projects|',
        keywords: ['projects', 'all', 'list', 'manage', 'create', 'project'],
        search_weight: 8,
        allowed_roles: ['super_admin', 'management', 'manager']
      },
      {
        title: 'Project Overview',
        description: 'View project overview and details',
        category: SearchCategory.PROJECTS,
        type: SearchItemType.PAGE,
        url: 'projects|projects-overview',
        keywords: ['projects', 'overview', 'details', 'summary'],
        search_weight: 7
      },
      {
        title: 'Project Tasks',
        description: 'Manage tasks within projects',
        category: SearchCategory.PROJECTS,
        type: SearchItemType.PAGE,
        url: 'projects|projects-tasks',
        keywords: ['projects', 'tasks', 'manage', 'assignments'],
        search_weight: 7
      },
      
      // Task Management
      {
        title: 'My Tasks',
        description: 'View and manage your assigned tasks',
        category: SearchCategory.TASKS,
        type: SearchItemType.PAGE,
        url: 'tasks|',
        keywords: ['tasks', 'my', 'assigned', 'todo', 'work'],
        search_weight: 7
      },
      {
        title: 'Create Task',
        description: 'Create a new task in a project',
        category: SearchCategory.TASKS,
        type: SearchItemType.ACTION,
        url: '/tasks/create',
        keywords: ['add', 'new', 'assignment'],
        search_weight: 6
      },
      
      // User Management
      {
        title: 'User Management',
        description: 'Manage users and their permissions',
        category: SearchCategory.USERS,
        type: SearchItemType.PAGE,
        url: 'users|',
        keywords: ['users', 'employees', 'team', 'manage', 'admin', 'people'],
        search_weight: 8,
        allowed_roles: ['super_admin', 'management']
      },
      
      // Client Management
      {
        title: 'Client Management',
        description: 'Manage clients and customer information',
        category: SearchCategory.USERS,
        type: SearchItemType.PAGE,
        url: 'clients|',
        keywords: ['clients', 'customers', 'companies', 'manage'],
        search_weight: 7
      },
      
      // Billing Management
      {
        title: 'Billing Management',
        description: 'View billing dashboard and summaries',
        category: SearchCategory.BILLING,
        type: SearchItemType.PAGE,
        url: 'billing|',
        keywords: ['billing', 'invoices', 'payments', 'financial', 'money'],
        search_weight: 8,
        allowed_roles: ['super_admin', 'management', 'manager']
      },
      {
        title: 'Project Billing',
        description: 'Manage project-based billing and rates',
        category: SearchCategory.BILLING,
        type: SearchItemType.PAGE,
        url: 'billing|billing-projects',
        keywords: ['billing', 'project', 'rates', 'hours', 'cost', 'invoice'],
        search_weight: 8
      },
      {
        title: 'Task Billing',
        description: 'Manage task-based billing and time tracking',
        category: SearchCategory.BILLING,
        type: SearchItemType.PAGE,
        url: 'billing|billing-tasks',
        keywords: ['billing', 'task', 'time', 'tracking', 'hourly', 'charges'],
        search_weight: 8
      },
      {
        title: 'Other Billing',
        description: 'Manage other billing items and expenses',
        category: SearchCategory.BILLING,
        type: SearchItemType.PAGE,
        url: 'billing|billing-others',
        keywords: ['billing', 'others', 'expenses', 'misc', 'additional'],
        search_weight: 6
      },
      
      // Reports & Analytics
      {
        title: 'Reports & Analytics',
        description: 'Generate and view various reports',
        category: SearchCategory.REPORTS,
        type: SearchItemType.PAGE,
        url: 'reports|',
        keywords: ['reports', 'analytics', 'data', 'statistics', 'charts'],
        search_weight: 7
      },
      
      // Audit Logs
      {
        title: 'Audit Logs',
        description: 'View system audit logs and activity',
        category: SearchCategory.SETTINGS,
        type: SearchItemType.PAGE,
        url: 'audit|',
        keywords: ['audit', 'logs', 'activity', 'history', 'security'],
        search_weight: 6
      },
      
      // Settings
      {
        title: 'Settings',
        description: 'System and user settings',
        category: SearchCategory.SETTINGS,
        type: SearchItemType.PAGE,
        url: '/settings',
        keywords: ['preferences', 'configuration', 'profile'],
        search_weight: 5
      },
      {
        title: 'Profile Settings',
        description: 'Update your profile information',
        category: SearchCategory.SETTINGS,
        type: SearchItemType.PAGE,
        url: '/settings/profile',
        keywords: ['personal', 'account', 'update'],
        search_weight: 4
      }
    ];

    // Clear existing default items and insert new ones
    await (SearchIndex as any).deleteMany({ entity_id: { $exists: false } });
    
    for (const item of defaultItems) {
      await (SearchIndex as any).create(item);
    }
  }

  /**
   * Perform search across all indexed items
   */
  static async search(options: SearchOptions): Promise<SearchResult[]> {
    const {
      query,
      categories,
      types,
      limit = 10,
      user_id,
      user_role
    } = options;

    // Build search filter
    const filter: any = {
      is_active: true
    };

    if (categories && categories.length > 0) {
      filter.category = { $in: categories };
    }

    if (types && types.length > 0) {
      filter.type = { $in: types };
    }

    // Add role-based filtering
    if (user_role) {
      filter.$or = [
        { allowed_roles: { $exists: false } }, // Items without role restrictions
        { allowed_roles: user_role }, // Items that explicitly allow this role
        { allowed_roles: { $in: [user_role] } } // Items that allow this role in array
      ];
    }

    // Perform text search
    const searchResults = await (SearchIndex as any)
      .find({
        ...filter,
        $text: { $search: query }
      })
      .select({
        title: 1,
        description: 1,
        category: 1,
        type: 1,
        url: 1,
        meta_data: 1,
        entity_id: 1,
        score: { $meta: 'textScore' }
      })
      .sort({ 
        score: { $meta: 'textScore' },
        search_weight: -1 
      })
      .limit(limit)
      .lean();

    // Also search dynamic content (users, projects, tasks)
    const dynamicResults = await this.searchDynamicContent(query, user_id, limit);

    // Combine and sort results
    const allResults = [
      ...searchResults.map((item: any) => ({
        id: item._id.toString(),
        title: item.title,
        description: item.description,
        category: item.category,
        type: item.type,
        url: item.url,
        score: item.score,
        meta_data: item.meta_data,
        icon: this.getIconForCategory(item.category)
      })),
      ...dynamicResults
    ];

    // Sort by score and return top results
    return allResults
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, limit);
  }

  /**
   * Search dynamic content (users, projects, tasks)
   */
  private static async searchDynamicContent(query: string, userId?: string, limit: number = 5): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const searchRegex = new RegExp(query, 'i');

    // Search users
    try {
      const users = await (User as any)
        .find({
          $or: [
            { full_name: searchRegex },
            { email: searchRegex }
          ],
          is_active: true
        })
        .select('full_name email role')
        .limit(limit)
        .lean();

      users.forEach((user: any) => {
        results.push({
          id: user._id.toString(),
          title: user.full_name,
          description: `${user.role} - ${user.email}`,
          category: SearchCategory.USERS,
          type: SearchItemType.USER,
          url: `/users/${user._id}`,
          score: this.calculateMatchScore(query, user.full_name),
          icon: 'user'
        });
      });
    } catch (error) {
      console.error('Error searching users:', error);
    }

    // Search projects
    try {
      const projects = await (Project as any)
        .find({
          $or: [
            { name: searchRegex },
            { description: searchRegex }
          ],
          is_active: true
        })
        .select('name description client_name status')
        .limit(limit)
        .lean();

      projects.forEach((project: any) => {
        results.push({
          id: project._id.toString(),
          title: project.name,
          description: `${project.client_name || 'No Client'} - ${project.status}`,
          category: SearchCategory.PROJECTS,
          type: SearchItemType.PROJECT,
          url: `/projects/${project._id}`,
          score: this.calculateMatchScore(query, project.name),
          icon: 'folder'
        });
      });
    } catch (error) {
      console.error('Error searching projects:', error);
    }

    return results;
  }

  /**
   * Update search index for dynamic content
   */
  static async updateDynamicIndex(entityType: SearchItemType, entityId: string, data: any): Promise<void> {
    try {
      let searchItem: any;

      switch (entityType) {
        case SearchItemType.USER:
          searchItem = {
            title: data.full_name,
            description: `${data.role} - ${data.email}`,
            category: SearchCategory.USERS,
            type: SearchItemType.USER,
            url: `/users/${entityId}`,
            keywords: [data.full_name, data.email, data.role],
            entity_id: entityId,
            search_weight: 3
          };
          break;
        
        case SearchItemType.PROJECT:
          searchItem = {
            title: data.name,
            description: data.description || `Project managed by ${data.client_name || 'Unknown'}`,
            category: SearchCategory.PROJECTS,
            type: SearchItemType.PROJECT,
            url: `/projects/${entityId}`,
            keywords: [data.name, data.client_name, data.status].filter(Boolean),
            entity_id: entityId,
            search_weight: 4
          };
          break;
        
        case SearchItemType.TASK:
          searchItem = {
            title: data.name,
            description: data.description || `Task in ${data.project_name || 'Unknown Project'}`,
            category: SearchCategory.TASKS,
            type: SearchItemType.TASK,
            url: `/tasks/${entityId}`,
            keywords: [data.name, data.project_name, data.status].filter(Boolean),
            entity_id: entityId,
            search_weight: 3
          };
          break;
      }

      if (searchItem) {
        await (SearchIndex as any).findOneAndUpdate(
          { entity_id: entityId, type: entityType },
          searchItem,
          { upsert: true, new: true }
        );
      }
    } catch (error) {
      console.error('Error updating search index:', error);
    }
  }

  /**
   * Remove item from search index
   */
  static async removeFromIndex(entityId: string): Promise<void> {
    try {
      await (SearchIndex as any).deleteMany({ entity_id: entityId });
    } catch (error) {
      console.error('Error removing from search index:', error);
    }
  }

  /**
   * Get quick actions for search
   */
  static async getQuickActions(user_role?: string): Promise<SearchResult[]> {
    const filter: any = {
      type: SearchItemType.ACTION,
      is_active: true
    };

    // Add role-based filtering for quick actions
    if (user_role) {
      filter.$or = [
        { allowed_roles: { $exists: false } },
        { allowed_roles: user_role },
        { allowed_roles: { $in: [user_role] } }
      ];
    }

    const quickActions = await (SearchIndex as any)
      .find(filter)
      .sort({ search_weight: -1 })
      .limit(8)
      .lean();

    return quickActions.map((action: any) => ({
      id: action._id.toString(),
      title: action.title,
      description: action.description,
      category: action.category,
      type: action.type,
      url: action.url,
      icon: this.getIconForCategory(action.category)
    }));
  }

  /**
   * Calculate match score for fuzzy search
   */
  private static calculateMatchScore(query: string, text: string): number {
    if (!query || !text) return 0;
    
    const queryLower = query.toLowerCase();
    const textLower = text.toLowerCase();
    
    // Exact match gets highest score
    if (textLower === queryLower) return 10;
    
    // Starts with query gets high score
    if (textLower.startsWith(queryLower)) return 8;
    
    // Contains query gets medium score
    if (textLower.includes(queryLower)) return 6;
    
    // Fuzzy matching based on character similarity
    let score = 0;
    for (const char of queryLower) {
      if (textLower.includes(char)) {
        score += 1;
      }
    }
    
    return Math.min(score / query.length * 3, 5);
  }

  /**
   * Get icon for category
   */
  private static getIconForCategory(category: SearchCategory): string {
    const iconMap: Record<SearchCategory, string> = {
      [SearchCategory.NAVIGATION]: 'home',
      [SearchCategory.USERS]: 'users',
      [SearchCategory.PROJECTS]: 'folder',
      [SearchCategory.TASKS]: 'check-square',
      [SearchCategory.TIMESHEETS]: 'clock',
      [SearchCategory.REPORTS]: 'bar-chart',
      [SearchCategory.SETTINGS]: 'settings',
      [SearchCategory.BILLING]: 'credit-card'
    };
    
    return iconMap[category] || 'search';
  }
}
