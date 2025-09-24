import { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Save, 
  Send, 
  Edit, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  List,
  CalendarDays,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Copy,
  ArrowRight,
  Filter,
  FileText,
  Lock,
  Timer,
  Play,
  Square,
  BarChart3,
  TrendingUp,
  Download,
  Zap,
  Target,
  Activity,
  Users,
  Check,
  X,
  Shield,
  User as UserIcon,
  Bell
} from 'lucide-react';
import { useAuth } from '../store/contexts/AuthContext';
import { TimesheetApprovalService } from '../services/TimesheetApprovalService';
import { TimesheetService } from '../services/TimesheetService';
import { UserService } from '../services/UserService';
import { ProjectService } from '../services/ProjectService';

import type { 
  Timesheet, 
  TimeEntry, 
  TimesheetStatus,
  User
} from '../types';

interface TimeEntryForm {
  id?: string;
  project_id: string;
  task_id?: string;
  custom_task_description?: string;
  date: string;
  hours: number;
  description?: string;
  is_billable: boolean;
}

interface WeeklyTimesheet {
  timesheet: Timesheet;
  entries: TimeEntry[];
  user?: User;
}

interface TimerState {
  isRunning: boolean;
  taskId?: string;
  startTime?: Date;
  elapsedSeconds: number;
}

interface EnhancedTimesheetUIProps {
  initialViewMode?: 'calendar' | 'list' | 'analytics' | 'team-review' | 'my-timesheet';
}

