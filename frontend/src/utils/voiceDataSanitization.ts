/**
 * Voice Data Sanitization Utilities
 * 
 * Prevents common data corruption issues in voice command processing,
 * particularly the date corruption where parseFloat("2026-01-02") = 2026
 * gets passed to new Date(2026) creating 1970 epoch timestamps.
 */

/**
 * Determines if a field should be treated as a date/time field
 * @param fieldName - The field name to check
 * @param value - The field value to check
 * @returns true if this field should be preserved as a date string
 */
export function isDateTimeField(fieldName: string, value: string): boolean {
  const lowerFieldName = fieldName.toLowerCase();
  const trimmedValue = value.trim();
  
  // Check field name patterns
  const dateFieldPatterns = [
    'date',
    'time', 
    'deadline',
    'due',
    'start',
    'end',
    'created',
    'updated',
    'modified',
    'scheduled'
  ];
  
  if (dateFieldPatterns.some(pattern => lowerFieldName.includes(pattern))) {
    return true;
  }
  
  // Check value patterns (ISO date format)
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmedValue)) {
    return true;
  }
  
  // Check for relative date strings
  const relativeDatePatterns = [
    'today', 'tomorrow', 'yesterday',
    'next week', 'next month', 'next year',
    'last week', 'last month', 'last year'
  ];
  
  if (relativeDatePatterns.some(pattern => trimmedValue.toLowerCase().includes(pattern))) {
    return true;
  }
  
  return false;
}

/**
 * Sanitizes voice action data to prevent type conversion errors
 * @param data - Raw voice action data
 * @returns Sanitized data safe for backend processing
 */
export function sanitizeVoiceActionData(data: Record<string, any>): Record<string, any> {
  const sanitized = { ...data };
  
  Object.keys(sanitized).forEach((fieldName) => {
    const value = sanitized[fieldName];
    
    // Remove null/undefined/empty values
    if (value === null || value === undefined) {
      delete sanitized[fieldName];
      return;
    }
    
    if (typeof value === 'string') {
      const trimmed = value.trim();
      
      // Remove empty strings
      if (trimmed === '') {
        delete sanitized[fieldName];
        return;
      }
      
      // CRITICAL: Handle date/time fields BEFORE numeric conversion
      if (isDateTimeField(fieldName, trimmed)) {
        // Keep as string for backend parsing
        sanitized[fieldName] = trimmed;
        return;
      }
      
      // Handle budget/monetary fields
      if (fieldName.toLowerCase().includes('budget') || 
          fieldName.toLowerCase().includes('amount') || 
          fieldName.toLowerCase().includes('cost') || 
          fieldName.toLowerCase().includes('price')) {
        const parsed = parseFloat(trimmed);
        if (!isNaN(parsed)) {
          sanitized[fieldName] = parsed;
        } else {
          delete sanitized[fieldName];
        }
        return;
      }
      
      // Handle other numeric fields
      if (/^(estimated|hours|rate|count|quantity)/i.test(fieldName) || 
          /^[0-9.+-eE]+$/.test(trimmed)) {
        const parsed = parseFloat(trimmed);
        if (!isNaN(parsed)) {
          sanitized[fieldName] = parsed;
        } else {
          delete sanitized[fieldName];
        }
        return;
      }
    }
  });
  
  return sanitized;
}

/**
 * Sanitizes an array of voice actions
 * @param actions - Array of voice actions to sanitize
 * @returns Sanitized voice actions
 */
export function sanitizeVoiceActions(actions: any[]): any[] {
  return actions.map(action => ({
    ...action,
    data: sanitizeVoiceActionData(action.data || {})
  }));
}