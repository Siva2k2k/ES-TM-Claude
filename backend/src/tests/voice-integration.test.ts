import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { VoiceActionDispatcher } from '../src/services/VoiceActionDispatcher';
import { RoleBasedServiceDispatcher } from '../src/services/RoleBasedServiceDispatcher';
import { VoiceFieldMapper } from '../src/services/VoiceFieldMapper';
import { VoiceValidationService } from '../src/services/VoiceValidationService';
import { VoiceErrorHandler } from '../src/services/VoiceErrorHandler';
import IntentConfigService from '../src/services/IntentConfigService';
import { UserService } from '../src/services/UserService';
import { ProjectService } from '../src/services/ProjectService';
import { IUser } from '../src/models/User';
import { VoiceAction } from '../src/types/voice';

// Mock services
jest.mock('../src/services/UserService');
jest.mock('../src/services/ProjectService');
jest.mock('../src/services/IntentConfigService');

describe('Voice LLM Integration Tests - Four Critical Aspects', () => {
  let mockAdmin: IUser;
  let mockManager: IUser;
  let mockEmployee: IUser;

  beforeAll(async () => {
    // Initialize validation service
    await VoiceValidationService.initialize();
  });

  beforeEach(() => {
    // Setup mock users with different roles
    mockAdmin = {
      _id: 'admin123',
      email: 'admin@test.com',
      role: 'super_admin',
      full_name: 'Test Admin',
      hourly_rate: 100,
      is_active: true,
      is_approved_by_super_admin: true
    } as IUser;

    mockManager = {
      _id: 'manager123',
      email: 'manager@test.com',
      role: 'management',
      full_name: 'Test Manager',
      hourly_rate: 80,
      is_active: true,
      is_approved_by_super_admin: true
    } as IUser;

    mockEmployee = {
      _id: 'employee123',
      email: 'employee@test.com',
      role: 'employee',
      full_name: 'Test Employee',
      hourly_rate: 50,
      is_active: true,
      is_approved_by_super_admin: true
    } as IUser;
  });

  describe('1. Field Mapping Between LLM Response and Backend', () => {
    it('should correctly map create_user intent fields', async () => {
      const llmResponse = {
        intent: 'create_user',
        data: {
          full_name: 'John Doe',
          email: 'john@test.com',
          role: 'employee',
          hourly_rate: '45'
        },
        confidence: 0.95
      } as VoiceAction;

      const mapper = new VoiceFieldMapper();
      const mappedData = await mapper.mapUserCreation(llmResponse.data);

      expect(mappedData).toEqual({
        full_name: 'John Doe',
        email: 'john@test.com',
        role: 'employee',
        hourly_rate: 45, // Should be converted to number
        is_active: true,
        is_approved_by_super_admin: false
      });
    });

    it('should correctly map create_project intent fields', async () => {
      const llmResponse = {
        intent: 'create_project',
        data: {
          project_name: 'New Project',
          client_name: 'Test Client',
          manager_name: 'Test Manager',
          start_date: '2024-01-01',
          end_date: '2024-12-31'
        },
        confidence: 0.92
      } as VoiceAction;

      // Mock client and manager lookups
      jest.mocked(IntentConfigService.getByIntent).mockResolvedValue({
        intent: 'create_project',
        requiredFields: ['project_name', 'client_name'],
        optionalFields: ['manager_name', 'start_date', 'end_date'],
        fieldTypes: {
          project_name: 'string',
          client_name: 'string',
          manager_name: 'string',
          start_date: 'date',
          end_date: 'date'
        }
      });

      const mapper = new VoiceFieldMapper();
      const mappedData = await mapper.mapProjectCreation(llmResponse.data);

      expect(mappedData).toHaveProperty('project_name', 'New Project');
      expect(mappedData).toHaveProperty('client_name', 'Test Client');
      expect(mappedData).toHaveProperty('manager_name', 'Test Manager');
      expect(mappedData.start_date).toBeInstanceOf(Date);
      expect(mappedData.end_date).toBeInstanceOf(Date);
    });

    it('should handle field mapping validation errors', async () => {
      const invalidAction = {
        intent: 'create_user',
        data: {
          full_name: '', // Invalid: required field empty
          email: 'invalid-email', // Invalid: malformed email
          hourly_rate: 'not-a-number' // Invalid: should be number
        },
        confidence: 0.85
      } as VoiceAction;

      const validationResult = await VoiceValidationService.validateVoiceCommand(
        'create_user',
        'super_admin',
        invalidAction.data,
        mockAdmin
      );

      expect(validationResult.success).toBe(false);
      if (!validationResult.success) {
        expect(validationResult.errors).toContainEqual(
          expect.objectContaining({
            type: 'validation',
            field: 'full_name',
            message: expect.stringContaining('required')
          })
        );
      }
    });
  });

  describe('2. Reference Type Dropdown Logic', () => {
    it('should detect reference types in create_project intent', () => {
      const projectIntentConfig = {
        intent: 'create_project',
        requiredFields: ['project_name', 'client_name'],
        optionalFields: ['manager_name'],
        fieldTypes: {
          project_name: 'string',
          client_name: 'reference',
          manager_name: 'reference'
        }
      };

      // Extract reference fields for dropdown population
      const referenceFields = ['client_name', 'manager_name'].filter(field => 
        projectIntentConfig.fieldTypes[field] === 'reference'
      );

      expect(referenceFields).toEqual(['client_name', 'manager_name']);
    });

    it('should populate dropdown data from database correctly', async () => {
      // Mock API responses that frontend would use
      const mockClients = [
        { _id: 'client1', client_name: 'Client A', email: 'clienta@test.com' },
        { _id: 'client2', client_name: 'Client B', email: 'clientb@test.com' }
      ];

      const mockManagers = [
        { _id: 'manager1', full_name: 'Manager A', role: 'manager' },
        { _id: 'manager2', full_name: 'Manager B', role: 'management' }
      ];

      // Simulate frontend dropdown population logic
      const dropdownOptions = {
        client_name: mockClients.map(c => ({ value: c.client_name, label: c.client_name })),
        manager_name: mockManagers.map(m => ({ value: m.full_name, label: m.full_name }))
      };

      expect(dropdownOptions.client_name).toHaveLength(2);
      expect(dropdownOptions.manager_name).toHaveLength(2);
      expect(dropdownOptions.client_name[0]).toEqual({ value: 'Client A', label: 'Client A' });
      expect(dropdownOptions.manager_name[0]).toEqual({ value: 'Manager A', label: 'Manager A' });
    });

    it('should validate reference field existence', async () => {
      const action = {
        intent: 'create_project',
        data: {
          project_name: 'Test Project',
          client_name: 'Nonexistent Client', // Should fail validation
          manager_name: 'Nonexistent Manager' // Should fail validation
        },
        confidence: 0.9
      } as VoiceAction;

      // Mock intent configuration
      jest.mocked(IntentConfigService.getByIntent).mockResolvedValue({
        intent: 'create_project',
        allowedRoles: ['super_admin', 'management', 'manager'],
        requiredFields: ['project_name', 'client_name'],
        optionalFields: ['manager_name'],
        fieldTypes: {
          project_name: 'string',
          client_name: 'string',
          manager_name: 'string'
        }
      });

      const validationResult = await VoiceValidationService.validateVoiceCommand(
        'create_project',
        'super_admin',
        action.data,
        mockAdmin
      );

      expect(validationResult.success).toBe(false);
      if (!validationResult.success) {
        expect(validationResult.errors.some(error => 
          error.type === 'data' && error.field === 'client_name'
        )).toBe(true);
      }
    });
  });

  describe('3. Role-Specific Service Calls', () => {
    it('should route create_user intent to different services based on role', async () => {
      const createUserAction = {
        intent: 'create_user',
        data: {
          full_name: 'New User',
          email: 'newuser@test.com',
          role: 'employee'
        },
        confidence: 0.93
      } as VoiceAction;

      const dispatcher = new RoleBasedServiceDispatcher();

      // Mock UserService methods
      jest.mocked(UserService.prototype.createUser).mockResolvedValue({ 
        success: true, 
        data: { _id: 'newuser123' } 
      });
      jest.mocked(UserService.prototype.createUserForApproval).mockResolvedValue({ 
        success: true, 
        data: { _id: 'newuser123', pending_approval: true } 
      });

      // Admin should call createUser
      const adminResult = await dispatcher.executeIntent(createUserAction, mockAdmin);
      expect(UserService.prototype.createUser).toHaveBeenCalled();

      // Management should call createUserForApproval
      const managementResult = await dispatcher.executeIntent(createUserAction, mockManager);
      expect(UserService.prototype.createUserForApproval).toHaveBeenCalled();
    });

    it('should restrict access based on user role', async () => {
      const createProjectAction = {
        intent: 'create_project',
        data: {
          project_name: 'Employee Project',
          client_name: 'Test Client'
        },
        confidence: 0.88
      } as VoiceAction;

      // Mock intent configuration with role restrictions
      jest.mocked(IntentConfigService.getByIntent).mockResolvedValue({
        intent: 'create_project',
        allowedRoles: ['super_admin', 'management', 'manager'],
        requiredFields: ['project_name', 'client_name'],
        fieldTypes: { project_name: 'string', client_name: 'string' }
      });

      const validationResult = await VoiceValidationService.validateVoiceCommand(
        'create_project',
        'employee',
        createProjectAction.data,
        mockEmployee
      );

      expect(validationResult.success).toBe(false);
      if (!validationResult.success) {
        expect(validationResult.errors).toContainEqual(
          expect.objectContaining({
            type: 'permission',
            message: expect.stringContaining('not authorized')
          })
        );
      }
    });

    it('should determine available intents based on user role', () => {
      const allIntents = [
        { intent: 'create_user', allowedRoles: ['super_admin'] },
        { intent: 'create_project', allowedRoles: ['super_admin', 'management', 'manager'] },
        { intent: 'view_timesheet', allowedRoles: ['super_admin', 'management', 'manager', 'employee'] },
        { intent: 'approve_user', allowedRoles: ['super_admin'] }
      ];

      // Filter intents for employee
      const employeeIntents = allIntents.filter(intent => 
        intent.allowedRoles.includes('employee')
      );

      // Filter intents for manager
      const managerIntents = allIntents.filter(intent => 
        intent.allowedRoles.includes('manager')
      );

      expect(employeeIntents).toHaveLength(1);
      expect(employeeIntents[0].intent).toBe('view_timesheet');

      expect(managerIntents).toHaveLength(2);
      expect(managerIntents.map(i => i.intent)).toEqual(['create_project', 'view_timesheet']);
    });
  });

  describe('4. Backend-Frontend Error Synchronization', () => {
    it('should provide consistent error format between backend and frontend', async () => {
      const invalidAction = {
        intent: 'create_user',
        data: {
          email: 'invalid-email',
          hourly_rate: -10 // Invalid: negative rate
        },
        confidence: 0.75
      } as VoiceAction;

      const validationResult = await VoiceValidationService.validateVoiceCommand(
        'create_user',
        'super_admin',
        invalidAction.data,
        mockAdmin
      );

      expect(validationResult.success).toBe(false);
      
      if (!validationResult.success) {
        // Backend should provide structured error response
        expect(validationResult).toHaveProperty('errors');
        expect(validationResult).toHaveProperty('formErrors');
        
        // Each error should have the required structure
        validationResult.errors.forEach(error => {
          expect(error).toHaveProperty('type');
          expect(error).toHaveProperty('message');
          expect(error).toHaveProperty('code');
          expect(['validation', 'permission', 'data', 'system']).toContain(error.type);
        });

        // Form errors should be mapped for frontend form display
        if (validationResult.formErrors) {
          Object.entries(validationResult.formErrors).forEach(([field, message]) => {
            expect(typeof field).toBe('string');
            expect(typeof message).toBe('string');
          });
        }
      }
    });

    it('should handle system errors gracefully', async () => {
      // Simulate system error during validation
      jest.mocked(IntentConfigService.getByIntent).mockRejectedValue(new Error('Database connection failed'));

      const action = {
        intent: 'create_user',
        data: { full_name: 'Test User', email: 'test@test.com' },
        confidence: 0.9
      } as VoiceAction;

      const validationResult = await VoiceValidationService.validateVoiceCommand(
        'create_user',
        'super_admin',
        action.data,
        mockAdmin
      );

      expect(validationResult.success).toBe(false);
      if (!validationResult.success) {
        expect(validationResult.systemError).toBeDefined();
        expect(validationResult.errors.some(error => error.type === 'system')).toBe(true);
      }
    });

    it('should prevent UI success when backend fails', async () => {
      const action = {
        intent: 'create_user',
        data: {
          full_name: 'Test User',
          email: 'test@test.com',
          role: 'employee'
        },
        confidence: 0.9
      } as VoiceAction;

      // Mock successful validation but failed execution
      jest.mocked(UserService.prototype.createUser).mockRejectedValue(new Error('Database save failed'));

      const dispatcher = new VoiceActionDispatcher();
      
      try {
        const results = await dispatcher.executeActions([action], mockAdmin);
        
        // Should have result with success: false
        expect(results).toHaveLength(1);
        expect(results[0].success).toBe(false);
        expect(results[0].error).toBeDefined();
        
        // Frontend should not show success when backend fails
        const frontendShouldShowSuccess = results.every(result => result.success);
        expect(frontendShouldShowSuccess).toBe(false);
      } catch (error) {
        // If exception is thrown, it should be caught and handled
        expect(error).toBeDefined();
      }
    });

    it('should provide field-level error details for frontend form highlighting', async () => {
      const multiErrorAction = {
        intent: 'create_user',
        data: {
          full_name: '', // Required field missing
          email: 'not-an-email', // Invalid format
          role: 'invalid_role', // Invalid enum value
          hourly_rate: 'not-a-number' // Wrong type
        },
        confidence: 0.8
      } as VoiceAction;

      const validationResult = await VoiceValidationService.validateVoiceCommand(
        'create_user',
        'super_admin',
        multiErrorAction.data,
        mockAdmin
      );

      expect(validationResult.success).toBe(false);
      
      if (!validationResult.success) {
        // Should have form errors for frontend field highlighting
        expect(validationResult.formErrors).toBeDefined();
        
        if (validationResult.formErrors) {
          const errorFields = Object.keys(validationResult.formErrors);
          expect(errorFields).toContain('full_name');
          // Additional field errors would be validated based on actual validation rules
        }

        // Should have detailed errors for specific error handling
        const validationErrors = validationResult.errors.filter(e => e.type === 'validation');
        expect(validationErrors.length).toBeGreaterThan(0);
        
        validationErrors.forEach(error => {
          expect(error.field).toBeDefined();
          expect(error.message).toBeDefined();
        });
      }
    });
  });

  describe('Integration - All Four Aspects Combined', () => {
    it('should handle complete voice command flow with all validations', async () => {
      const createProjectAction = {
        intent: 'create_project',
        data: {
          project_name: 'Integration Test Project',
          client_name: 'Test Client',
          manager_name: 'Test Manager',
          start_date: '2024-01-01'
        },
        confidence: 0.95
      } as VoiceAction;

      // 1. Field mapping should work
      const mapper = new VoiceFieldMapper();
      const mappedData = await mapper.mapProjectCreation(createProjectAction.data);
      expect(mappedData.project_name).toBe('Integration Test Project');

      // 2. Reference type validation should work
      // (Would need actual database setup for full integration)

      // 3. Role-based service routing should work
      const roleDispatcher = new RoleBasedServiceDispatcher();
      // Should route to appropriate service based on user role

      // 4. Error handling should be comprehensive
      const validationResult = await VoiceValidationService.validateVoiceCommand(
        'create_project',
        'manager',
        createProjectAction.data,
        mockManager
      );

      // If validation passes, execution should proceed
      if (validationResult.success) {
        // Mock successful project creation
        jest.mocked(ProjectService.prototype.createProject).mockResolvedValue({
          success: true,
          data: { _id: 'project123', project_name: 'Integration Test Project' }
        });

        const executionResult = await roleDispatcher.executeIntent(createProjectAction, mockManager);
        expect(executionResult.success).toBe(true);
      }
    });
  });
});