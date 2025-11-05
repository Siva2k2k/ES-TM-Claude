import { VoiceAction, VoiceContext } from '../types/voice';
import AzureOpenAIService from './AzureOpenAIService';
import VoiceContextService from './VoiceContextService';
import IntentConfigService from './IntentConfigService';
import { IUser } from '../models/User';
import { IIntentDefinition } from '../models/IntentDefinition';
import logger from '../config/logger';

interface IntentDetectionResponse {
  intents: string[];
}

interface DataExtractionResponse {
  actions: VoiceAction[];
}

class IntentRecognitionService {
  /**
   * Two-step voice command processing
   * Step 1: Detect intents with minimal prompt
   * Step 2: Extract data with context-enriched prompt
   */
  async processCommand(transcript: string, user: IUser): Promise<VoiceAction[]> {
    logger.info('Processing voice command', {
      userId: user._id,
      transcript
    });

    // Step 1: Intent Detection
    const intents = await this.detectIntents(transcript, user);

    if (intents.length === 0) {
      return [{
        intent: 'unknown',
        data: {},
        errors: ['Unable to understand the command. Please try rephrasing.'],
        description: 'Command not recognized'
      }];
    }

    // Step 2: Data Extraction with Context
    const actions = await this.extractData(transcript, intents, user);

    // Track command in user history
    await IntentConfigService.addCommandToHistory(
      user._id,
      transcript,
      actions.length > 0 ? actions[0].intent : 'unknown',
      actions.length > 0 && actions[0].errors.length === 0
    );

    return actions;
  }

  /**
   * Step 1: Detect intents from user command (minimal prompt)
   */
  private async detectIntents(transcript: string, user: IUser): Promise<string[]> {
    try {
      const context = await VoiceContextService.getContext(user);

      const allowedIntentNames = context.allowedIntents.map(i => i.intent);

      const systemPrompt = `You are an intent classifier for a timesheet management system.
Your task is to identify the user's intents from their voice command.

Available Intents:
${allowedIntentNames.join(', ')}

Rules:
1. Return ONLY valid JSON with an array of intents
2. Multiple intents are allowed if the user requests multiple actions
3. Only return intents from the available list
4. If intent is unclear, make your best guess based on keywords

Response Format:
{
  "intents": ["intent1", "intent2"]
}`;

      const userPrompt = `User Command: "${transcript}"

Identify the intents from this command.`;

      const response = await AzureOpenAIService.generateCompletion({
        systemPrompt,
        userPrompt,
        temperature: 0.1,
        maxTokens: 200
      });

      const parsed = AzureOpenAIService.parseJSONResponse<IntentDetectionResponse>(response);

      logger.info('Intents detected', {
        intents: parsed.intents,
        transcript
      });

      return parsed.intents;
    } catch (error) {
      logger.error('Intent detection failed, falling back to keyword matching', { error, transcript });
      
      // Fallback: Use keyword-based intent detection
      return this.fallbackIntentDetection(transcript, user);
    }
  }

  /**
   * Step 2: Extract data from command with full context
   */
  private async extractData(
    transcript: string,
    intents: string[],
    user: IUser
  ): Promise<VoiceAction[]> {
    const context = await VoiceContextService.getContextForIntents(user, intents);

    // Build comprehensive prompt with context from database
    const systemPrompt = await this.buildContextualPrompt(context, intents);

    const userPrompt = `VOICE COMMAND: "${transcript}"

Parse this command and return the structured JSON response.`;

    try {
      const response = await AzureOpenAIService.generateCompletion({
        systemPrompt,
        userPrompt,
        temperature: 0.1,
        maxTokens: 2000
      });

      const parsed = AzureOpenAIService.parseJSONResponse<DataExtractionResponse>(response);

      // Enrich actions with field definitions from intent definitions
      const enrichedActions = parsed.actions.map(action => {
        const intentDef = context.allowedIntents.find(i => i.intent === action.intent);
        if (intentDef) {
          return this.enrichActionWithFields(action, intentDef);
        }
        return action;
      });

      logger.info('Data extracted', {
        actionsCount: enrichedActions.length,
        intents: enrichedActions.map(a => a.intent)
      });

      return enrichedActions;
    } catch (error) {
      logger.error('Data extraction failed', { error, transcript });
      return [{
        intent: intents[0] || 'unknown',
        data: {},
        errors: ['Failed to parse command. Please try again.'],
        description: 'Failed to extract data from command'
      }];
    }
  }

