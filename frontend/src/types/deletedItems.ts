export interface DeletedItem {
  _id: string;
  entity_type: 'user' | 'project' | 'client' | 'task' | 'timesheet';
  name?: string;
  email?: string;
  full_name?: string;
  deleted_at: string;
  deleted_by?: string;
  deletion_reason?: string;
  can_restore: boolean;
  has_dependencies?: boolean;
}