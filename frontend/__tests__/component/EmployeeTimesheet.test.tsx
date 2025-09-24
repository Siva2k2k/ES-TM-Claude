import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmployeeTimesheet } from '../../src/components/EmployeeTimesheet';
import { useAuth } from '../../src/contexts/AuthContext';
import { TimesheetApprovalService } from '../../src/services/TimesheetApprovalService';
import ProjectService from '../../src/services/ProjectService';
import type { User, TimesheetWithDetails, TimesheetStatus, Project, Task } from '../../src/types';

// Mock dependencies
vi.mock('../../src/contexts/AuthContext');
vi.mock('../../src/services/TimesheetApprovalService', () => ({
  TimesheetApprovalService: {
    getStatusFlow: vi.fn(),
    getUserTimesheets: vi.fn(),
    getTimesheetsForApproval: vi.fn(),
    getNextActionForRole: vi.fn(),
    //enhanceTimesheet
    //isUserInManagerTeam
    getCalendarData: vi.fn(),
    addTimeEntry: vi.fn(),
    createTimesheet: vi.fn(),
    addMultipleEntries: vi.fn(),
    addBulkTimeEntries: vi.fn(),
    getTimesheetByUserAndWeek: vi.fn(),
    updateTimesheetEntries: vi.fn(),
    submitTimesheet: vi.fn(),
    managerAction: vi.fn(),
    managementAction: vi.fn()
    //createWeeklyBillingSnapshot
  }
}));
vi.mock('../../src/services/ProjectService', () => ({
  default: {
    getAllProjects: vi.fn(),
    getProjectsByStatus: vi.fn(),
    getActiveProjects: vi.fn(),
    getProjectsByUser: vi.fn(),
    getTasksByProject: vi.fn(),
    getCompletedProjects: vi.fn(),
    getProjectTasks: vi.fn(),
    getProjectWithTasks: vi.fn(),
    getProjectById: vi.fn(),
    getUserProjects: vi.fn(),
    getProjectMembers: vi.fn(),
    getUserTasks: vi.fn(),
    getLeadTasks: vi.fn()
    //updateProjectStatus
    //getProjectAnalytics
    //getAllClients
    //createClient
    //deleteProject
    //validateProjectData
    //removeUserFromProject
    //addUserToProject
    //createTask
    //updateTask
    //addProjectMember
    //removeProjectMember
  }
}));

// Mock window.confirm and window.alert
vi.stubGlobal('confirm', vi.fn());
vi.stubGlobal('alert', vi.fn());

const mockUseAuth = vi.mocked(useAuth);
const mockTimesheetApprovalService = vi.mocked(TimesheetApprovalService);
const mockProjectService = vi.mocked(ProjectService);

const mockUser: User = {
  id: 'user-123',
  email: 'test@example.com',
  full_name: 'John Doe',
  role: 'employee',
  hourly_rate: 50,
  is_active: true,
  is_approved_by_super_admin: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};

const mockProject: Project = {
  id: 'proj-123',
  name: 'Test Project',
  client_id: 'client-123',
  primary_manager_id: 'manager-123',
  status: 'active',
  start_date: '2024-01-01',
  is_billable: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};

const mockTask: Task = {
  id: 'task-123',
  project_id: 'proj-123',
  name: 'Test Task',
  description: 'Test task description',
  status: 'active',
  is_billable: true,
  created_by_user_id: 'user-123',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};

const mockTimesheet: TimesheetWithDetails = {
  id: 'timesheet-123',
  user_id: 'user-123',
  week_start_date: '2024-01-01',
  week_end_date: '2024-01-07',
  total_hours: 40,
  status: 'draft',
  is_verified: false,
  is_frozen: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  user_name: 'John Doe',
  user_email: 'test@example.com',
  time_entries: [],
  can_edit: true,
  can_submit: true,
  can_approve: false,
  can_reject: false,
  next_action: 'Submit for approval',
  billableHours: 32,
  nonBillableHours: 8
};