  /**
   * Enrich action with field definitions from intent definition
   */
  private enrichActionWithFields(action: VoiceAction, intentDef: IIntentDefinition): VoiceAction {
    const fields: any[] = [];

    // Add required fields
    for (const fieldName of intentDef.requiredFields) {
      const fieldType = intentDef.fieldTypes.get(fieldName) || 'string';
      const enumValues = intentDef.enumValues?.get(fieldName);
      const referenceType = intentDef.referenceTypes?.get(fieldName);

      fields.push({
        name: fieldName,
        type: fieldType,
        required: true,
        enumValues: enumValues || undefined,
        referenceType: referenceType || undefined,
        label: this.formatFieldLabel(fieldName)
      });

      // Ensure field exists in data (with empty value if not present)
      if (!(fieldName in action.data)) {
        action.data[fieldName] = this.getDefaultValueForType(fieldType);
      }
    }

    // Add optional fields
    for (const fieldName of intentDef.optionalFields) {
      const fieldType = intentDef.fieldTypes.get(fieldName) || 'string';
      const enumValues = intentDef.enumValues?.get(fieldName);
      const referenceType = intentDef.referenceTypes?.get(fieldName);

      fields.push({
        name: fieldName,
        type: fieldType,
        required: false,
        enumValues: enumValues || undefined,
        referenceType: referenceType || undefined,
        label: this.formatFieldLabel(fieldName)
      });

      // Ensure field exists in data if it has a value or is boolean
      if (!(fieldName in action.data)) {
        if (fieldType === 'boolean') {
          action.data[fieldName] = false;
        } else {
          action.data[fieldName] = this.getDefaultValueForType(fieldType);
        }
      }
    }

    return {
      ...action,
      fields
    };
  }

