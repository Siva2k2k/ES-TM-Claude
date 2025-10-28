import type { Project, User, Client } from '../types';

/**
 * Project Utility Functions
 * Pure helper functions for project-related operations
 */

/**
 * Get the display name of a project's primary manager
 * Handles both object and string manager references
 */
export const getManagerDisplayName = (project: Project, users: User[]): string => {
  const pm = project.primary_manager_id;
  if (!pm) return 'Unassigned';

  // Handle populated manager object
  if (typeof pm === 'object' && pm !== null) {
    const managerObj = pm as { full_name?: string; name?: string; _id?: string };
    if (managerObj.full_name) return managerObj.full_name;
    if (managerObj._id && managerObj.name) return managerObj.name;
    return String(pm);
  }

  // Handle manager ID string - find in users array
  const manager = users.find(u => {
    const userObj = u as User & { _id?: string };
    return u.id === pm || userObj._id === pm || String(u.id) === String(pm);
  });

  return manager ? manager.full_name : String(pm);
};

/**
 * Get the display name of a project's client
 * Handles both object and string client references
 */
export const getClientName = (project: Project, clients: Client[]): string => {
  const cid = project.client_id;
  if (!cid) return 'No Client';

  // Handle populated client object
  if (typeof cid === 'object' && cid !== null) {
    const clientObj = cid as { name?: string; _id?: string };
    if (clientObj.name) return clientObj.name;
    return String(cid);
  }

  // Handle client ID string - find in clients array
  const client = clients.find(c => c.id === cid || String(c.id) === String(cid));
  return client ? client.name : String(cid);
};

/**
 * Remove duplicate projects from array based on project ID
 * Keeps the first occurrence of each unique project
 */
export const deduplicateProjects = (projects: Project[]): Project[] => {
  const seen = new Set<string>();
  const deduped: Project[] = [];

  for (const project of projects) {
    if (!project?.id) continue;
    if (!seen.has(project.id)) {
      seen.add(project.id);
      deduped.push(project);
    }
  }

  return deduped;
};

/**
 * Format a date string or Date object for display
 * Returns formatted date or 'N/A' if invalid
 */
export const formatProjectDate = (dateString: string | Date | undefined): string => {
  if (!dateString) return 'N/A';

  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return 'N/A';
  }
};

/**
 * Filter projects based on search term
 * Searches in project name and description
 */
export const filterProjectsBySearch = (projects: Project[], searchTerm: string): Project[] => {
  if (!searchTerm.trim()) return projects;

  const lowerSearch = searchTerm.toLowerCase();
  return projects.filter(project =>
    project.name.toLowerCase().includes(lowerSearch) ||
    project.description?.toLowerCase().includes(lowerSearch)
  );
};

/**
 * Filter projects by status
 */
export const filterProjectsByStatus = (
  projects: Project[],
  status: 'all' | 'active' | 'completed' | 'archived'
): Project[] => {
  if (status === 'all') return projects;
  return projects.filter(project => project.status === status);
};

/**
 * Get managers from users list (manager, management, super_admin roles)
 */
export const getManagers = (users: User[]): User[] => {
  return users.filter(user =>
    ['manager'].includes(user.role) && user.is_active
  );
};