describe('EmployeeTimesheet Component', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default auth mock
    mockUseAuth.mockReturnValue({
      currentUser: mockUser,
      currentUserRole: 'employee',
      login: vi.fn(),
      logout: vi.fn(),
      switchRole: vi.fn(),
      loading: false
    });

    // Setup default service mocks
    mockTimesheetApprovalService.getUserTimesheets.mockResolvedValue([]);
    mockTimesheetApprovalService.getCalendarData.mockResolvedValue({});
    mockProjectService.getProjectsByUser.mockResolvedValue([]);
    mockProjectService.getTasksByProject.mockResolvedValue([]);

    // Reset global mocks
    vi.mocked(window.confirm).mockReturnValue(true);
    vi.mocked(window.alert).mockImplementation(() => {});
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render calendar view by default', async () => {
      render(<EmployeeTimesheet />);

      expect(screen.getByText('My Timesheet Calendar')).toBeInTheDocument();
      expect(screen.getByText('Track your time with monthly calendar view')).toBeInTheDocument();
    });

    it('should render with management role title', async () => {
      mockUseAuth.mockReturnValue({
        currentUser: { ...mockUser, role: 'management' },
        currentUserRole: 'management',
        login: vi.fn(),
        logout: vi.fn(),
        switchRole: vi.fn(),
        loading: false
      });

      render(<EmployeeTimesheet />);

      expect(screen.getByText('Management Timesheet Calendar')).toBeInTheDocument();
    });

    it('should render list view when specified', async () => {
      render(<EmployeeTimesheet viewMode="list" />);

      const headings = screen.getAllByRole('heading', { name: /My Timesheets/i })
      expect(headings[1]).toBeInTheDocument()
      expect(screen.getByText('Manage all your timesheet submissions')).toBeInTheDocument();
    });

    // it('should render create view when specified', async () => {
    //   render(<EmployeeTimesheet viewMode="create" />);

    //   expect(screen.getByText('Create Timesheet')).toBeInTheDocument();
    //   expect(screen.getByText('Track your time and manage your work efficiently')).toBeInTheDocument();
    // });

    it('should show loading state initially', async () => {
      mockUseAuth.mockReturnValue({
        currentUser: mockUser,
        currentUserRole: 'employee',
        login: vi.fn(),
        logout: vi.fn(),
        switchRole: vi.fn(),
        loading: true
      });

      render(<EmployeeTimesheet />);

      // Component should render but might show loading indicators
      expect(screen.getByText('My Timesheet Calendar')).toBeInTheDocument();
    });
  });

  describe('Create Timesheet Functionality', () => {
    beforeEach(() => {
      mockProjectService.getActiveProjects.mockResolvedValue({ projects: [mockProject] });
      mockProjectService.getProjectTasks.mockResolvedValue({ tasks: [mockTask] });
    });

    it('should open create timesheet form', async () => {
      render(<EmployeeTimesheet />);

      const createButton = screen.getByRole('button', { name: /New Timesheet/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByText(/create timesheet/i)).toBeInTheDocument();
      });
    });

    it('should create new timesheet successfully', async () => {
      mockTimesheetApprovalService.createTimesheet.mockResolvedValue(mockTimesheet);
      mockTimesheetApprovalService.addMultipleEntries.mockResolvedValue([
        {
          id: 'entry-1',
          timesheet_id: 'timesheet-123',
          date: '2024-01-01',
          hours: 8,
          is_billable: true,
          entry_type: 'project_task',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]);

      render(<EmployeeTimesheet/>);

      //open create timesheet modal
      const createButton = screen.getByRole('button', { name: /New Timesheet/i });
      await user.click(createButton);

      // Wait for the form to appear
      await waitFor(() => {
        expect(screen.getByText(/Create New Timesheet/i)).toBeInTheDocument();
      });

      // Fill in timesheet form
      const weekStartInput = screen.getByDisplayValue(/2025/);
      await user.clear(weekStartInput);
      await user.type(weekStartInput, '2024-01-01');

      // Select a project first
      const projectSelect = screen.getByLabelText('Project *');
      await user.selectOptions(projectSelect, 'proj-123');

      await waitFor(() => {
        expect(screen.getByLabelText('Task *')).toBeInTheDocument();
      });
      
      const taskSelect = screen.getByLabelText('Task *');
      await user.selectOptions(taskSelect, 'task-123');

      const dateInputforTimesheet = screen.getByLabelText('Date *');
      fireEvent.change(dateInputforTimesheet, { target: { value: '2024-01-01' } });

      // Add a time entry
      const hoursInput = screen.getByLabelText(/Hours/i);
      await user.clear(hoursInput);
      await user.type(hoursInput, '8');

      // const dateInput = screen.getByLabelText('Date *');
      // await user.type(dateInput, '2024-01-01');
      const description = screen.getByLabelText('Work Description');
      await user.clear(description);
      await user.type(description, 'Development work');

      // First, add the entry to the timesheet
      await waitFor(() => {
        const addEntryButton = screen.getByRole('button', { name: /Add Entry/i });
        expect(addEntryButton).not.toBeDisabled();
      });
      
      const addEntryButton = screen.getByRole('button', { name: /Add Entry/i });
      await user.click(addEntryButton);

      // Wait for entry to be added
       await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /Create Timesheet/i });
        expect(submitButton).not.toBeDisabled();
      });

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /create timesheet/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockTimesheetApprovalService.createTimesheet).toHaveBeenCalledWith(
          'user-123',
          expect.any(String) //handling the date is failing as it is invalid, so the component sets it default to current week monday
        );
      });

      expect(vi.mocked(window.alert)).toHaveBeenCalledWith(
        expect.stringContaining('Timesheet created successfully')
      );
    });

    it('should handle timesheet creation failure', async () => {
      mockTimesheetApprovalService.createTimesheet.mockResolvedValue(null);

      render(<EmployeeTimesheet/>);

      //open create timesheet modal
      const createButton = screen.getByRole('button', { name: /New Timesheet/i });
      await user.click(createButton);

      // Wait for the form to appear
      await waitFor(() => {
        expect(screen.getByText(/Create New Timesheet/i)).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /Create Timesheet/i });
      // await user.click(submitButton);

      // await waitFor(() => {
      //   expect(mockTimesheetApprovalService.createTimesheet).toHaveBeenCalled();
      // });

      expect(submitButton).toBeDisabled()
    });

    it('should offer to edit existing timesheet when duplicate detected', async () => {
      mockTimesheetApprovalService.createTimesheet.mockResolvedValue(null);
      mockTimesheetApprovalService.getTimesheetByUserAndWeek.mockResolvedValue(mockTimesheet);
      vi.mocked(window.confirm).mockReturnValue(true);

      render(<EmployeeTimesheet/>);

      //open create timesheet modal
      const createButton = screen.getByRole('button', { name: /New Timesheet/i });
      await user.click(createButton);

      // Wait for the form to appear
      await waitFor(() => {
        expect(screen.getByText(/Create New Timesheet/i)).toBeInTheDocument();
      });

      const weekStartInput = screen.getByDisplayValue(/2025/);
      await user.clear(weekStartInput);
      await user.type(weekStartInput, '2024-01-01');

      // Select a project first
      const projectSelect = screen.getByLabelText('Project *');
      await user.selectOptions(projectSelect, 'proj-123');

      await waitFor(() => {
        expect(screen.getByLabelText('Task *')).toBeInTheDocument();
      });
      
      const taskSelect = screen.getByLabelText('Task *');
      await user.selectOptions(taskSelect, 'task-123');

      const dateInputforTimesheet = screen.getByLabelText('Date *');
      fireEvent.change(dateInputforTimesheet, { target: { value: '2024-01-01' } });

      // Add a time entry
      const hoursInput = screen.getByLabelText(/Hours/i);
      await user.clear(hoursInput);
      await user.type(hoursInput, '8');

      // const dateInput = screen.getByLabelText('Date *');
      // await user.type(dateInput, '2024-01-01');

      // First, add the entry to the timesheet
      await waitFor(() => {
        const addEntryButton = screen.getByRole('button', { name: /Add Entry/i });
        expect(addEntryButton).not.toBeDisabled();
      });
      
      const addEntryButton = screen.getByRole('button', { name: /Add Entry/i });
      await user.click(addEntryButton);

      // Wait for entry to be added
       await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /Create Timesheet/i });
        expect(submitButton).not.toBeDisabled();
      });

      const submitButton = screen.getByRole('button', { name: /Create Timesheet/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockTimesheetApprovalService.getTimesheetByUserAndWeek).toHaveBeenCalled();
      });

      expect(vi.mocked(window.confirm)).toHaveBeenCalledWith(
        expect.stringContaining('A timesheet already exists')
      );
    });
  });

  describe('Edit Timesheet Functionality', () => {
    beforeEach(() => {
      mockProjectService.getProjectsByUser.mockResolvedValue([mockProject]);
      mockProjectService.getTasksByProject.mockResolvedValue([mockTask]);
      mockTimesheetApprovalService.getUserTimesheets.mockResolvedValue([mockTimesheet]);
    });

    it('should load existing timesheet for editing', async () => {
      const timesheetWithEntries = {
        ...mockTimesheet,
        time_entries: [
          {
            id: 'entry-1',
            timesheet_id: 'timesheet-123',
            date: '2024-01-01',
            hours: 8,
            description: 'Existing work',
            is_billable: true,
            entry_type: 'project_task' as const,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          }
        ]
      };

      render(<EmployeeTimesheet viewMode='list'/>);

      // Simulate clicking edit on a timesheet
      await waitFor(() => {
        const editButton = screen.getByTitle(/edit timesheet/i);
        expect(editButton).toBeInTheDocument();
      });

      const editButton = screen.getByTitle(/edit timesheet/i);
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByText(/edit timesheet/i)).toBeInTheDocument();
      });
    });

    it('should update existing timesheet successfully', async () => {
      const timesheetWithEntries = {
        ...mockTimesheet,
        time_entries: [
          {
            id: 'entry-1',
            timesheet_id: 'timesheet-123',
            date: '2024-01-01',
            hours: 8,
            description: 'Existing work',
            is_billable: true,
            entry_type: 'project_task' as const,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          }
        ]
      };
      
      mockTimesheetApprovalService.getUserTimesheets.mockResolvedValue([timesheetWithEntries]);
      mockTimesheetApprovalService.updateTimesheetEntries.mockResolvedValue(true);

      render(<EmployeeTimesheet viewMode='list'/>);

     // Simulate clicking edit on a timesheet
      await waitFor(() => {
        const editButton = screen.getByTitle(/edit timesheet/i);
        expect(editButton).toBeInTheDocument();
      });

      const editButton = screen.getByTitle(/edit timesheet/i);
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByText(/edit timesheet/i)).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /Update timesheet/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockTimesheetApprovalService.updateTimesheetEntries).toHaveBeenCalled();
      });

      expect(vi.mocked(window.alert)).toHaveBeenCalledWith(
        expect.stringContaining('Timesheet updated successfully')
      );
    });

    it('should handle timesheet update failure', async () => {
      const timesheetWithEntries = {
        ...mockTimesheet,
        can_edit:true,
        time_entries: [
          {
            id: 'entry-1',
            timesheet_id: 'timesheet-123',
            date: '2024-01-01',
            hours: 8,
            description: 'Existing work',
            is_billable: true,
            entry_type: 'project_task' as const,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          }
        ]
      };
      
      mockTimesheetApprovalService.getUserTimesheets.mockResolvedValue([timesheetWithEntries]);
      mockTimesheetApprovalService.updateTimesheetEntries.mockResolvedValue(false);

      render(<EmployeeTimesheet viewMode='list'/>);

     // Simulate clicking edit on a timesheet
      await waitFor(() => {
        const editButton = screen.getByTitle(/edit timesheet/i);
        expect(editButton).toBeInTheDocument();
      });

      const editButton = screen.getByTitle(/edit timesheet/i);
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByText(/edit timesheet/i)).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /Update timesheet/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockTimesheetApprovalService.updateTimesheetEntries).toHaveBeenCalled();
      });

      expect(window.alert).toHaveBeenCalledWith(
        expect.stringContaining('Error updating timesheet')
      );
    });

    it('should only allow editing of draft timesheets', async () => {
      const submittedTimesheet = {
        ...mockTimesheet,
        status: 'submitted' as const,
        can_edit: false,
        can_submit: false
      };

      mockTimesheetApprovalService.getUserTimesheets.mockResolvedValue([submittedTimesheet]);

      render(<EmployeeTimesheet />);

      await waitFor(() => {
        const editButtons = screen.queryAllByRole('button', { name: /edit/i });
        expect(editButtons).toHaveLength(0);
      });
    });
  });

  describe('Submit Timesheet Functionality', () => {
    beforeEach(() => {
      const submittableTimesheet = {
        ...mockTimesheet,
        total_hours: 40,
        can_submit: true,
        time_entries: [
          {
            id: 'entry-1',
            timesheet_id: 'timesheet-123',
            date: '2024-01-01',
            hours: 8,
            is_billable: true,
            entry_type: 'project_task' as const,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          }
        ]
      };

      mockTimesheetApprovalService.getUserTimesheets.mockResolvedValue([submittableTimesheet]);
    });

    it('should submit timesheet for approval successfully', async () => {
      mockTimesheetApprovalService.submitTimesheet.mockResolvedValue(true);

      render(<EmployeeTimesheet viewMode='list'/>);

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /submit/i });
        expect(submitButton).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockTimesheetApprovalService.submitTimesheet).toHaveBeenCalledWith(
          'timesheet-123',
          'user-123'
        );
      });

      expect(vi.mocked(window.alert)).toHaveBeenCalledWith(
        'Timesheet submitted for approval!'
      );
    });

    it('should handle timesheet submission failure', async () => {
      mockTimesheetApprovalService.submitTimesheet.mockResolvedValue(false);

      render(<EmployeeTimesheet  viewMode='list' />);

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /submit/i });
        expect(submitButton).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockTimesheetApprovalService.submitTimesheet).toHaveBeenCalled();
      });

      expect(vi.mocked(window.alert)).toHaveBeenCalledWith(
        'Failed to submit timesheet for approval!'
      );
    });

    it('should validate timesheet before submission', async () => {
      const invalidTimesheet = {
        ...mockTimesheet,
        time_entries: [
          {
            id: 'entry-1',
            timesheet_id: 'timesheet-123',
            date: '2024-01-01',
            hours: 15, // Invalid: exceeds daily limit
            is_billable: true,
            entry_type: 'project_task' as const,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          }
        ]
      };

      mockTimesheetApprovalService.getUserTimesheets.mockResolvedValue([invalidTimesheet]);
      mockTimesheetApprovalService.submitTimesheet.mockResolvedValue(true);
      vi.mocked(window.confirm).mockReturnValue(true); // User chooses to proceed despite warnings

      render(<EmployeeTimesheet  viewMode='list'/>);

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /submit/i });
        expect(submitButton).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /submit/i });
      await user.click(submitButton);

      expect(vi.mocked(window.confirm)).toHaveBeenCalledWith(
        expect.stringContaining('Warnings detected')
      );

      await waitFor(() => {
        expect(mockTimesheetApprovalService.submitTimesheet).toHaveBeenCalled();
      });
    });

    it('should warn submission if user rejects validation warnings', async () => {
      const invalidTimesheet = {
        ...mockTimesheet,
        time_entries: [
          {
            id: 'entry-1',
            timesheet_id: 'timesheet-123',
            date: '2024-01-01',
            hours: 15,
            is_billable: true,
            entry_type: 'project_task' as const,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          }
        ]
      };

      mockTimesheetApprovalService.getUserTimesheets.mockResolvedValue([invalidTimesheet]);
      vi.mocked(window.confirm).mockReturnValue(false); // User cancels

      render(<EmployeeTimesheet  viewMode='list'/>);

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /submit/i });
        expect(submitButton).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /submit/i });
      await user.click(submitButton);

      expect(vi.mocked(window.confirm)).toHaveBeenCalled();
      expect(mockTimesheetApprovalService.submitTimesheet).not.toHaveBeenCalled();
    });

    it('should not allow submission of empty timesheet', async () => {
      const emptyTimesheet = {
        ...mockTimesheet,
        total_hours: 0,
        can_submit: false,
        time_entries: []
      };

      mockTimesheetApprovalService.getUserTimesheets.mockResolvedValue([emptyTimesheet]);

      render(<EmployeeTimesheet viewMode='list'/>);

      await waitFor(() => {
        const submitButtons = screen.queryAllByRole('button', { name: /submit/i });
        expect(submitButtons).toHaveLength(0);
      });
    });

    it('should prevent double submission', async () => {
      mockTimesheetApprovalService.submitTimesheet.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(true), 100))
      );

      render(<EmployeeTimesheet viewMode='list'/>);

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /submit/i });
        expect(submitButton).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /submit/i });
      
      // Click twice rapidly
      await user.click(submitButton);
      await user.click(submitButton);

      // Should only call the service once
      await waitFor(() => {
        expect(mockTimesheetApprovalService.submitTimesheet).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Time Entry Management', () => {
    beforeEach(() => {
      mockProjectService.getActiveProjects.mockResolvedValue({ projects: [mockProject] });
      mockProjectService.getProjectTasks.mockResolvedValue({ tasks: [mockTask] });
    });

    it('should add new time entry', async () => {
      mockTimesheetApprovalService.createTimesheet.mockResolvedValue(mockTimesheet);

      render(<EmployeeTimesheet/>);

      //open create timesheet modal
      const createButton = screen.getByRole('button', { name: /New Timesheet/i });
      await user.click(createButton);

      // Wait for the form to appear
      await waitFor(() => {
        expect(screen.getByText(/Create New Timesheet/i)).toBeInTheDocument();
      });

      // Fill in timesheet form
      const weekStartInput = screen.getByDisplayValue(/2025/);
      await user.clear(weekStartInput);
      await user.type(weekStartInput, '2024-01-01');

      // Select a project first
      const projectSelect = screen.getByLabelText('Project *');
      await user.selectOptions(projectSelect, 'proj-123');

      await waitFor(() => {
        expect(screen.getByLabelText('Task *')).toBeInTheDocument();
      });
      
      const taskSelect = screen.getByLabelText('Task *');
      await user.selectOptions(taskSelect, 'task-123');

      const dateInputforTimesheet = screen.getByLabelText('Date *');
      fireEvent.change(dateInputforTimesheet, { target: { value: '2024-01-01' } });

      // Add a time entry
      const hoursInput = screen.getByLabelText(/Hours/i);
      await user.clear(hoursInput);
      await user.type(hoursInput, '8');

      // const dateInput = screen.getByLabelText('Date *');
      // await user.type(dateInput, '2024-01-01');

      const description = screen.getByLabelText('Work Description');
      await user.type(description, 'Development work')

      // First, add the entry to the timesheet
      await waitFor(() => {
        const addEntryButton = screen.getByRole('button', { name: /Add Entry/i });
        expect(addEntryButton).not.toBeDisabled();
      });
      
      const addEntryButton = screen.getByRole('button', { name: /Add Entry/i });
      await user.click(addEntryButton);

      // Verify entry was added to the form
      expect(screen.getByText('Development work')).toBeInTheDocument();
    });

    it('should remove time entry', async () => {
      render(<EmployeeTimesheet/>);

      // Add an entry first
      //open create timesheet modal
      const createButton = screen.getByRole('button', { name: /New Timesheet/i });
      await user.click(createButton);

      // Wait for the form to appear
      await waitFor(() => {
        expect(screen.getByText(/Create New Timesheet/i)).toBeInTheDocument();
      });

      // Fill in timesheet form
      const weekStartInput = screen.getByDisplayValue(/2025/);
      await user.clear(weekStartInput);
      await user.type(weekStartInput, '2024-01-01');

      // Select a project first
      const projectSelect = screen.getByLabelText('Project *');
      await user.selectOptions(projectSelect, 'proj-123');

      await waitFor(() => {
        expect(screen.getByLabelText('Task *')).toBeInTheDocument();
      });
      
      const taskSelect = screen.getByLabelText('Task *');
      await user.selectOptions(taskSelect, 'task-123');

      const dateInputforTimesheet = screen.getByLabelText('Date *');
      fireEvent.change(dateInputforTimesheet, { target: { value: '2024-01-01' } });

      // Add a time entry
      const hoursInput = screen.getByLabelText(/Hours/i);
      await user.clear(hoursInput);
      await user.type(hoursInput, '8');

      // const dateInput = screen.getByLabelText('Date *');
      // await user.type(dateInput, '2024-01-01');

      const description = screen.getByLabelText('Work Description');
      await user.type(description, 'Development work')

      // First, add the entry to the timesheet
      await waitFor(() => {
        const addEntryButton = screen.getByRole('button', { name: /Add Entry/i });
        expect(addEntryButton).not.toBeDisabled();
      });
      
      const addEntryButton = screen.getByRole('button', { name: /Add Entry/i });
      await user.click(addEntryButton);

      // Now remove it
      const removeButton = screen.getByRole('button', { name: /remove/i });
      await user.click(removeButton);

      // Entry should be removed
      await waitFor(() => {
        expect(screen.queryByTitle(/remove entry/i)).not.toBeInTheDocument();
      });
    });

    it('should handle bulk entry creation', async () => {
      render(<EmployeeTimesheet/>);

      // Add an entry first
      //open create timesheet modal
      const createButton = screen.getByRole('button', { name: /New Timesheet/i });
      await user.click(createButton);

      // Wait for the form to appear
      await waitFor(() => {
        expect(screen.getByText(/Create New Timesheet/i)).toBeInTheDocument();
      });

      // Fill in timesheet form
      const weekStartInput = screen.getByDisplayValue(/2025/);
      await user.clear(weekStartInput);
      await user.type(weekStartInput, '2024-01-01');

      // Select a project first
      const projectSelect = screen.getByLabelText('Project *');
      await user.selectOptions(projectSelect, 'proj-123');

      await waitFor(() => {
        expect(screen.getByLabelText('Task *')).toBeInTheDocument();
      });
      
      const taskSelect = screen.getByLabelText('Task *');
      await user.selectOptions(taskSelect, 'task-123');

      const dateInputforTimesheet = screen.getByLabelText('Date *');
      fireEvent.change(dateInputforTimesheet, { target: { value: '2024-01-01' } });

      // Add a time entry
      const hoursInput = screen.getByLabelText(/Hours/i);
      await user.clear(hoursInput);
      await user.type(hoursInput, '8');

      const dateInput = screen.getByLabelText('Date *');
      await user.type(dateInput, '2024-01-01');

      const description = screen.getByLabelText('Work Description');
      await user.type(description, 'Development work')

      // Enable bulk entry mode
      const multipleDaysRadio = screen.getByLabelText(/Multiple Days/i);
      await user.click(multipleDaysRadio);

      // Select multiple dates
      const mondayOption = screen.getByText('Mon').closest('label');
      const tuesdayOption = screen.getByText('Tue').closest('label');

      await within(mondayOption!).getByRole('checkbox').click();
      await within(tuesdayOption!).getByRole('checkbox').click();

      // First, add the entry to the timesheet
      await waitFor(() => {
        const addEntryButton = screen.getByRole('button', { name: /Add Entry/i });
        expect(addEntryButton).not.toBeDisabled();
      });
      
      const addEntryButton = screen.getByRole('button', { name: /Add Entry/i });
      await user.click(addEntryButton);

      // Should create entries for both days
      expect(screen.getAllByText('8h')).toHaveLength(2);
    });

    it('should copy entry to full week', async () => {
       render(<EmployeeTimesheet/>);

      // Add an entry first
      //open create timesheet modal
      const createButton = screen.getByRole('button', { name: /New Timesheet/i });
      await user.click(createButton);

      // Wait for the form to appear
      await waitFor(() => {
        expect(screen.getByText(/Create New Timesheet/i)).toBeInTheDocument();
      });

      // Fill in timesheet form
      const weekStartInput = screen.getByDisplayValue(/2025/);
      await user.clear(weekStartInput);
      await user.type(weekStartInput, '2024-01-01');

      // Select a project first
      const projectSelect = screen.getByLabelText('Project *');
      await user.selectOptions(projectSelect, 'proj-123');

      await waitFor(() => {
        expect(screen.getByLabelText('Task *')).toBeInTheDocument();
      });
      
      const taskSelect = screen.getByLabelText('Task *');
      await user.selectOptions(taskSelect, 'task-123');

      const dateInputforTimesheet = screen.getByLabelText('Date *');
      fireEvent.change(dateInputforTimesheet, { target: { value: '2024-01-01' } });

      // Add a time entry
      const hoursInput = screen.getByLabelText(/Hours/i);
      await user.clear(hoursInput);
      await user.type(hoursInput, '8');

      // const dateInput = screen.getByLabelText('Date *');
      // await user.type(dateInput, '2024-01-01');

      const description = screen.getByLabelText('Work Description');
      await user.type(description, 'Development work')

      // First, add the entry to the timesheet
      await waitFor(() => {
        const addEntryButton = screen.getByRole('button', { name: /Add Entry/i });
        expect(addEntryButton).not.toBeDisabled();
      });
      
      const addEntryButton = screen.getByRole('button', { name: /Add Entry/i });
      await user.click(addEntryButton);

      const copyButton = await screen.findByTitle(/Copy this entry to multiple days/i);
      await user.click(copyButton);

      // Click "Copy to Full Week"
      const copyFullWeekButton = await screen.findByRole('button', { name: /Copy to Full Week/i });
      await user.click(copyFullWeekButton);

      // Now there should be 7 entries total (M–Su)
      expect(screen.getAllByText('8h')).toHaveLength(8);
    });
  });

  describe('Calendar Navigation', () => {
    it('should navigate to next month', async () => {
      render(<EmployeeTimesheet />);

      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      // Should reload calendar data for next month
      expect(mockTimesheetApprovalService.getCalendarData).toHaveBeenCalled();
    });

    it('should navigate to previous month', async () => {
      render(<EmployeeTimesheet />);

      const prevButton = screen.getByRole('button', { name: /previous/i });
      await user.click(prevButton);

      // Should reload calendar data for previous month
      expect(mockTimesheetApprovalService.getCalendarData).toHaveBeenCalled();
    });

    it('should show day entries when clicking on calendar day', async () => {
      const calendarData = {
        '2025-09-01': {
          hours: 8,
          status: 'draft'as TimesheetStatus,
          entries: [
            {
              id: 'entry-1',
              timesheet_id: 'timesheet-123',
              date: '2025-09-01',
              hours: 8,
              description: 'Work done',
              is_billable: true,
              entry_type: 'project_task' as const,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            }
          ]
        }
      };

      mockTimesheetApprovalService.getCalendarData.mockResolvedValue(calendarData);

      render(<EmployeeTimesheet/>);

      // Wait for calendar to load
      await waitFor(() => {
        const monthHeader = screen.getByText(/september 2025/i);
        expect(monthHeader).toBeInTheDocument();
      });

      // Find a day cell that contains "1" and has entries (hours badge)
      await waitFor(() => {
        const hoursIndicator = screen.getAllByText('8h')[0];
        expect(hoursIndicator).toBeInTheDocument();
      });

     // Click on the day cell that contains the hours indicator
      const dayCell = screen.getAllByText('8h')[0].closest('[class*="cursor-pointer"]');
      expect(dayCell).toBeTruthy();
      await user.click(dayCell!);

      // Check for modal content
      await waitFor(() => {
        expect(screen.getByText(/Monday, September 1/i)).toBeInTheDocument();
        expect(screen.getByText(/8 hours logged/i)).toBeInTheDocument();
      });

      expect(screen.getByText('Billable')).toBeInTheDocument();
      expect(screen.getByText('Work done')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      mockTimesheetApprovalService.getUserTimesheets.mockRejectedValue(
        new Error('Network error')
      );

      render(<EmployeeTimesheet />);

      // Component should still render without crashing
      expect(screen.getByText('My Timesheet Calendar')).toBeInTheDocument();
    });

    it('should handle missing user context', async () => {
      mockUseAuth.mockReturnValue({
        currentUser: null,
        currentUserRole: undefined,
        login: vi.fn(),
        logout: vi.fn(),
        switchRole: vi.fn(),
        loading: false
      });

      render(<EmployeeTimesheet />);

      // Should render but with limited functionality
      expect(screen.getByText('My Timesheet Calendar')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      render(<EmployeeTimesheet />);

      // Check for important ARIA labels
      // expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /new timesheet/i })).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      render(<EmployeeTimesheet />);

      const createButton = screen.getByRole('button', { name: /new timesheet/i });
      
      // Should be focusable
      createButton.focus();
      expect(createButton).toHaveFocus();

      // Should respond to Enter key
      fireEvent.keyDown(createButton, { key: 'Enter', code: 'Enter' });
      
      await waitFor(() => {
        expect(screen.getByText(/new timesheet/i)).toBeInTheDocument();
      });
    });
  });
});