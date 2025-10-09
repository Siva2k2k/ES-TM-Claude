import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Dialog } from '../components/ui/Dialog';
import { AlertDialog } from '../components/ui/AlertDialog';
import { Badge } from '../components/ui/Badge';
import { 
  Search, 
  Plus, 
  MoreHorizontal, 
  Edit3, 
  Trash2, 
  UserCheck, 
  UserX,
  Mail,
  Calendar
} from 'lucide-react';
import { User, PaginatedResponse, ApiResponse } from '../types';
import { userService } from '../services/userService';
import { toast } from '../hooks/useToast';
import UserForm from '../components/UserForm';

interface UserWithActions extends User {
  isActive: boolean;
}

const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<UserWithActions[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState<UserWithActions | null>(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithActions | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchUsers = async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 10,
        search: searchTerm,
        role: roleFilter !== 'all' ? roleFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      };
      
      const response = await userService.getUsers(params);
      console.log('Fetched Users:', response);
      
      // Handle different response structures
      if (response && response.data) {
        setUsers(Array.isArray(response.data) ? response.data : []);
        if (response.pagination && response.pagination.totalPages) {
          setTotalPages(response.pagination.totalPages);
        } else {
          setTotalPages(1);
        }
      } else {
        // Fallback with mock data for demo purposes
        const mockUsers: UserWithActions[] = [
          {
            id: '1',
            email: 'admin@example.com',
            firstName: 'System',
            lastName: 'Administrator',
            role: 'SuperAdmin' as const,
            isEmailVerified: true,
            isActive: true,
            lastLogin: new Date('2024-01-15'),
            createdAt: new Date('2024-01-01'),
          },
          {
            id: '2',
            email: 'user@example.com',
            firstName: 'Demo',
            lastName: 'User',
            role: 'User' as const,
            isEmailVerified: false,
            isActive: true,
            lastLogin: new Date('2024-01-14'),
            createdAt: new Date('2024-01-05'),
          },
        ];
        
        // Filter mock users based on search/filters
        let filteredUsers = mockUsers;
        if (searchTerm) {
          filteredUsers = filteredUsers.filter(user => 
            user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }
        if (roleFilter !== 'all') {
          filteredUsers = filteredUsers.filter(user => user.role === roleFilter);
        }
        if (statusFilter !== 'all') {
          const isActive = statusFilter === 'active';
          filteredUsers = filteredUsers.filter(user => user.isActive === isActive);
        }
        
        setUsers(filteredUsers);
        setTotalPages(1);
        toast.info('Showing demo data - User management API not yet implemented');
      }
    } catch (error: any) {
      console.error('Error fetching users:', error);
      setUsers([]);
      setTotalPages(1);
      
      // More specific error messages
      if (error?.message?.includes('404')) {
        toast.error('User management endpoint not found - backend may not be fully implemented');
      } else if (error?.message?.includes('403')) {
        toast.error('Access denied - insufficient permissions');
      } else {
        toast.error('Failed to fetch users - check console for details');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new AbortController for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    const loadUsers = async () => {
      try {
        await fetchUsers(abortController.signal);
      } catch (error: any) {
        // Ignore abort errors
        if (error.name !== 'AbortError') {
          console.error('Failed to load users:', error);
        }
      }
    };
    
    loadUsers();
    
    return () => {
      abortController.abort();
    };
  }, [currentPage, searchTerm, roleFilter, statusFilter]);

  const handleCreateUser = () => {
    setSelectedUser(null);
    setShowUserForm(true);
  };

  const handleEditUser = (user: UserWithActions) => {
    setSelectedUser(user);
    setShowUserForm(true);
  };

  const handleDeleteUser = (user: UserWithActions) => {
    setUserToDelete(user);
    setShowDeleteDialog(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      await userService.deleteUser(userToDelete.id);
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      if (error?.message?.includes('not yet implemented')) {
        toast.error('Delete user functionality not yet implemented in backend');
      } else {
        toast.error('Failed to delete user');
      }
    } finally {
      setShowDeleteDialog(false);
      setUserToDelete(null);
    }
  };

  const handleToggleUserStatus = async (user: UserWithActions) => {
    try {
      await userService.updateUser(user.id, { isActive: !user.isActive });
      toast.success(`User ${user.isActive ? 'deactivated' : 'activated'} successfully`);
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating user status:', error);
      if (error?.message?.includes('not yet implemented')) {
        toast.error('Update user functionality not yet implemented in backend');
      } else {
        toast.error('Failed to update user status');
      }
    }
  };

  const handleUserSaved = () => {
    setShowUserForm(false);
    setSelectedUser(null);
    fetchUsers();
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'SuperAdmin': return 'destructive';
      case 'Admin': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusBadgeVariant = (isActive: boolean) => {
    return isActive ? 'success' : 'secondary';
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground">Manage users and their permissions</p>
        </div>
        <Button onClick={handleCreateUser}>
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="all">All Roles</option>
          <option value="User">User</option>
          <option value="Admin">Admin</option>
          <option value="SuperAdmin">Super Admin</option>
        </Select>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
      </div>

      {/* Users Table */}
      <div className="bg-card rounded-lg border">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium">User</th>
                  <th className="text-left p-4 font-medium">Role</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Email Verified</th>
                  <th className="text-left p-4 font-medium">Last Login</th>
                  <th className="text-left p-4 font-medium">Created</th>
                  <th className="text-right p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users && users.length > 0 ? users.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-muted/50">
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {user.firstName[0]}{user.lastName[0]}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium">{user.firstName} {user.lastName}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Badge variant={getStatusBadgeVariant(user.isActive)}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-1">
                        {user.isEmailVerified ? (
                          <>
                            <UserCheck className="w-4 h-4 text-green-500" />
                            <span className="text-sm text-green-700">Verified</span>
                          </>
                        ) : (
                          <>
                            <Mail className="w-4 h-4 text-orange-500" />
                            <span className="text-sm text-orange-700">Pending</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleUserStatus(user)}
                        >
                          {user.isActive ? (
                            <UserX className="w-4 h-4" />
                          ) : (
                            <UserCheck className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteUser(user)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} className="text-center p-8">
                      <div className="flex flex-col items-center space-y-3">
                        <div className="text-4xl text-muted-foreground">👥</div>
                        <div className="text-lg font-medium">No users found</div>
                        <div className="text-sm text-muted-foreground">
                          {searchTerm || roleFilter !== 'all' || statusFilter !== 'all' 
                            ? 'Try adjusting your filters or search terms'
                            : 'The user management API may not be fully implemented yet'
                          }
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && users.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* User Form Dialog */}
      <Dialog open={showUserForm} onOpenChange={setShowUserForm}>
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm">
          <div className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] bg-background p-6 shadow-lg duration-200 rounded-lg border">
            <UserForm
              user={selectedUser}
              onSave={handleUserSaved}
              onCancel={() => setShowUserForm(false)}
            />
          </div>
        </div>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm">
          <div className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] bg-background p-6 shadow-lg duration-200 rounded-lg border">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Delete User</h3>
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to delete {userToDelete?.firstName} {userToDelete?.lastName}? 
                  This action cannot be undone.
                </p>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={confirmDeleteUser}>
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      </AlertDialog>
    </div>
  );
};

export default UserManagementPage;