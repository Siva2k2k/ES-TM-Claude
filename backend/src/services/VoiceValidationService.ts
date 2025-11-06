import { VoiceErrorHandler, VoiceResponse, VoiceError } from './VoiceErrorHandler';
import IntentConfigService from './IntentConfigService';
import { IUser, User } from '../models/User';
import { Project } from '../models/Project';
import { IClient } from '../models/Client';
import { logger } from '../config/logger';

export interface ValidationRule {
  field: string;
  type: 'required' | 'type' | 'reference' | 'custom';
  config: {
    fieldType?: string;
    referenceType?: { model: string; field: string };
    customValidator?: (value: any, data: Record<string, any>, user: IUser) => Promise<string | null>;
  };
}

export interface IntentValidationConfig {
  intent: string;
  allowedRoles: string[];
  rules: ValidationRule[];
  customValidations?: Array<{
    name: string;
    validator: (data: Record<string, any>, user: IUser) => Promise<VoiceError[]>;
  }>;
}

export class VoiceValidationService {
  private static validationConfigs: Map<string, IntentValidationConfig> = new Map();

  /**
   * Initialize validation configurations for all intents
   */
  static async initialize(): Promise<void> {
    try {
      const intents = await IntentConfigService.getAllActive();
      
      for (const intent of intents) {
        await this.createValidationConfig(intent);
      }

      logger.info(`Initialized validation for ${intents.length} voice intents`);
    } catch (error) {
      logger.error('Failed to initialize voice validation:', error);
    }
  }

  /**
   * Create validation configuration for an intent
   */
  private static async createValidationConfig(intentDef: any): Promise<void> {
    const rules: ValidationRule[] = [];

    // Add required field rules
    for (const field of intentDef.requiredFields || []) {
      rules.push({
        field,
        type: 'required',
        config: {}
      });
    }

    // Add type validation rules
    for (const [field, type] of Object.entries(intentDef.fieldTypes || {})) {
      rules.push({
        field,
        type: 'type',
        config: { fieldType: type as string }
      });
    }

    // Add reference field rules
    const referenceFields = this.extractReferenceFields(intentDef);
    for (const [field, config] of Object.entries(referenceFields)) {
      rules.push({
        field,
        type: 'reference',
        config: { referenceType: config }
      });
    }

    // Add custom validations based on intent
    const customValidations = this.getCustomValidations(intentDef.intent);

    const config: IntentValidationConfig = {
      intent: intentDef.intent,
      allowedRoles: intentDef.allowedRoles || [],
      rules,
      customValidations
    };

    this.validationConfigs.set(intentDef.intent, config);
  }

  /**
   * Extract reference field mappings
   */
  private static extractReferenceFields(intentDef: any): Record<string, { model: string; field: string }> {
    const referenceFields: Record<string, { model: string; field: string }> = {};

    const fieldMappings = {
      // Client references
      client_name: { model: 'IClient', field: 'client_name' },
      client_id: { model: 'IClient', field: '_id' },
      client_email: { model: 'IClient', field: 'email' },
      
      // User references
      user_name: { model: 'User', field: 'full_name' },
      user_id: { model: 'User', field: '_id' },
      user_email: { model: 'User', field: 'email' },
      manager_name: { model: 'User', field: 'full_name' },
      manager_id: { model: 'User', field: '_id' },
      lead_name: { model: 'User', field: 'full_name' },
      lead_id: { model: 'User', field: '_id' },
      
      // Project references
      project_name: { model: 'Project', field: 'project_name' },
      project_id: { model: 'Project', field: '_id' }
    };

    const allFields = [...(intentDef.requiredFields || []), ...(intentDef.optionalFields || [])];
    
    for (const field of allFields) {
      if (fieldMappings[field]) {
        referenceFields[field] = fieldMappings[field];
      }
    }

    return referenceFields;
  }