const EnhancedTimesheetUI = ({ initialViewMode }: EnhancedTimesheetUIProps) => {
  const { currentUserRole, user } = useAuth();
  const [viewMode, setViewMode] = useState<'calendar' | 'list' | 'analytics' | 'team-review' | 'my-timesheet'>(() => {
    // Use initialViewMode if provided
    if (initialViewMode) return initialViewMode;
    
    // Default view based on role
    if (currentUserRole === 'super_admin') return 'team-review';
    if (currentUserRole === 'management') return 'my-timesheet';
    if (currentUserRole === 'manager') return 'my-timesheet';
    if (currentUserRole === 'lead') return 'team-review';
    return 'calendar'; // Employee default (legacy support)
  });
  const [subViewMode, setSubViewMode] = useState<'calendar' | 'list' | 'analytics'>('calendar'); // For my-timesheet views
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedTimesheet, setSelectedTimesheet] = useState<WeeklyTimesheet | null>(null);
  const [timeEntries, setTimeEntries] = useState<TimeEntryForm[]>([]);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntryForm | null>(null);
  const [spanToWeek, setSpanToWeek] = useState(false);
  const [timer, setTimer] = useState<TimerState>({ isRunning: false, elapsedSeconds: 0 });
  const [timerInterval, setTimerInterval] = useState<number | null>(null);
  const [quickEntryMode, setQuickEntryMode] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TimesheetStatus | 'all'>('all');
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter'>('week');

  // Team review state for leads and managers
  const [teamTimesheets, setTeamTimesheets] = useState<WeeklyTimesheet[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Get current user - use the real authenticated user
  const getCurrentUser = () => {
    return user; // This comes from our AuthContext
  };

  const currentUser = getCurrentUser();

  // Get user's accessible projects
  const getUserProjects = () => {
    // For now, return all projects - could be filtered based on user assignments
    return projects;
  };

  const userProjects = getUserProjects();

  // Get employees that the user can review based on role
  const getReviewableEmployees = () => {
    if (currentUserRole === 'super_admin') {
      // Super admin can see everyone
      return teamMembers.filter(u => u.role !== 'super_admin');
    }
    if (currentUserRole === 'management') {
      // Management can see all employees and managers
      return teamMembers.filter(u => u.role === 'employee' || u.role === 'manager' || u.role === 'lead');
    }
    if (currentUserRole === 'manager') {
      // Managers can see employees in their team
      return teamMembers.filter(u => u.role === 'employee');
    }
    if (currentUserRole === 'lead') {
      // Leads can see employees they work with
      return teamMembers.filter(u => u.role === 'employee');
    }
    return [];
  };

  const reviewableEmployees = getReviewableEmployees();

  // Load team members based on role
  const loadTeamMembers = async () => {
    if (!currentUser?.id) return;
    
    try {
      setLoading(true);
      let result;
      
      if (currentUserRole === 'manager' || currentUserRole === 'lead') {
        // Get team members for this manager/lead
        result = await UserService.getTeamMembers(currentUser.id);
      } else if (currentUserRole === 'management' || currentUserRole === 'super_admin') {
        // Get all users for management/super admin
        result = await UserService.getAllUsers();
      } else {
        // Employee - no team members
        result = { users: [], error: null };
      }
      
      if (result.error) {
        console.error('Error loading team members:', result.error);
      } else {
        setTeamMembers(result.users || []);
      }
    } catch (error) {
      console.error('Error in loadTeamMembers:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load team timesheets for approval
  const loadTeamTimesheets = async () => {
    if (!currentUser?.id) return;
    
    try {
      setLoading(true);
      const result = await TimesheetApprovalService.getTimesheetsForApproval(
        currentUserRole,
        currentUser.id,
        {
          status: statusFilter === 'all' ? undefined : [statusFilter]
        }
      );
      
      // Convert TimesheetWithDetails to WeeklyTimesheet format
      const weeklyTimesheets: WeeklyTimesheet[] = result.map(ts => ({
        timesheet: ts,
        entries: ts.entries || [],
        user: {
          id: ts.user_id,
          email: ts.user?.email || '',
          full_name: ts.user?.full_name || 'Unknown User',
          role: ts.user?.role || 'employee'
        } as User
      }));
      
      setTeamTimesheets(weeklyTimesheets);
    } catch (error) {
      console.error('Error loading team timesheets:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load projects
  const loadProjects = async () => {
    try {
      const result = await ProjectService.getProjects();
      if (result.error) {
        console.error('Error loading projects:', result.error);
      } else {
        setProjects(result.projects || []);
      }
    } catch (error) {
      console.error('Error in loadProjects:', error);
    }
  };

  // Load data when component mounts or role changes
  useEffect(() => {
    loadTeamMembers();
    loadProjects();
    if (viewMode === 'team-review') {
      loadTeamTimesheets();
    }
  }, [currentUserRole, viewMode, statusFilter]);

  // Get available tasks for a project
  const getProjectTasks = (projectId: string) => {
    // For now, return empty array - would need to implement task service
    return [];
  };

  // Check if user can approve/reject timesheets
  const canApproveTimesheets = () => {
    return currentUserRole === 'management' || currentUserRole === 'manager';
  };

  // Check if user can perform management actions
  const canPerformManagementActions = () => {
    return currentUserRole === 'management';
  };

  // Get accessible view modes based on role
  const getAccessibleViewModes = () => {
    const modes = ['my-timesheet']; // All roles have their own timesheet
    
    if (currentUserRole === 'management') {
      modes.push('team-review', 'analytics');
    } else if (currentUserRole === 'manager') {
      modes.push('team-review', 'analytics');
    } else if (currentUserRole === 'lead') {
      modes.push('team-review');
    } else {
      // Employee
      modes.push('analytics');
    }
    
    return modes;
  };

  // Get week dates
  const getWeekDates = (date: Date) => {
    const start = new Date(date);
    start.setDate(date.getDate() - date.getDay()); // Sunday
    const end = new Date(start);
    end.setDate(start.getDate() + 6); // Saturday
    return { start, end };
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const { start: weekStart, end: weekEnd } = getWeekDates(currentWeek);

  // Load team timesheets for management roles
  useEffect(() => {
    if ((currentUserRole === 'management' || currentUserRole === 'manager' || currentUserRole === 'lead') && viewMode === 'team-review') {
      const weekStartStr = formatDate(weekStart);
      
      const employeeTimesheets = sampleTimesheets.filter(ts => {
        if (ts.week_start_date !== weekStartStr) return false;
        const user = sampleUsers.find(u => u.id === ts.user_id);
        
        // Filter based on role permissions
        if (currentUserRole === 'management') {
          // Management sees all except their own
          return user && user.id !== currentUser.id && ts.status !== 'draft';
        } else if (currentUserRole === 'manager') {
          // Managers see employees under them
          return user?.role === 'employee' && ts.status !== 'draft';
        } else if (currentUserRole === 'lead') {
          // Leads see employees (review only)
          return user?.role === 'employee' && ts.status !== 'draft';
        }
        return false;
      });

      const timesheetsWithData = employeeTimesheets.map(ts => {
        const entries = sampleTimeEntries.filter(te => te.timesheet_id === ts.id);
        const user = sampleUsers.find(u => u.id === ts.user_id);
        return { timesheet: ts, entries, user };
      });

      setTeamTimesheets(timesheetsWithData);
    }
  }, [currentUserRole, viewMode, weekStart, currentUser.id]);

  // Timer functions
  const startTimer = (taskId?: string) => {
    if (timer.isRunning) {
      stopTimer();
    }
    
    const newTimer: TimerState = {
      isRunning: true,
      taskId,
      startTime: new Date(),
      elapsedSeconds: 0
    };
    
    setTimer(newTimer);
    
    const interval = setInterval(() => {
      setTimer(prev => {
        if (!prev.isRunning || !prev.startTime) return prev;
        return {
          ...prev,
          elapsedSeconds: Math.floor((new Date().getTime() - prev.startTime.getTime()) / 1000)
        };
      });
    }, 1000);
    
    setTimerInterval(interval);
  };

  const stopTimer = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    
    if (timer.isRunning && timer.elapsedSeconds > 0) {
      const hours = timer.elapsedSeconds / 3600;
      
      // Auto-create time entry
      const newEntry: TimeEntryForm = {
        id: `entry-${Date.now()}`,
        project_id: '',
        task_id: timer.taskId,
        date: formatDate(new Date()),
        hours: Math.round(hours * 4) / 4, // Round to nearest 15 minutes
        description: `Timer session - ${formatTime(timer.elapsedSeconds)}`,
        is_billable: true
      };
      
      setEditingEntry(newEntry);
      setShowEntryModal(true);
    }
    
    setTimer({ isRunning: false, elapsedSeconds: 0 });
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Load timesheet for current week
  useEffect(() => {
    const loadWeeklyTimesheet = () => {
      const weekStartStr = formatDate(weekStart);
      const weekEndStr = formatDate(weekEnd);
      
      const existingTimesheet = sampleTimesheets.find(ts => 
        ts.user_id === currentUser.id && 
        ts.week_start_date === weekStartStr
      );

      if (existingTimesheet) {
        const entries = sampleTimeEntries.filter(te => te.timesheet_id === existingTimesheet.id);
        setSelectedTimesheet({ timesheet: existingTimesheet, entries });
        
        const formEntries = entries.map(entry => ({
          id: entry.id,
          project_id: entry.project_id || '',
          task_id: entry.task_id,
          custom_task_description: entry.custom_task_description,
          date: entry.date,
          hours: entry.hours,
          description: entry.description,
          is_billable: entry.is_billable
        }));
        setTimeEntries(formEntries);
      } else {
        const newTimesheet: Timesheet = {
          id: `new-${Date.now()}`,
          user_id: currentUser.id,
          week_start_date: weekStartStr,
          week_end_date: weekEndStr,
          total_hours: 0,
          status: 'draft',
          is_verified: false,
        billing_snapshot_id: undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        setSelectedTimesheet({ timesheet: newTimesheet, entries: [] });
        setTimeEntries([]);
      }
    };

    loadWeeklyTimesheet();
  }, [currentWeek, currentUser.id, weekStart, weekEnd]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [timerInterval]);

  const getStatusColor = (status: TimesheetStatus) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800 border-gray-200',
      submitted: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      manager_approved: 'bg-green-100 text-green-800 border-green-200',
      manager_rejected: 'bg-red-100 text-red-800 border-red-200',
      management_approved: 'bg-green-100 text-green-800 border-green-200',
      management_rejected: 'bg-red-100 text-red-800 border-red-200',
      verified: 'bg-blue-100 text-blue-800 border-blue-200', // verified = frozen
      frozen: 'bg-slate-100 text-slate-800 border-slate-200'
    };
    return colors[status] || colors.draft;
  };

  const getStatusIcon = (status: TimesheetStatus) => {
    switch (status) {
      case 'manager_approved':
      case 'management_approved':
      case 'verified':
      case 'frozen':
        return <CheckCircle className="w-4 h-4" />;
      case 'manager_rejected':
      case 'management_rejected':
        return <XCircle className="w-4 h-4" />;
      case 'submitted':
        return <Clock className="w-4 h-4" />;
      default:
        return <Edit className="w-4 h-4" />;
    }
  };

  const canEditTimesheet = () => {
    if (!selectedTimesheet) return false;
    // Can only edit draft and rejected timesheets
    return selectedTimesheet.timesheet.status === 'draft' || 
           selectedTimesheet.timesheet.status === 'manager_rejected' || 
           selectedTimesheet.timesheet.status === 'management_rejected';
  };

  const calculateTotalHours = () => {
    return timeEntries.reduce((total, entry) => total + entry.hours, 0);
  };

  const calculateBillableHours = () => {
    return timeEntries.filter(entry => entry.is_billable).reduce((total, entry) => total + entry.hours, 0);
  };

  const getDayEntries = (date: string) => {
    return timeEntries.filter(entry => entry.date === date);
  };

  const getDayHours = (date: string) => {
    return getDayEntries(date).reduce((total, entry) => total + entry.hours, 0);
  };

  const getClientName = (clientId: string) => {
    const client = sampleClients.find(c => c.id === clientId);
    return client ? client.name : 'Unknown Client';
  };

  const addTimeEntry = (date?: string) => {
    const entryDate = date || formatDate(new Date());
    setEditingEntry({
      project_id: '',
      date: entryDate,
      hours: 0,
      description: '',
      is_billable: true
    });
    setSpanToWeek(false);
    setShowEntryModal(true);
  };

  const saveTimeEntry = () => {
    if (!editingEntry) return;

    if (spanToWeek) {
      const weekDays = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        weekDays.push(formatDate(date));
      }

      const newEntries = weekDays.map(date => ({
        ...editingEntry,
        id: `entry-${Date.now()}-${date}`,
        date
      }));

      setTimeEntries(prev => [...prev, ...newEntries]);
    } else {
      const newEntry: TimeEntryForm = {
        ...editingEntry,
        id: editingEntry.id || `entry-${Date.now()}`
      };

      if (editingEntry.id) {
        setTimeEntries(prev => prev.map(entry => 
          entry.id === editingEntry.id ? newEntry : entry
        ));
      } else {
        setTimeEntries(prev => [...prev, newEntry]);
      }
    }

    setShowEntryModal(false);
    setEditingEntry(null);
    setSpanToWeek(false);
  };

  const deleteTimeEntry = (entryId: string) => {
    setTimeEntries(prev => prev.filter(entry => entry.id !== entryId));
  };

  const saveTimesheet = (status: TimesheetStatus = 'draft') => {
    if (!selectedTimesheet) return;

    const totalHours = calculateTotalHours();
    const updatedTimesheet = {
      ...selectedTimesheet.timesheet,
      total_hours: totalHours,
      status,
      updated_at: new Date().toISOString()
    };

    setSelectedTimesheet({
      ...selectedTimesheet,
      timesheet: updatedTimesheet
    });

    const statusMessages = {
      draft: 'saved as draft',
      submitted: 'submitted for approval',
      manager_approved: 'approved by manager',
      manager_rejected: 'rejected by manager',
      management_approved: 'approved by management',
      management_rejected: 'rejected by management',
      verified: 'verified and locked',
      frozen: 'permanently frozen'
    };

    alert(`Timesheet ${statusMessages[status] || 'updated'}`);
  };

  // Approval functions for managers and management
  const approveTimesheet = (timesheetId: string) => {
    const timesheet = teamTimesheets.find(ts => ts.timesheet.id === timesheetId);
    if (!timesheet) return;

    let newStatus: TimesheetStatus;
    if (currentUserRole === 'manager') {
      newStatus = 'manager_approved';
    } else if (currentUserRole === 'management') {
      newStatus = 'management_approved';
    } else {
      return; // Only managers and management can approve
    }

    // Update the timesheet status
    const updatedTimesheets = teamTimesheets.map(ts => 
      ts.timesheet.id === timesheetId 
        ? { ...ts, timesheet: { ...ts.timesheet, status: newStatus, updated_at: new Date().toISOString() } }
        : ts
    );
    setTeamTimesheets(updatedTimesheets);

    alert(`Timesheet approved successfully`);
  };

  const rejectTimesheet = (timesheetId: string, reason: string) => {
    const timesheet = teamTimesheets.find(ts => ts.timesheet.id === timesheetId);
    if (!timesheet || !reason.trim()) return;

    let newStatus: TimesheetStatus;
    if (currentUserRole === 'manager') {
      newStatus = 'manager_rejected';
    } else if (currentUserRole === 'management') {
      newStatus = 'management_rejected';
      // TODO: Notify the respective manager when management rejects
      console.log('TODO: Notify manager of management rejection');
    } else {
      return; // Only managers and management can reject
    }

    // Update the timesheet status
    const updatedTimesheets = teamTimesheets.map(ts => 
      ts.timesheet.id === timesheetId 
        ? { 
            ...ts, 
            timesheet: { 
              ...ts.timesheet, 
              status: newStatus, 
              rejection_reason: reason,
              updated_at: new Date().toISOString() 
            } 
          }
        : ts
    );
    setTeamTimesheets(updatedTimesheets);

    alert(`Timesheet rejected with reason: ${reason}`);
  };

  const verifyTimesheet = (timesheetId: string) => {
    if (currentUserRole !== 'management') return;

    const updatedTimesheets = teamTimesheets.map(ts => 
      ts.timesheet.id === timesheetId 
        ? { 
            ...ts, 
            timesheet: { 
              ...ts.timesheet, 
              status: 'verified' as TimesheetStatus, // verified = frozen
              updated_at: new Date().toISOString() 
            } 
          }
        : ts
    );
    setTeamTimesheets(updatedTimesheets);

    alert('Timesheet verified and locked permanently');
  };

  const duplicateEntry = (entry: TimeEntryForm) => {
    const newEntry = {
      ...entry,
      id: `entry-${Date.now()}`,
      date: formatDate(new Date())
    };
    setTimeEntries(prev => [...prev, newEntry]);
  };

  // Manager-specific team management functions
  const bulkApproveTimesheets = (timesheetIds: string[]) => {
    if (currentUserRole !== 'manager' && currentUserRole !== 'management') return;

    const newStatus = currentUserRole === 'manager' ? 'manager_approved' : 'management_approved';
    
    const updatedTimesheets = teamTimesheets.map(ts => 
      timesheetIds.includes(ts.timesheet.id) && ts.timesheet.status === 'submitted'
        ? { ...ts, timesheet: { ...ts.timesheet, status: newStatus as TimesheetStatus, updated_at: new Date().toISOString() } }
        : ts
    );
    setTeamTimesheets(updatedTimesheets);

    alert(`${timesheetIds.length} timesheets approved successfully`);
  };

  const getTeamStatistics = () => {
    const weekStartStr = formatDate(weekStart);
    const weeklyTimesheets = teamTimesheets.filter(ts => ts.timesheet.week_start_date === weekStartStr);
    
    return {
      totalEmployees: reviewableEmployees.length,
      submittedThisWeek: weeklyTimesheets.filter(ts => ts.timesheet.status === 'submitted').length,
      approvedThisWeek: weeklyTimesheets.filter(ts => 
        ts.timesheet.status === 'manager_approved' || ts.timesheet.status === 'management_approved'
      ).length,
      totalHoursThisWeek: weeklyTimesheets.reduce((sum, ts) => sum + ts.timesheet.total_hours, 0),
      averageHoursPerEmployee: weeklyTimesheets.length > 0 
        ? Math.round(weeklyTimesheets.reduce((sum, ts) => sum + ts.timesheet.total_hours, 0) / weeklyTimesheets.length * 10) / 10 
        : 0,
      productivityTrend: calculateProductivityTrend(),
      pendingApprovals: weeklyTimesheets.filter(ts => ts.timesheet.status === 'submitted').length
    };
  };

  const calculateProductivityTrend = () => {
    // Calculate productivity trend over last 4 weeks
    const trends = [];
    for (let i = 0; i < 4; i++) {
      const weekDate = new Date(currentWeek.getTime() - (i * 7 * 24 * 60 * 60 * 1000));
      const { start: weekStartDate } = getWeekDates(weekDate);
      const weekStr = formatDate(weekStartDate);
      const weekTimesheets = teamTimesheets.filter(ts => ts.timesheet.week_start_date === weekStr);
      const totalHours = weekTimesheets.reduce((sum, ts) => sum + ts.timesheet.total_hours, 0);
      trends.unshift({ week: weekStr, hours: totalHours });
    }
    return trends;
  };

  const sendReminderToEmployee = (employeeId: string) => {
    const employee = sampleUsers.find(u => u.id === employeeId);
    if (!employee) return;

    // In a real app, this would send an email/notification
    alert(`Reminder sent to ${employee.full_name} to submit their timesheet`);
  };

  const exportTeamData = (format: 'csv' | 'pdf' | 'excel') => {
    const weekStartStr = formatDate(weekStart);
    const weeklyTimesheets = teamTimesheets.filter(ts => ts.timesheet.week_start_date === weekStartStr);
    
    // In a real app, this would generate the actual export
    console.log(`Exporting ${weeklyTimesheets.length} timesheets in ${format} format`);
    alert(`Team data exported as ${format.toUpperCase()} file`);
  };

  const managerDelegateApproval = (timesheetId: string, delegateToManagerId: string) => {
    if (currentUserRole !== 'management') return;

    // In a real app, this would delegate approval authority
    console.log(`Delegating approval of timesheet ${timesheetId} to manager ${delegateToManagerId}`);
    alert('Approval delegated successfully');
  };

  const generateTeamReport = (reportType: 'weekly' | 'monthly' | 'productivity' | 'utilization') => {
    const stats = getTeamStatistics();
    
    // In a real app, this would generate comprehensive reports
    console.log(`Generating ${reportType} report with data:`, stats);
    alert(`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} report generated successfully`);
  };

  // Team Review View - Use Lead's interface for all management roles
  const renderTeamReviewView = () => {
    // Lead, Manager, and Management all use the same Team Review interface
    if (currentUserRole === 'lead' || currentUserRole === 'manager' || currentUserRole === 'management') {
      return renderLeadTeamReview();
    }
    
    // Get team data for dashboard view
    const weekStartStr = formatDate(weekStart);
    const allTeamTimesheets = sampleTimesheets.filter(ts => {
      if (ts.week_start_date !== weekStartStr) return false;
      const user = sampleUsers.find(u => u.id === ts.user_id);
      
      if (currentUserRole === 'super_admin') {
        return user && user.id !== currentUser.id;
      } else if (currentUserRole === 'management') {
        return user && user.id !== currentUser.id && ts.status !== 'draft';
      } else if (currentUserRole === 'manager') {
        return user?.role === 'employee' && ts.status !== 'draft';
      }
      return false;
    }).map(ts => {
      const entries = sampleTimeEntries.filter(te => te.timesheet_id === ts.id);
      const user = sampleUsers.find(u => u.id === ts.user_id);
      return { timesheet: ts, entries, user };
    });

    // Apply filters
    const filteredTimesheets = allTeamTimesheets.filter(ts => {
      if (selectedEmployeeId && ts.timesheet.user_id !== selectedEmployeeId) return false;
      if (statusFilter !== 'all' && ts.timesheet.status !== statusFilter) return false;
      return true;
    });

    // Calculate dashboard metrics
    const dashboardMetrics = {
      totalEmployees: reviewableEmployees.length,
      totalTimesheets: filteredTimesheets.length,
      totalHours: filteredTimesheets.reduce((sum, ts) => sum + ts.timesheet.total_hours, 0),
      totalBillableHours: filteredTimesheets.reduce((sum, ts) => 
        sum + ts.entries.filter(e => e.is_billable).reduce((entrySum, e) => entrySum + e.hours, 0), 0
      ),
      avgHoursPerEmployee: filteredTimesheets.length > 0 
        ? Math.round(filteredTimesheets.reduce((sum, ts) => sum + ts.timesheet.total_hours, 0) / filteredTimesheets.length * 10) / 10 
        : 0,
      statusCounts: {
        submitted: filteredTimesheets.filter(ts => ts.timesheet.status === 'submitted').length,
        manager_approved: filteredTimesheets.filter(ts => ts.timesheet.status === 'manager_approved').length,
        management_approved: filteredTimesheets.filter(ts => ts.timesheet.status === 'management_approved').length,
        rejected: filteredTimesheets.filter(ts => 
          ts.timesheet.status === 'manager_rejected' || ts.timesheet.status === 'management_rejected'
        ).length,
        verified: filteredTimesheets.filter(ts => ts.timesheet.status === 'verified').length
      },
      projectDistribution: {} as Record<string, number>
    };

    // Calculate project distribution
    filteredTimesheets.forEach(ts => {
      ts.entries.forEach(entry => {
        const project = sampleProjects.find(p => p.id === entry.project_id);
        if (project) {
          if (!dashboardMetrics.projectDistribution[project.name]) {
            dashboardMetrics.projectDistribution[project.name] = 0;
          }
          dashboardMetrics.projectDistribution[project.name] += entry.hours;
        }
      });
    });

    // Get role-specific header info
    const getRoleHeader = () => {
      if (currentUserRole === 'super_admin') {
        return {
          title: 'System Oversight Dashboard',
          subtitle: 'Complete organizational timesheet management and verification',
          bgGradient: 'bg-gradient-to-r from-red-500 to-pink-600',
          icon: Shield,
          permissions: 'Full System Access'
        };
      } else if (currentUserRole === 'management') {
        return {
          title: 'Executive Management Dashboard',
          subtitle: 'Strategic oversight and final approval authority',
          bgGradient: 'bg-gradient-to-r from-purple-500 to-indigo-600',
          icon: Target,
          permissions: 'Management Authority'
        };
      } else if (currentUserRole === 'manager') {
        return {
          title: 'Team Management Dashboard',
          subtitle: 'Review and approve employee timesheets',
          bgGradient: 'bg-gradient-to-r from-blue-500 to-cyan-600',
          icon: Users,
          permissions: 'Approval Authority'
        };
      }
      return {
        title: 'Team Dashboard',
        subtitle: 'Team oversight and management',
        bgGradient: 'bg-gradient-to-r from-gray-500 to-slate-600',
        icon: Eye,
        permissions: 'View Access'
      };
    };

    const roleHeader = getRoleHeader();
    const HeaderIcon = roleHeader.icon;

    return (
      <div className="space-y-6">
        {/* Executive Dashboard Header */}
        <div className={`${roleHeader.bgGradient} rounded-xl p-8 text-white shadow-xl`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white bg-opacity-20 rounded-xl">
                <HeaderIcon className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">{roleHeader.title}</h1>
                <p className="text-lg opacity-90 mt-1">{roleHeader.subtitle}</p>
                <div className="flex items-center mt-3 space-x-4">
                  <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-sm font-medium">
                    {roleHeader.permissions}
                  </span>
                  <span className="text-sm opacity-75">
                    Week of {weekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold">{dashboardMetrics.totalEmployees}</div>
              <div className="text-lg opacity-90">Team Members</div>
            </div>
          </div>
        </div>

        {/* Key Performance Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Hours</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{dashboardMetrics.totalHours}h</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Billable Hours</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{dashboardMetrics.totalBillableHours}h</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Target className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Avg Hours</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">{dashboardMetrics.avgHoursPerEmployee}h</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Pending</p>
                <p className="text-3xl font-bold text-yellow-600 mt-1">{dashboardMetrics.statusCounts.submitted}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Approved</p>
                <p className="text-3xl font-bold text-emerald-600 mt-1">
                  {dashboardMetrics.statusCounts.manager_approved + dashboardMetrics.statusCounts.management_approved}
                </p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Verified</p>
                <p className="text-3xl font-bold text-indigo-600 mt-1">{dashboardMetrics.statusCounts.verified}</p>
              </div>
              <div className="p-3 bg-indigo-100 rounded-lg">
                <Shield className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Control Panel */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-semibold text-slate-900">Team Control Panel</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentWeek(new Date(currentWeek.getTime() - 7 * 24 * 60 * 60 * 1000))}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="px-3 py-1 bg-slate-100 rounded-lg text-sm font-medium">
                  {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                <button
                  onClick={() => setCurrentWeek(new Date(currentWeek.getTime() + 7 * 24 * 60 * 60 * 1000))}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setCurrentWeek(new Date())}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                >
                  Current Week
                </button>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Users className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="pl-10 pr-8 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="">All Team Members</option>
                  {reviewableEmployees.map(employee => (
                    <option key={employee.id} value={employee.id}>{employee.full_name}</option>
                  ))}
                </select>
              </div>
              
              <div className="relative">
                <Filter className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as TimesheetStatus | 'all')}
                  className="pl-10 pr-8 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="all">All Status</option>
                  <option value="submitted">Submitted</option>
                  <option value="manager_approved">Manager Approved</option>
                  <option value="manager_rejected">Manager Rejected</option>
                  <option value="management_approved">Management Approved</option>
                  <option value="management_rejected">Management Rejected</option>
                  <option value="verified">Verified (Frozen)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Manager Action Panel - Only visible for Manager/Management roles */}
        {(currentUserRole === 'manager' || currentUserRole === 'management') && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Manager Actions</h3>
                <p className="text-sm text-slate-600">Quick actions for team management and productivity insights</p>
              </div>
              
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => bulkApproveTimesheets(
                    filteredTimesheets
                      .filter(ts => ts.timesheet.status === 'submitted')
                      .map(ts => ts.timesheet.id)
                  )}
                  disabled={filteredTimesheets.filter(ts => ts.timesheet.status === 'submitted').length === 0}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Bulk Approve ({filteredTimesheets.filter(ts => ts.timesheet.status === 'submitted').length})
                </button>
                
                <button
                  onClick={() => exportTeamData('excel')}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Export Data
                </button>
                
                <button
                  onClick={() => generateTeamReport('weekly')}
                  className="inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Generate Report
                </button>
                
                {filteredTimesheets.some(ts => ts.timesheet.status === 'submitted') && (
                  <button
                    onClick={() => {
                      const employeesToRemind = filteredTimesheets
                        .filter(ts => ts.timesheet.status === 'draft')
                        .map(ts => ts.user?.id)
                        .filter(Boolean);
                      employeesToRemind.forEach(id => id && sendReminderToEmployee(id));
                    }}
                    className="inline-flex items-center px-4 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    <Bell className="w-4 h-4 mr-2" />
                    Send Reminders
                  </button>
                )}
              </div>
            </div>
            
            {/* Quick Stats for Managers */}
            <div className="mt-4 pt-4 border-t border-blue-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{getTeamStatistics().pendingApprovals}</div>
                  <div className="text-xs text-slate-600">Pending Approvals</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{getTeamStatistics().approvedThisWeek}</div>
                  <div className="text-xs text-slate-600">Approved This Week</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{getTeamStatistics().averageHoursPerEmployee}h</div>
                  <div className="text-xs text-slate-600">Avg Hours/Employee</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{getTeamStatistics().totalHoursThisWeek}h</div>
                  <div className="text-xs text-slate-600">Total Team Hours</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Manager Insights Panel - Additional insights for Manager role only */}
        {currentUserRole === 'manager' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Manager Insights</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <h4 className="font-medium text-slate-700">Approval Status</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">Submitted</span>
                    <span className="font-medium text-yellow-600">
                      {filteredTimesheets.filter(ts => ts.timesheet.status === 'submitted').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">Approved by Me</span>
                    <span className="font-medium text-green-600">
                      {filteredTimesheets.filter(ts => ts.timesheet.status === 'manager_approved').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">Rejected</span>
                    <span className="font-medium text-red-600">
                      {filteredTimesheets.filter(ts => ts.timesheet.status === 'manager_rejected').length}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium text-slate-700">Team Performance</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">On-time Submissions</span>
                    <span className="font-medium text-green-600">
                      {Math.round((filteredTimesheets.filter(ts => ts.timesheet.status !== 'draft').length / Math.max(filteredTimesheets.length, 1)) * 100)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">Avg Billable Rate</span>
                    <span className="font-medium text-blue-600">
                      {Math.round(filteredTimesheets.reduce((sum, ts) => {
                        const billable = ts.entries.filter(e => e.is_billable).reduce((s, e) => s + e.hours, 0);
                        return sum + (ts.timesheet.total_hours > 0 ? (billable / ts.timesheet.total_hours) * 100 : 0);
                      }, 0) / Math.max(filteredTimesheets.length, 1))}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">Team Utilization</span>
                    <span className="font-medium text-purple-600">
                      {Math.round((filteredTimesheets.reduce((sum, ts) => sum + ts.timesheet.total_hours, 0) / (filteredTimesheets.length * 40)) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium text-slate-700">Quick Actions</h4>
                <div className="space-y-2">
                  <button
                    onClick={() => generateTeamReport('productivity')}
                    className="w-full text-left px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    📊 Generate Productivity Report
                  </button>
                  <button
                    onClick={() => exportTeamData('pdf')}
                    className="w-full text-left px-3 py-2 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    📄 Export Team Summary
                  </button>
                  <button
                    onClick={() => {
                      const overdueEmployees = filteredTimesheets.filter(ts => ts.timesheet.status === 'draft');
                      alert(`Found ${overdueEmployees.length} overdue submissions`);
                    }}
                    className="w-full text-left px-3 py-2 text-sm bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors"
                  >
                    ⚠️ Check Overdue Submissions
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Team Members Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredTimesheets.map((ts) => {
            const billableHours = ts.entries.filter(e => e.is_billable).reduce((sum, e) => sum + e.hours, 0);
            const billableRate = ts.timesheet.total_hours > 0 ? Math.round((billableHours / ts.timesheet.total_hours) * 100) : 0;
            const projectCount = new Set(ts.entries.map(e => e.project_id)).size;
            
            return (
              <div key={ts.timesheet.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                {/* Employee Header */}
                <div className="p-6 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                        {ts.user?.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">{ts.user?.full_name}</h4>
                        <p className="text-sm text-slate-600">{ts.user?.email}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-3 py-1 text-xs font-bold rounded-full ${getStatusColor(ts.timesheet.status)}`}>
                      {getStatusIcon(ts.timesheet.status)}
                      <span className="ml-1">{ts.timesheet.status.replace('_', ' ').toUpperCase()}</span>
                    </span>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{ts.timesheet.total_hours}h</div>
                      <div className="text-xs text-blue-700">Total Hours</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{billableHours}h</div>
                      <div className="text-xs text-green-700">Billable</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">{billableRate}%</div>
                      <div className="text-xs text-purple-700">Rate</div>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">{projectCount}</div>
                      <div className="text-xs text-orange-700">Projects</div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  {(currentUserRole === 'manager' || currentUserRole === 'management' || currentUserRole === 'super_admin') && (
                    <div className="space-y-3">
                      {ts.timesheet.status === 'submitted' && (
                        <div className="space-y-2">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => approveTimesheet(ts.timesheet.id)}
                              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
                            >
                              <Check className="w-4 h-4 inline mr-2" />
                              Approve
                            </button>
                            <button
                              onClick={() => rejectTimesheet(ts.timesheet.id, 'Requires corrections')}
                              className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
                            >
                              <X className="w-4 h-4 inline mr-2" />
                              Reject
                            </button>
                          </div>
                          {currentUserRole === 'manager' && (
                            <button
                              onClick={() => sendReminderToEmployee(ts.timesheet.user_id)}
                              className="w-full bg-orange-500 text-white py-1 px-3 rounded-md hover:bg-orange-600 transition-colors font-medium text-xs"
                            >
                              <Bell className="w-3 h-3 inline mr-1" />
                              Send Reminder to Employee
                            </button>
                          )}
                        </div>
                      )}
                      
                      {(currentUserRole === 'management' || currentUserRole === 'super_admin') && ts.timesheet.status === 'manager_approved' && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => approveTimesheet(ts.timesheet.id)}
                            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                          >
                            <CheckCircle className="w-4 h-4 inline mr-2" />
                            Final Approve
                          </button>
                          <button
                            onClick={() => rejectTimesheet(ts.timesheet.id, 'Management review required')}
                            className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
                          >
                            <XCircle className="w-4 h-4 inline mr-2" />
                            Reject
                          </button>
                        </div>
                      )}
                      
                      {(currentUserRole === 'management' || currentUserRole === 'super_admin') && ts.timesheet.status === 'management_approved' && (
                        <button
                          onClick={() => verifyTimesheet(ts.timesheet.id)}
                          className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm"
                        >
                          <Shield className="w-4 h-4 inline mr-2" />
                          Verify & Lock
                        </button>
                      )}

                      {ts.timesheet.status === 'verified' && (
                        <div className="flex items-center justify-center p-2 bg-indigo-50 rounded-lg">
                          <Lock className="w-4 h-4 text-indigo-600 mr-2" />
                          <span className="text-indigo-700 font-medium text-sm">Verified & Locked</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Project Summary */}
                  <div className="mt-6 pt-4 border-t border-slate-100">
                    <h5 className="font-medium text-slate-900 mb-3">Project Activities</h5>
                    <div className="space-y-2">
                      {Object.entries(
                        ts.entries.reduce((acc, entry) => {
                          const project = sampleProjects.find(p => p.id === entry.project_id);
                          const projectName = project?.name || 'Unknown Project';
                          if (!acc[projectName]) acc[projectName] = 0;
                          acc[projectName] += entry.hours;
                          return acc;
                        }, {} as Record<string, number>)
                      ).map(([projectName, hours]) => (
                        <div key={projectName} className="flex justify-between items-center text-sm">
                          <span className="text-slate-600 truncate">{projectName}</span>
                          <span className="font-medium text-slate-900">{hours}h</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredTimesheets.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">No Team Data Available</h3>
            <p className="text-slate-600 mb-6">
              No employee timesheets found for the selected week and filters.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-500">
              <div className="flex items-center justify-center space-x-2">
                <CheckCircle className="w-4 h-4" />
                <span>Check if team members have submitted timesheets</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <Filter className="w-4 h-4" />
                <span>Try adjusting your filters</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>Select a different week</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Lead-style Team Review - Shared interface for Lead, Manager, and Management
  const renderLeadTeamReview = () => {
    // Get reviewable employees based on role
    const getReviewableEmployees = () => {
      if (currentUserRole === 'lead') {
        return sampleUsers.filter(u => u.role === 'employee');
      } else if (currentUserRole === 'manager') {
        return sampleUsers.filter(u => u.role === 'employee' || u.role === 'lead');
      } else if (currentUserRole === 'management') {
        return sampleUsers.filter(u => u.role === 'employee' || u.role === 'lead' || u.role === 'manager');
      }
      return [];
    };

    const reviewableEmployees = getReviewableEmployees();
    
    // Get timesheets for the current week
    const weekStartStr = formatDate(weekStart);
    const filteredTimesheets = sampleTimesheets.filter(ts => {
      if (ts.week_start_date !== weekStartStr) return false;
      const user = sampleUsers.find(u => u.id === ts.user_id);
      
      if (currentUserRole === 'lead') {
        return user?.role === 'employee'; // Lead can only see employee timesheets
      } else if (currentUserRole === 'manager') {
        return user?.role === 'employee' || user?.role === 'lead'; // Manager can see employee and lead timesheets
      } else if (currentUserRole === 'management') {
        return user && user.id !== currentUser.id; // Management can see all except their own
      }
      return false;
    }).map(ts => {
      const entries = sampleTimeEntries.filter(te => te.timesheet_id === ts.id);
      const user = sampleUsers.find(u => u.id === ts.user_id);
      return { timesheet: ts, entries, user };
    });

    // Apply filters
    const finalFilteredTimesheets = filteredTimesheets.filter(ts => {
      if (selectedEmployeeId && ts.timesheet.user_id !== selectedEmployeeId) return false;
      if (statusFilter !== 'all' && ts.timesheet.status !== statusFilter) return false;
      return true;
    });

    // Calculate team statistics
    const teamStats = {
      totalEmployees: reviewableEmployees.length,
      activeTimesheets: finalFilteredTimesheets.filter(ts => ts.timesheet.status !== 'draft').length,
      totalHours: finalFilteredTimesheets.reduce((sum, ts) => sum + ts.timesheet.total_hours, 0),
      avgHoursPerEmployee: finalFilteredTimesheets.length > 0 
        ? Math.round(finalFilteredTimesheets.reduce((sum, ts) => sum + ts.timesheet.total_hours, 0) / finalFilteredTimesheets.length * 10) / 10 
        : 0,
      submittedCount: finalFilteredTimesheets.filter(ts => ts.timesheet.status === 'submitted').length,
      approvedCount: finalFilteredTimesheets.filter(ts => 
        ts.timesheet.status === 'manager_approved' || 
        ts.timesheet.status === 'management_approved' || 
        ts.timesheet.status === 'verified'
      ).length
    };

    // Get role-specific header information
    const getRoleHeader = () => {
      if (currentUserRole === 'lead') {
        return {
          title: 'Team Lead Dashboard',
          subtitle: 'Monitor employee productivity and project progress',
          bgColor: 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200',
          iconBg: 'bg-green-100',
          iconColor: 'text-green-600',
          titleColor: 'text-green-800',
          subtitleColor: 'text-green-700'
        };
      } else if (currentUserRole === 'manager') {
        return {
          title: 'Manager Dashboard',
          subtitle: 'Review and approve team timesheets with full authority',
          bgColor: 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200',
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
          titleColor: 'text-blue-800',
          subtitleColor: 'text-blue-700'
        };
      } else if (currentUserRole === 'management') {
        return {
          title: 'Management Dashboard',
          subtitle: 'Executive oversight with final approval and verification authority',
          bgColor: 'bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200',
          iconBg: 'bg-purple-100',
          iconColor: 'text-purple-600',
          titleColor: 'text-purple-800',
          subtitleColor: 'text-purple-700'
        };
      }
      return {
        title: 'Team Dashboard',
        subtitle: 'Team oversight',
        bgColor: 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200',
        iconBg: 'bg-gray-100',
        iconColor: 'text-gray-600',
        titleColor: 'text-gray-800',
        subtitleColor: 'text-gray-700'
      };
    };

    const roleHeader = getRoleHeader();

    return (
      <div className="space-y-6">
        {/* Role-specific Header */}
        <div className={`${roleHeader.bgColor} border rounded-lg p-6`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 ${roleHeader.iconBg} rounded-lg`}>
                <Eye className={`w-6 h-6 ${roleHeader.iconColor}`} />
              </div>
              <div>
                <h2 className={`text-xl font-bold ${roleHeader.titleColor}`}>{roleHeader.title}</h2>
                <p className={`${roleHeader.subtitleColor} mt-1`}>{roleHeader.subtitle}</p>
              </div>
            </div>
            <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
              currentUserRole === 'lead' ? 'bg-green-100' : 
              currentUserRole === 'manager' ? 'bg-blue-100' : 'bg-purple-100'
            }`}>
              <Users className={`w-5 h-5 ${
                currentUserRole === 'lead' ? 'text-green-600' : 
                currentUserRole === 'manager' ? 'text-blue-600' : 'text-purple-600'
              }`} />
              <span className={`font-medium ${
                currentUserRole === 'lead' ? 'text-green-800' : 
                currentUserRole === 'manager' ? 'text-blue-800' : 'text-purple-800'
              }`}>
                {currentUserRole === 'lead' ? 'Read-Only Access' : 
                 currentUserRole === 'manager' ? 'Approval Authority' : 'Full Management Access'}
              </span>
            </div>
          </div>
        </div>

        {/* Team Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white border border-slate-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{teamStats.totalEmployees}</div>
            <div className="text-sm text-slate-600 mt-1">Team Members</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{teamStats.activeTimesheets}</div>
            <div className="text-sm text-slate-600 mt-1">Active Timesheets</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{teamStats.totalHours}h</div>
            <div className="text-sm text-slate-600 mt-1">Total Hours</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{teamStats.avgHoursPerEmployee}h</div>
            <div className="text-sm text-slate-600 mt-1">Avg per Employee</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{teamStats.submittedCount}</div>
            <div className="text-sm text-slate-600 mt-1">Pending Review</div>
          </div>
        </div>

        {/* Week Navigation */}
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setCurrentWeek(new Date(currentWeek.getTime() - 7 * 24 * 60 * 60 * 1000))}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-slate-900">
                  {weekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - {weekEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </h3>
                <p className="text-sm text-slate-600">Team Review Week</p>
              </div>
              <button
                onClick={() => setCurrentWeek(new Date(currentWeek.getTime() + 7 * 24 * 60 * 60 * 1000))}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            
            <button
              onClick={() => setCurrentWeek(new Date())}
              className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
            >
              Current Week
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative">
              <Users className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="pl-10 pr-8 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">All Team Members</option>
                {reviewableEmployees.map(employee => (
                  <option key={employee.id} value={employee.id}>{employee.full_name}</option>
                ))}
              </select>
            </div>
            <div className="relative">
              <Filter className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as TimesheetStatus | 'all')}
                className="pl-10 pr-8 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="manager_approved">Manager Approved</option>
                <option value="manager_rejected">Manager Rejected</option>
                <option value="management_approved">Management Approved</option>
                <option value="verified">Verified (Frozen)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Team Members List */}
        <div className="bg-white rounded-lg border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">
              Team Overview ({finalFilteredTimesheets.length} timesheets)
            </h3>
            <p className="text-sm text-slate-600 mt-1">Monitor team productivity and task completion</p>
          </div>

          <div className="divide-y divide-slate-200">
            {finalFilteredTimesheets.map((ts) => {
              const billableHours = ts.entries.filter(e => e.is_billable).reduce((sum, e) => sum + e.hours, 0);
              const projectCount = new Set(ts.entries.map(e => e.project_id)).size;
              const taskCount = ts.entries.filter(e => e.task_id).length;
              
              return (
                <div key={ts.timesheet.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center">
                        <UserIcon className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 text-lg">{ts.user?.full_name}</h4>
                        <p className="text-sm text-slate-600">{ts.user?.email}</p>
                        <div className="flex items-center space-x-3 mt-2">
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(ts.timesheet.status)}`}>
                            {getStatusIcon(ts.timesheet.status)}
                            <span className="ml-1">{ts.timesheet.status.replace('_', ' ').toUpperCase()}</span>
                          </span>
                          <span className="text-sm text-slate-600">
                            <strong>{ts.timesheet.total_hours}h</strong> total
                          </span>
                          <span className="text-sm text-green-600">
                            <strong>{billableHours}h</strong> billable
                          </span>
                          <span className="text-sm text-blue-600">
                            <strong>{projectCount}</strong> projects
                          </span>
                          <span className="text-sm text-purple-600">
                            <strong>{taskCount}</strong> tasks
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        <Eye className="w-3 h-3 mr-1" />
                        REVIEW MODE
                      </span>
                      {ts.timesheet.status === 'verified' && (
                        <span className="inline-flex items-center text-blue-600 text-sm">
                          <Lock className="w-4 h-4 mr-1" />
                          Locked
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Productivity Insights */}
                  <div className="ml-16 mb-4">
                    <div className="grid grid-cols-3 gap-4 p-3 bg-green-50 rounded-lg">
                      <div className="text-center">
                        <div className="font-bold text-green-700">{Math.round((billableHours / Math.max(ts.timesheet.total_hours, 1)) * 100)}%</div>
                        <div className="text-xs text-green-600">Billable Rate</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-blue-700">{Math.round(ts.timesheet.total_hours / 5 * 10) / 10}h</div>
                        <div className="text-xs text-blue-600">Daily Average</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-purple-700">{ts.entries.length}</div>
                        <div className="text-xs text-purple-600">Total Entries</div>
                      </div>
                    </div>
                  </div>

                  {/* Time Entries */}
                  <div className="ml-16">
                    <h5 className="font-medium text-slate-900 mb-3">Work Breakdown ({ts.entries.length} entries)</h5>
                    <div className="space-y-2">
                      {ts.entries.map((entry) => {
                        const project = sampleProjects.find(p => p.id === entry.project_id);
                        const client = sampleClients.find(c => c.id === project?.client_id);
                        const task = entry.task_id ? sampleTasks.find(t => t.id === entry.task_id) : null;
                        
                        return (
                          <div key={entry.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border-l-4 border-green-400">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-1">
                                <span className="font-medium text-slate-900">
                                  {new Date(entry.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                </span>
                                <ArrowRight className="w-4 h-4 text-slate-400" />
                                <span className="text-blue-600 font-medium">
                                  {project?.name || 'Unknown Project'}
                                </span>
                                {client && (
                                  <>
                                    <span className="text-slate-400">•</span>
                                    <span className="text-slate-600 text-sm">{client.name}</span>
                                  </>
                                )}
                              </div>
                              {(task?.name || entry.custom_task_description) && (
                                <div className="text-sm text-slate-600 ml-0">
                                  <strong>Task:</strong> {task?.name || entry.custom_task_description}
                                </div>
                              )}
                              {entry.description && (
                                <div className="text-sm text-slate-500 ml-0 mt-1">
                                  {entry.description}
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center space-x-3 ml-4">
                              <div className="text-right">
                                <div className="font-bold text-lg text-slate-900">{entry.hours}h</div>
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  entry.is_billable ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {entry.is_billable ? 'Billable' : 'Non-billable'}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {ts.entries.length === 0 && (
                      <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg">
                        <Clock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                        <p className="font-medium">No work logged this week</p>
                        <p className="text-sm">Employee hasn't submitted any time entries</p>
                      </div>
                    )}
                    
                    {/* Manager and Management Action Buttons */}
                    {(currentUserRole === 'manager' || currentUserRole === 'management') && ts.timesheet.status === 'submitted' && (
                      <div className="mt-6 pt-4 border-t border-slate-200 flex gap-3 justify-end">
                        <button
                          onClick={() => approveTimesheet(ts.timesheet.id)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 font-medium"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => rejectTimesheet(ts.timesheet.id, 'Rejected by manager')}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 font-medium"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {finalFilteredTimesheets.length === 0 && (
              <div className="p-12 text-center text-slate-500">
                <Users className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No Team Data</h3>
                <p className="text-slate-600">
                  No employee timesheets found for the selected week and filters.
                </p>
                <div className="mt-4 text-sm text-slate-500">
                  <p>• Check if team members have submitted their timesheets</p>
                  <p>• Try adjusting the week or status filters</p>
                  <p>• Ensure employees are assigned to projects</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Lead Insights Panel */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-800 mb-4">Team Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-green-700">Productivity Trends</h4>
              <div className="text-sm text-green-600">
                <p>• Average {teamStats.avgHoursPerEmployee}h per team member this week</p>
                <p>• {teamStats.submittedCount} timesheets awaiting manager review</p>
                <p>• {teamStats.approvedCount} timesheets already approved</p>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-green-700">Action Items</h4>
              <div className="text-sm text-green-600">
                <p>• Follow up with team members missing timesheet entries</p>
                <p>• Review project allocation and task assignments</p>
                <p>• Monitor billable hour percentages for optimization</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Enhanced Calendar View
  const renderCalendarView = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekDays = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      weekDays.push(date);
    }

    const isReadOnly = !canEditTimesheet();

    return (
      <div className="space-y-6">
        {/* Week Navigation & Stats */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setCurrentWeek(new Date(currentWeek.getTime() - 7 * 24 * 60 * 60 * 1000))}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-slate-900">
                  {weekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - {weekEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </h3>
                <p className="text-sm text-slate-600">Week {Math.ceil((weekStart.getTime() - new Date(weekStart.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))}</p>
              </div>
              <button
                onClick={() => setCurrentWeek(new Date(currentWeek.getTime() + 7 * 24 * 60 * 60 * 1000))}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setCurrentWeek(new Date())}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                Today
              </button>
              {selectedTimesheet && (
                <div className={`flex items-center px-3 py-1 text-sm font-medium rounded-lg border ${getStatusColor(selectedTimesheet.timesheet.status)}`}>
                  {getStatusIcon(selectedTimesheet.timesheet.status)}
                  <span className="ml-2">{selectedTimesheet.timesheet.status.toUpperCase()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Week Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{calculateTotalHours()}h</div>
              <div className="text-sm text-blue-700">Total Hours</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{calculateBillableHours()}h</div>
              <div className="text-sm text-green-700">Billable Hours</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{timeEntries.length}</div>
              <div className="text-sm text-purple-700">Entries</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{Math.round((calculateBillableHours() / Math.max(calculateTotalHours(), 1)) * 100)}%</div>
              <div className="text-sm text-orange-700">Billable Rate</div>
            </div>
          </div>

          {isReadOnly && (
            <div className="mt-4 flex items-center text-amber-600 text-sm bg-amber-50 p-3 rounded-lg">
              <Lock className="w-4 h-4 mr-2" />
              This timesheet is read-only (Status: {selectedTimesheet?.timesheet.status})
            </div>
          )}
        </div>

        {/* Timer Section */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Timer className="w-5 h-5 text-slate-600" />
                <h3 className="text-lg font-semibold text-slate-900">Quick Timer</h3>
              </div>
              {timer.isRunning && (
                <div className="flex items-center space-x-2 text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">Recording time</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-2xl font-mono font-bold text-slate-900">
                {formatTime(timer.elapsedSeconds)}
              </div>
              <div className="flex space-x-2">
                {timer.isRunning ? (
                  <button
                    onClick={stopTimer}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center transition-colors"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    Stop
                  </button>
                ) : (
                  <button
                    onClick={() => startTimer()}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center transition-colors"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Start
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-7 gap-px bg-slate-200">
            {days.map((day, index) => {
              const date = weekDays[index];
              const dateStr = formatDate(date);
              const dayEntries = getDayEntries(dateStr);
              const dayHours = getDayHours(dateStr);
              const isToday = formatDate(new Date()) === dateStr;
              const isWeekend = index === 0 || index === 6;

              return (
                <div key={day} className={`bg-white min-h-[300px] p-4 ${isWeekend ? 'bg-slate-50' : ''}`}>
                  <div className="flex justify-between items-center mb-3">
                    <div className={`text-sm font-medium ${isToday ? 'text-blue-600' : 'text-slate-900'}`}>
                      <div className="font-semibold">{day}</div>
                      <div className={`text-lg ${isToday ? 'bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center' : ''}`}>
                        {date.getDate()}
                      </div>
                    </div>
                    {!isReadOnly && (
                      <button
                        onClick={() => addTimeEntry(dateStr)}
                        className="p-1 hover:bg-blue-50 rounded text-slate-400 hover:text-blue-600 transition-colors"
                        title="Add time entry"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  {dayHours > 0 && (
                    <div className="text-xs text-slate-600 mb-3 font-medium bg-slate-100 px-2 py-1 rounded flex items-center justify-between">
                      <span>{dayHours}h total</span>
                      <span className="text-green-600">{dayEntries.filter(e => e.is_billable).reduce((sum, e) => sum + e.hours, 0)}h billable</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    {dayEntries.map((entry) => {
                      const project = userProjects.find(p => p.id === entry.project_id);
                      const task = entry.task_id ? sampleTasks.find(t => t.id === entry.task_id) : null;
                      return (
                        <div
                          key={entry.id}
                          className={`text-xs p-2 rounded border-l-3 cursor-pointer hover:shadow-sm transition-all ${
                            entry.is_billable 
                              ? 'bg-blue-50 border-blue-400 hover:bg-blue-100' 
                              : 'bg-gray-50 border-gray-400 hover:bg-gray-100'
                          }`}
                          onClick={() => {
                            if (!isReadOnly) {
                              setEditingEntry(entry);
                              setShowEntryModal(true);
                            }
                          }}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="font-medium text-slate-900 truncate flex-1">
                              {project?.name || 'Unknown Project'}
                            </div>
                            <div className="text-slate-600 font-bold ml-2">{entry.hours}h</div>
                          </div>
                          {(task?.name || entry.custom_task_description) && (
                            <div className="text-slate-600 truncate text-xs mb-1">
                              {task?.name || entry.custom_task_description}
                            </div>
                          )}
                          {entry.description && (
                            <div className="text-slate-500 truncate text-xs">
                              {entry.description}
                            </div>
                          )}
                          <div className="flex items-center justify-between mt-1">
                            <span className={`inline-flex px-1 py-0.5 text-xs rounded ${
                              entry.is_billable ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                            }`}>
                              {entry.is_billable ? 'Billable' : 'Non-billable'}
                            </span>
                            {!isReadOnly && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  duplicateEntry(entry);
                                }}
                                className="text-slate-400 hover:text-blue-600 transition-colors"
                                title="Duplicate entry"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Enhanced List View
  const renderListView = () => {
    const groupedEntries = timeEntries.reduce((acc, entry) => {
      const date = entry.date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(entry);
      return acc;
    }, {} as Record<string, TimeEntryForm[]>);

    const sortedDates = Object.keys(groupedEntries).sort();
    const isReadOnly = !canEditTimesheet();

    return (
      <div className="space-y-6">
        {/* List Header */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-900">Time Entries</h3>
            <div className="flex items-center space-x-3">
              {!isReadOnly && (
                <>
                  <button
                    onClick={() => setQuickEntryMode(!quickEntryMode)}
                    className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                      quickEntryMode 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Zap className="w-4 h-4 mr-1 inline" />
                    Quick Entry
                  </button>
                  <button
                    onClick={() => addTimeEntry()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Entry
                  </button>
                </>
              )}
            </div>
          </div>
          
          {isReadOnly && (
            <div className="mt-4 flex items-center text-amber-600 text-sm bg-amber-50 p-3 rounded-lg">
              <Lock className="w-4 h-4 mr-2" />
              This timesheet is read-only (Status: {selectedTimesheet?.timesheet.status})
            </div>
          )}
        </div>

        {/* Entries List */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="divide-y divide-slate-200">
            {sortedDates.map((date) => {
              const entries = groupedEntries[date];
              const dayTotal = entries.reduce((sum, entry) => sum + entry.hours, 0);
              const dayBillable = entries.filter(e => e.is_billable).reduce((sum, entry) => sum + entry.hours, 0);
              
              return (
                <div key={date} className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-semibold text-slate-900 text-lg">
                      {new Date(date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </h4>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                        {dayTotal}h total
                      </span>
                      <span className="text-sm text-green-600 bg-green-100 px-3 py-1 rounded-full">
                        {dayBillable}h billable
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {entries.map((entry) => {
                      const project = userProjects.find(p => p.id === entry.project_id);
                      const task = entry.task_id ? sampleTasks.find(t => t.id === entry.task_id) : null;
                      
                      return (
                        <div key={entry.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                          <div className="flex-1">
                            <div className="flex items-center space-x-4 mb-2">
                              <div className="font-medium text-slate-900">
                                {project?.name || 'Unknown Project'}
                              </div>
                              <ArrowRight className="w-4 h-4 text-slate-400" />
                              <div className="text-slate-600">
                                {task?.name || entry.custom_task_description || 'Custom Task'}
                              </div>
                              <div className="font-bold text-blue-600 text-lg">
                                {entry.hours}h
                              </div>
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                entry.is_billable ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {entry.is_billable ? 'Billable' : 'Non-billable'}
                              </span>
                            </div>
                            {entry.description && (
                              <div className="text-sm text-slate-500 ml-0">
                                {entry.description}
                              </div>
                            )}
                          </div>
                          
                          {!isReadOnly && (
                            <div className="flex space-x-2 ml-4">
                              <button
                                onClick={() => duplicateEntry(entry)}
                                className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Duplicate entry"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingEntry(entry);
                                  setShowEntryModal(true);
                                }}
                                className="text-slate-600 hover:text-slate-900 p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Edit entry"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteTimeEntry(entry.id!)}
                                className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete entry"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            
            {sortedDates.length === 0 && (
              <div className="p-12 text-center text-slate-500">
                <Clock className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No time entries yet</h3>
                <p className="text-slate-600 mb-4">Start tracking your time to see entries here.</p>
                {!isReadOnly && (
                  <button
                    onClick={() => addTimeEntry()}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center mx-auto transition-colors"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Add your first entry
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Analytics View
  const renderAnalyticsView = () => {
    const weeklyData = Array.from({ length: 4 }, (_, i) => {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (i * 7));
      return {
        week: `Week ${4 - i}`,
        hours: Math.floor(Math.random() * 20) + 30,
        billable: Math.floor(Math.random() * 15) + 25
      };
    });

    const projectHours = userProjects.map(project => {
      const projectEntries = timeEntries.filter(e => e.project_id === project.id);
      const totalHours = projectEntries.reduce((sum, e) => sum + e.hours, 0);
      const billableHours = projectEntries.filter(e => e.is_billable).reduce((sum, e) => sum + e.hours, 0);
      
      return {
        name: project.name,
        total: totalHours,
        billable: billableHours,
        client: getClientName(project.client_id)
      };
    }).filter(p => p.total > 0);

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-900">Time Analytics</h2>
          <div className="flex items-center space-x-3">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as 'week' | 'month' | 'quarter')}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
            </select>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center transition-colors">
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Hours</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{calculateTotalHours()}h</p>
                <p className="text-sm mt-1 text-green-600">+12% from last week</p>
              </div>
              <div className="p-3 rounded-full bg-blue-500">
                <Clock className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Billable Hours</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{calculateBillableHours()}h</p>
                <p className="text-sm mt-1 text-green-600">
                  {Math.round((calculateBillableHours() / Math.max(calculateTotalHours(), 1)) * 100)}% rate
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-500">
                <Target className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Active Projects</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">{userProjects.length}</p>
                <p className="text-sm mt-1 text-slate-600">Across {new Set(userProjects.map(p => p.client_id)).size} clients</p>
              </div>
              <div className="p-3 rounded-full bg-purple-500">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Avg Daily Hours</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">
                  {(calculateTotalHours() / 7).toFixed(1)}h
                </p>
                <p className="text-sm mt-1 text-orange-600">This week</p>
              </div>
              <div className="p-3 rounded-full bg-orange-500">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Weekly Trend</h3>
            <div className="space-y-4">
              {weeklyData.map((week, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 w-16">{week.week}</span>
                  <div className="flex-1 mx-4">
                    <div className="flex space-x-1">
                      <div className="flex-1 bg-slate-200 rounded-full h-3 overflow-hidden">
                        <div 
                          className="bg-blue-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${(week.hours / 50) * 100}%` }}
                        />
                      </div>
                      <div className="flex-1 bg-slate-200 rounded-full h-3 overflow-hidden">
                        <div 
                          className="bg-green-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${(week.billable / 50) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="text-slate-900 font-medium">{week.hours}h</div>
                    <div className="text-green-600">{week.billable}h billable</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Project Breakdown</h3>
            <div className="space-y-4">
              {projectHours.map((project, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium text-slate-900">{project.name}</div>
                      <div className="text-sm text-slate-600">{project.client}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900">{project.total}h</div>
                      <div className="text-sm text-green-600">{project.billable}h billable</div>
                    </div>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${(project.total / Math.max(...projectHours.map(p => p.total))) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              {projectHours.length === 0 && (
                <div className="text-center text-slate-500 py-8">
                  <Activity className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>No project data available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Entry Modal
  const renderEntryModal = () => {
    if (!showEntryModal || !editingEntry) return null;

    const selectedProject = userProjects.find(p => p.id === editingEntry.project_id);
    const projectTasks = selectedProject ? getProjectTasks(selectedProject.id) : [];

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            {editingEntry.id ? 'Edit Time Entry' : 'Add Time Entry'}
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
              <input
                type="date"
                value={editingEntry.date}
                onChange={(e) => setEditingEntry({...editingEntry, date: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {!editingEntry.id && (
              <div className="flex items-center p-3 bg-blue-50 rounded-lg">
                <input
                  type="checkbox"
                  id="spanWeek"
                  checked={spanToWeek}
                  onChange={(e) => setSpanToWeek(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                />
                <label htmlFor="spanWeek" className="ml-2 block text-sm text-blue-800">
                  <Copy className="w-4 h-4 inline mr-1" />
                  Apply this entry to the entire week
                </label>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Project *</label>
              <select
                value={editingEntry.project_id}
                onChange={(e) => setEditingEntry({...editingEntry, project_id: e.target.value, task_id: undefined})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select Project</option>
                {userProjects.map(project => {
                  const client = getClientName(project.client_id);
                  return (
                    <option key={project.id} value={project.id}>
                      {project.name} ({client})
                    </option>
                  );
                })}
              </select>
            </div>

            {editingEntry.project_id && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Task</label>
                <select
                  value={editingEntry.task_id || ''}
                  onChange={(e) => setEditingEntry({
                    ...editingEntry, 
                    task_id: e.target.value || undefined,
                    custom_task_description: e.target.value ? undefined : editingEntry.custom_task_description
                  })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select existing task or enter custom below</option>
                  {projectTasks.map(task => (
                    <option key={task.id} value={task.id}>{task.name}</option>
                  ))}
                </select>
              </div>
            )}

            {editingEntry.project_id && !editingEntry.task_id && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Custom Task Description</label>
                <input
                  type="text"
                  value={editingEntry.custom_task_description || ''}
                  onChange={(e) => setEditingEntry({...editingEntry, custom_task_description: e.target.value})}
                  placeholder="Enter custom task description"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Hours *</label>
              <input
                type="number"
                step="0.25"
                min="0"
                max="24"
                value={editingEntry.hours}
                onChange={(e) => setEditingEntry({...editingEntry, hours: parseFloat(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <p className="text-xs text-slate-500 mt-1">Time can be entered in 0.25 hour increments</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Work Description</label>
              <textarea
                value={editingEntry.description || ''}
                onChange={(e) => setEditingEntry({...editingEntry, description: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe the work performed (optional)"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="billable"
                checked={editingEntry.is_billable}
                onChange={(e) => setEditingEntry({...editingEntry, is_billable: e.target.checked})}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
              />
              <label htmlFor="billable" className="ml-2 block text-sm text-slate-700">
                This is billable time
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-slate-200">
            <button
              onClick={() => {
                setShowEntryModal(false);
                setEditingEntry(null);
                setSpanToWeek(false);
              }}
              className="px-4 py-2 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={saveTimeEntry}
              disabled={!editingEntry.project_id || editingEntry.hours <= 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {spanToWeek ? 'Save to Week' : 'Save Entry'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            {viewMode === 'team-review' ? (
              currentUserRole === 'lead' ? 'Employee Timesheet Review' : 
              currentUserRole === 'manager' ? 'Team Timesheet Approval' :
              currentUserRole === 'management' ? 'Team Timesheet Management' :
              currentUserRole === 'super_admin' ? 'System Timesheet Oversight' : 'Team Review'
            ) : 'My Timesheet'}
          </h2>
          {selectedTimesheet && (
            <div className="flex items-center mt-2 space-x-4">
              <span className={`inline-flex items-center px-3 py-1 text-sm font-semibold rounded-lg border ${getStatusColor(selectedTimesheet.timesheet.status)}`}>
                {getStatusIcon(selectedTimesheet.timesheet.status)}
                <span className="ml-2">{selectedTimesheet.timesheet.status.toUpperCase()}</span>
              </span>
              <span className="text-sm text-slate-600">
                Total: <span className="font-medium text-blue-600">{calculateTotalHours()}h</span>
              </span>
              <span className="text-sm text-slate-600">
                Billable: <span className="font-medium text-green-600">{calculateBillableHours()}h</span>
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex bg-slate-100 rounded-lg p-1">
            {currentUserRole === 'lead' ? (
              <button
                onClick={() => setViewMode('team-review')}
                className="px-3 py-1 rounded-md text-sm font-medium bg-white text-slate-900 shadow-sm flex items-center"
              >
                <Users className="w-4 h-4 mr-1" />
                Team Review
              </button>
            ) : (currentUserRole === 'manager' || currentUserRole === 'management' || currentUserRole === 'super_admin') ? (
              <>
                <button
                  onClick={() => setViewMode('my-timesheet')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'my-timesheet' 
                      ? 'bg-white text-slate-900 shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Clock className="w-4 h-4 mr-1 inline" />
                  My Timesheet
                </button>
                <button
                  onClick={() => setViewMode('team-review')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'team-review' 
                      ? 'bg-white text-slate-900 shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Users className="w-4 h-4 mr-1 inline" />
                  Team Review
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setSubViewMode('calendar')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    subViewMode === 'calendar' 
                      ? 'bg-white text-slate-900 shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CalendarDays className="w-4 h-4 mr-1 inline" />
                  Calendar
                </button>
                <button
                  onClick={() => setSubViewMode('list')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    subViewMode === 'list' 
                      ? 'bg-white text-slate-900 shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <List className="w-4 h-4 mr-1 inline" />
                  List
                </button>
                <button
                  onClick={() => setSubViewMode('analytics')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    subViewMode === 'analytics' 
                      ? 'bg-white text-slate-900 shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BarChart3 className="w-4 h-4 mr-1 inline" />
                  Analytics
                </button>
              </>
            )}
          </div>

          {/* Sub-navigation for My Timesheet tab */}
          {viewMode === 'my-timesheet' && (currentUserRole === 'manager' || currentUserRole === 'management' || currentUserRole === 'super_admin') && (
            <div className="flex bg-slate-50 rounded-lg p-1 ml-2">
              <button
                onClick={() => setSubViewMode('calendar')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  subViewMode === 'calendar' 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarDays className="w-4 h-4 mr-1 inline" />
                Calendar
              </button>
              <button
                onClick={() => setSubViewMode('list')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  subViewMode === 'list' 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="w-4 h-4 mr-1 inline" />
                List
              </button>
              <button
                onClick={() => setSubViewMode('analytics')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  subViewMode === 'analytics' 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="w-4 h-4 mr-1 inline" />
                Analytics
              </button>
            </div>
          )}

          {canEditTimesheet() && viewMode === 'my-timesheet' && (
            <div className="flex space-x-2">
              <button
                onClick={() => saveTimesheet('draft')}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 flex items-center transition-colors"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Draft
              </button>
              <button
                onClick={() => saveTimesheet('submitted')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center transition-colors"
              >
                <Send className="w-4 h-4 mr-2" />
                Submit
              </button>
            </div>
          )}

          {/* Legacy save buttons for employees */}
          {canEditTimesheet() && currentUserRole === 'employee' && viewMode !== 'analytics' && viewMode !== 'team-review' && (
            <div className="flex space-x-2">
              <button
                onClick={() => saveTimesheet('draft')}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 flex items-center transition-colors"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Draft
              </button>
              <button
                onClick={() => saveTimesheet('submitted')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center transition-colors"
              >
                <Send className="w-4 h-4 mr-2" />
                Submit
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      {viewMode === 'team-review' ? renderTeamReviewView() :
       viewMode === 'my-timesheet' ? (
         subViewMode === 'calendar' ? renderCalendarView() :
         subViewMode === 'list' ? renderListView() : renderAnalyticsView()
       ) : (
         // For employees (legacy compatibility)
         viewMode === 'calendar' ? renderCalendarView() :
         viewMode === 'list' ? renderListView() : renderAnalyticsView()
       )}

      {/* Entry Modal */}
      {renderEntryModal()}
    </div>
  );
};

export default EnhancedTimesheetUI;