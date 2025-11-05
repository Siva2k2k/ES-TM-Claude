// Voice command and action types for frontend

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
  confidence: number;
  errors?: string[];
  warnings?: string[];
  fields?: VoiceActionField[]; // Field definitions for rendering the form
  description?: string;
}

export interface VoiceCommandResponse {
  success: boolean;
  actions: VoiceAction[];
  message: string;
  timestamp: string;
}

export interface VoiceExecuteResponse {
  success: boolean;
  results: ActionExecutionResult[];
  message: string;
  timestamp: string;
}

export interface ActionExecutionResult {
  intent: string;
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  redirectUrl?: string;
  affectedEntities?: {
    projectId?: string;
    userId?: string;
    clientId?: string;
    timesheetId?: string;
    projectWeekGroupId?: string;
    auditLogId?: string;
  };
}

export interface IntentDefinition {
  _id: string;
  intent: string;
  category: 'project' | 'user' | 'client' | 'timesheet' | 'team_review' | 'billing' | 'audit';
  description: string;
  requiredFields: string[];
  optionalFields: string[];
  fieldTypes: Record<string, 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'array'>;
  enumValues?: Record<string, string[]>;
  contextRequired: Array<'projects' | 'users' | 'clients' | 'tasks' | 'timesheets' | 'projectWeekGroups'>;
  allowedRoles: Array<'super_admin' | 'management' | 'manager' | 'lead' | 'employee'>;
  exampleCommand: string;
  redirectUrlTemplate?: string;
  isActive: boolean;
}

export interface VoiceContext {
  allowedIntents: IntentDefinition[];
  entities: {
    projects?: Array<{ _id: string; project_name: string; client_name: string }>;
    users?: Array<{ _id: string; name: string; role: string; email: string }>;
    clients?: Array<{ _id: string; client_name: string; email: string }>;
    tasks?: Array<{ _id: string; task_name: string; project_name: string }>;
    timesheets?: Array<{ _id: string; date: string; user_name: string; hours: number }>;
    projectWeekGroups?: Array<{ _id: string; project_name: string; week_start: string; week_end: string }>;
  };
  user: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
}

export interface UserVoicePreferences {
  user_id: string;
  speechMethod: 'web-speech' | 'azure-speech' | 'auto';
  enabledIntents: string[];
  disabledIntents: string[];
  customCommands: Array<{
    phrase: string;
    intent: string;
    data: Record<string, any>;
  }>;
  voiceSettings: {
    language: string;
    autoSubmit: boolean;
    confirmBeforeExecute: boolean;
  };
  commandHistory: Array<{
    command: string;
    intent: string;
    timestamp: string;
    success: boolean;
  }>;
}

export interface DeviceInfo {
  browser: 'chrome' | 'firefox' | 'safari' | 'edge' | 'opera' | 'samsung' | 'unknown';
  version: string;
  os: 'windows' | 'mac' | 'ios' | 'android' | 'linux' | 'unknown';
  isMobile: boolean;
  supportsWebSpeech: boolean;
  recommendedMethod: 'web-speech' | 'azure-speech';
}

export interface SpeechToTextRequest {
  audioData: string; // base64
  format: 'webm' | 'wav' | 'mp3' | 'ogg';
  language?: string;
}

export interface SpeechToTextResponse {
  success: boolean;
  transcript: string;
  confidence: number;
  language: string;
  duration: number;
  message?: string;
}

export interface IntentStatistics {
  totalIntents: number;
  activeIntents: number;
  inactiveIntents: number;
  byCategory: Record<string, number>;
  byRole: Record<string, number>;
  mostUsedIntents: Array<{
    intent: string;
    count: number;
    successRate: number;
  }>;
}

// Voice layer state
export interface VoiceState {
  isListening: boolean;
  isProcessing: boolean;
  transcript: string;
  pendingActions: VoiceAction[];
  context: VoiceContext | null;
  preferences: UserVoicePreferences | null;
  deviceInfo: DeviceInfo | null;
  error: string | null;
}

// Voice layer actions
export type VoiceActionType =
  | { type: 'START_LISTENING' }
  | { type: 'STOP_LISTENING' }
  | { type: 'SET_TRANSCRIPT'; payload: string }
  | { type: 'SET_PROCESSING'; payload: boolean }
  | { type: 'SET_PENDING_ACTIONS'; payload: VoiceAction[] }
  | { type: 'CLEAR_PENDING_ACTIONS' }
  | { type: 'SET_CONTEXT'; payload: VoiceContext }
  | { type: 'SET_PREFERENCES'; payload: UserVoicePreferences }
  | { type: 'SET_DEVICE_INFO'; payload: DeviceInfo }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET' };