  /**
   * Get custom validation functions for specific intents
   */
  private static getCustomValidations(intent: string): Array<{
    name: string;
    validator: (data: Record<string, any>, user: IUser) => Promise<VoiceError[]>;
  }> {
    const customValidations: Record<string, any> = {
      create_user: [
        {
          name: 'email_uniqueness',
          validator: async (data: Record<string, any>, user: IUser): Promise<VoiceError[]> => {
            const errors: VoiceError[] = [];
            if (data.email) {
              const existingUser = await User.findOne({ email: data.email });
              if (existingUser) {
                errors.push(VoiceErrorHandler.dataError(
                  'email',
                  `User with email '${data.email}' already exists`,
                  { existingUserId: existingUser._id }
                ));
              }
            }
            return errors;
          }
        },
        {
          name: 'management_approval_requirement',
          validator: async (data: Record<string, any>, user: IUser): Promise<VoiceError[]> => {
            const errors: VoiceError[] = [];
            if (user.role === 'management' && data.role && ['super_admin', 'management'].includes(data.role)) {
              errors.push(VoiceErrorHandler.permissionError(
                'Management users cannot create super_admin or management level users',
                { attemptedRole: data.role, userRole: user.role }
              ));
            }
            return errors;
          }
        }
      ],

      create_project: [
        {
          name: 'client_existence',
          validator: async (data: Record<string, any>, user: IUser): Promise<VoiceError[]> => {
            const errors: VoiceError[] = [];
            if (data.client_name) {
              const client = await IClient.findOne({ client_name: data.client_name });
              if (!client) {
                errors.push(VoiceErrorHandler.dataError(
                  'client_name',
                  `Client '${data.client_name}' not found`,
                  { providedClientName: data.client_name }
                ));
              }
            }
            return errors;
          }
        },
        {
          name: 'manager_role_validation',
          validator: async (data: Record<string, any>, user: IUser): Promise<VoiceError[]> => {
            const errors: VoiceError[] = [];
            if (data.manager_name) {
              const manager = await User.findOne({ full_name: data.manager_name });
              if (manager && !['manager', 'management', 'lead', 'super_admin'].includes(manager.role)) {
                errors.push(VoiceErrorHandler.dataError(
                  'manager_name',
                  `User '${data.manager_name}' does not have manager-level role`,
                  { userRole: manager.role, requiredRoles: ['manager', 'management', 'lead', 'super_admin'] }
                ));
              }
            }
            return errors;
          }
        }
      ],

      create_client: [
        {
          name: 'client_name_uniqueness',
          validator: async (data: Record<string, any>, user: IUser): Promise<VoiceError[]> => {
            const errors: VoiceError[] = [];
            if (data.client_name) {
              const existingClient = await IClient.findOne({ client_name: data.client_name });
              if (existingClient) {
                errors.push(VoiceErrorHandler.dataError(
                  'client_name',
                  `Client with name '${data.client_name}' already exists`,
                  { existingClientId: existingClient._id }
                ));
              }
            }
            return errors;
          }
        }
      ]
    };

    return customValidations[intent] || [];
  }

  /**
   * Validate a voice command comprehensively
   */
  static async validateVoiceCommand(
    intent: string,
    userRole: string,
    data: Record<string, any>,
    user: IUser
  ): Promise<VoiceResponse> {
    const errors: VoiceError[] = [];

    try {
      // Get validation configuration
      const config = this.validationConfigs.get(intent);
      if (!config) {
        errors.push(VoiceErrorHandler.systemError(`No validation configuration found for intent: ${intent}`));
        return VoiceErrorHandler.createErrorResponse(errors);
      }

      // 1. Validate role permissions
      if (config.allowedRoles.length > 0 && !config.allowedRoles.includes(userRole)) {
        errors.push(VoiceErrorHandler.permissionError(
          `Role '${userRole}' is not authorized for '${intent}' action`,
          { userRole, intent, allowedRoles: config.allowedRoles }
        ));
      }

      // 2. Apply validation rules
      for (const rule of config.rules) {
        const ruleErrors = await this.applyValidationRule(rule, data, user);
        errors.push(...ruleErrors);
      }

      // 3. Apply custom validations
      if (config.customValidations) {
        for (const customValidation of config.customValidations) {
          try {
            const customErrors = await customValidation.validator(data, user);
            errors.push(...customErrors);
          } catch (error) {
            logger.error(`Custom validation '${customValidation.name}' failed:`, error);
            errors.push(VoiceErrorHandler.systemError(
              `Custom validation '${customValidation.name}' failed`,
              { error: error instanceof Error ? error.message : 'Unknown error' }
            ));
          }
        }
      }

      // Return results
      if (errors.length > 0) {
        VoiceErrorHandler.logError(intent, userRole, errors, { data, user: { id: user._id, role: user.role } });
        return VoiceErrorHandler.createErrorResponse(errors);
      }

      return VoiceErrorHandler.createSuccessResponse({ validated: true });

    } catch (error) {
      logger.error('Voice validation system error:', error);
      errors.push(VoiceErrorHandler.systemError(
        'Validation system error occurred',
        { error: error instanceof Error ? error.message : 'Unknown error' }
      ));
      return VoiceErrorHandler.createErrorResponse(errors);
    }
  }

