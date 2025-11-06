import { logger } from '../config/logger';

export interface VoiceError {
  type: 'validation' | 'permission' | 'data' | 'system';
  field?: string;
  message: string;
  code: string;
  details?: any;
}

export interface VoiceErrorResponse {
  success: false;
  errors: VoiceError[];
  formErrors?: Record<string, string>;
  systemError?: string;
}

export interface VoiceSuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

export type VoiceResponse<T = any> = VoiceSuccessResponse<T> | VoiceErrorResponse;

export class VoiceErrorHandler {

  /**
   * Create a validation error
   */
  static validationError(field: string, message: string, details?: any): VoiceError {
    return {
      type: 'validation',
      field,
      message,
      code: 'VALIDATION_ERROR',
      details
    };
  }

  /**
   * Create a permission error
   */
  static permissionError(message: string, details?: any): VoiceError {
    return {
      type: 'permission',
      field: undefined,
      message,
      code: 'PERMISSION_DENIED',
      details
    };
  }

  /**
   * Create a data error (e.g., entity not found)
   */
  static dataError(field: string, message: string, details?: any): VoiceError {
    return {
      type: 'data',
      field,
      message,
      code: 'DATA_ERROR',
      details
    };
  }

  /**
   * Create a system error
   */
  static systemError(message: string, details?: any): VoiceError {
    return {
      type: 'system',
      field: undefined,
      message,
      code: 'SYSTEM_ERROR',
      details
    };
  }

  /**
   * Create an error response
   */
  static createErrorResponse(errors: VoiceError[]): VoiceErrorResponse {
    const formErrors: Record<string, string> = {};
    let systemError: string | undefined;

    for (const error of errors) {
      if (error.field && error.type === 'validation') {
        formErrors[error.field] = error.message;
      } else if (error.type === 'system') {
        systemError = error.message;
      }
    }

    return {
      success: false,
      errors,
      formErrors: Object.keys(formErrors).length > 0 ? formErrors : undefined,
      systemError
    };
  }

  /**
   * Create a success response
   */
  static createSuccessResponse<T>(data: T, message?: string): VoiceSuccessResponse<T> {
    return {
      success: true,
      data,
      message
    };
  }

  /**
   * Validate role permissions for intent
   */
  static validateRolePermissions(
    userRole: string,
    intent: string,
    requiredRoles?: string[]
  ): VoiceError[] {
    const errors: VoiceError[] = [];

    if (!requiredRoles) {
      return errors;
    }

    if (!requiredRoles.includes(userRole)) {
      errors.push(this.permissionError(
        `Access denied. Role '${userRole}' is not authorized for '${intent}' action.`,
        { userRole, intent, requiredRoles }
      ));
    }

    return errors;
  }

  /**
   * Validate required fields
   */
  static validateRequiredFields(
    data: Record<string, any>,
    requiredFields: string[]
  ): VoiceError[] {
    const errors: VoiceError[] = [];

    for (const field of requiredFields) {
      const value = data[field];
      if (value === undefined || value === null || value === '') {
        errors.push(this.validationError(
          field,
          `${field} is required`,
          { providedValue: value }
        ));
      }
    }

    return errors;
  }

