import { ObjectId } from 'mongoose';
import { IIntentDefinition } from '../models/IntentDefinition';

// Voice command processing types
export interface VoiceCommandRequest {
  transcript: string;
  context?: {
    currentPage?: string;
    currentRoute?: string;
    selectedEntity?: {
      type: 'project' | 'user' | 'timesheet' | 'client';
      id: string;
    };
    recentActions?: string[];
  };
}

export interface VoiceActionField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'array';
  required: boolean;
  enumValues?: string[];
  label?: string;
}

export interface VoiceAction {
  intent: string;
  data: Record<string, any>;
  errors: string[];
  description: string;
  fields?: VoiceActionField[]; // Field definitions for the form
  confidence?: number;
  warnings?: string[];
}

export interface VoiceCommandResponse {
  success: boolean;
  actions: VoiceAction[];
  message?: string;
}

export interface VoiceExecuteRequest {
  actions: VoiceAction[];
  confirmed: boolean;
  userId: string;
}

// Intent types - now fetched from DB, but type for reference
export type Intent = string;

// Context types
export interface VoiceContext {
  user: {
    id: string;
    name: string;
    role: string;
    email: string;
  };
  allowedIntents: IIntentDefinition[];
  disallowedIntents: IIntentDefinition[];
  entities: {
    projects?: Array<{ id: string; name: string; client?: string }>;
    users?: Array<{ id: string; name: string; email: string; role: string }>;
    clients?: Array<{ id: string; name: string; contactPerson?: string }>;
    tasks?: Record<string, Array<{ id: string; name: string; assignedTo?: string }>>;
    timesheets?: Array<{ weekStart: string; weekEnd: string; status: string }>;
    projectWeekGroups?: Array<{
      projectId: string;
      projectName: string;
      weekStart: string;
      weekEnd: string;
    }>;
  };
  currentDate: string;
  currentWeek: {
    start: string;
    end: string;
  };
}

// Azure OpenAI types
export interface AzureOpenAIConfig {
  endpoint: string;
  apiKey: string;
  deploymentName: string;
  apiVersion: string;
}

export interface LLMPrompt {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMResponse {
  content: string;
  finishReason: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// Speech-to-text types
export interface SpeechToTextRequest {
  audioData: string; // base64 encoded audio
  format: 'webm' | 'ogg' | 'wav' | 'mp3';
  language?: string;
}

export interface SpeechToTextResponse {
  transcript: string;
  confidence?: number;
  language?: string;
}

// Action execution types
export interface ActionExecutionResult {
  intent: Intent;
  success: boolean;
  data?: any;
  error?: string;
  affectedEntities?: Array<{
    type: string;
    id: string;
    name?: string;
  }>;
  redirectUrl?: string;
}

export interface VoiceExecuteResponse {
  success: boolean;
  results: ActionExecutionResult[];
  message: string;
}