  /**
   * Apply a single validation rule
   */
  private static async applyValidationRule(
    rule: ValidationRule,
    data: Record<string, any>,
    user: IUser
  ): Promise<VoiceError[]> {
    const errors: VoiceError[] = [];
    const value = data[rule.field];

    switch (rule.type) {
      case 'required':
        if (value === undefined || value === null || value === '') {
          errors.push(VoiceErrorHandler.validationError(
            rule.field,
            `${rule.field} is required`,
            { providedValue: value }
          ));
        }
        break;

      case 'type':
        if (value !== undefined && value !== null && rule.config.fieldType) {
          const expectedType = rule.config.fieldType;
          const actualType = Array.isArray(value) ? 'array' : typeof value;
          
          if (expectedType === 'array' && !Array.isArray(value)) {
            errors.push(VoiceErrorHandler.validationError(
              rule.field,
              `${rule.field} must be an array`,
              { expectedType, actualType }
            ));
          } else if (expectedType !== 'array' && actualType !== expectedType) {
            errors.push(VoiceErrorHandler.validationError(
              rule.field,
              `${rule.field} must be of type ${expectedType}`,
              { expectedType, actualType }
            ));
          }
        }
        break;

      case 'reference':
        if (value && rule.config.referenceType) {
          const refErrors = await this.validateReference(rule.field, value, rule.config.referenceType);
          errors.push(...refErrors);
        }
        break;

      case 'custom':
        if (rule.config.customValidator) {
          try {
            const customError = await rule.config.customValidator(value, data, user);
            if (customError) {
              errors.push(VoiceErrorHandler.validationError(rule.field, customError));
            }
          } catch (error) {
            errors.push(VoiceErrorHandler.systemError(
              `Custom validation failed for ${rule.field}`,
              { error: error instanceof Error ? error.message : 'Unknown error' }
            ));
          }
        }
        break;
    }

    return errors;
  }

  /**
   * Validate reference field
   */
  private static async validateReference(
    field: string,
    value: any,
    referenceType: { model: string; field: string }
  ): Promise<VoiceError[]> {
    const errors: VoiceError[] = [];

    try {
      let Model;
      switch (referenceType.model) {
        case 'User':
          Model = User;
          break;
        case 'Project':
          Model = Project;
          break;
        case 'IClient':
          Model = IClient;
          break;
        default:
          errors.push(VoiceErrorHandler.systemError(
            `Unknown reference model: ${referenceType.model}`,
            { field, model: referenceType.model }
          ));
          return errors;
      }

      const query = { [referenceType.field]: value };
      const exists = await Model.findOne(query);
      
      if (!exists) {
        errors.push(VoiceErrorHandler.dataError(
          field,
          `Referenced ${referenceType.model} with ${referenceType.field} '${value}' not found`,
          { field, value, model: referenceType.model, queryField: referenceType.field }
        ));
      }

    } catch (error) {
      logger.error('Reference validation error:', error);
      errors.push(VoiceErrorHandler.systemError(
        `Error validating reference for ${field}`,
        { field, error: error instanceof Error ? error.message : 'Unknown error' }
      ));
    }

    return errors;
  }

  /**
   * Get validation configuration for an intent
   */
  static getValidationConfig(intent: string): IntentValidationConfig | undefined {
    return this.validationConfigs.get(intent);
  }

  /**
   * Add or update validation configuration
   */
  static setValidationConfig(config: IntentValidationConfig): void {
    this.validationConfigs.set(config.intent, config);
  }

  /**
   * Get all validation configurations
   */
  static getAllValidationConfigs(): Map<string, IntentValidationConfig> {
    return new Map(this.validationConfigs);
  }
}