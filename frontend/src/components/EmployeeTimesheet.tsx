import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../store/contexts/AuthContext';
import { TimesheetApprovalService, TimeEntryInput } from '../services/TimesheetApprovalService';
import ProjectService from '../services/ProjectService';
import { showSuccess, showError, showWarning } from '../utils/toast';
import type { TimesheetWithDetails, TimeEntry, CalendarData, Project, Task, UserRole } from '../types';
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  Filter,
  ChevronLeft,
  ChevronRight,
  Copy,
  Calendar,
  FileText
} from 'lucide-react';

type ViewMode = 'calendar' | 'list' | 'create';
type FormMode = 'create' | 'edit' | 'view';

interface EmployeeTimesheetProps {
  viewMode?: ViewMode;
}

interface TimesheetFormData {
  week_start_date: string;
  entries: TimeEntryInput[];
}

export const EmployeeTimesheet: React.FC<EmployeeTimesheetProps> = ({ viewMode: initialViewMode = 'calendar' }) => {
  const { currentUser, currentUserRole } = useAuth();
  const viewMode = initialViewMode;

  // Helper function to get role-specific titles
  const getRoleBasedTitles = (userRole: UserRole | undefined, viewMode: ViewMode) => {
    const roleLabels = {
      super_admin: 'Administrator',
      management: 'Management',
      manager: 'Manager',
      lead: 'Lead',
      employee: 'My'
    };

    const roleLabel = userRole ? roleLabels[userRole] : 'My';

    switch (viewMode) {
      case 'calendar':
        return {
          title: `${roleLabel} Timesheet Calendar`,
          subtitle: 'Track your time with monthly calendar view'
        };
      case 'list':
        return {
          title: `${roleLabel} Timesheets List`,
          subtitle: 'Manage all your timesheet submissions'
        };
      case 'create':
        return {
          title: `Create ${roleLabel === 'My' ? '' : roleLabel} Timesheet`,
          subtitle: 'Track your time and manage your work efficiently'
        };
      default:
        return {
          title: 'My Timesheets List',
          subtitle: 'Manage your timesheet submissions'
        };
    }
  };

  const titles = getRoleBasedTitles(currentUser?.role, viewMode);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [timesheets, setTimesheets] = useState<TimesheetWithDetails[]>([]);
  const [selectedTimesheet, setSelectedTimesheet] = useState<TimesheetWithDetails | null>(null);
  const [showForm, setShowForm] = useState(viewMode === 'create');
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [calendarData, setCalendarData] = useState<CalendarData>({});
  const [filters, setFilters] = useState({
    status: [] as string[],
    dateRange: { start: '', end: '' },
    showPriorityFirst: true
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showDayEntries, setShowDayEntries] = useState(false);
  const [listViewType, setListViewType] = useState<'week' | 'day'>('week');
  const [entryViewMode, setEntryViewMode] = useState<'simple' | 'grouped'>('simple');
  const [showVerifiedTab, setShowVerifiedTab] = useState(false);

  // Form state
  const [formData, setFormData] = useState<TimesheetFormData>({
    week_start_date: '',
    entries: []
  });
  const [newEntry, setNewEntry] = useState<TimeEntryInput>({
    project_id: '',
    task_id: '',
    date: '',
    hours: 0,
    description: '',
    is_billable: true,
    entry_type: 'project_task'
  });
  const [isBulkEntry, setIsBulkEntry] = useState(false);
  const [bulkDates, setBulkDates] = useState<string[]>([]);

  // Prevent duplicate simultaneous submissions
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Projects and tasks state
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  const loadTimesheets = useCallback(async () => {
    if (!currentUser) return;

    try {
      const userTimesheets = await TimesheetApprovalService.getUserTimesheets(
        currentUser.id,
        {
          ...filters,
          status: filters.status as never[] // Type assertion for compatibility
        }
      );
      setTimesheets(userTimesheets);
    } catch (error) {
      console.error('Error loading timesheets:', error);
      setTimesheets([]);
    }
  }, [currentUser, filters]);

  const loadProjectsAndTasks = useCallback(async () => {
    setLoadingProjects(true);
    try {
      // Check if user is authenticated
      if (!currentUser?.id) {
        console.error('No current user found');
        setProjects([]);
        setTasks([]);
        return;
      }

      // Load user's projects (this works for employees)
      const projectsResult = await ProjectService.getUserProjects(currentUser.id);

      if (projectsResult.error) {
        console.error('Error loading projects:', projectsResult.error);
        setProjects([]);
      } else {
        // Filter for active projects only
        const activeProjects = projectsResult.projects.filter(project => project.status === 'active');
        setProjects(activeProjects);

        // Load tasks for all active projects
        const allTasks: Task[] = [];
        console.log(`📋 Loading tasks for ${activeProjects.length} active projects`);

        for (const project of activeProjects) {
          console.log(`📋 Loading tasks for project: ${project.name} (${project.id})`);
          const tasksResult = await ProjectService.getProjectTasks(project.id);
          if (!tasksResult.error) {
            console.log(`📋 Found ${tasksResult.tasks.length} tasks for project ${project.name}`);
            allTasks.push(...tasksResult.tasks);
          } else {
            console.error(`Error loading tasks for ${project.name}:`, tasksResult.error);
          }
        }
        console.log(`📋 Total tasks loaded: ${allTasks.length}`);
        console.log(`📋 Task details:`, allTasks.map(t => ({ id: t.id, name: t.name, project_id: t.project_id })));
        setTasks(allTasks);
      }
    } catch (error) {
      console.error('💥 Error in loadProjectsAndTasks:', error);
      setProjects([]);
      setTasks([]);
    } finally {
      setLoadingProjects(false);
      console.log('🏁 Finished loading projects and tasks');
    }
  }, [currentUser?.id]);

  // Validation helper - runs only during submission (not for drafts)
  const validateTimesheet = (entries: Array<{ project_id?: string; task_id?: string; date: string; hours: number }>): string[] => {
    const warnings: string[] = [];
    if (!entries || entries.length === 0) return warnings;

    // 1) Daily totals (min 8, max 10)
    const dailyTotals: Record<string, number> = {};
    for (const e of entries) {
      if (!e || !e.date) continue;
      dailyTotals[e.date] = (dailyTotals[e.date] || 0) + (Number(e.hours) || 0);
    }

    for (const [date, total] of Object.entries(dailyTotals)) {
      if (total < 8) warnings.push(`On ${date}: total hours ${total} < minimum 8`);
      if (total > 10) warnings.push(`On ${date}: total hours ${total} > maximum 10`);
    }

    // 2) Weekly max 56
    const weekTotal = Object.values(dailyTotals).reduce((s, v) => s + v, 0);
    if (weekTotal > 56) warnings.push(`Total weekly hours ${weekTotal} > maximum 56`);

    // 3) Duplicate project+task+date combos
    const seen = new Set<string>();
    for (const e of entries) {
      const key = `${e.project_id || ''}::${e.task_id || ''}::${e.date}`;
      if (seen.has(key)) {
        warnings.push(`Duplicate entry for project/task/date: ${e.project_id || 'N/A'}/${e.task_id || 'N/A'}/${e.date}`);
      } else {
        seen.add(key);
      }
    }

    // 4) No future dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (const e of entries) {
      if (!e.date) continue;
      const d = new Date(e.date);
      d.setHours(0, 0, 0, 0);
      if (d > today) warnings.push(`Future date not allowed: ${e.date}`);
    }

    // 5) Missing weekday entries (Monday - Friday)
    // Determine the week to check from the entries' dates (use earliest entry date as week reference)
    const entryDates = Object.keys(dailyTotals).sort();
    if (entryDates.length > 0) {
      const earliest = entryDates[0];
      const weekStart = getMonday(new Date(earliest));
      // check Monday..Friday
      for (let i = 0; i < 5; i++) {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        const ds = d.toISOString().split('T')[0];
        if (!dailyTotals[ds] || dailyTotals[ds] === 0) {
          warnings.push(`Missing entry for weekday: ${ds}`);
        }
      }
    }

    return Array.from(new Set(warnings)); // dedupe warnings
  };

  const loadCalendarData = useCallback(async () => {
    if (!currentUser) {
      console.log('📅 loadCalendarData: No current user, skipping');
      return;
    }

    try {
      const month = (selectedDate.getMonth() + 1).toString();
      const year = selectedDate.getFullYear().toString();

      console.log(`📅 loadCalendarData: Loading for user ${currentUser.id} (${currentUserRole}), month ${month}, year ${year}`);
      console.log(`📅 loadCalendarData: Selected date ${selectedDate.toISOString()}`);

      // For now, load current user's data only
      // TODO: Implement role-based calendar loading for leads/managers
      const data = await TimesheetApprovalService.getCalendarData(currentUser.id, month, year);

      console.log(`📅 loadCalendarData: Received data with ${Object.keys(data).length} days`);
      if (Object.keys(data).length > 0) {
        console.log(`📅 loadCalendarData: Sample data keys:`, Object.keys(data).slice(0, 5));
        console.log(`📅 loadCalendarData: Sample data:`, Object.keys(data).slice(0, 2).map(key => ({
          date: key,
          hours: data[key].hours,
          status: data[key].status,
          entriesCount: data[key].entries.length
        })));

        // Log all days with data for debugging
        Object.keys(data).forEach(dateKey => {
          const dayData = data[dateKey];
          if (dayData.hours > 0) {
            console.log(`📅 Calendar data for ${dateKey}:`, {
              hours: dayData.hours,
              status: dayData.status,
              entries: dayData.entries.length,
              firstEntry: dayData.entries[0]
            });
          }
        });
      } else {
        console.log('📅 loadCalendarData: No calendar data found');
      }

      setCalendarData(data as unknown as CalendarData);
    } catch (error) {
      console.error('❌ Error loading calendar data:', error);
      setCalendarData({});
    }
  }, [currentUser, currentUserRole, selectedDate]);

  // Load projects and tasks on component mount
  useEffect(() => {
    loadProjectsAndTasks();
  }, [loadProjectsAndTasks]);

  useEffect(() => {
    loadTimesheets();
    if (viewMode === 'calendar') {
      // Force clear calendar data first, then reload
      setCalendarData({});
      setTimeout(() => {
        loadCalendarData();
      }, 10);
    }
  }, [loadTimesheets, loadCalendarData, viewMode]);

  // Force refresh calendar when selectedDate changes
  useEffect(() => {
    if (viewMode === 'calendar') {
      console.log('Selected date changed, forcing calendar refresh');
      setCalendarData({});
      setTimeout(() => {
        loadCalendarData();
      }, 10);
    }
  }, [selectedDate, viewMode, loadCalendarData]);

  const getStatusColor = (status: string) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800 border-gray-300',
      submitted: 'bg-blue-100 text-blue-800 border-blue-300',
      manager_approved: 'bg-green-100 text-green-800 border-green-300',
      manager_rejected: 'bg-red-100 text-red-800 border-red-300',
      management_approved: 'bg-purple-100 text-purple-800 border-purple-300',
      management_rejected: 'bg-orange-100 text-orange-800 border-orange-300',
      verified: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      frozen: 'bg-slate-100 text-slate-800 border-slate-300'
    };
    return colors[status as keyof typeof colors] || colors.draft;
  };

  const getDayEntries = (date: string) => {
    const dayData = calendarData[date];
    return dayData?.entries || [];
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      draft: <Edit className="w-4 h-4" />,
      submitted: <Clock className="w-4 h-4" />,
      manager_approved: <CheckCircle className="w-4 h-4" />,
      manager_rejected: <XCircle className="w-4 h-4" />,
      management_approved: <CheckCircle className="w-4 h-4" />,
      management_rejected: <XCircle className="w-4 h-4" />,
      verified: <CheckCircle className="w-4 h-4" />,
      frozen: <Eye className="w-4 h-4" />
    };
    return icons[status as keyof typeof icons] || icons.draft;
  };

  const handleCreateTimesheet = () => {
    // Check for existing draft or rejected timesheets
    const existingTimesheets = timesheets.filter(ts =>
      ['draft', 'manager_rejected', 'management_rejected'].includes(ts.status)
    );

    if (existingTimesheets.length > 0) {
      setShowTimesheetSelection(true);
    } else {
      createNewTimesheet();
    }
  };

  const createNewTimesheet = () => {
    const monday = getMonday(new Date());
    setFormData({
      week_start_date: monday.toISOString().split('T')[0],
      entries: []
    });
    setFormMode('create');
    setSelectedTimesheet(null);
    setShowForm(true);
  };

  const [showTimesheetSelection, setShowTimesheetSelection] = useState(false);

  const handleTimesheetSelection = (timesheet: TimesheetWithDetails | null) => {
    setShowTimesheetSelection(false);
    if (timesheet) {
      handleEditTimesheet(timesheet);
    } else {
      createNewTimesheet();
    }
  };

  const getMonday = (date: Date): Date => {
    const d = new Date(date);
    // Check if the date is valid
    if (isNaN(d.getTime())) {
      return new Date(); // Return current date if invalid
    }
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const getWeekDates = (startDate: string): Date[] => {
    const start = new Date(startDate);
    const dates = [];
    // Ensure we start from Monday
    const monday = getMonday(start);

    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const addTimeEntry = () => {
    const selectedProject = projects.find(p => p.id === newEntry.project_id);
    const isBillable = selectedProject?.status === 'active'; // Use status as proxy for billable

    const customTaskName = newEntry.entry_type === 'custom_task' ? newEntry.custom_task_description || '' : '';

    if (isBulkEntry && bulkDates.length > 0) {
      const bulkEntries = bulkDates.map(date => ({
        ...newEntry,
        date,
        is_billable: isBillable,
        custom_task_description: newEntry.entry_type === 'custom_task' ? customTaskName : undefined
      }));
      setFormData(prev => ({
        ...prev,
        entries: [...prev.entries, ...bulkEntries]
      }));
      setBulkDates([]);
    } else if (newEntry.date && newEntry.hours > 0) {
      const entryToAdd = {
        ...newEntry,
        is_billable: isBillable,
        custom_task_description: newEntry.entry_type === 'custom_task' ? customTaskName : undefined
      };
      setFormData(prev => ({
        ...prev,
        entries: [...prev.entries, entryToAdd]
      }));
    }

    // Reset form
    setNewEntry({
      project_id: '',
      task_id: '',
      date: '',
      hours: 0,
      description: '',
      is_billable: true,
      entry_type: 'project_task'
    });
    setIsBulkEntry(false);
  };

  const removeTimeEntry = (index: number) => {
    setFormData(prev => ({
      ...prev,
      entries: prev.entries.filter((_, i) => i !== index)
    }));
  };

  const copyEntryToWeek = (entry: TimeEntryInput) => {
    const weekDates = getWeekDates(formData.week_start_date);

    // Only copy to weekdays (Monday-Friday) by default, excluding weekends
    const weekdayEntries = weekDates.slice(0, 5).map(date => ({
      ...entry,
      date: date.toISOString().split('T')[0]
    }));

    setFormData(prev => ({
      ...prev,
      entries: [...prev.entries, ...weekdayEntries]
    }));
  };

  const copyEntryToFullWeek = (entry: TimeEntryInput) => {
    const weekDates = getWeekDates(formData.week_start_date);

    // Copy to all 7 days including weekends
    const allDayEntries = weekDates.map(date => ({
      ...entry,
      date: date.toISOString().split('T')[0]
    }));

    setFormData(prev => ({
      ...prev,
      entries: [...prev.entries, ...allDayEntries]
    }));
  };

  // Group entries by project-task combination for better visual organization
  const groupEntriesByProjectTask = (entries: TimeEntryInput[]) => {
    const groups: { [key: string]: TimeEntryInput[] } = {};

    entries.forEach(entry => {
      const taskName = entry.entry_type === 'project_task'
        ? tasks.find(t => t.id === entry.task_id)?.name || 'Unknown Task'
        : entry.custom_task_description || 'Custom Task';

      const key = `${entry.project_id}-${taskName}`;

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(entry);
    });

    return groups;
  };

  const handleEditTimesheet = (timesheet: TimesheetWithDetails) => {
    setSelectedTimesheet(timesheet);
    setFormData({
      week_start_date: timesheet.week_start_date,
      entries: timesheet.time_entries.map(entry => ({
        project_id: entry.project_id,
        task_id: entry.task_id,
        date: entry.date,
        hours: entry.hours,
        description: entry.description,
        is_billable: entry.is_billable,
        custom_task_description: entry.custom_task_description,
        entry_type: entry.entry_type
      }))
    });
    setFormMode('edit');
    setShowForm(true);
  };

  const handleViewTimesheet = (timesheet: TimesheetWithDetails) => {
    setSelectedTimesheet(timesheet);
    setFormData({
      week_start_date: timesheet.week_start_date,
      entries: (timesheet.time_entries || []).map(entry => ({
        project_id: entry.project_id,
        task_id: entry.task_id,
        date: entry.date,
        hours: entry.hours,
        description: entry.description,
        is_billable: entry.is_billable,
        custom_task_description: entry.custom_task_description,
        entry_type: entry.entry_type
      }))
    });
    setFormMode('view');
    setShowForm(true);
  };

  const handleSubmitTimesheet = async () => {
    if (!currentUser) return;
    if (isSubmitting) return;

    // Run validations only on submit (not for drafts)
    const warnings = validateTimesheet(formData.entries || []);
    if (warnings.length > 0) {
      const proceed = confirm('Warnings detected:\n\n' + warnings.join('\n') + '\n\nContinue submission?');
      if (!proceed) return;
    }

    try {
      setIsSubmitting(true);
      if (formMode === 'create') {
        const timesheet = await TimesheetApprovalService.createTimesheet(
          currentUser.id,
          formData.week_start_date
        );

        if (!timesheet) {
          console.error('Timesheet creation returned null - checking for existing timesheet');

          // Check if there's already a timesheet for this week using the specific method
          const existingTimesheet = await TimesheetApprovalService.getTimesheetByUserAndWeek(
            currentUser.id,
            formData.week_start_date
          );

          if (existingTimesheet) {
            const shouldEdit = confirm(
              `A timesheet already exists for the week starting ${formData.week_start_date} (Status: ${existingTimesheet.status}). ` +
              'Would you like to edit the existing timesheet instead?'
            );

            if (shouldEdit) {
              setSelectedTimesheet(existingTimesheet);
              setFormMode('edit');
              return; // Don't close the form, switch to edit mode
            }
          } else {
            showError('Error creating timesheet! Please check the console for details.');
          }
          return;
        }
        console.log('Form data entries before calling addMultipleEntries:', formData.entries);
        // Bulk add all time entries in a single call to speed up submission
        const added = await TimesheetApprovalService.addMultipleEntries(timesheet.id, formData.entries || []);
        if (added === null) {
          showError('Timesheet created but failed to add time entries. Check logs.');
        } else {
          showSuccess(`Timesheet created successfully with ${added.length} time entries!`);
        }
      } else if (formMode === 'edit' && selectedTimesheet) {
        // Update existing timesheet
        const success = await TimesheetApprovalService.updateTimesheetEntries(
          selectedTimesheet.id,
          formData.entries
        );

        if (success) {
          showSuccess(`Timesheet updated successfully with ${formData.entries.length} entries!`);
        } else {
          showError('Error updating timesheet! Please check the console for details.');
          return;
        }
      }

      setShowForm(false);
      loadTimesheets();
      loadCalendarData();
    } catch (error) {
      console.error('Error in handleSubmitTimesheet:', error);
      showError(`Error: ${error}`);
    }
    finally {
      setIsSubmitting(false);
    }
  };

  const submitTimesheetForApproval = async (timesheet: TimesheetWithDetails) => {
    if (!currentUser) {
      console.error('❌ No current user found');
      return;
    }
    if (isSubmitting) return;

    // Validate entries before submission
    const warnings = validateTimesheet(timesheet.time_entries || []);
    if (warnings.length > 0) {
      const proceed = confirm('Warnings detected:\n\n' + warnings.join('\n') + '\n\nContinue submission?');
      if (!proceed) return;
    }

    try {
      setIsSubmitting(true);
      console.log('🚀 Starting timesheet submission:', {
        timesheetId: timesheet.id,
        status: timesheet.status,
        total_hours: timesheet.total_hours,
        can_submit: timesheet.can_submit,
        userId: currentUser.id
      });

      const success = await TimesheetApprovalService.submitTimesheet(timesheet.id, currentUser.id);

      console.log('📋 Submission completed with result:', success);

      if (success) {
        showSuccess('Timesheet submitted for approval!');
        console.log('🔄 Reloading timesheets...');
        loadTimesheets();
      } else {
        showError('Failed to submit timesheet for approval!');
      }
    } catch (error) {
      console.error('💥 Error submitting timesheet:', error);
      showError('Error submitting timesheet for approval!');
    }
    finally {
      setIsSubmitting(false);
    }
  };

  const renderCalendarView = () => {
    // Generate calendar days with correct logic (Sunday-first)
    const currentYear = selectedDate.getFullYear();
    const currentMonth = selectedDate.getMonth(); // 0-indexed

    // Get first day of the month
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);

    // Find Sunday of the week containing the 1st (Sunday-first layout)
    const firstDayWeekday = firstDayOfMonth.getDay(); // 0=Sunday, 1=Monday, etc.
    const sundayOffset = firstDayWeekday; // Days back to Sunday

    // Get last day of the month to determine how many weeks we need
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const lastDayWeekday = lastDayOfMonth.getDay();

    // Calculate total days needed for the calendar grid
    const daysFromPrevMonth = sundayOffset;
    const daysInCurrentMonth = lastDayOfMonth.getDate();
    const daysFromNextMonth = lastDayWeekday === 6 ? 0 : 6 - lastDayWeekday;
    const totalDays = daysFromPrevMonth + daysInCurrentMonth + daysFromNextMonth;

    // Ensure we have complete weeks (minimum 35 days, maximum 42)
    const weeksNeeded = Math.ceil(totalDays / 7);
    const calendarDays = [];

    // Start calendar from the Sunday before the first day of the month
    const calendarStart = new Date(currentYear, currentMonth, 1 - sundayOffset);

    // Generate days for the exact number of weeks needed
    for (let i = 0; i < weeksNeeded * 7; i++) {
      const date = new Date(calendarStart);
      date.setDate(calendarStart.getDate() + i);

      // Use local date formatting to avoid timezone issues
      const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const isCurrentMonthDay = date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      const dayData = calendarData[dateString] || { hours: 0, status: '', entries: [] };

      // Debug specific dates
      if (dateString === '2025-09-01' || dateString === '2025-09-02' || dateString === '2025-09-03') {
        console.log(`🔍 Debugging ${dateString}:`, {
          found: !!calendarData[dateString],
          dayData: dayData,
          calendarDataForDate: calendarData[dateString]
        });
      }

      calendarDays.push({
        date: dateString,
        day: date.getDate(),
        month: date.getMonth(),
        year: date.getFullYear(),
        isCurrentMonth: isCurrentMonthDay,
        hours: dayData.hours,
        status: dayData.status,
        entries: dayData.entries
      });
    }

    const monthYear = selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // Fix timezone issue - get local date string instead of UTC
    const todayDate = new Date();
    const today = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;

    // Debug logging
    console.log('🔥 CALENDAR DEBUG:');
    console.log(`Today calculated as: ${today}`);
    console.log(`Current month: ${currentMonth} (${monthYear})`);
    console.log(`Calendar grid will show ${calendarDays.length} days (${weeksNeeded} weeks)`);
    console.log(`First calendar day: ${calendarDays[0]?.date} (${calendarDays[0]?.isCurrentMonth ? 'current month' : 'other month'})`);
    console.log(`Last calendar day: ${calendarDays[calendarDays.length - 1]?.date} (${calendarDays[calendarDays.length - 1]?.isCurrentMonth ? 'current month' : 'other month'})`);
    console.log(`Calendar data object:`, calendarData);
    console.log(`Calendar data keys (${Object.keys(calendarData).length}):`, Object.keys(calendarData));
    console.log(`Sample calendar data:`, Object.keys(calendarData).slice(0, 3).map(key => ({
      date: key,
      hours: calendarData[key]?.hours,
      status: calendarData[key]?.status,
      entries: calendarData[key]?.entries?.length || 0
    })));

    // Check if any calendar days have data
    let daysWithData = 0;
    calendarDays.forEach((day, index) => {
      if (day.hours > 0) {
        daysWithData++;
        console.log(`📅 Day ${day.day} (${day.date}) has ${day.hours} hours, status: ${day.status}`);
      }
      if (!day.isCurrentMonth && (day.day === 1 || day.day <= 5)) {
        console.log(`Non-current month day at position ${index + 1}: ${day.day} ${new Date(day.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} (isCurrentMonth: ${day.isCurrentMonth})`);
      }
    });
    console.log(`📅 Total days with data in calendar: ${daysWithData}`);

    return (
      <div className="space-y-6">
        {/* Calendar Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-5">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              {/* Title and Navigation */}
              <div className="flex items-center space-x-6">
                <div className="min-w-[200px]">
                  <h1 data-testid="calendar-title" className="text-2xl font-bold text-gray-900">{monthYear}</h1>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      const newDate = new Date(selectedDate);
                      newDate.setMonth(newDate.getMonth() - 1);
                      setSelectedDate(newDate);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Previous Month"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <button
                    onClick={() => setSelectedDate(new Date())}
                    className="px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium whitespace-nowrap"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => {
                      const newDate = new Date(selectedDate);
                      newDate.setMonth(newDate.getMonth() + 1);
                      setSelectedDate(newDate);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Next Month"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  </button>
                  {/* <button
                    onClick={() => {
                      console.log('Manual refresh triggered');
                      setCalendarData({});
                      setTimeout(() => {
                        loadCalendarData();
                      }, 10);
                    }}
                    className="px-3 py-2 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium whitespace-nowrap"
                    title="Refresh Calendar"
                  >
                    🔄 Refresh
                  </button>
                  <button
                    onClick={async () => {
                      console.log('🔧 DEBUG: Manual calendar data fetch');
                      if (currentUser) {
                        const month = (selectedDate.getMonth() + 1).toString();
                        const year = selectedDate.getFullYear().toString();
                        console.log(`Fetching data for user ${currentUser.id}, month ${month}, year ${year}`);
                        const data = await TimesheetApprovalService.getCalendarData(currentUser.id, month, year);
                        console.log('🔧 DEBUG: Raw calendar data received:', data);
                        setCalendarData(data as unknown as CalendarData);
                      }
                    }}
                    className="px-3 py-2 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors font-medium whitespace-nowrap"
                    title="Debug Calendar Data"
                  >
                    🔧 Debug
                  </button> */}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-3">
                {/* Create New Timesheet Button */}
                <button
                  onClick={handleCreateTimesheet}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all font-medium flex items-center space-x-2 shadow-lg hover:shadow-xl whitespace-nowrap"
                >
                  <Plus className="w-5 h-5" />
                  <span>New Timesheet</span>
                </button>
              </div>
            </div>
          </div>

          {/* Status Legend */}
          <div className="px-6 pb-4 border-t border-gray-100 pt-4">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="text-gray-600 font-medium">Status Legend:</span>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                <span className="text-gray-600">Draft</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-gray-600">Submitted</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-gray-600">Approved</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-gray-600">Rejected</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span className="text-gray-600">Verified</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                <span className="text-gray-600">Management Approved</span>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div
          key={`calendar-${selectedDate.getFullYear()}-${selectedDate.getMonth()}`}
          className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
          data-testid="calendar-grid"
        >
          {/* Day Headers */}
          <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
              <div key={day} className="p-4 text-center text-sm font-semibold text-gray-700 border-r border-gray-200 last:border-r-0">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day) => {
              const isToday = day.date === today;
              const isCurrentMonth = day.isCurrentMonth;
              const hasEntries = day.hours > 0 && isCurrentMonth;
              const dayNumber = day.day;

              // Debug logging for each day
              if (hasEntries) {
                console.log(`Day ${dayNumber} (${day.date}): ${day.hours}h, status: ${day.status}, entries: ${day.entries?.length || 0}`);
              }

              return (
                <div
                  key={day.date}
                  data-testid={`calendar-day-${day.date}`}
                  className={`min-h-[120px] border-r border-b border-gray-200 last:border-r-0 transition-all duration-200 cursor-pointer hover:bg-blue-50 ${!isCurrentMonth ? 'bg-gray-50/70' : 'bg-white'
                    } ${isToday ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                  onClick={() => {
                    if (isCurrentMonth) {
                      console.log(`📅 Day clicked: ${day.date} (day ${dayNumber})`);
                      setSelectedDay(day.date);
                      setShowDayEntries(true);
                    }
                  }}
                >
                  <div className="p-3 h-full flex flex-col">
                    {/* Date Number */}
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-medium ${isToday
                          ? 'bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold'
                          : isCurrentMonth
                            ? 'text-gray-900'
                            : 'text-gray-300 text-xs'
                        }`}>
                        {dayNumber}
                      </span>

                      {/* Status Dot - only for current month with entries */}
                      {hasEntries && (
                        <div className={`w-3 h-3 rounded-full ${day.status === 'draft' ? 'bg-gray-400' :
                            day.status === 'submitted' ? 'bg-blue-500' :
                              day.status === 'manager_approved' ? 'bg-green-500' :
                                day.status === 'manager_rejected' ? 'bg-red-500' :
                                  day.status === 'management_pending' ? 'bg-yellow-500' :
                                    day.status === 'management_approved' ? 'bg-purple-500' :
                                      day.status === 'management_rejected' ? 'bg-orange-500' :
                                        day.status === 'verified' ? 'bg-emerald-500' :
                                          day.status === 'frozen' ? 'bg-slate-500' :
                                            day.status === 'billed' ? 'bg-indigo-500' :
                                              'bg-gray-400'
                          }`}></div>
                      )}
                    </div>

                    {/* Enhanced Content - only for current month with entries */}
                    {hasEntries && (
                      <div className="flex-1 space-y-2">
                        {/* Hours Badge */}
                        <div className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 border">
                          <Clock className="w-3 h-3 mr-1" />
                          {day.hours}h
                        </div>

                        {/* Status Text */}
                        <div className={`text-xs font-medium capitalize px-2 py-1 rounded-md ${day.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                            day.status === 'submitted' ? 'bg-blue-100 text-blue-700' :
                              day.status === 'manager_approved' ? 'bg-green-100 text-green-700' :
                                day.status === 'manager_rejected' ? 'bg-red-100 text-red-700' :
                                  day.status === 'management_approved' ? 'bg-purple-100 text-purple-700' :
                                    day.status === 'verified' ? 'bg-emerald-100 text-emerald-700' :
                                      'bg-gray-100 text-gray-700'
                          }`}>
                          {day.status.replace('_', ' ')}
                        </div>

                        {/* Entry Count */}
                        {day.entries && day.entries.length > 0 && (
                          <div className="text-xs text-gray-500">
                            {day.entries.length} entr{day.entries.length === 1 ? 'y' : 'ies'}
                          </div>
                        )}

                        {/* Quick Preview of Projects */}
                        {day.entries && day.entries.length > 0 && (
                          <div className="space-y-1 max-h-12 overflow-hidden">
                            {day.entries.slice(0, 2).map((entry, idx) => {
                              const project = projects.find(p => p.id === entry.project_id);
                              return (
                                <div key={idx} className="text-xs text-gray-600 truncate">
                                  {project?.name || 'Unknown Project'}
                                </div>
                              );
                            })}
                            {day.entries.length > 2 && (
                              <div className="text-xs text-gray-400">
                                +{day.entries.length - 2} more
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Month Label for non-current month days */}
                    {!isCurrentMonth && (
                      <div className="text-xs text-gray-400 font-normal mt-1">
                        {new Date(day.date).toLocaleDateString('en-US', { month: 'short' })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Hours</p>
                <p className="text-lg font-semibold text-gray-900">
                  {Object.values(calendarData).reduce((sum, day) => sum + day.hours, 0)}h
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Days Logged</p>
                <p className="text-lg font-semibold text-gray-900">
                  {Object.values(calendarData).filter(day => day.hours > 0).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-amber-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-lg font-semibold text-gray-900">
                  {Object.values(calendarData).filter(day => ['draft', 'submitted'].includes(day.status)).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Verified</p>
                <p className="text-lg font-semibold text-gray-900">
                  {Object.values(calendarData).filter(day => ['verified', 'frozen'].includes(day.status)).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Status Legend */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Status Legend</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-gray-400"></div>
              <span className="text-gray-600">Draft</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span className="text-gray-600">Submitted</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-gray-600">Manager Approved</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span className="text-gray-600">Manager Rejected</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
              <span className="text-gray-600">Mgmt Pending</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-purple-500"></div>
              <span className="text-gray-600">Mgmt Approved</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-slate-500"></div>
              <span className="text-gray-600">Frozen</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
              <span className="text-gray-600">Billed</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderListView = () => {
    const filteredTimesheets = showVerifiedTab
      ? timesheets.filter(ts => ts.status === 'frozen' || ts.status === 'billed')
      : timesheets.filter(ts => ts.status !== 'frozen' && ts.status !== 'billed');

    return (
      <div className="space-y-6">
        {/* Top Header with Clean Layout */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-5">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              {/* Title and Stats */}
              <div className="flex items-center space-x-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {showVerifiedTab ? 'Verified Timesheets' : titles.title.split(" ").slice(0, -1).join(" ")}
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    {filteredTimesheets.length} timesheet{filteredTimesheets.length !== 1 ? 's' : ''} found
                  </p>
                </div>

                {/* Quick Stats */}
                {!showVerifiedTab && (
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="bg-blue-50 px-3 py-2 rounded-lg">
                      <span className="text-blue-600 font-medium">
                        {filteredTimesheets.filter(ts => ts.status === 'draft').length} Draft
                      </span>
                    </div>
                    <div className="bg-yellow-50 px-3 py-2 rounded-lg">
                      <span className="text-yellow-600 font-medium">
                        {filteredTimesheets.filter(ts => ts.status === 'submitted').length} Pending
                      </span>
                    </div>
                    <div className="bg-green-50 px-3 py-2 rounded-lg">
                      <span className="text-green-600 font-medium">
                        {filteredTimesheets.filter(ts => ts.status === 'manager_approved').length} Approved
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-3">
                {/* Create New Button */}
                {!showVerifiedTab && (
                  <button
                    onClick={handleCreateTimesheet}
                    className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all font-medium flex items-center space-x-2 shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>New Timesheet</span>
                  </button>
                )}

                {/* Filter Dropdown */}
                <div className="relative">
                  <select
                    value={filters.status.join(',')}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      status: e.target.value ? e.target.value.split(',') : []
                    }))}
                    className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2.5 pr-8 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Status</option>
                    <option value="draft">Draft Only</option>
                    <option value="submitted">Submitted Only</option>
                    <option value="manager_approved">Approved Only</option>
                    <option value="manager_rejected">Rejected Only</option>
                  </select>
                  <Filter className="absolute right-2 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-t border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setShowVerifiedTab(false)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${!showVerifiedTab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4" />
                  <span>Active Timesheets</span>
                  {!showVerifiedTab && (
                    <span className="bg-blue-100 text-blue-600 py-0.5 px-2 rounded-full text-xs font-medium">
                      {timesheets.filter(ts => ts.status !== 'frozen' && ts.status !== 'billed').length}
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={() => setShowVerifiedTab(true)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${showVerifiedTab
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Verified Timesheets</span>
                  {showVerifiedTab && (
                    <span className="bg-green-100 text-green-600 py-0.5 px-2 rounded-full text-xs font-medium">
                      {timesheets.filter(ts => ts.status === 'frozen' || ts.status === 'billed').length}
                    </span>
                  )}
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Priority Alerts */}
        {!showVerifiedTab && filteredTimesheets.filter(ts => ['draft', 'manager_rejected', 'management_rejected'].includes(ts.status)).length > 0 && (
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-amber-800">
                  Action Required
                </h3>
                <p className="text-sm text-amber-700 mt-1">
                  You have {filteredTimesheets.filter(ts => ['draft', 'manager_rejected', 'management_rejected'].includes(ts.status)).length} timesheet(s) that need your attention.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* View Type Toggle - Modern Design */}
        {filteredTimesheets.length > 0 && (
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">View as:</span>
              <div className="bg-gray-100 rounded-lg p-1 flex">
                <button
                  onClick={() => setListViewType('week')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${listViewType === 'week'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>Week View</span>
                  </div>
                </button>
                <button
                  onClick={() => setListViewType('day')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${listViewType === 'day'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>Day View</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Timesheets Grid */}
        {filteredTimesheets.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {showVerifiedTab ? 'No verified timesheets' : 'No timesheets found'}
            </h3>
            <p className="text-gray-500 mb-6">
              {showVerifiedTab
                ? 'Your verified timesheets will appear here once they are processed.'
                : 'Get started by creating your first timesheet entry.'}
            </p>
            {!showVerifiedTab && (
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('navigate-to-create'));
                }}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Create First Timesheet
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {listViewType === 'week' ? renderWeekCards(filteredTimesheets) : renderDayCards(filteredTimesheets)}
          </div>
        )}
      </div>
    );
  };

  const renderWeekCards = (timesheets: TimesheetWithDetails[]) => {
    return timesheets.map((timesheet) => (
      <div key={timesheet.id} data-testid="timesheet-card" className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <Calendar className="w-5 h-5 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Week of {new Date(timesheet.week_start_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </h3>
              </div>

              {/* Status Badge */}
              <div className="flex items-center space-x-3">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(timesheet.status)}`}>
                  {getStatusIcon(timesheet.status)}
                  <span className="ml-2 capitalize">{timesheet.status.replace('_', ' ')}</span>
                </span>

                {/* Priority indicator for action items */}
                {['draft', 'manager_rejected', 'management_rejected'].includes(timesheet.status) && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Action Required
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              {timesheet.can_edit && (
                <button
                  onClick={() => handleEditTimesheet(timesheet)}
                  className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Edit Timesheet"
                >
                  <Edit className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={() => handleViewTimesheet(timesheet)}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
                title="View Details"
              >
                <Eye className="w-4 h-4" />
              </button>

              {timesheet.can_submit && (
                <button
                  onClick={() => submitTimesheetForApproval(timesheet)}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Submit for Approval
                </button>
              )}
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{timesheet.total_hours}</div>
              <div className="text-xs text-blue-600 font-medium">Total Hours</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">{timesheet.time_entries.length}</div>
              <div className="text-xs text-gray-600 font-medium">Time Entries</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {timesheet.time_entries.filter(entry => entry.is_billable).length}
              </div>
              <div className="text-xs text-green-600 font-medium">Billable Entries</div>
            </div>
          </div>

          {/* Rejection Reason */}
          {(timesheet.manager_rejection_reason || timesheet.management_rejection_reason) && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-red-800">Rejection Reason</div>
                  <div className="text-sm text-red-700 mt-1">
                    {timesheet.manager_rejection_reason || timesheet.management_rejection_reason}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Next Action */}
          {timesheet.next_action && (
            <div className="flex items-center space-x-2 text-sm">
              <CheckCircle className="w-4 h-4 text-blue-600" />
              <span className="text-blue-600 font-medium">{timesheet.next_action}</span>
            </div>
          )}

          {/* Footer */}
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Updated {new Date(timesheet.updated_at).toLocaleDateString()}</span>
            <span data-testid="timesheet-id">ID: {timesheet.id}</span>
          </div>
        </div>
      </div>
    ));
  };

  const renderDayCards = (timesheets: TimesheetWithDetails[]) => {
    const dayEntries: Array<{
      date: string;
      timesheet: TimesheetWithDetails;
      entries: TimeEntry[];
      totalHours: number;
    }> = [];

    timesheets.forEach(timesheet => {
      timesheet.time_entries.forEach(entry => {
        const existingDay = dayEntries.find(d => d.date === entry.date);
        if (existingDay) {
          existingDay.entries.push(entry as TimeEntry);
          existingDay.totalHours += entry.hours;
        } else {
          dayEntries.push({
            date: entry.date,
            timesheet: timesheet,
            entries: [entry as TimeEntry],
            totalHours: entry.hours
          });
        }
      });
    });

    dayEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return dayEntries.map((dayEntry, index) => (
      <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {new Date(dayEntry.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {new Date(dayEntry.date).toLocaleDateString('en-US', {
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              {/* Status and Hours */}
              <div className="flex items-center space-x-3">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(dayEntry.timesheet.status)}`}>
                  {getStatusIcon(dayEntry.timesheet.status)}
                  <span className="ml-2 capitalize">{dayEntry.timesheet.status.replace('_', ' ')}</span>
                </span>

                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span className="font-medium text-blue-600">{dayEntry.totalHours}h total</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <FileText className="w-4 h-4" />
                    <span>{dayEntry.entries.length} entries</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={() => handleViewTimesheet(dayEntry.timesheet)}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
              title="View Full Timesheet"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>

          {/* Time Entries */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700 border-b border-gray-200 pb-2">
              Time Entries
            </h4>
            {dayEntry.entries.map((entry: TimeEntry, entryIndex: number) => {
              const project = projects.find(p => p.id === entry.project_id);
              const task = tasks.find(t => t.id === entry.task_id);
              return (
                <div key={entryIndex} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                        {entry.hours}h
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          <span className="text-blue-600">{project?.name}</span>
                          {entry.entry_type === 'project_task' && task && (
                            <span className="text-gray-600 ml-2">• {task.name}</span>
                          )}
                          {entry.entry_type === 'custom_task' && (
                            <span className="text-gray-600 ml-2">• {entry.custom_task_description}</span>
                          )}
                        </div>
                        {entry.description && (
                          <p className="text-sm text-gray-600 mt-1">{entry.description}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {entry.is_billable && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                      Billable
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer with timesheet info */}
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>From week of {new Date(dayEntry.timesheet.week_start_date).toLocaleDateString()}</span>
            <span>Timesheet ID: {dayEntry.timesheet.id}</span>
          </div>
        </div>
      </div>
    ));
  };

  const renderTimesheetForm = () => {
    const availableProjects = projects.filter(p => p.status === 'active');
    const availableTasks = newEntry.project_id
      ? tasks.filter(t => t.project_id === newEntry.project_id)
      : [];

    console.log(`🎯 Task dropdown debug:`);
    console.log(`   Selected project ID: ${newEntry.project_id}`);
    console.log(`   Total tasks in state: ${tasks.length}`);
    console.log(`   Available tasks for this project: ${availableTasks.length}`);
    console.log(`   Available tasks:`, availableTasks.map(t => ({ id: t.id, name: t.name })));

    const selectedProject = projects.find(p => p.id === newEntry.project_id);
    const currentWeekMonday = getMonday(new Date());
    const currentWeekEnd = new Date(currentWeekMonday);
    currentWeekEnd.setDate(currentWeekEnd.getDate() + 6);
    const currentWeekEndISO = currentWeekEnd.toISOString().split('T')[0];
    const weekDates = getWeekDates(formData.week_start_date);

    const customTaskName = newEntry.entry_type === 'custom_task' ? newEntry.custom_task_description || '' : '';
    const setCustomTaskName = (value: string) => {
      setNewEntry(prev => ({ ...prev, custom_task_description: value }));
    };

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-white flex-shrink-0">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-semibold">
                  {formMode === 'create' ? 'Create New Timesheet' :
                    formMode === 'edit' ? 'Edit Timesheet' : 'Timesheet Details'}
                </h3>
                <p className="text-blue-100 text-sm mt-1">
                  {formMode === 'create'
                    ? 'Track your time for this week'
                    : formMode === 'edit'
                      ? 'Update your timesheet entries'
                      : 'Review timesheet entries'
                  }
                </p>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="text-white/80 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6"
            style={{ maxHeight: 'calc(95vh - 140px)' }}>
            {/* Week Selection */}
            {/* Current week bounds used to prevent selecting future weeks */}
            <div className="mb-8">
              <label htmlFor='week-start' className="block text-sm font-semibold text-gray-900 mb-3">
                Week Starting (Monday)
              </label>
              <div className="relative">
                <input
                  type="date"
                  id="week-start"
                  value={formData.week_start_date}
                  // Prevent selecting a week that is after the current week
                  max={currentWeekEndISO}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (!value) return; // Don't process empty values

                    const selectedDate = new Date(value);
                    // Check if the date is valid
                    if (isNaN(selectedDate.getTime())) return;

                    const monday = getMonday(selectedDate);

                    // Check if user selected a non-Monday
                    if (selectedDate.getDay() !== 1) {
                      showWarning(`Please select a Monday. Auto-adjusted to ${monday.toLocaleDateString()}`);
                    }

                    // If the selected week's Monday is after the current week's Monday, block it
                    if (monday.getTime() > currentWeekMonday.getTime()) {
                      showError('Cannot select a future week. Please choose this week or an earlier week.');
                      return;
                    }
                    setFormData(prev => ({
                      ...prev,
                      week_start_date: monday.toISOString().split('T')[0]
                    }));
                  }}
                  disabled={formMode === 'view'}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white text-gray-900 font-medium"
                />
                <div className="mt-2 text-sm text-gray-600">
                  Week: {weekDates[0].toLocaleDateString()} - {weekDates[6].toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Add Time Entry Section */}
            {formMode !== 'view' && (
              <div className="mb-8 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
                <div className="flex items-center mb-6">
                  <div className="bg-blue-100 p-2 rounded-lg mr-3">
                    <Plus className="w-5 h-5 text-blue-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900">Add Time Entry</h4>
                </div>

                {/* Project and Task Selection */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label htmlFor="project-select" className="block text-sm font-semibold text-gray-700 mb-2">
                      Project <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="project-select"
                      value={newEntry.project_id}
                      onChange={(e) => setNewEntry(prev => ({
                        ...prev,
                        project_id: e.target.value,
                        task_id: '',
                        entry_type: 'project_task'
                      }))}
                      disabled={loadingProjects}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white disabled:bg-gray-100"
                    >
                      <option value="">{loadingProjects ? 'Loading projects...' : 'Select a project...'}</option>
                      {availableProjects.map(project => (
                        <option key={project.id} value={project.id}>
                          {project.name} (Active Project)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Task Type
                    </label>
                    <div className="space-y-3">
                      <label className="flex items-center p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                        <input
                          type="radio"
                          name="taskType"
                          checked={newEntry.entry_type === 'project_task'}
                          onChange={() => setNewEntry(prev => ({
                            ...prev,
                            entry_type: 'project_task',
                            task_id: ''
                          }))}
                          className="mr-3 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <div className="font-medium text-gray-900">Predefined Task</div>
                          <div className="text-sm text-gray-500">Choose from project tasks</div>
                        </div>
                      </label>

                      <label className="flex items-center p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                        <input
                          type="radio"
                          name="taskType"
                          checked={newEntry.entry_type === 'custom_task'}
                          onChange={() => setNewEntry(prev => ({
                            ...prev,
                            entry_type: 'custom_task',
                            task_id: ''
                          }))}
                          className="mr-3 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <div className="font-medium text-gray-900">Custom Task</div>
                          <div className="text-sm text-gray-500">Create a custom task for this project</div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Task Selection or Custom Task Input */}
                {newEntry.entry_type === 'project_task' ? (
                  <div className="mb-6">
                    <label htmlFor="task-select" className="block text-sm font-semibold text-gray-700 mb-2">
                      Task <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="task-select"
                      value={newEntry.task_id}
                      onChange={(e) => setNewEntry(prev => ({ ...prev, task_id: e.target.value }))}
                      disabled={!newEntry.project_id}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">Select a task...</option>
                      {availableTasks.map(task => (
                        <option key={task.id} value={task.id}>{task.name}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Custom Task Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={customTaskName}
                      onChange={(e) => setCustomTaskName(e.target.value)}
                      placeholder="e.g., Client meeting, Code review, Documentation..."
                      disabled={!newEntry.project_id}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>
                )}

                {/* Hours and Description */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                  <div>
                    <label htmlFor="hours-input" className="block text-sm font-semibold text-gray-700 mb-2">
                      Hours <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="hours-input"
                      type="number"
                      step="0.5"
                      min="0"
                      max="24"
                      value={newEntry.hours}
                      onChange={(e) => setNewEntry(prev => ({ ...prev, hours: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="0.00"
                      aria-label="Hours"
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <label htmlFor="desc-input" className="block text-sm font-semibold text-gray-700 mb-2">
                      Work Description
                    </label>
                    <textarea
                      id="desc-input"
                      value={newEntry.description}
                      onChange={(e) => setNewEntry(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe what you worked on..."
                      rows={3}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                    />
                  </div>
                </div>

                {/* Project Billing Info */}
                {selectedProject && (
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full mr-2 bg-green-500"></div>
                      <span className="text-sm font-medium text-gray-700">
                        This project is <strong>active and billable</strong>
                      </span>
                    </div>
                  </div>
                )}

                {/* Date Selection */}
                <div className="mb-6">
                  <div className="flex items-center space-x-6 mb-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={!isBulkEntry}
                        onChange={() => setIsBulkEntry(false)}
                        className="mr-2 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-medium text-gray-700">Single Date</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={isBulkEntry}
                        onChange={() => setIsBulkEntry(true)}
                        className="mr-2 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-medium text-gray-700">Multiple Days</span>
                    </label>
                  </div>

                  {!isBulkEntry ? (
                    <div>
                      <label htmlFor="date-input" className="block text-sm font-semibold text-gray-700 mb-2">
                        Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="date-input"
                        type="date"
                        value={newEntry.date}
                        min={formData.week_start_date}
                        max={weekDates[6]?.toISOString().split('T')[0]}
                        onChange={(e) => {
                          const selected = new Date(e.target.value);
                          const selectedMonday = getMonday(selected);
                          const weekStart = new Date(formData.week_start_date);

                          // Check if date is within the selected timesheet week
                          if (selectedMonday.getTime() !== weekStart.getTime()) {
                            showWarning(`Date must be within the selected week (${weekDates[0]?.toLocaleDateString()} - ${weekDates[6]?.toLocaleDateString()})`);
                            return;
                          }

                          // Also check if it's not a future week
                          const currentMonday = getMonday(new Date());
                          if (selectedMonday.getTime() > currentMonday.getTime()) {
                            showError('Cannot select a date in a future week.');
                            return;
                          }
                          setNewEntry(prev => ({ ...prev, date: e.target.value }));
                        }}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Select Days <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-7 gap-2">
                        {weekDates.slice(0, 6).map((date, index) => { // Exclude Sunday (index 6)
                          const dateStr = date.toISOString().split('T')[0];
                          const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                          const isSelected = bulkDates.includes(dateStr);

                          return (
                            <label
                              key={index}
                              className={`flex flex-col items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${isSelected
                                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                              <span className="text-xs font-medium mb-1">{dayNames[index]}</span>
                              <span className="text-xs text-gray-600 mb-2">{date.getDate()}</span>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  const selected = new Date(dateStr);
                                  const selectedMonday = getMonday(selected);
                                  const currentMonday = getMonday(new Date());
                                  if (e.target.checked) {
                                    if (selectedMonday.getTime() > currentMonday.getTime()) {
                                      showError('Cannot select days in a future week.');
                                      return;
                                    }
                                    setBulkDates(prev => [...prev, dateStr]);
                                  } else {
                                    setBulkDates(prev => prev.filter(d => d !== dateStr));
                                  }
                                }}
                                className="rounded text-blue-600 focus:ring-blue-500"
                              />
                            </label>
                          );
                        })}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Sunday is not available for time entry
                      </p>
                    </div>
                  )}
                </div>

                {/* Add Entry Button */}
                <div className="flex justify-end">
                  <button
                    onClick={addTimeEntry}
                    disabled={
                      !newEntry.project_id ||
                      (newEntry.entry_type === 'project_task' && !newEntry.task_id) ||
                      (newEntry.entry_type === 'custom_task' && !customTaskName.trim()) ||
                      newEntry.hours <= 0 ||
                      (!newEntry.date && !isBulkEntry) ||
                      (isBulkEntry && bulkDates.length === 0)
                    }
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center font-medium shadow-lg"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Add Entry
                  </button>
                </div>
              </div>
            )}

            {/* Time Entries List */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-blue-600" />
                  Time Entries ({formData.entries.length})
                </h4>

                {/* View Toggle */}
                {formData.entries.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">View:</span>
                    <div className="bg-gray-100 rounded-lg p-1 flex">
                      <button
                        onClick={() => setEntryViewMode('simple')}
                        className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${entryViewMode === 'simple'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                          }`}
                      >
                        Simple List
                      </button>
                      <button
                        onClick={() => setEntryViewMode('grouped')}
                        className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${entryViewMode === 'grouped'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                          }`}
                      >
                        Grouped by Project
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {formData.entries.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No time entries yet</h3>
                  <p className="text-gray-500">Add your first time entry using the form above</p>
                </div>
              ) : entryViewMode === 'simple' ? (
                <div className="space-y-3">
                  {formData.entries.map((entry, index) => {
                    const project = projects.find(p => p.id === entry.project_id);
                    const task = tasks.find(t => t.id === entry.task_id);

                    return (
                      <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded">
                                {new Date(entry.date).toLocaleDateString('en-US', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </span>
                              <span className="text-lg font-semibold text-gray-900">
                                {entry.hours}h
                              </span>
                              {entry.is_billable && (
                                <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded">
                                  Billable
                                </span>
                              )}
                            </div>
                            <div className="text-gray-900 font-medium mb-1">
                              <span className="text-blue-600">{project?.name}</span> - {' '}
                              {entry.entry_type === 'project_task'
                                ? task?.name
                                : entry.custom_task_description
                              }
                            </div>
                            {entry.description && (
                              <div className="text-gray-600 text-sm">
                                {entry.description}
                              </div>
                            )}
                          </div>

                          {formMode !== 'view' && (
                            <div className="flex items-center space-x-2">
                              {/* Copy to Week Dropdown */}
                              <div className="relative group">
                                <button
                                  className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                                  title="Copy this entry to multiple days"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>

                                {/* Dropdown Menu */}
                                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                                  <div className="p-2">
                                    <button
                                      onClick={() => copyEntryToWeek(entry)}
                                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 rounded-md transition-colors flex items-center"
                                    >
                                      <Copy className="w-3 h-3 mr-2" />
                                      Copy to Weekdays (M-F)
                                    </button>
                                    <button
                                      onClick={() => copyEntryToFullWeek(entry)}
                                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 rounded-md transition-colors flex items-center"
                                    >
                                      <Copy className="w-3 h-3 mr-2" />
                                      Copy to Full Week (M-Su)
                                    </button>
                                  </div>
                                </div>
                              </div>

                              <button
                                onClick={() => removeTimeEntry(index)}
                                className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                                title="Remove entry"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Grouped View */
                <div className="space-y-4">
                  {Object.entries(groupEntriesByProjectTask(formData.entries)).map(([groupKey, groupEntries]) => {
                    const firstEntry = groupEntries[0];
                    const project = projects.find(p => p.id === firstEntry.project_id);
                    const taskName = firstEntry.entry_type === 'project_task'
                      ? tasks.find(t => t.id === firstEntry.task_id)?.name || 'Unknown Task'
                      : firstEntry.custom_task_description || 'Custom Task';
                    const totalHours = groupEntries.reduce((sum, entry) => sum + entry.hours, 0);

                    return (
                      <div key={groupKey} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                        {/* Group Header */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-gray-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <h5 className="font-semibold text-gray-900">
                                <span className="text-blue-600">{project?.name}</span> - {taskName}
                              </h5>
                              <p className="text-sm text-gray-600">{groupEntries.length} entries, {totalHours}h total</p>
                            </div>
                            {formMode !== 'view' && (
                              <div className="relative group">
                                <button
                                  className="p-2 text-green-600 hover:text-green-800 hover:bg-green-100 rounded-lg transition-colors"
                                  title="Copy this project-task combination to multiple days"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>

                                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                                  <div className="p-2">
                                    <button
                                      onClick={() => copyEntryToWeek(firstEntry)}
                                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 rounded-md transition-colors flex items-center"
                                    >
                                      <Copy className="w-3 h-3 mr-2" />
                                      Copy to Weekdays (M-F)
                                    </button>
                                    <button
                                      onClick={() => copyEntryToFullWeek(firstEntry)}
                                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 rounded-md transition-colors flex items-center"
                                    >
                                      <Copy className="w-3 h-3 mr-2" />
                                      Copy to Full Week (M-Su)
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Group Entries */}
                        <div className="p-4 space-y-2">
                          {groupEntries.map((entry, index) => {
                            const originalIndex = formData.entries.findIndex(e =>
                              e.date === entry.date &&
                              e.project_id === entry.project_id &&
                              e.hours === entry.hours
                            );

                            return (
                              <div key={`${groupKey}-${index}`} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                <div className="flex items-center space-x-3">
                                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
                                    {new Date(entry.date).toLocaleDateString('en-US', {
                                      weekday: 'short',
                                      month: 'short',
                                      day: 'numeric'
                                    })}
                                  </span>
                                  <span className="font-semibold text-gray-900">{entry.hours}h</span>
                                  {entry.is_billable && (
                                    <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded">
                                      Billable
                                    </span>
                                  )}
                                  {entry.description && (
                                    <span className="text-sm text-gray-600">- {entry.description}</span>
                                  )}
                                </div>

                                {formMode !== 'view' && (
                                  <button
                                    onClick={() => removeTimeEntry(originalIndex)}
                                    className="p-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded transition-colors"
                                    title="Remove entry"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Total Hours Summary */}
            {formData.entries.length > 0 && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-blue-900 font-medium">Total Hours:</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {formData.entries.reduce((sum, entry) => sum + entry.hours, 0)}h
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Footer - Always visible at bottom */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end space-x-3 flex-shrink-0 rounded-b-xl">
            <button
              onClick={() => setShowForm(false)}
              className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              {formMode === 'view' ? 'Close' : 'Cancel'}
            </button>
            {formMode !== 'view' && (
              <button
                onClick={handleSubmitTimesheet}
                disabled={formData.entries.length === 0}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center font-medium shadow-lg"
              >
                <Save className="w-4 h-4 mr-2" />
                {formMode === 'create' ? 'Create Timesheet' : 'Update Timesheet'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render functions need to be declared before the main return statement
  const renderCreateView = () => {
    const existingTimesheets = timesheets.filter(ts =>
      ['draft', 'manager_rejected', 'management_rejected'].includes(ts.status)
    );

    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{titles.title}</h2>
            <p className="text-gray-600">{titles.subtitle}</p>
          </div>

          {existingTimesheets.length > 0 && (
            <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
                <div>
                  <h3 className="font-medium text-yellow-800">Existing Draft/Rejected Timesheets Found</h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    You have {existingTimesheets.length} timesheet(s) in draft or rejected state.
                    You can continue working on them or start fresh.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              onClick={createNewTimesheet}
              className="p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
            >
              <div className="text-center">
                <Plus className="w-12 h-12 text-gray-400 group-hover:text-blue-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Create New Timesheet</h3>
                <p className="text-gray-500">Start with a fresh timesheet for this week</p>
              </div>
            </button>

            {existingTimesheets.length > 0 && (
              <button
                onClick={() => setShowTimesheetSelection(true)}
                className="p-6 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all group"
              >
                <div className="text-center">
                  <Edit className="w-12 h-12 text-gray-400 group-hover:text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Continue Existing</h3>
                  <p className="text-gray-500">
                    Work on your {existingTimesheets.length} draft/rejected timesheet(s)
                  </p>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderTimesheetSelectionModal = () => {
    const existingTimesheets = timesheets.filter(ts =>
      ['draft', 'manager_rejected', 'management_rejected'].includes(ts.status)
    );

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 text-white">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-semibold">Select Timesheet to Continue</h3>
                <p className="text-green-100 text-sm mt-1">Choose an existing timesheet or create new</p>
              </div>
              <button
                onClick={() => setShowTimesheetSelection(false)}
                className="text-white/80 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="p-6 max-h-96 overflow-y-auto">
            <div className="space-y-3">
              {existingTimesheets.map((timesheet) => (
                <button
                  key={timesheet.id}
                  onClick={() => handleTimesheetSelection(timesheet)}
                  className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Week of {new Date(timesheet.week_start_date).toLocaleDateString()}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {timesheet.total_hours} hours • {timesheet.time_entries.length} entries
                      </p>
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium mt-2 ${getStatusColor(timesheet.status)}`}>
                        {timesheet.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <button
              onClick={() => handleTimesheetSelection(null)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create New Timesheet Instead
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderDayEntriesModal = () => {
    if (!selectedDay) return null;

    const dayEntries = getDayEntries(selectedDay);
    const dayData = calendarData[selectedDay];

    // Fix timezone issue by parsing the date string properly
    const [year, month, day] = selectedDay.split('-').map(Number);
    const selectedDate = new Date(year, month - 1, day); // month is 0-indexed

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 text-white">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-semibold">
                  {selectedDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric'
                  })}
                </h3>
                <p className="text-purple-100 text-sm mt-1">
                  {dayData?.hours || 0} hours logged • {selectedDay}
                </p>
              </div>
              <button
                onClick={() => setShowDayEntries(false)}
                className="text-white/80 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="p-6 max-h-96 overflow-y-auto">
            {dayEntries.length > 0 ? (
              <div className="space-y-3">
                {dayEntries.map((entry, index) => {
                  const project = projects.find(p => p.id === entry.project_id);
                  const task = tasks.find(t => t.id === entry.task_id);

                  return (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-lg text-blue-600">{entry.hours}h</span>
                        {entry.is_billable && (
                          <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded">
                            Billable
                          </span>
                        )}
                      </div>
                      <div className="text-gray-900 font-medium">
                        {project?.name}
                      </div>
                      <div className="text-gray-600 text-sm">
                        {entry.entry_type === 'project_task'
                          ? task?.name
                          : entry.custom_task_description
                        }
                      </div>
                      {entry.description && (
                        <div className="text-gray-500 text-sm mt-2">
                          {entry.description}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No entries for this day</h3>
                <p className="text-gray-500">No time has been logged for this date.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {titles.title}
          </h1>
          <p className="text-gray-600 mt-1">
            {titles.subtitle}
          </p>
        </div>
      </div>

      {/* Main Content */}
      {viewMode === 'calendar' ? renderCalendarView() :
        viewMode === 'list' ? renderListView() :
          viewMode === 'create' ? (showForm ? renderTimesheetForm() : renderCreateView()) : null}

      {/* Timesheet Form Modal */}
      {showForm && viewMode !== 'create' && renderTimesheetForm()}

      {/* Timesheet Selection Modal */}
      {showTimesheetSelection && renderTimesheetSelectionModal()}

      {/* Day Entries Modal */}
      {showDayEntries && selectedDay && renderDayEntriesModal()}
    </div>
  );
};

export default EmployeeTimesheet;