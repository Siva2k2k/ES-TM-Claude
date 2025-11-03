import IntentDefinition from '../models/IntentDefinition';

export const intentDefinitions = [
  // PROJECT MANAGEMENT INTENTS
  {
    intent: 'create_project',
    category: 'project',
    description: 'Create a new project with client and manager assignment',
    requiredFields: ['projectName', 'description', 'clientName', 'managerName', 'startDate'],
    optionalFields: ['endDate', 'status', 'budget'],
    fieldTypes: {
      projectName: 'string',
      description: 'string',
      clientName: 'string',
      managerName: 'string',
      startDate: 'date',
      endDate: 'date',
      status: 'enum',
      budget: 'number'
    },
    enumValues: {
      status: ['Active', 'Completed', 'Archived']
    },
    contextRequired: ['clients', 'users', 'projects'],
    allowedRoles: ['super_admin', 'management', 'manager'],
    exampleCommand: 'Create a project named AI Platform for client Acme Corp managed by John Doe starting January 1st',
    redirectUrlTemplate: '/projects/{projectId}',
    isActive: true
  },
  {
    intent: 'add_project_member',
    category: 'project',
    description: 'Add a team member to a project with a specific role',
    requiredFields: ['projectName', 'role', 'name'],
    optionalFields: [],
    fieldTypes: {
      projectName: 'string',
      role: 'string',
      name: 'string'
    },
    contextRequired: ['projects', 'users'],
    allowedRoles: ['super_admin', 'management', 'manager'],
    exampleCommand: 'Add Sarah Smith as a developer to the AI Platform project',
    redirectUrlTemplate: '/projects/{projectId}?tab=members',
    isActive: true
  },
  {
    intent: 'remove_project_member',
    category: 'project',
    description: 'Remove a team member from a project',
    requiredFields: ['projectName', 'role', 'name'],
    optionalFields: [],
    fieldTypes: {
      projectName: 'string',
      role: 'string',
      name: 'string'
    },
    contextRequired: ['projects', 'users'],
    allowedRoles: ['super_admin', 'management', 'manager'],
    exampleCommand: 'Remove John Doe from the AI Platform project',
    redirectUrlTemplate: '/projects/{projectId}?tab=members',
    isActive: true
  },
  {
    intent: 'add_task',
    category: 'project',
    description: 'Add a task to a project and assign it to a team member',
    requiredFields: ['projectName', 'taskName', 'assignedMemberName'],
    optionalFields: ['description', 'estimatedHours', 'status', 'isBillable'],
    fieldTypes: {
      projectName: 'string',
      taskName: 'string',
      assignedMemberName: 'string',
      description: 'string',
      estimatedHours: 'number',
      status: 'enum',
      isBillable: 'boolean'
    },
    enumValues: {
      status: ['Open', 'InProgress', 'Completed']
    },
    contextRequired: ['projects', 'users'],
    allowedRoles: ['super_admin', 'management', 'manager', 'lead'],
    exampleCommand: 'Add a task called Code Review to AI Platform and assign it to Sarah Smith',
    redirectUrlTemplate: '/projects/{projectId}?tab=tasks',
    isActive: true
  },
  {
    intent: 'update_project',
    category: 'project',
    description: 'Update project details',
    requiredFields: ['projectName'],
    optionalFields: ['managerName', 'description', 'clientName', 'startDate', 'endDate', 'status', 'budget'],
    fieldTypes: {
      projectName: 'string',
      managerName: 'string',
      description: 'string',
      clientName: 'string',
      startDate: 'date',
      endDate: 'date',
      status: 'enum',
      budget: 'number'
    },
    enumValues: {
      status: ['Active', 'Completed', 'Archived']
    },
    contextRequired: ['projects', 'clients', 'users'],
    allowedRoles: ['super_admin', 'management', 'manager'],
    exampleCommand: 'Update AI Platform project status to Completed',
    redirectUrlTemplate: '/projects/{projectId}',
    isActive: true
  },
  {
    intent: 'update_task',
    category: 'project',
    description: 'Update task details',
    requiredFields: ['projectName', 'taskName'],
    optionalFields: ['assignedMemberName', 'description', 'estimatedHours'],
    fieldTypes: {
      projectName: 'string',
      taskName: 'string',
      assignedMemberName: 'string',
      description: 'string',
      estimatedHours: 'number'
    },
    contextRequired: ['projects', 'tasks', 'users'],
    allowedRoles: ['super_admin', 'management', 'manager', 'lead'],
    exampleCommand: 'Update Code Review task estimated hours to 10',
    redirectUrlTemplate: '/projects/{projectId}?tab=tasks',
    isActive: true
  },
  {
    intent: 'delete_project',
    category: 'project',
    description: 'Delete a project',
    requiredFields: ['projectName', 'reason'],
    optionalFields: ['managerName'],
    fieldTypes: {
      projectName: 'string',
      managerName: 'string',
      reason: 'string'
    },
    contextRequired: ['projects'],
    allowedRoles: ['super_admin', 'management'],
    exampleCommand: 'Delete AI Platform project because it is cancelled',
    redirectUrlTemplate: '/projects',
    isActive: true
  },

  // USER MANAGEMENT INTENTS
  {
    intent: 'create_user',
    category: 'user',
    description: 'Create a new user account',
    requiredFields: ['userName', 'email', 'role'],
    optionalFields: ['hourlyRate'],
    fieldTypes: {
      userName: 'string',
      email: 'string',
      role: 'enum',
      hourlyRate: 'number'
    },
    enumValues: {
      role: ['Management', 'Manager', 'Lead', 'Employee']
    },
    contextRequired: ['users'],
    allowedRoles: ['super_admin', 'management'],
    exampleCommand: 'Create a user named Jane Doe with email jane@company.com as a Manager',
    redirectUrlTemplate: '/admin/users/{userId}',
    isActive: true
  },
  {
    intent: 'update_user',
    category: 'user',
    description: 'Update user account details',
    requiredFields: ['userName'],
    optionalFields: ['email', 'role', 'hourlyRate'],
    fieldTypes: {
      userName: 'string',
      email: 'string',
      role: 'enum',
      hourlyRate: 'number'
    },
    enumValues: {
      role: ['Management', 'Manager', 'Lead', 'Employee']
    },
    contextRequired: ['users'],
    allowedRoles: ['super_admin', 'management'],
    exampleCommand: 'Update Jane Doe role to Lead',
    redirectUrlTemplate: '/admin/users/{userId}',
    isActive: true
  },
  {
    intent: 'delete_user',
    category: 'user',
    description: 'Delete a user account',
    requiredFields: ['userName', 'reason'],
    optionalFields: ['role'],
    fieldTypes: {
      userName: 'string',
      role: 'string',
      reason: 'string'
    },
    contextRequired: ['users'],
    allowedRoles: ['super_admin', 'management'],
    exampleCommand: 'Delete user Jane Doe because they left the company',
    redirectUrlTemplate: '/admin/users',
    isActive: true
  },

  // CLIENT MANAGEMENT INTENTS
  {
    intent: 'create_client',
    category: 'client',
    description: 'Create a new client',
    requiredFields: ['clientName', 'contactPerson', 'contactEmail'],
    optionalFields: ['isActive'],
    fieldTypes: {
      clientName: 'string',
      contactPerson: 'string',
      contactEmail: 'string',
      isActive: 'boolean'
    },
    contextRequired: ['clients'],
    allowedRoles: ['super_admin', 'management'],
    exampleCommand: 'Create a client named Acme Corp with contact John Smith at john@acme.com',
    redirectUrlTemplate: '/admin/clients/{clientId}',
    isActive: true
  },
  {
    intent: 'update_client',
    category: 'client',
    description: 'Update client details',
    requiredFields: ['clientName'],
    optionalFields: ['contactPerson', 'contactEmail', 'isActive'],
    fieldTypes: {
      clientName: 'string',
      contactPerson: 'string',
      contactEmail: 'string',
      isActive: 'boolean'
    },
    contextRequired: ['clients'],
    allowedRoles: ['super_admin', 'management'],
    exampleCommand: 'Update Acme Corp contact person to Jane Smith',
    redirectUrlTemplate: '/admin/clients/{clientId}',
    isActive: true
  },
  {
    intent: 'delete_client',
    category: 'client',
    description: 'Delete a client',
    requiredFields: ['clientName', 'reason'],
    optionalFields: [],
    fieldTypes: {
      clientName: 'string',
      reason: 'string'
    },
    contextRequired: ['clients'],
    allowedRoles: ['super_admin', 'management'],
    exampleCommand: 'Delete client Acme Corp because they closed their business',
    redirectUrlTemplate: '/admin/clients',
    isActive: true
  },

  // TIMESHEET MANAGEMENT INTENTS
  {
    intent: 'create_timesheet',
    category: 'timesheet',
    description: 'Create a new timesheet for a week',
    requiredFields: ['weekStart', 'weekEnd'],
    optionalFields: [],
    fieldTypes: {
      weekStart: 'date',
      weekEnd: 'date'
    },
    contextRequired: ['timesheets'],
    allowedRoles: ['super_admin', 'management', 'manager', 'lead', 'employee'],
    exampleCommand: 'Create a timesheet for this week',
    redirectUrlTemplate: '/timesheets?week={weekStart}',
    isActive: true
  },
  {
    intent: 'add_entries',
    category: 'timesheet',
    description: 'Add time entries to a timesheet',
    requiredFields: ['projectName', 'taskName', 'date', 'hours', 'entryType'],
    optionalFields: ['taskType', 'description'],
    fieldTypes: {
      projectName: 'string',
      taskName: 'string',
      taskType: 'enum',
      date: 'date',
      hours: 'number',
      description: 'string',
      entryType: 'enum'
    },
    enumValues: {
      taskType: ['project_task', 'custom_task'],
      entryType: ['Project', 'Training', 'Leave', 'Miscellaneous']
    },
    contextRequired: ['timesheets', 'projects', 'tasks'],
    allowedRoles: ['super_admin', 'management', 'manager', 'lead', 'employee'],
    exampleCommand: 'Log 8 hours for AI Platform project on Code Review task for today',
    redirectUrlTemplate: '/timesheets?week={weekStart}',
    isActive: true
  },
  {
    intent: 'update_entries',
    category: 'timesheet',
    description: 'Update time entries in a timesheet',
    requiredFields: ['weekStart', 'projectName', 'taskName'],
    optionalFields: ['taskType', 'date', 'hours', 'description', 'entryType'],
    fieldTypes: {
      weekStart: 'date',
      projectName: 'string',
      taskName: 'string',
      taskType: 'enum',
      date: 'date',
      hours: 'number',
      description: 'string',
      entryType: 'enum'
    },
    enumValues: {
      taskType: ['project_task', 'custom_task'],
      entryType: ['Project', 'Training', 'Leave', 'Miscellaneous']
    },
    contextRequired: ['timesheets', 'projects', 'tasks'],
    allowedRoles: ['super_admin', 'management', 'manager', 'lead', 'employee'],
    exampleCommand: 'Update Monday entry for AI Platform to 9 hours',
    redirectUrlTemplate: '/timesheets?week={weekStart}',
    isActive: true
  },
  {
    intent: 'delete_timesheet',
    category: 'timesheet',
    description: 'Delete an entire timesheet',
    requiredFields: ['weekStart'],
    optionalFields: [],
    fieldTypes: {
      weekStart: 'date'
    },
    contextRequired: ['timesheets'],
    allowedRoles: ['super_admin', 'management', 'manager', 'lead', 'employee'],
    exampleCommand: 'Delete timesheet for last week',
    redirectUrlTemplate: '/timesheets',
    isActive: true
  },
  {
    intent: 'delete_entries',
    category: 'timesheet',
    description: 'Delete specific time entries',
    requiredFields: ['weekStart', 'projectName', 'taskName'],
    optionalFields: [],
    fieldTypes: {
      weekStart: 'date',
      projectName: 'string',
      taskName: 'string'
    },
    contextRequired: ['timesheets', 'projects', 'tasks'],
    allowedRoles: ['super_admin', 'management', 'manager', 'lead', 'employee'],
    exampleCommand: 'Delete Monday entry for AI Platform',
    redirectUrlTemplate: '/timesheets?week={weekStart}',
    isActive: true
  },
  {
    intent: 'copy_entry',
    category: 'timesheet',
    description: 'Copy a time entry to multiple dates',
    requiredFields: ['projectName', 'taskName', 'date', 'weekDates'],
    optionalFields: [],
    fieldTypes: {
      projectName: 'string',
      taskName: 'string',
      date: 'date',
      weekDates: 'array'
    },
    contextRequired: ['timesheets', 'projects', 'tasks'],
    allowedRoles: ['super_admin', 'management', 'manager', 'lead', 'employee'],
    exampleCommand: 'Copy Monday AI Platform entry to rest of the week',
    redirectUrlTemplate: '/timesheets?week={weekStart}',
    isActive: true
  },

  // TEAM REVIEW INTENTS
  {
    intent: 'approve_user',
    category: 'team_review',
    description: 'Approve a user timesheet for a project and week',
    requiredFields: ['weekStart', 'weekEnd', 'userName', 'projectName'],
    optionalFields: [],
    fieldTypes: {
      weekStart: 'date',
      weekEnd: 'date',
      userName: 'string',
      projectName: 'string'
    },
    contextRequired: ['users', 'projects', 'projectWeekGroups'],
    allowedRoles: ['super_admin', 'management', 'manager', 'lead'],
    exampleCommand: 'Approve Jane Doe timesheet for AI Platform project this week',
    redirectUrlTemplate: '/team-review?week={weekStart}',
    isActive: true
  },
  {
    intent: 'approve_project_week',
    category: 'team_review',
    description: 'Approve all timesheets for a project and week',
    requiredFields: ['weekStart', 'weekEnd', 'projectName'],
    optionalFields: [],
    fieldTypes: {
      weekStart: 'date',
      weekEnd: 'date',
      projectName: 'string'
    },
    contextRequired: ['projects', 'projectWeekGroups'],
    allowedRoles: ['super_admin', 'management', 'manager'],
    exampleCommand: 'Approve all timesheets for AI Platform project this week',
    redirectUrlTemplate: '/team-review?week={weekStart}',
    isActive: true
  },
  {
    intent: 'reject_user',
    category: 'team_review',
    description: 'Reject a user timesheet for a project and week',
    requiredFields: ['weekStart', 'weekEnd', 'userName', 'projectName', 'reason'],
    optionalFields: [],
    fieldTypes: {
      weekStart: 'date',
      weekEnd: 'date',
      userName: 'string',
      projectName: 'string',
      reason: 'string'
    },
    contextRequired: ['users', 'projects', 'projectWeekGroups'],
    allowedRoles: ['super_admin', 'management', 'manager', 'lead'],
    exampleCommand: 'Reject Jane Doe timesheet for AI Platform because hours are incorrect',
    redirectUrlTemplate: '/team-review?week={weekStart}',
    isActive: true
  },
  {
    intent: 'reject_project_week',
    category: 'team_review',
    description: 'Reject all timesheets for a project and week',
    requiredFields: ['weekStart', 'weekEnd', 'projectName', 'reason'],
    optionalFields: [],
    fieldTypes: {
      weekStart: 'date',
      weekEnd: 'date',
      projectName: 'string',
      reason: 'string'
    },
    contextRequired: ['projects', 'projectWeekGroups'],
    allowedRoles: ['super_admin', 'management', 'manager'],
    exampleCommand: 'Reject all AI Platform timesheets this week because project was on hold',
    redirectUrlTemplate: '/team-review?week={weekStart}',
    isActive: true
  },
  {
    intent: 'send_reminder',
    category: 'team_review',
    description: 'Send reminder to submit timesheets',
    requiredFields: ['weekStart', 'weekEnd', 'projectName'],
    optionalFields: [],
    fieldTypes: {
      weekStart: 'date',
      weekEnd: 'date',
      projectName: 'string'
    },
    contextRequired: ['projects', 'projectWeekGroups', 'users'],
    allowedRoles: ['super_admin', 'management', 'manager', 'lead'],
    exampleCommand: 'Send reminder for AI Platform timesheets for this week',
    redirectUrlTemplate: '/team-review?week={weekStart}',
    isActive: true
  },

  // BILLING INTENTS
  {
    intent: 'export_project_billing',
    category: 'billing',
    description: 'Export project billing report',
    requiredFields: ['startDate', 'endDate', 'format'],
    optionalFields: ['projectName', 'clientName'],
    fieldTypes: {
      startDate: 'date',
      endDate: 'date',
      projectName: 'string',
      clientName: 'string',
      format: 'enum'
    },
    enumValues: {
      format: ['CSV', 'PDF', 'Excel']
    },
    contextRequired: ['projects', 'clients', 'projectWeekGroups'],
    allowedRoles: ['super_admin', 'management', 'manager'],
    exampleCommand: 'Export AI Platform billing for last month as PDF',
    redirectUrlTemplate: '/billing/projects',
    isActive: true
  },
  {
    intent: 'export_user_billing',
    category: 'billing',
    description: 'Export user billing report',
    requiredFields: ['startDate', 'endDate', 'format'],
    optionalFields: ['userName', 'clientName'],
    fieldTypes: {
      startDate: 'date',
      endDate: 'date',
      userName: 'string',
      clientName: 'string',
      format: 'enum'
    },
    enumValues: {
      format: ['CSV', 'PDF', 'Excel']
    },
    contextRequired: ['users', 'clients', 'projectWeekGroups'],
    allowedRoles: ['super_admin', 'management', 'manager'],
    exampleCommand: 'Export Jane Doe billing for last quarter as Excel',
    redirectUrlTemplate: '/billing/users',
    isActive: true
  },

  // AUDIT INTENTS
  {
    intent: 'get_audit_logs',
    category: 'audit',
    description: 'Retrieve audit logs',
    requiredFields: ['startDate', 'endDate'],
    optionalFields: ['needExport'],
    fieldTypes: {
      startDate: 'date',
      endDate: 'date',
      needExport: 'boolean'
    },
    contextRequired: [],
    allowedRoles: ['super_admin', 'management'],
    exampleCommand: 'Get audit logs for last month',
    redirectUrlTemplate: '/admin/audit-logs',
    isActive: true
  }
];

export async function seedIntentDefinitions() {
  try {
    console.log('Seeding intent definitions...');

    for (const intent of intentDefinitions) {
      await IntentDefinition.findOneAndUpdate(
        { intent: intent.intent },
        intent,
        { upsert: true, new: true }
      );
    }

    console.log(`Successfully seeded ${intentDefinitions.length} intent definitions`);
  } catch (error) {
    console.error('Error seeding intent definitions:', error);
    throw error;
  }
}