  /**
   * Validate field types
   */
  static validateFieldTypes(
    data: Record<string, any>,
    fieldTypes: Record<string, string>
  ): VoiceError[] {
    const errors: VoiceError[] = [];

    for (const [field, expectedType] of Object.entries(fieldTypes)) {
      const value = data[field];
      if (value !== undefined && value !== null && value !== '') {
        const actualType = typeof value;
        
        // Skip validation for reference fields - they will be resolved by VoiceFieldMapper
        if (expectedType === 'reference') {
          continue;
        }
        
        // Skip validation for enum fields - they're just strings with specific allowed values
        if (expectedType === 'enum') {
          continue;
        }
        
        // For date fields, accept strings that can be parsed as dates
        if (expectedType === 'date') {
          if (actualType === 'string') {
            const parsedDate = new Date(value);
            if (isNaN(parsedDate.getTime())) {
              errors.push(this.validationError(
                field,
                `${field} must be a valid date`,
                { expectedType, actualType, value }
              ));
            }
          }
          continue;
        }
        
        // For boolean fields, accept string representations
        if (expectedType === 'boolean') {
          if (actualType === 'string' && (value === 'true' || value === 'false')) {
            continue;
          }
          if (actualType === 'boolean') {
            continue;
          }
          errors.push(this.validationError(
            field,
            `${field} must be a boolean value (true/false)`,
            { expectedType, actualType, receivedValue: value }
          ));
          continue;
        }
        
        // For number fields, accept string representations of numbers
        if (expectedType === 'number') {
          if (actualType === 'string' && !isNaN(parseFloat(value)) && isFinite(parseFloat(value))) {
            continue;
          }
          if (actualType === 'number') {
            continue;
          }
          errors.push(this.validationError(
            field,
            `${field} must be a number`,
            { expectedType, actualType, receivedValue: value }
          ));
          continue;
        }
        
        
        if (expectedType === 'array' && !Array.isArray(value)) {
          errors.push(this.validationError(
            field,
            `${field} must be an array`,
            { expectedType, actualType: 'non-array' }
          ));
        } else if (expectedType === 'string' && actualType !== 'string') {
          errors.push(this.validationError(
            field,
            `${field} must be of type ${expectedType}`,
            { expectedType, actualType }
          ));
        }
      }
    }

    return errors;
  }

  /**
   * Validate reference field existence
   */
  static async validateReferenceFields(
    data: Record<string, any>,
    referenceFields: Record<string, { model: string; field: string }>,
    models: Record<string, any>
  ): Promise<VoiceError[]> {
    const errors: VoiceError[] = [];

    for (const [field, config] of Object.entries(referenceFields)) {
      const value = data[field];
      if (value) {
        try {
          const Model = models[config.model];
          if (!Model) {
            errors.push(this.systemError(
              `Reference model '${config.model}' not found`,
              { field, model: config.model }
            ));
            continue;
          }

          const query = { [config.field]: value };
          const exists = await Model.findOne(query);
          
          if (!exists) {
            errors.push(this.dataError(
              field,
              `Referenced ${config.model} with ${config.field} '${value}' not found`,
              { field, value, model: config.model }
            ));
          }
        } catch (error) {
          logger.error('Error validating reference field:', error);
          errors.push(this.systemError(
            `Error validating reference for ${field}`,
            { field, error: error.message }
          ));
        }
      }
    }

    return errors;
  }

  /**
   * Log error for monitoring
   */
  static logError(intent: string, userRole: string, errors: VoiceError[], context?: any): void {
    logger.error('Voice command validation failed', {
      intent,
      userRole,
      errors: errors.map(err => ({
        type: err.type,
        field: err.field,
        message: err.message,
        code: err.code
      })),
      context
    });
  }

  /**
   * Comprehensive validation for voice commands
   */
  static async validateVoiceCommand(
    intent: string,
    userRole: string,
    data: Record<string, any>,
    config: {
      requiredRoles?: string[];
      requiredFields?: string[];
      fieldTypes?: Record<string, string>;
      referenceFields?: Record<string, { model: string; field: string }>;
      models?: Record<string, any>;
    }
  ): Promise<VoiceError[]> {
    const errors: VoiceError[] = [];

    try {
      // 1. Validate role permissions
      if (config.requiredRoles) {
        errors.push(...this.validateRolePermissions(userRole, intent, config.requiredRoles));
      }

      // 2. Validate required fields
      if (config.requiredFields) {
        errors.push(...this.validateRequiredFields(data, config.requiredFields));
      }

      // 3. Validate field types
      if (config.fieldTypes) {
        errors.push(...this.validateFieldTypes(data, config.fieldTypes));
      }

      // 4. Validate reference fields
      if (config.referenceFields && config.models) {
        const refErrors = await this.validateReferenceFields(
          data,
          config.referenceFields,
          config.models
        );
        errors.push(...refErrors);
      }

      // Log if there are errors
      if (errors.length > 0) {
        this.logError(intent, userRole, errors, { data, config });
      }

    } catch (error) {
      logger.error('Error during voice command validation:', error);
      errors.push(this.systemError(
        'Validation system error occurred',
        { error: error.message }
      ));
    }

    return errors;
  }
}