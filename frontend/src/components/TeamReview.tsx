import React, { useState, useEffect, useCallback } from 'react';
import { 
  Clock, 
  Users,
  CheckCircle,
  Eye,
  Check,
  X,
  FileText,
  Calendar,
  Filter,
  Search,
  RefreshCw,
  AlertTriangle,
  UserCheck,
  Shield,
  ChevronDown,
  ChevronRight,
  Download,
  Bell
} from 'lucide-react';
import { useAuth } from '../store/contexts/AuthContext';
import { TimesheetApprovalService } from '../services/TimesheetApprovalService';
import { UserService } from '../services/UserService';
import { showSuccess, showError, showWarning } from '../utils/toast';
import type { TimesheetStatus, TimesheetWithDetails, User } from '../types';
import { DeleteButton } from './common/DeleteButton';

interface TeamReviewProps {
  defaultView?: 'list' | 'approval';
}

const TeamReview: React.FC<TeamReviewProps> = ({ defaultView = 'list' }) => {
  const { currentUserRole, currentUser } = useAuth();
  
  // Debug auth state
  console.log('🔐 TeamReview Auth State:', {
    currentUser: currentUser ? { id: currentUser.id, email: currentUser.email, role: currentUser.role } : null,
    currentUserRole,
    isAuthenticated: !!currentUser
  });
  
  const [viewMode, setViewMode] = useState<'list' | 'approval'>(defaultView);
  const [timesheets, setTimesheets] = useState<TimesheetWithDetails[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TimesheetStatus | 'all'>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTimesheet, setSelectedTimesheet] = useState<TimesheetWithDetails | null>(null);
  const [expandedTimesheet, setExpandedTimesheet] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [timesheetToReject, setTimesheetToReject] = useState<string | null>(null);
  const [functionsCalledLog, setFunctionsCalledLog] = useState<string[]>([]);
  
  // Store project-specific role data for multi-role users
  const [userManagerProjects, setUserManagerProjects] = useState<Map<string, string[]>>(new Map());

  // Role-based access control
  const canViewTeamTimesheets = currentUserRole === 'lead' || currentUserRole === 'manager' || currentUserRole === 'management' || currentUserRole === 'super_admin';
  const canApproveTimesheets =
    currentUserRole === 'manager' ||
    currentUserRole === 'management' ||
    currentUserRole === 'super_admin' ||
    currentUserRole === 'lead';
  const isLeadRole = currentUserRole === 'lead';
  const isManagerRole = currentUserRole === 'manager';
  const isManagementRole = currentUserRole === 'management';
  const isSuperAdminRole = currentUserRole === 'super_admin';

  //Status based on role
  const statusOptionsByRole: Record<string, { label: string; value: TimesheetStatus | 'all' }[]> = {
    employee: [
      { label: 'All Status', value: 'all' },
      { label: 'Draft', value: 'draft' },
      { label: 'Submitted', value: 'submitted' },
      { label: 'Manager Approved', value: 'manager_approved' },
      { label: 'Management Pending', value: 'management_pending' },
      { label: 'Manager Rejected', value: 'manager_rejected' },
      { label: 'Management Rejected', value: 'management_rejected' },
      { label: 'Frozen', value: 'frozen' },
      { label: 'Billed', value: 'billed' },
    ],
    management: [
      { label: 'All Status', value: 'all' },
      { label: 'Manager Approved', value: 'manager_approved' },
      { label: 'Management Pending', value: 'management_pending' },
      { label: 'Manager Rejected', value: 'manager_rejected' },
      { label: 'Management Rejected', value: 'management_rejected' },
      { label: 'Frozen', value: 'frozen' },
    ],
  };

  const statusOptions = statusOptionsByRole[currentUserRole] || statusOptionsByRole['employee'];
  
  // Enhanced permission checking for project-specific roles
  const canManageUser = useCallback((userId: string): boolean => {
    console.log(`🔍 canManageUser called for userId: ${userId}`);
    console.log(`🔍 Current user role: ${currentUserRole}, isManagerRole: ${isManagerRole}, isLeadRole: ${isLeadRole}, isManagementRole: ${isManagementRole}`);
    console.log(`🔍 userManagerProjects map:`, Object.fromEntries(userManagerProjects));
    
    // Always allow management and super_admin
    if (currentUserRole === 'management' || currentUserRole === 'super_admin') {
      console.log(`✅ Management/super_admin access granted for ${userId}`);
      return true;
    }
    
    // Global managers can manage their team
    if (isManagerRole) {
      console.log(`✅ Global manager access granted for ${userId}`);
      return true;
    }
    
    // Leads with manager project roles can manage users in those projects
    if (isLeadRole && userManagerProjects.has(userId)) {
      const managedProjects = userManagerProjects.get(userId) || [];
      console.log(`🔍 Lead with manager projects for ${userId}:`, managedProjects);
      const hasManagerAccess = managedProjects.length > 0;
      console.log(`${hasManagerAccess ? '✅' : '❌'} Lead manager access for ${userId}: ${hasManagerAccess}`);
      return hasManagerAccess;
    }
    
    console.log(`❌ No management access for ${userId}`);
    return false;
  }, [currentUserRole, isManagerRole, isLeadRole, isManagementRole, userManagerProjects]);
  
  // Debug access control
  console.log('🛡️ Access Control:', {
    currentUserRole,
    canViewTeamTimesheets,
    canApproveTimesheets,
    isLeadRole,
    isManagerRole,
    isManagementRole,
    isSuperAdminRole
  });

  // Load team members based on role
  const loadTeamMembers = useCallback(async () => {
    setFunctionsCalledLog(prev => [...prev, 'loadTeamMembers']);
    console.log('🔍 loadTeamMembers called', {
      currentUserId: currentUser?.id,
      currentUserRole,
      canViewTeamTimesheets,
      isLeadRole,
      isManagerRole
    });

    if (!currentUser?.id || !canViewTeamTimesheets) {
      console.log('❌ loadTeamMembers early return:', {
        hasCurrentUser: !!currentUser?.id,
        canViewTeamTimesheets
      });
      return;
    }
    
    const previousStatus = timesheet.status;

    try {
      setLoading(true);
      let result;
      
      console.log('📊 Loading team members for role:', currentUserRole);
      
      if (isLeadRole || isManagerRole) {
        console.log('👥 Loading with project-specific roles...');
        // Use the new multi-role method for leads and managers
        const teamMembersResult = await UserService.getTeamMembersWithProjectRoles(currentUser.id);
        console.log('👥 Team members with project roles result:', teamMembersResult);
        
        if (!teamMembersResult.error) {
          console.log('✅ Team members found:', teamMembersResult.users.length);
          console.log('🔍 Project role maps:', {
            userProjectRoles: Object.fromEntries(teamMembersResult.userProjectRoles),
            userManagerProjects: Object.fromEntries(teamMembersResult.userManagerProjects)
          });
          
          // Store project role data for permission checking
          setUserManagerProjects(teamMembersResult.userManagerProjects);
          
          result = { users: teamMembersResult.users, error: null };
        } else {
          result = { users: [], error: teamMembersResult.error };
        }
      } else {
        console.log('👥 Loading for Management/SuperAdmin role...');
        // Management and Super Admin can see all users
        result = await UserService.getAllUsers();
        console.log('👤 All users result for management:', result);
        
        // Clear project role data for management roles
        setUserManagerProjects(new Map());
      }
      
      console.log('📤 Final team members result:', result);
      
      if (result.error) {
        console.error('❌ Error loading team members:', result.error);
      } else {
        console.log('✅ Setting team members:', result.users?.length, 'users');
        setTeamMembers(result.users || []);
      }
    } catch (error) {
      console.error('❌ Error in loadTeamMembers:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, currentUserRole, canViewTeamTimesheets, isLeadRole, isManagerRole]);

  // Load team timesheets for review/approval
  const loadTeamTimesheets = useCallback(async () => {
    setFunctionsCalledLog(prev => [...prev, 'loadTeamTimesheets']);
    console.log('📋 loadTeamTimesheets called', {
      currentUserId: currentUser?.id,
      canViewTeamTimesheets,
      teamMembersCount: teamMembers.length,
      statusFilter,
      userFilter,
      searchTerm
    });

    if (!currentUser?.id || !canViewTeamTimesheets) {
      console.log('❌ loadTeamTimesheets early return:', {
        hasCurrentUser: !!currentUser?.id,
        canViewTeamTimesheets
      });
      return;
    }
    
    try {
      setLoading(true);
      
      console.log('📊 Loading timesheets for role:', currentUserRole);
      console.log('👥 Available team members:', teamMembers.map(m => ({ id: m.id, name: m.full_name, role: m.role })));
      
      // Get timesheets based on role
      const allTimesheets: TimesheetWithDetails[] = [];
      
      if (isLeadRole) {
        console.log('👁️ Lead: Loading employee timesheets with project-specific permissions');
        // Lead can view employee timesheets, and approve/reject if they have manager role in projects
        const employees = teamMembers.filter(m => m.role === 'employee');
        console.log('👤 Employees to load timesheets for:', employees.map(e => ({ id: e.id, name: e.full_name })));
        
        for (const member of employees) {
          console.log(`📋 Loading timesheets for employee: ${member.full_name} (${member.id})`);
          const result = await TimesheetApprovalService.getUserTimesheets(member.id);
          console.log(`📤 Timesheets for ${member.full_name}:`, result);
          
          const canManageThisUser = canManageUser(member.id);
          console.log(`🔍 Lead can manage ${member.full_name}:`, canManageThisUser);
          console.log(`🔍 Timesheet status for permission check:`, result.map(ts => ({ id: ts.id, status: ts.status })));
          
          const enhancedTimesheets = result.map(ts => {
            const canApprove = canManageThisUser && ts.status === 'submitted';
            const canReject = canManageThisUser && ts.status === 'submitted';
            console.log(`🔍 Timesheet ${ts.id} permissions: canApprove=${canApprove}, canReject=${canReject} (canManageThisUser=${canManageThisUser}, status=${ts.status})`);

            return {
              ...ts,
              user_name: member.full_name,
              user_email: member.email,
              user: member,
              owner_role: member.role,
              can_approve: canApprove,
              can_reject: canReject,
              can_finalize: canApprove,
              can_edit: false
            };
          });
          
          console.log(`🔍 Enhanced timesheets for ${member.full_name}:`, enhancedTimesheets.map(ts => ({ 
            id: ts.id, 
            user_name: ts.user_name, 
            can_approve: ts.can_approve, 
            can_reject: ts.can_reject 
          })));
          
          allTimesheets.push(...enhancedTimesheets);
        }
      } else if (isManagerRole) {
        console.log('👔 Manager: Loading employee and lead timesheets');
        // Manager can view and approve employee and lead timesheets
        const subordinates = teamMembers.filter(m => m.role === 'employee' || m.role === 'lead');
        console.log('👤 Subordinates to load timesheets for:', subordinates.map(s => ({ id: s.id, name: s.full_name, role: s.role })));
        
        for (const member of subordinates) {
          console.log(`📋 Loading timesheets for ${member.role}: ${member.full_name} (${member.id})`);
          const result = await TimesheetApprovalService.getUserTimesheets(member.id);
          console.log(`📤 Timesheets for ${member.full_name}:`, result);
          
          const enhancedTimesheets = result.map(ts => {
            const canApprove = ts.status === 'submitted' || ts.status === 'manager_approved';
            const canReject = ts.status === 'submitted' || ts.status === 'manager_approved';

            return {
              ...ts,
              user_name: member.full_name,
              user_email: member.email,
              user: member,
              owner_role: member.role,
              can_approve: canApprove,
              can_reject: canReject,
              can_finalize: ts.status === 'manager_approved',
              can_edit: false
            };
          });
          allTimesheets.push(...enhancedTimesheets);
        }
      } else {
        console.log('🏢 Management/SuperAdmin: Loading timesheets for all team members');
        // Management and Super Admin can see all timesheets from their team members
        
        // For Management, we need to get timesheets from all team members
        if (teamMembers.length === 0) {
          console.log('⚠️ No team members loaded yet for Management - loading timesheets will be limited');
        }
        
        // Get timesheets for all team members (Management can see all)
        for (const member of teamMembers) {
          console.log(`📋 Loading timesheets for ${member.role}: ${member.full_name} (${member.id})`);
          const result = await TimesheetApprovalService.getUserTimesheets(member.id);
          console.log(`📤 Timesheets for ${member.full_name}:`, result);
          
          const relevantStatuses: TimesheetStatus[] = member.role === 'manager'
            ? ['submitted', 'management_pending', 'manager_approved', 'manager_rejected']
            : ['manager_approved', 'management_pending', 'frozen', 'management_rejected'];

          const enhancedTimesheets = result
            .filter(ts => relevantStatuses.includes(ts.status))
            .map(ts => {
              const awaitingManagement = ts.status === 'manager_approved' || ts.status === 'management_pending';
              const managerSelfSubmitted = member.role === 'manager' && ts.status === 'submitted';

              return {
                ...ts,
                user_name: member.full_name,
                user_email: member.email,
                user: member,
                owner_role: member.role,
                can_approve: awaitingManagement || managerSelfSubmitted,
                can_reject: awaitingManagement || managerSelfSubmitted,
                can_finalize: awaitingManagement,
                can_edit: false
              };
            });
          console.log(enhancedTimesheets.length, "Wohoooo")
          allTimesheets.push(...enhancedTimesheets);
        }
        
        // Also try the management API as fallback for any missed timesheets
        try {
          console.log('🔄 Also loading via management API as fallback...');
          const managementResult = await TimesheetApprovalService.getTimesheetsForApproval(
            'management',
            currentUser.id,
            {
              status: statusFilter === 'all' ? undefined : [statusFilter]
            }
          );
          console.log('📤 Management API result:', managementResult);
          
          // Add any additional timesheets not already loaded
          const existingIds = new Set(allTimesheets.map(ts => ts.id));
          const additionalTimesheets = managementResult.filter(ts => !existingIds.has(ts.id));
          console.log('📤 Additional timesheets from management API:', additionalTimesheets.length);
          const normalizedAdditionalTimesheets = additionalTimesheets.map(ts => ({
            ...ts,
            owner_role: ts.user?.role || ts.owner_role,
            can_finalize: ts.status === 'manager_approved' || ts.status === 'management_pending'
          }));
          allTimesheets.push(...normalizedAdditionalTimesheets);
        } catch (fallbackError) {
          console.error('⚠️ Management API fallback failed:', fallbackError);
        }
      }
      
      console.log('📊 All timesheets before filtering:', allTimesheets.length);
      
      // Apply filters
      let filteredTimesheets = allTimesheets;
      
      if (statusFilter !== 'all') {
        const beforeFilter = filteredTimesheets.length;
        filteredTimesheets = filteredTimesheets.filter(ts => ts.status === statusFilter);
        console.log(`🔍 Status filter (${statusFilter}): ${beforeFilter} → ${filteredTimesheets.length}`);
      }
      
      if (userFilter !== 'all') {
        const beforeFilter = filteredTimesheets.length;
        filteredTimesheets = filteredTimesheets.filter(ts => ts.user_id === userFilter);
        console.log(`🔍 User filter (${userFilter}): ${beforeFilter} → ${filteredTimesheets.length}`);
      }
      
      if (searchTerm) {
        const beforeFilter = filteredTimesheets.length;
        filteredTimesheets = filteredTimesheets.filter(ts => 
          ts.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          ts.status.toLowerCase().includes(searchTerm.toLowerCase())
        );
        console.log(`🔍 Search filter (${searchTerm}): ${beforeFilter} → ${filteredTimesheets.length}`);
      }
      
      console.log('✅ Final filtered timesheets:', filteredTimesheets.length);
      console.log('📋 Setting timesheets:', filteredTimesheets.map(ts => ({ 
        id: ts.id, 
        user: ts.user_name, 
        status: ts.status, 
        week: `${ts.week_start_date} - ${ts.week_end_date}` 
      })));
      
      setTimesheets(filteredTimesheets);
    } catch (error) {
      console.error('❌ Error loading team timesheets:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, currentUserRole, statusFilter, userFilter, searchTerm, teamMembers, canViewTeamTimesheets, isLeadRole, isManagerRole, canManageUser]);

  // Handle timesheet approval (Manager or Lead with project manager role)
  const handleApproveTimesheet = async (timesheetId: string, mode: 'default' | 'finalize' = 'default') => {
    // Find the timesheet to check user-specific permissions
    const timesheet = timesheets.find(ts => ts.id === timesheetId);
    if (!timesheet) {
      showError('Timesheet not found');
      return;
    }

    const previousStatus = timesheet.status;

    // Check if user can manage this specific timesheet owner
    const canManageThisUser = canManageUser(timesheet.user_id);
    if (!canManageThisUser) {
      showError('You do not have permission to approve this timesheet');
      return;
    }

    try {
      setLoading(true);
      
      // Determine which action to call based on timesheet status and user role
      let success = false;
      if (timesheet.status === 'manager_approved') {
        const finalizeByManagement = isManagementRole || isSuperAdminRole;
        success = await TimesheetApprovalService.managementAction(
          timesheetId,
          currentUser?.id || '',
          'approve',
          {
            reason: finalizeByManagement ? 'Final approval by management' : 'Final approval by manager',
            approverRole: finalizeByManagement ? 'management' : 'manager',
            finalize: true,
            notify: true
          }
        );
      } else if (timesheet.status === 'management_pending') {
        success = await TimesheetApprovalService.managementAction(
          timesheetId,
          currentUser?.id || '',
          'approve',
          {
            reason: 'Verified and approved by management',
            approverRole: 'management',
            finalize: true,
            notify: true
          }
        );
      } else if (timesheet.status === 'submitted') {
      const approverRole = isLeadRole ? 'lead' : 'manager';
        success = await TimesheetApprovalService.managerAction(
          timesheetId,
          currentUser?.id || '',
          'approve',
          {
            reason: isLeadRole ? 'Approved by lead (project manager)' : 'Approved by manager',
            approverRole,
            finalize: isLeadRole && mode === 'finalize',
            notify: true
          }
        );
      } else {
        showWarning(`Cannot approve timesheet with status: ${timesheet.status}`);
        setLoading(false);
        return;
      }
      
      if (success) {
        await loadTeamTimesheets();
        setSelectedTimesheet(null);
        showSuccess(previousStatus === 'manager_approved' ? 'Timesheet finalized successfully' : 'Timesheet approved successfully');
      } else {
        showError('Error approving timesheet');
      }
    } catch (error) {
      console.error('Error in handleApproveTimesheet:', error);
      showError('Error approving timesheet');
    } finally {
      setLoading(false);
    }
  };

  // Handle timesheet rejection (Manager or Lead with project manager role)
  const handleRejectTimesheet = async (timesheetId: string, reason: string) => {
    // Find the timesheet to check user-specific permissions
    const timesheet = timesheets.find(ts => ts.id === timesheetId);
    if (!timesheet) {
      showError('Timesheet not found');
      return;
    }

    // Check if user can manage this specific timesheet owner
    const canManageThisUser = canManageUser(timesheet.user_id);
    if (!canManageThisUser) {
      showError('You do not have permission to reject this timesheet');
      return;
    }

    if (!reason.trim()) {
      showError('Rejection reason is required');
      return;
    }

    try {
      setLoading(true);
      
      // Determine which action to call based on timesheet status and user role
      let success = false;
      if (timesheet.status === 'manager_approved' || timesheet.status === 'management_pending') {
        const finalizeByManagement = isManagementRole || isSuperAdminRole;
        success = await TimesheetApprovalService.managementAction(
          timesheetId,
          currentUser?.id || '',
          'reject',
          {
            reason,
            approverRole: finalizeByManagement ? 'management' : 'manager',
            finalize: false,
            notify: true
          }
        );
      } else if (timesheet.status === 'submitted') {
        const approverRole = isLeadRole ? 'lead' : 'manager';
        success = await TimesheetApprovalService.managerAction(
          timesheetId,
          currentUser?.id || '',
          'reject',
          {
            reason,
            approverRole,
            notify: true
          }
        );
      } else {
        showWarning(`Cannot reject timesheet with status: ${timesheet.status}`);
        setLoading(false);
        return;
      }
      
      if (success) {
        await loadTeamTimesheets();
        setSelectedTimesheet(null);
        showSuccess('Timesheet rejected successfully');
        setShowRejectionModal(false);
      } else {
        showError('Error rejecting timesheet');
      }
    } catch (error) {
      console.error('Error in handleRejectTimesheet:', error);
      showError('Error rejecting timesheet');
    } finally {
      setLoading(false);
    }
  };

  // Show rejection modal
  const showRejectModal = (timesheetId: string) => {
    setTimesheetToReject(timesheetId);
    setShowRejectionModal(true);
  };

  // Load data when component mounts or filters change
  useEffect(() => {
    console.log('🚀 useEffect: calling loadTeamMembers');
    loadTeamMembers();
  }, [loadTeamMembers]);

  useEffect(() => {
    console.log('🚀 useEffect: teamMembers changed', { count: teamMembers.length });
    if (teamMembers.length > 0) {
      console.log('🚀 useEffect: calling loadTeamTimesheets');
      loadTeamTimesheets();
    }
  }, [loadTeamTimesheets, teamMembers]);

  // Get status badge styling
  const getStatusBadge = (status: TimesheetStatus) => {
    const styles: Record<TimesheetStatus, string> = {
      draft: 'bg-gray-100 text-gray-800',
      submitted: 'bg-blue-100 text-blue-800',
      manager_approved: 'bg-green-100 text-green-800',
      management_pending: 'bg-yellow-100 text-yellow-800',
      manager_rejected: 'bg-red-100 text-red-800',
      management_rejected: 'bg-red-100 text-red-800',
      frozen: 'bg-purple-100 text-purple-800',
      billed: 'bg-indigo-100 text-indigo-800'
    };
    
    return `px-3 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`;
  };

  // Get available actions for a timesheet based on status and user role
  const getAvailableActions = (timesheet: TimesheetWithDetails) => {
    const actions = [];
    
    // Always allow view
    actions.push('view');
    
    // Check per-timesheet permissions (works for leads with manager roles in specific projects)
    if (timesheet.can_approve) {
      actions.push('approve');
    }
    
    if (timesheet.can_reject) {
      actions.push('reject');
    }

    if(!timesheet.is_frozen){
      actions.push('delete')
    }
    
    console.log(`🔍 Actions for timesheet ${timesheet.id} (user: ${timesheet.user_name}):`, {
      can_approve: timesheet.can_approve,
      can_reject: timesheet.can_reject,
      actions
    });
    
    return actions;
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Calculate total hours for a timesheet
  const getTotalHours = (timesheet: TimesheetWithDetails) => {
    return timesheet.total_hours || 0;
  };

  // Get billable hours for a timesheet
  const getBillableHours = (timesheet: TimesheetWithDetails) => {
    if (!timesheet.entries) return 0;
    return timesheet.entries.filter(e => e.is_billable).reduce((sum, e) => sum + e.hours, 0);
  };

  // Access control check
  if (!canViewTeamTimesheets) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access Team Review.</p>
        </div>
      </div>
    );
  }

  if (loading && timesheets.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading team timesheets...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Users className="w-6 h-6 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Team Review
            </h1>
            <p className="text-gray-600">
              {isLeadRole && (
                <span className="inline-flex items-center text-sm bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Project Approval - Employee Timesheets
                </span>
              )}
              {isManagerRole && (
                <span className="inline-flex items-center text-sm bg-green-50 text-green-700 px-2 py-1 rounded-full">
                  <UserCheck className="w-3 h-3 mr-1" />
                  Approval Authority - Employee & Lead Timesheets
                </span>
              )}
              {(currentUserRole === 'management' || currentUserRole === 'super_admin') && (
                <span className="inline-flex items-center text-sm bg-purple-50 text-purple-700 px-2 py-1 rounded-full">
                  <Shield className="w-3 h-3 mr-1" />
                  Full Management Access
                </span>
              )}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* View Mode Toggle */}
          <div className="flex rounded-lg bg-gray-100 p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FileText className="w-4 h-4 inline mr-1" />
              All Timesheets
            </button>
            {canApproveTimesheets && (
              <button
                onClick={() => setViewMode('approval')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'approval'
                    ? 'bg-white text-gray-900 shadow'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <CheckCircle className="w-4 h-4 inline mr-1" />
                Approval Queue
              </button>
            )}
          </div>
          
          <button
            onClick={() => {
              loadTeamMembers();
              loadTeamTimesheets();
            }}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by employee name or status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {/* User Filter */}
          <div className="relative">
            <Users className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Team Members</option>
              {teamMembers.map(member => (
                <option key={member.id} value={member.id}>
                  {member.full_name} ({member.role})
                </option>
              ))}
            </select>
          </div>
          
          {/* Status Filter */}
          <div className="relative">
            <Filter className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TimesheetStatus | 'all')}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Team Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center">
            <Users className="w-5 h-5 text-blue-600 mr-2" />
            <span className="text-sm font-medium text-gray-600">Team Members</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">{teamMembers.length}</p>
          <p className="text-xs text-gray-500">
            {isLeadRole ? 'Employees only' : isManagerRole ? 'Employees & Leads' : 'All users'}
          </p>
        </div>
        
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center">
            <Clock className="w-5 h-5 text-orange-600 mr-2" />
            <span className="text-sm font-medium text-gray-600">Pending Review</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {timesheets.filter(t => t.status === 'submitted' || t.status === 'management_pending').length}
          </p>
          <p className="text-xs text-gray-500">
            {canApproveTimesheets ? 'Awaiting your approval' : 'Awaiting approval'}
          </p>
        </div>
        
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            <span className="text-sm font-medium text-gray-600">Frozen</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {timesheets.filter(t =>  t.status === 'frozen').length}
          </p>
          <p className="text-xs text-gray-500">This period</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center">
            <Calendar className="w-5 h-5 text-purple-600 mr-2" />
            <span className="text-sm font-medium text-gray-600">Total Hours</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {timesheets.reduce((total, ts) => total + getTotalHours(ts), 0)}
          </p>
          <p className="text-xs text-gray-500">
            {timesheets.reduce((total, ts) => total + getBillableHours(ts), 0)}h billable
          </p>
        </div>
      </div>

      {/* Timesheets List */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">
              {viewMode === 'list' ? 'All Team Timesheets' : 'Timesheets Pending Approval'}
              <span className="ml-2 text-sm text-gray-500">
                ({timesheets.filter(ts => viewMode === 'list' || ['submitted', 'management_pending'].includes(ts.status)).length})
              </span>
            </h2>
            
            {canApproveTimesheets && (
              <div className="flex items-center space-x-2">
                <Bell className="w-4 h-4 text-orange-500" />
                <span className="text-sm text-orange-600">
                  {timesheets.filter(t => t.status === 'submitted').length} awaiting approval
                </span>
              </div>
            )}
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Week Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hours
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {timesheets
                .filter(ts => viewMode === 'list' || ['submitted', 'management_pending'].includes(ts.status))
                .map((timesheet) => {
                  const actions = getAvailableActions(timesheet);
                  const isExpanded = expandedTimesheet === timesheet.id;
                  const billableHours = getBillableHours(timesheet);
                  
                  return (
                    <React.Fragment key={timesheet.id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8">
                              <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-white">
                                  {timesheet.user_name?.charAt(0) || 'U'}
                                </span>
                              </div>
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">
                                {timesheet.user_name || 'Unknown User'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {timesheet.user?.role || 'Unknown Role'}
                              </div>
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>
                            <div className="font-medium">
                              {formatDate(timesheet.week_start_date)} - {formatDate(timesheet.week_end_date)}
                            </div>
                            <div className="text-xs text-gray-500">
                              Submitted: {timesheet.submitted_at ? formatDate(timesheet.submitted_at) : 'Not submitted'}
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>
                            <div className="font-medium">{getTotalHours(timesheet)}h total</div>
                            <div className="text-xs text-green-600">{billableHours}h billable</div>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={getStatusBadge(timesheet.status)}>
                            {timesheet.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            {/* Expand/Collapse Button */}
                            <button
                              onClick={() => setExpandedTimesheet(isExpanded ? null : timesheet.id)}
                              className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors"
                              title={isExpanded ? 'Collapse details' : 'Expand details'}
                            >
                              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>

                            {/* View Details Button */}
                            {actions.includes('view') && (
                              <button
                                onClick={() => setSelectedTimesheet(timesheet)}
                                className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                                title="View full details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            )}
                            
                            {/* Approve Button - Manager only */}
                            {actions.includes('approve') && (
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleApproveTimesheet(timesheet.id)}
                                  className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50 transition-colors"
                                  disabled={loading}
                                  title="Approve and send to manager"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                {isLeadRole && timesheet.can_finalize && (
                                  <button
                                    onClick={() => handleApproveTimesheet(timesheet.id, 'finalize')}
                                    className="text-emerald-600 hover:text-emerald-900 p-1 rounded hover:bg-emerald-50 transition-colors"
                                    disabled={loading}
                                    title="Approve and finalize for manager"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            )}
                            
                            {/* Reject Button - Manager only */}
                            {actions.includes('reject') && (
                              <button
                                onClick={() => showRejectModal(timesheet.id)}
                                className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                                disabled={loading}
                                title="Reject timesheet"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}

                            {/* Reject Button - Manager only */}
                            {/* {actions.includes('delete') && (
                              <button
                                onClick={() => showRejectModal(timesheet.id)}
                                className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                                disabled={loading}
                                title="Reject timesheet"
                              >
                                <DeleteButton className="w-4 h-4" entityType={''} entityId={''} />
                              </button>
                            )} */}

                            {/* Role-specific indicators */}
                            {isLeadRole && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                View Only
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Row Details */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={5} className="px-6 py-4 bg-gray-50">
                            <div className="space-y-4">
                              {/* Quick Stats */}
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-white p-3 rounded-lg border">
                                  <div className="text-lg font-bold text-gray-900">{timesheet.entries?.length || 0}</div>
                                  <div className="text-sm text-gray-600">Time Entries</div>
                                </div>
                                <div className="bg-white p-3 rounded-lg border">
                                  <div className="text-lg font-bold text-green-600">{billableHours}h</div>
                                  <div className="text-sm text-gray-600">Billable Hours</div>
                                </div>
                                <div className="bg-white p-3 rounded-lg border">
                                  <div className="text-lg font-bold text-gray-600">{getTotalHours(timesheet) - billableHours}h</div>
                                  <div className="text-sm text-gray-600">Non-billable Hours</div>
                                </div>
                                <div className="bg-white p-3 rounded-lg border">
                                  <div className="text-lg font-bold text-blue-600">
                                    {timesheet.entries?.filter(e => e.entry_type === 'project_task').length || 0}
                                  </div>
                                  <div className="text-sm text-gray-600">Project Tasks</div>
                                </div>
                              </div>

                              {/* Recent Time Entries */}
                              {timesheet.entries && timesheet.entries.length > 0 && (
                                <div>
                                  <h4 className="font-medium text-gray-900 mb-2">Recent Time Entries</h4>
                                  <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {timesheet.entries.slice(0, 5).map((entry, index) => (
                                      <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                                        <div className="flex-1">
                                          <div className="flex items-center space-x-2">
                                            <span className="font-medium text-sm">
                                              {formatDate(entry.date)}
                                            </span>
                                            <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                                              entry.is_billable ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                            }`}>
                                              {entry.is_billable ? 'Billable' : 'Non-billable'}
                                            </span>
                                          </div>
                                          <p className="text-sm text-gray-600 mt-1">
                                            {entry.description || entry.custom_task_description || 'No description'}
                                          </p>
                                        </div>
                                        <div className="text-right">
                                          <div className="font-bold text-gray-900">{entry.hours}h</div>
                                          <div className="text-xs text-gray-500">{entry.entry_type}</div>
                                        </div>
                                      </div>
                                    ))}
                                    {timesheet.entries.length > 5 && (
                                      <div className="text-center py-2">
                                        <button
                                          onClick={() => setSelectedTimesheet(timesheet)}
                                          className="text-blue-600 hover:text-blue-800 text-sm"
                                        >
                                          View all {timesheet.entries.length} entries
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
            </tbody>
          </table>
          
          {timesheets.filter(ts => viewMode === 'list' || ['submitted', 'management_pending'].includes(ts.status)).length === 0 && (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No timesheets found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {viewMode === 'approval' 
                  ? 'No timesheets pending approval'
                  : searchTerm || statusFilter !== 'all' || userFilter !== 'all'
                  ? 'No timesheets match your current filters'
                  : isLeadRole
                  ? 'No employee timesheets found for your projects'
                  : 'No team timesheets found'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Timesheet Detail Modal */}
      {selectedTimesheet && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-medium text-gray-900">
                  Timesheet Details - {selectedTimesheet.user_name}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Week of {formatDate(selectedTimesheet.week_start_date)} - {formatDate(selectedTimesheet.week_end_date)}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <span data-testid="statusBadge" className={getStatusBadge(selectedTimesheet.status)}>
                  {selectedTimesheet.status.replace('_', ' ').toUpperCase()}
                </span>
                <button
                  onClick={() => setSelectedTimesheet(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Summary Stats */}
              <div className="lg:col-span-1">
                <h4 className="font-semibold text-gray-900 mb-4">Summary</h4>
                <div className="space-y-3">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{getTotalHours(selectedTimesheet)}h</div>
                    <div className="text-sm text-blue-700">Total Hours</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{getBillableHours(selectedTimesheet)}h</div>
                    <div className="text-sm text-green-700">Billable Hours</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-gray-600">
                      {getTotalHours(selectedTimesheet) - getBillableHours(selectedTimesheet)}h
                    </div>
                    <div className="text-sm text-gray-700">Non-billable Hours</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{selectedTimesheet.entries?.length || 0}</div>
                    <div className="text-sm text-purple-700">Time Entries</div>
                  </div>
                </div>

                {/* Employee Info */}
                <div className="mt-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Employee Details</h4>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Name:</span>
                      <span className="text-sm font-medium text-gray-900">{selectedTimesheet.user_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Role:</span>
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {selectedTimesheet.user?.role || 'Unknown'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Rate:</span>
                      <span className="text-sm font-medium text-gray-900">
                        ${selectedTimesheet.user?.hourly_rate || 0}/hr
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Time Entries Details */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-gray-900">Time Entries</h4>
                  <button
                    onClick={() => {
                      // Export functionality placeholder
                      showError('Export functionality would generate a detailed report of this timesheet');
                    }}
                    className="flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Export
                  </button>
                </div>
                
                {selectedTimesheet.entries && selectedTimesheet.entries.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {selectedTimesheet.entries.map((entry, index) => (
                      <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <span className="font-medium text-gray-900">
                                {formatDate(entry.date)}
                              </span>
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                entry.is_billable ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {entry.is_billable ? 'Billable' : 'Non-billable'}
                              </span>
                              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                {entry.entry_type === 'project_task' ? 'Project Task' : 'Custom Task'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 mb-2">
                              {entry.description || entry.custom_task_description || 'No description provided'}
                            </p>
                            {entry.project_id && (
                              <p className="text-xs text-gray-500">
                                Project ID: {entry.project_id}
                              </p>
                            )}
                          </div>
                          <div className="text-right ml-4">
                            <div className="text-lg font-bold text-gray-900">{entry.hours}h</div>
                            <div className="text-xs text-gray-500">
                              {entry.hourly_rate ? `$${entry.hourly_rate}/hr` : 'No rate'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No time entries found for this timesheet</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                <div>Created: {formatDate(selectedTimesheet.created_at)}</div>
                <div>Last Updated: {formatDate(selectedTimesheet.updated_at)}</div>
                {selectedTimesheet.submitted_at && (
                  <div>Submitted: {formatDate(selectedTimesheet.submitted_at)}</div>
                )}
              </div>
              
              <div className="flex space-x-3">
                {getAvailableActions(selectedTimesheet).includes('approve') && (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 space-y-2 sm:space-y-0">
                    <button
                      onClick={() => {
                        handleApproveTimesheet(selectedTimesheet.id);
                        setSelectedTimesheet(null);
                      }}
                      disabled={loading}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Approve & Notify Manager
                    </button>
                    {isLeadRole && selectedTimesheet?.can_finalize && (
                      <button
                        onClick={() => {
                          handleApproveTimesheet(selectedTimesheet.id, 'finalize');
                          setSelectedTimesheet(null);
                        }}
                        disabled={loading}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve & Finalize
                      </button>
                    )}
                  </div>
                )}
                
                {getAvailableActions(selectedTimesheet).includes('reject') && (
                  <button
                    onClick={() => {
                      showRejectModal(selectedTimesheet.id);
                      setSelectedTimesheet(null);
                    }}
                    disabled={loading}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Reject Timesheet
                  </button>
                )}
                
                <button
                  onClick={() => setSelectedTimesheet(null)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectionModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Reject Timesheet
              </h3>
              <button
                onClick={() => {
                  setShowRejectionModal(false);
                  setRejectionReason('');
                  setTimesheetToReject(null);
                }}
                data-testid="reject=close-btn"
                className="text-gray-400 hover:text-gray-600"

              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rejection Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please provide a clear reason for rejection..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                  rows={4}
                  required
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowRejectionModal(false);
                    setRejectionReason('');
                    setTimesheetToReject(null);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (timesheetToReject) {
                      handleRejectTimesheet(timesheetToReject, rejectionReason);
                    }
                  }}
                  disabled={!rejectionReason.trim() || loading}
                  data-testid="reject-btn"
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Rejecting...' : 'Reject Timesheet'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Role-specific Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900">
              {isLeadRole ? 'Lead Access Information' : isManagerRole ? 'Manager Access Information' : 'Management Access Information'}
            </h4>
            <p className="text-sm text-blue-700 mt-1">
              {isLeadRole && (
                'As a Lead, you can review and approve or reject employee timesheets for the projects where you serve as the project manager. Approved entries are automatically forwarded to the employee\'s manager for final review.'
              )}
              {isManagerRole && (
                'As a Manager, you can approve or reject timesheets from employees and leads in your team. Once all entries are cleared, finalize the timesheet to move it to the frozen state.'
              )}
              {(currentUserRole === 'management' || currentUserRole === 'super_admin') && (
                'You have full access to view and manage all team timesheets. Provide the final approval for manager submissions and oversee escalated employee timesheets when needed.'
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamReview;