  /**
   * Format field name to readable label
   */
  private formatFieldLabel(fieldName: string): string {
    return fieldName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Get default value for a field type
   */
  private getDefaultValueForType(type: string): any {
    switch (type) {
      case 'number':
        return '';
      case 'boolean':
        return false;
      case 'date':
        return '';
      case 'array':
        return [];
      default:
        return '';
    }
  }

  /**
   * Build contextual prompt with all necessary information from database
   */
  private async buildContextualPrompt(context: VoiceContext, intents: string[]): Promise<string> {
    let prompt = `You are a timesheet system command parser. Extract data from voice commands and return ONLY valid JSON.

Parse the following user command into a structured JSON object with:
- intent (from the list of allowed intents)
- data (field values extracted from command)
- errors (validation errors, permission errors, fuzzy matches)
- description (human-readable action plan)

IMPORTANT RULES:
1. Extract field values from the command and map to exact field names provided
2. Create separate actions if user requests multiple operations
3. Throw error if intent is not in Allowed Intents list
4. Capture ALL errors per intent; do not stop at first error
5. For dates: Convert day names (Monday, Tuesday) to YYYY-MM-DD format
   - Calculate based on current week
   - Today is ${context.currentDate}
   - Current week: ${context.currentWeek.start} to ${context.currentWeek.end}
6. For hours: Extract numeric value (support "5 hours", "5h", "5.5 hours")
7. For field values: Try exact match from available lists first
   - If no exact match, use closest match and add error
   - For 'update' intents: Require exact match or throw error
8. For 'create' intents: Entity (name/email) should NOT exist in available list
9. For 'add_entries': Handle entry types (Leave, Training, Miscellaneous) with "entryType" field
10. If exact task match not found, flag as custom_task

Current User Role: ${context.user.role}

Allowed Intents:
${context.allowedIntents.map(i => i.intent).join(', ')}

Not Allowed Intents:
${context.disallowedIntents.map(i => i.intent).join(', ')}

`;

    // Add available entities
    if (context.entities.projects && context.entities.projects.length > 0) {
      prompt += `\nAvailable Projects:\n`;
      context.entities.projects.forEach(p => {
        prompt += `- ${p.name}${p.client ? ` (Client: ${p.client})` : ''}\n`;
      });
    }

    if (context.entities.users && context.entities.users.length > 0) {
      prompt += `\nAvailable Users:\n`;
      context.entities.users.slice(0, 20).forEach(u => {
        prompt += `- ${u.name} (${u.email}, ${u.role})\n`;
      });
      if (context.entities.users.length > 20) {
        prompt += `... and ${context.entities.users.length - 20} more users\n`;
      }
    }

    if (context.entities.clients && context.entities.clients.length > 0) {
      prompt += `\nAvailable Clients:\n`;
      context.entities.clients.forEach(c => {
        prompt += `- ${c.name}${c.contactPerson ? ` (Contact: ${c.contactPerson})` : ''}\n`;
      });
    }

    if (context.entities.tasks) {
      prompt += `\nAvailable Tasks by Project:\n`;
      Object.entries(context.entities.tasks).slice(0, 10).forEach(([projectName, tasks]) => {
        prompt += `- ${projectName}: {${tasks.map(t => t.name).join(', ')}}\n`;
      });
    }

    // Add field definitions for each intent from database
    prompt += `\n`;
    for (const intent of intents) {
      const intentDef = context.allowedIntents.find(i => i.intent === intent);
      if (intentDef) {
        prompt += this.buildIntentFieldDefinition(intentDef);
      }
    }

    prompt += `\nResponse Format (JSON only):
{
  "actions": [
    {
      "intent": "intent_name",
      "data": {
        "fieldName": "value",
        ...
      },
      "errors": [
        "Error message if any"
      ],
      "description": "Human-readable description of what this action will do"
    }
  ]
}

Example:
{
  "actions": [
    {
      "intent": "add_entries",
      "data": {
        "projectName": "HVAC Installation",
        "taskName": "Code Review",
        "date": "2025-10-22",
        "hours": 5,
        "taskType": "project_task",
        "entryType": "Project"
      },
      "errors": [],
      "description": "Add 5 hours to HVAC Installation project for Code Review task on 2025-10-22"
    }
  ]
}`;

    return prompt;
  }

  /**
   * Build field definition section for an intent from database
   */
  private buildIntentFieldDefinition(intentDef: IIntentDefinition): string {
    let section = `\nIntent: ${intentDef.intent}\n`;
    section += `Description: ${intentDef.description}\n`;
    section += `Required Fields: ${intentDef.requiredFields.join(', ')}\n`;
    section += `Optional Fields: ${intentDef.optionalFields.join(', ')}\n`;

    if (intentDef.enumValues && intentDef.enumValues.size > 0) {
      section += `Enum Values:\n`;
      intentDef.enumValues.forEach((values, field) => {
        section += `  ${field}: {${values.join(', ')}}\n`;
      });
    }

    section += `Example: ${intentDef.exampleCommand}\n`;

    return section;
  }

  /**
   * Fallback intent detection using keyword matching when Azure OpenAI fails
   */
  private async fallbackIntentDetection(transcript: string, user: IUser): Promise<string[]> {
    try {
      const context = await VoiceContextService.getContext(user);
      const allowedIntents = context.allowedIntents.map(i => i.intent);
      const detectedIntents: string[] = [];

      // Convert transcript to lowercase for matching
      const lowerTranscript = transcript.toLowerCase();

      // Keywords mapping for common intents
      const intentKeywords: Record<string, string[]> = {
        'add_entries': ['add', 'create', 'log', 'entry', 'timesheet', 'hours'],
        'update_entries': ['update', 'modify', 'change', 'edit'],
        'view_entries': ['view', 'show', 'display', 'see', 'list'],
        'delete_entries': ['delete', 'remove', 'clear'],
        'create_project': ['create project', 'new project', 'add project'],
        'create_user': ['create user', 'new user', 'add user'],
        'view_reports': ['report', 'summary', 'analytics'],
        'manage_holidays': ['holiday', 'vacation', 'leave'],
        'view_dashboard': ['dashboard', 'overview', 'summary']
      };

      // Check each intent against keywords
      for (const intent of allowedIntents) {
        const keywords = intentKeywords[intent] || [];
        const hasKeyword = keywords.some(keyword => lowerTranscript.includes(keyword));
        
        if (hasKeyword) {
          detectedIntents.push(intent);
        }
      }

      // Default to add_entries if no specific intent found but mentions hours/time
      if (detectedIntents.length === 0) {
        if (lowerTranscript.includes('hour') || lowerTranscript.includes('time') || 
            lowerTranscript.includes('project')) {
          detectedIntents.push('add_entries');
        }
      }

      logger.info('Fallback intent detection completed', {
        detectedIntents,
        transcript
      });

      return detectedIntents;
    } catch (error) {
      logger.error('Fallback intent detection failed', { error, transcript });
      return ['add_entries']; // Ultimate fallback
    }
  }
}

export default new IntentRecognitionService();
