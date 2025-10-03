/**
 * Employee Timesheet Page
 *
 * Main page for employees to manage their timesheets.
 * Refactored version using new modular components.
 *
 * Original: EmployeeTimesheet.tsx (2,497 lines, CC >18)
 * Refactored: EmployeeTimesheetPage.tsx (250 lines, CC <10)
 *
 * Improvements:
 * - Reduced from 2,497 to ~250 lines (90% reduction)
 * - Cognitive Complexity from >18 to <10
 * - Uses React Hook Form instead of 20+ useState hooks
 * - Modular component architecture
 * - Centralized validation with Zod schemas
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../store/contexts/AuthContext';
import { TimesheetApprovalService } from '../../services/TimesheetApprovalService';
import ProjectService from '../../services/ProjectService';
import { showSuccess, showError } from '../../utils/toast';
import { useModal } from '../../hooks/useModal';
import { Button } from '../../components/ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { Modal } from '../../components/ui/Modal';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { PageHeader } from '../../components/shared/PageHeader';
import {
  TimesheetForm,
  TimesheetCalendar,
  TimesheetList,
  type Timesheet
} from '../../components/timesheet';
import { Calendar, List, Plus } from 'lucide-react';

type ViewMode = 'calendar' | 'list';

export const EmployeeTimesheetPage: React.FC = () => {
  const { currentUser } = useAuth();
  const createModal = useModal();
  const editModal = useModal();

  // State
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [weekStartDate, setWeekStartDate] = useState(getCurrentWeekMonday());
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [selectedTimesheet, setSelectedTimesheet] = useState<Timesheet | null>(null);
  const [projects, setProjects] = useState<Array<{ id: string; name: string; is_active: boolean; color?: string }>>([]);
  const [tasks, setTasks] = useState<Array<{ id: string; name: string; project_id: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch data
  useEffect(() => {
    loadData();
  }, [currentUser?.id]);

  const loadData = async () => {
    if (!currentUser?.id) return;

    setIsLoading(true);
    try {
      const [timesheetsData, projectsData, tasksData] = await Promise.all([
        TimesheetApprovalService.getEmployeeTimesheets(currentUser.id),
        ProjectService.getAllProjects(),
        ProjectService.getAllTasks()
      ]);

      setTimesheets(mapTimesheetsToListFormat(timesheetsData));
      setProjects(projectsData);
      setTasks(tasksData);
    } catch (error) {
      console.error('Error loading data:', error);
      showError('Failed to load timesheets');
    } finally {
      setIsLoading(false);
    }
  };

  // Map timesheet data to list format
  const mapTimesheetsToListFormat = (data: any[]): Timesheet[] => {
    return data.map(ts => ({
      id: ts.id,
      week_start_date: ts.week_start_date,
      week_end_date: ts.week_end_date || getWeekEndDate(ts.week_start_date),
      total_hours: ts.total_hours || 0,
      status: ts.status,
      submitted_at: ts.submitted_at,
      approved_at: ts.approved_at,
      approved_by: ts.approved_by_name,
      rejection_reason: ts.rejection_reason,
      created_at: ts.created_at
    }));
  };

  // Get entries for calendar view
  const getCalendarEntries = useCallback(() => {
    return timesheets
      .filter(ts => isInCurrentWeek(ts.week_start_date, weekStartDate))
      .flatMap(ts => ts.entries || []);
  }, [timesheets, weekStartDate]);

  // Handle form success
  const handleCreateSuccess = async (timesheetId: string) => {
    showSuccess('Timesheet created successfully');
    createModal.close();
    await loadData();
  };

  const handleEditSuccess = async (timesheetId: string) => {
    showSuccess('Timesheet updated successfully');
    editModal.close();
    setSelectedTimesheet(null);
    await loadData();
  };

  // Handle timesheet actions
  const handleTimesheetClick = (timesheet: Timesheet) => {
    setSelectedTimesheet(timesheet);
    editModal.open();
  };

  const handleEdit = (timesheet: Timesheet) => {
    setSelectedTimesheet(timesheet);
    editModal.open();
  };

  const handleDelete = async (timesheet: Timesheet) => {
    if (!confirm('Are you sure you want to delete this timesheet?')) return;

    try {
      await TimesheetApprovalService.deleteTimesheet(timesheet.id);
      showSuccess('Timesheet deleted successfully');
      await loadData();
    } catch (error) {
      console.error('Error deleting timesheet:', error);
      showError('Failed to delete timesheet');
    }
  };

  const handleWeekChange = (newWeekStart: string) => {
    setWeekStartDate(newWeekStart);
  };

  // Loading state
  if (isLoading) {
    return <LoadingSpinner fullscreen text="Loading timesheets..." />;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <PageHeader
        title="My Timesheets"
        description="Track your time and manage your weekly timesheets"
        action={
          <Button icon={Plus} onClick={createModal.open}>
            New Timesheet
          </Button>
        }
      />

      {/* View Tabs */}
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
        <TabsList>
          <TabsTrigger value="calendar" icon={Calendar}>
            Calendar View
          </TabsTrigger>
          <TabsTrigger value="list" icon={List}>
            List View
          </TabsTrigger>
        </TabsList>

        {/* Calendar View */}
        <TabsContent value="calendar">
          <TimesheetCalendar
            weekStartDate={weekStartDate}
            entries={getCalendarEntries()}
            projects={projects}
            onWeekChange={handleWeekChange}
            onEntryClick={(entry) => {
              // Find and open the timesheet containing this entry
              const timesheet = timesheets.find(ts =>
                ts.entries?.some(e => e.id === entry.id)
              );
              if (timesheet) handleTimesheetClick(timesheet);
            }}
            onDayClick={(date) => {
              // Could open create modal with pre-selected date
              createModal.open();
            }}
          />
        </TabsContent>

        {/* List View */}
        <TabsContent value="list">
          <TimesheetList
            timesheets={timesheets}
            viewMode="list"
            showFilters={true}
            enablePagination={true}
            itemsPerPage={10}
            onTimesheetClick={handleTimesheetClick}
            onEdit={handleEdit}
            onDelete={handleDelete}
            showActions={true}
          />
        </TabsContent>
      </Tabs>

      {/* Create Timesheet Modal */}
      <Modal
        isOpen={createModal.isOpen}
        onClose={createModal.close}
        title="Create New Timesheet"
        size="xl"
      >
        <TimesheetForm
          initialWeekStartDate={weekStartDate}
          projects={projects}
          tasks={tasks}
          onSuccess={handleCreateSuccess}
          onCancel={createModal.close}
        />
      </Modal>

      {/* Edit Timesheet Modal */}
      <Modal
        isOpen={editModal.isOpen}
        onClose={editModal.close}
        title="Edit Timesheet"
        size="xl"
      >
        {selectedTimesheet && (
          <TimesheetForm
            initialData={{
              week_start_date: selectedTimesheet.week_start_date,
              entries: selectedTimesheet.entries || []
            }}
            projects={projects}
            tasks={tasks}
            onSuccess={handleEditSuccess}
            onCancel={editModal.close}
          />
        )}
      </Modal>
    </div>
  );
};

// Helper functions
function getCurrentWeekMonday(): string {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(today.setDate(diff));
  return monday.toISOString().split('T')[0];
}

function getWeekEndDate(weekStartDate: string): string {
  const startDate = new Date(weekStartDate);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 4); // Friday (4 days after Monday)
  return endDate.toISOString().split('T')[0];
}

function isInCurrentWeek(timesheetWeekStart: string, currentWeekStart: string): boolean {
  return timesheetWeekStart === currentWeekStart;
}
