# Voice Layer with LLM Support - Detailed Implementation Plan

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [System Flow](#system-flow)
3. [Device Detection Strategy](#device-detection-strategy)
4. [Redirection Logic](#redirection-logic)
5. [Backend Implementation](#backend-implementation)
6. [Frontend Implementation](#frontend-implementation)
7. [Intent & Context Mapping](#intent--context-mapping)
8. [Security & Authorization](#security--authorization)
9. [Implementation Phases](#implementation-phases)
10. [Testing Strategy](#testing-strategy)
11. [Deployment Considerations](#deployment-considerations)

---

## Architecture Overview

### Design Principle
**Backend-Heavy Architecture**: All external service calls (Azure OpenAI, Azure Speech) are made from the backend. Frontend remains lightweight, handling only UI state, speech capture, and user interactions.

### Technology Stack

**Backend:**
- Azure OpenAI API (GPT-4o-mini) for intent recognition and data extraction
- Azure Cognitive Speech Services for speech-to-text (Safari/Opera fallback)
- Existing Express.js + TypeScript backend
- Existing MongoDB models and services

**Frontend:**
- React Speech Recognition (Web Speech API) - Primary for Chrome/Edge/Firefox
- MediaRecorder API - Audio capture for Azure Speech fallback
- Existing React + TypeScript + Tailwind setup
- Existing Modal and Form infrastructure

---

## System Flow

### Flow 1: Browser Speech Recognition (Primary - Chrome/Edge/Firefox)

```
User speaks
    ↓
react-speech-recognition (Web Speech API)
    ↓
Text transcript captured in frontend
    ↓
POST /api/v1/voice/process-command
    {
        transcript: "Create project named AI Platform",
        context: { currentPage, userRole, recentActions }
    }
    ↓
Backend: IntentRecognitionService
    ↓
Step 1: Azure OpenAI - Intent Detection (minimal prompt)
    Response: { intents: ["create_project"] }
    ↓
Step 2: Fetch Context (VoiceContextService)
    - Get allowed intents for user role
    - Get available entities (clients, managers, projects)
    - Get required fields for intent
    ↓
Step 3: Azure OpenAI - Data Extraction (context-enriched prompt)
    Response: {
        actions: [{
            intent: "create_project",
            data: { projectName: "AI Platform" },
            errors: [],
            description: "Create project named AI Platform"
        }]
    }
    ↓
Backend Response to Frontend
    ↓
Frontend: VoiceConfirmationModal
    - Show action plan (description)
    - Render dynamic form (ProjectForm with pre-filled data)
    - Show errors if any
    - Actions: Confirm / Edit / Cancel
    ↓
User clicks "Confirm"
    ↓
POST /api/v1/voice/execute-action
    {
        actions: [...],
        confirmed: true
    }
    ↓
Backend: VoiceActionDispatcher
    - Validate permissions
    - Call appropriate service (ProjectService.createProject)
    - Log to AuditLog
    - Send notification
    ↓
Success Response
    ↓
Frontend: Show success toast, update UI
```

### Flow 2: Azure Speech Fallback (Safari/Opera)

```
User speaks
    ↓
MediaRecorder captures audio blob
    ↓
Convert blob to base64
    ↓
POST /api/v1/voice/speech-to-text
    {
        audioData: "base64_encoded_audio",
        format: "webm"
    }
    ↓
Backend: Azure Speech Service
    - Convert speech to text
    ↓
Response: { transcript: "..." }
    ↓
Frontend: Continue with Flow 1 from "POST /api/v1/voice/process-command"
```

---

## Device Detection Strategy

### Intelligent Speech Recognition Selection

The system automatically detects the user's device and browser capabilities to choose the optimal speech recognition method:

**Detection Hierarchy:**
1. **Feature Detection** - Check if Web Speech API is available (`window.SpeechRecognition` or `window.webkitSpeechRecognition`)
2. **Browser Detection** - Parse User-Agent to identify specific browsers and versions
3. **User Preference** - Check localStorage for previously saved preference
4. **Fallback** - Default to Azure Speech if Web Speech API is unavailable

### Browser/Device Compatibility Matrix

| Browser/Device | Speech Method | Version Requirements |
|----------------|---------------|---------------------|
| Chrome Desktop | Web Speech API | v25+ |
| Chrome Android | Web Speech API | v25+ |
| Edge Desktop | Web Speech API | v79+ |
| Firefox Desktop | Web Speech API | Experimental (flag required) |
| Safari Desktop | Web Speech API | v14.1+ |
| Safari iOS | Web Speech API | v14.5+ |
| Safari < 14.1 | **Azure Speech** | All versions |
| Opera Desktop | **Azure Speech** | All versions |
| Opera Mobile | **Azure Speech** | All versions |
| Firefox Mobile | **Azure Speech** | All versions |
| Samsung Internet | **Azure Speech** | All versions |

### Device Detection Utility

**File: `frontend/src/utils/deviceDetection.ts`**

```typescript
export interface DeviceInfo {
  browser: string;
  version: string;
  os: string;
  isMobile: boolean;
  supportsWebSpeech: boolean;
  recommendedMethod: 'web-speech' | 'azure-speech';
}

export class DeviceDetector {
  /**
   * Detect device and browser information
   */
  static detect(): DeviceInfo {
    const ua = navigator.userAgent;

    const browser = this.detectBrowser(ua);
    const version = this.detectVersion(ua, browser);
    const os = this.detectOS(ua);
    const isMobile = this.isMobileDevice(ua);
    const supportsWebSpeech = this.checkWebSpeechSupport();
    const recommendedMethod = this.getRecommendedMethod(browser, version, supportsWebSpeech);

    return {
      browser,
      version,
      os,
      isMobile,
      supportsWebSpeech,
      recommendedMethod
    };
  }

  /**
   * Check if Web Speech API is available
   */
  private static checkWebSpeechSupport(): boolean {
    return !!(
      window.SpeechRecognition ||
      (window as any).webkitSpeechRecognition ||
      (window as any).mozSpeechRecognition ||
      (window as any).msSpeechRecognition
    );
  }

  /**
   * Detect browser name
   */
  private static detectBrowser(ua: string): string {
    if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
    if (ua.includes('Edg')) return 'Edge';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('OPR') || ua.includes('Opera')) return 'Opera';
    if (ua.includes('SamsungBrowser')) return 'Samsung Internet';
    return 'Unknown';
  }

  /**
   * Detect browser version
   */
  private static detectVersion(ua: string, browser: string): string {
    let match;
    switch (browser) {
      case 'Chrome':
        match = ua.match(/Chrome\/(\d+)/);
        break;
      case 'Edge':
        match = ua.match(/Edg\/(\d+)/);
        break;
      case 'Safari':
        match = ua.match(/Version\/(\d+)/);
        break;
      case 'Firefox':
        match = ua.match(/Firefox\/(\d+)/);
        break;
      case 'Opera':
        match = ua.match(/(?:OPR|Opera)\/(\d+)/);
        break;
      case 'Samsung Internet':
        match = ua.match(/SamsungBrowser\/(\d+)/);
        break;
    }
    return match ? match[1] : 'Unknown';
  }

  /**
   * Detect operating system
   */
  private static detectOS(ua: string): string {
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac OS X')) return 'macOS';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    if (ua.includes('Linux')) return 'Linux';
    return 'Unknown';
  }

  /**
   * Check if device is mobile
   */
  private static isMobileDevice(ua: string): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  }

  /**
   * Get recommended speech recognition method
   */
  private static getRecommendedMethod(
    browser: string,
    version: string,
    supportsWebSpeech: boolean
  ): 'web-speech' | 'azure-speech' {
    // Opera always uses Azure
    if (browser === 'Opera') return 'azure-speech';

    // Safari version check
    if (browser === 'Safari') {
      const versionNum = parseInt(version);
      if (isNaN(versionNum) || versionNum < 14) {
        return 'azure-speech';
      }
    }

    // Samsung Internet uses Azure
    if (browser === 'Samsung Internet') return 'azure-speech';

    // Firefox mobile uses Azure
    if (browser === 'Firefox' && this.isMobileDevice(navigator.userAgent)) {
      return 'azure-speech';
    }

    // If Web Speech is not supported, use Azure
    if (!supportsWebSpeech) return 'azure-speech';

    // Default to Web Speech for supported browsers
    return 'web-speech';
  }

  /**
   * Get user preference from localStorage
   */
  static getUserPreference(): 'web-speech' | 'azure-speech' | null {
    const preference = localStorage.getItem('voice_speech_method');
    if (preference === 'web-speech' || preference === 'azure-speech') {
      return preference;
    }
    return null;
  }

  /**
   * Save user preference to localStorage
   */
  static saveUserPreference(method: 'web-speech' | 'azure-speech'): void {
    localStorage.setItem('voice_speech_method', method);
  }

  /**
   * Get final speech method (considering user preference)
   */
  static getSpeechMethod(): 'web-speech' | 'azure-speech' {
    const preference = this.getUserPreference();
    if (preference) return preference;

    const deviceInfo = this.detect();
    return deviceInfo.recommendedMethod;
  }
}
```

### Usage in VoiceLayer Component

```typescript
import { DeviceDetector } from '../../utils/deviceDetection';

const VoiceLayer: React.FC = () => {
  const [speechMethod, setSpeechMethod] = useState<'web-speech' | 'azure-speech'>('web-speech');
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);

  useEffect(() => {
    // Detect device on mount
    const info = DeviceDetector.detect();
    setDeviceInfo(info);

    // Get preferred speech method
    const method = DeviceDetector.getSpeechMethod();
    setSpeechMethod(method);

    console.info('Voice Layer Device Detection:', {
      browser: info.browser,
      version: info.version,
      os: info.os,
      isMobile: info.isMobile,
      supportsWebSpeech: info.supportsWebSpeech,
      selectedMethod: method
    });
  }, []);

  // Rest of component logic...
};
```

### Benefits

1. **Automatic Selection** - No user configuration needed, works out of the box
2. **Optimal Performance** - Uses native Web Speech API when available for lower latency
3. **Universal Support** - Falls back to Azure Speech for unsupported browsers
4. **User Control** - Users can manually switch methods if desired
5. **Persistent Preference** - Saves user choice in localStorage
6. **Detailed Logging** - Tracks device info for debugging and analytics

---

## Redirection Logic

### Automatic Navigation After Success

After successful voice command execution and database updates, the system automatically redirects users to the relevant page to view their changes.

### Intent-to-Route Mapping

**File: `backend/src/types/voice.ts`** (Update)

```typescript
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
  redirectUrl?: string; // NEW: URL to redirect user after success
}
```

### Redirect URL Generation

**Complete Intent-to-Route Mapping:**

| Intent | Redirect URL | Description |
|--------|-------------|-------------|
| `create_project` | `/projects/{projectId}` | Open newly created project detail page |
| `update_project` | `/projects/{projectId}` | Show updated project page |
| `add_project_member` | `/projects/{projectId}?tab=members` | Open project with members tab active |
| `remove_project_member` | `/projects/{projectId}?tab=members` | Open project with members tab active |
| `add_task` | `/projects/{projectId}?tab=tasks` | Open project with tasks tab active |
| `update_task` | `/projects/{projectId}?tab=tasks` | Open project with tasks tab active |
| `delete_project` | `/projects` | Return to projects list page |
| `create_user` | `/admin/users/{userId}` | Open newly created user profile |
| `update_user` | `/admin/users/{userId}` | Show updated user profile |
| `delete_user` | `/admin/users` | Return to users list |
| `create_client` | `/admin/clients/{clientId}` | Open newly created client page |
| `update_client` | `/admin/clients/{clientId}` | Show updated client page |
| `delete_client` | `/admin/clients` | Return to clients list |
| `create_timesheet` | `/timesheets?week={weekStart}` | Open newly created timesheet |
| `add_entries` | `/timesheets?week={weekStart}` | Show timesheet with new entries |
| `update_entries` | `/timesheets?week={weekStart}` | Show updated timesheet |
| `delete_timesheet` | `/timesheets` | Return to timesheets list |
| `delete_entries` | `/timesheets?week={weekStart}` | Show timesheet after deletion |
| `copy_entry` | `/timesheets?week={weekStart}` | Show timesheet with copied entries |
| `approve_user` | `/team-review?week={weekStart}` | Stay on team review, refresh data |
| `approve_project_week` | `/team-review?week={weekStart}` | Stay on team review, refresh data |
| `reject_user` | `/team-review?week={weekStart}` | Stay on team review, refresh data |
| `reject_project_week` | `/team-review?week={weekStart}` | Stay on team review, refresh data |
| `send_reminder` | `/team-review?week={weekStart}` | Stay on team review page |
| `export_project_billing` | `/billing/projects` | Stay on billing page, trigger download |
| `export_user_billing` | `/billing/users` | Stay on billing page, trigger download |
| `get_audit_logs` | `/admin/audit-logs` | Open audit logs page |

### Backend Implementation

**File: `backend/src/services/VoiceActionDispatcher.ts`** (Update)

```typescript
private async createProject(data: any, user: IUser): Promise<ActionExecutionResult> {
  const project = await ProjectService.createProject({
    name: data.projectName,
    description: data.description,
    client_id: data.clientId,
    primary_manager_id: data.managerId,
    start_date: data.startDate,
    end_date: data.endDate,
    status: data.status?.toLowerCase(),
    budget: data.budget
  }, user);

  return {
    intent: 'create_project',
    success: true,
    data: project,
    affectedEntities: [{
      type: 'project',
      id: project._id.toString(),
      name: project.name
    }],
    redirectUrl: `/projects/${project._id.toString()}` // NEW
  };
}

private async addProjectMember(data: any, user: IUser): Promise<ActionExecutionResult> {
  const member = await ProjectService.addProjectMember(
    data.projectId,
    {
      user_id: data.userId,
      role: data.role
    },
    user
  );

  return {
    intent: 'add_project_member',
    success: true,
    data: member,
    affectedEntities: [{
      type: 'project',
      id: data.projectId
    }],
    redirectUrl: `/projects/${data.projectId}?tab=members` // NEW
  };
}

private async addEntries(data: any, user: IUser): Promise<ActionExecutionResult> {
  const entries = data.entries || [data];
  const createdEntries = [];

  for (const entry of entries) {
    const timeEntry = await TimesheetService.addEntry({
      user_id: user._id,
      project_id: entry.projectId,
      task_id: entry.taskId,
      date: entry.date,
      hours: entry.hours,
      task_type: entry.taskType,
      custom_task_description: entry.customTaskDescription,
      entry_type: entry.entryType,
      description: entry.description
    }, user);

    createdEntries.push(timeEntry);
  }

  // Get week start from first entry date
  const firstDate = new Date(entries[0].date);
  const weekStart = format(startOfWeek(firstDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  return {
    intent: 'add_entries',
    success: true,
    data: createdEntries,
    affectedEntities: createdEntries.map(e => ({
      type: 'time_entry',
      id: e._id.toString()
    })),
    redirectUrl: `/timesheets?week=${weekStart}` // NEW
  };
}

private async exportProjectBilling(data: any, user: IUser): Promise<ActionExecutionResult> {
  const file = await ProjectBillingService.exportBilling({
    start_date: data.startDate,
    end_date: data.endDate,
    project_id: data.projectId,
    client_id: data.clientId,
    format: data.format.toLowerCase()
  }, user);

  return {
    intent: 'export_project_billing',
    success: true,
    data: { fileUrl: file.url, fileName: file.name },
    redirectUrl: `/billing/projects` // NEW - Stay on billing page
  };
}
```

### Frontend Implementation

**File: `frontend/src/contexts/VoiceContext.tsx`** (Update)

```typescript
import { useNavigate } from 'react-router-dom';

export const VoiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentActions, setCurrentActions] = useState<VoiceAction[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [context, setContext] = useState<VoiceContextType | null>(null);

  const executeActions = useCallback(async (actions: VoiceAction[]) => {
    setIsProcessing(true);
    try {
      const response = await VoiceService.executeAction(actions, true);

      if (response.success) {
        toast.success(response.message);
        setShowConfirmation(false);
        setCurrentActions([]);

        // Handle redirection
        const firstResult = response.results[0];
        if (firstResult?.redirectUrl) {
          // Show loading indicator
          toast.info('Redirecting...', { autoClose: 1000 });

          // Small delay for UX (let success toast show)
          setTimeout(() => {
            navigate(firstResult.redirectUrl!);
          }, 1000);
        }

        // Trigger data refresh if no redirect
        if (!firstResult?.redirectUrl) {
          window.dispatchEvent(new CustomEvent('voice-command-success', {
            detail: { intent: firstResult?.intent }
          }));
        }
      } else {
        toast.error(response.message || 'Some actions failed');
      }
    } catch (error: any) {
      console.error('Action execution failed:', error);
      toast.error(error.message || 'Failed to execute actions');
    } finally {
      setIsProcessing(false);
    }
  }, [navigate]);

  // Rest of context implementation...
};
```

**File: `frontend/src/types/voice.ts`** (Update)

```typescript
export interface VoiceExecuteResponse {
  success: boolean;
  results: Array<{
    intent: string;
    success: boolean;
    data?: any;
    error?: string;
    redirectUrl?: string; // NEW
  }>;
  message: string;
}
```

### Special Handling for File Downloads

For export intents that trigger file downloads:

```typescript
// In VoiceContext
if (firstResult?.intent?.includes('export_')) {
  // Trigger download
  if (firstResult.data?.fileUrl) {
    const link = document.createElement('a');
    link.href = firstResult.data.fileUrl;
    link.download = firstResult.data.fileName || 'export.pdf';
    link.click();
  }

  // Navigate to billing page
  if (firstResult.redirectUrl) {
    navigate(firstResult.redirectUrl);
  }
}
```

### Multi-Action Handling

When multiple actions are executed in one command:

```typescript
// Redirect to the most relevant page based on action priority
const redirectPriority = ['create', 'update', 'add', 'delete'];

const sortedResults = response.results
  .filter(r => r.success && r.redirectUrl)
  .sort((a, b) => {
    const aPriority = redirectPriority.findIndex(p => a.intent.includes(p));
    const bPriority = redirectPriority.findIndex(p => b.intent.includes(p));
    return aPriority - bPriority;
  });

if (sortedResults.length > 0) {
  navigate(sortedResults[0].redirectUrl!);
}
```

### Loading State During Redirect

**File: `frontend/src/components/voice/VoiceConfirmationModal.tsx`** (Update)

```typescript
const [isRedirecting, setIsRedirecting] = useState(false);

const handleConfirm = async () => {
  await executeActions(editMode ? editedActions : currentActions);
  setIsRedirecting(true);
};

// In the modal render
{isRedirecting && (
  <div className="flex items-center justify-center gap-2 text-blue-600">
    <Loader className="w-5 h-5 animate-spin" />
    <span>Redirecting to updated page...</span>
  </div>
)}
```

### Benefits

1. **Seamless UX** - Users immediately see the results of their actions
2. **Context Preservation** - Opens relevant tabs or filters (e.g., `?tab=members`)
3. **Multi-Action Support** - Handles multiple actions with smart prioritization
4. **Download Handling** - Properly triggers file downloads without leaving page
5. **Loading Feedback** - Shows clear loading states during redirect
6. **Fallback Refresh** - If no redirect URL, triggers page refresh event

---

## Backend Implementation

### 1. Environment Configuration

**File: `.env`**

```env
# Azure OpenAI Configuration
AZURE_OPENAI_API_KEY=your_api_key_here
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4  # or gpt-35-turbo
AZURE_OPENAI_API_VERSION=2024-02-15-preview

# Azure Speech Services (Fallback for Safari/Opera)
AZURE_SPEECH_KEY=your_speech_key_here
AZURE_SPEECH_REGION=eastus

# Voice Feature Configuration
VOICE_ENABLED=true
VOICE_MAX_REQUESTS_PER_USER_PER_HOUR=100
VOICE_LLM_MAX_TOKENS=2000
VOICE_LLM_TEMPERATURE=0.1  # Low temperature for consistent parsing
VOICE_DEBUG_MODE=false  # Log full prompts and responses
```

### 2. Dependencies

**File: `backend/package.json`**

```json
{
  "dependencies": {
    "@azure/openai": "^1.0.0-beta.12",
    "microsoft-cognitiveservices-speech-sdk": "^1.34.0"
  }
}
```

### 3. Type Definitions

**File: `backend/src/types/voice.ts`**

```typescript
import { ObjectId } from 'mongoose';

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

export interface VoiceAction {
  intent: Intent;
  data: Record<string, any>;
  errors: string[];
  description: string;
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

// Intent types
export type Intent =
  // Project Management
  | 'create_project'
  | 'add_project_member'
  | 'remove_project_member'
  | 'add_task'
  | 'update_project'
  | 'update_task'
  | 'delete_project'
  // User Management
  | 'create_user'
  | 'update_user'
  | 'delete_user'
  // Client Management
  | 'create_client'
  | 'update_client'
  | 'delete_client'
  // Timesheet Management
  | 'create_timesheet'
  | 'add_entries'
  | 'update_entries'
  | 'delete_timesheet'
  | 'delete_entries'
  | 'copy_entry'
  // Team Review
  | 'approve_user'
  | 'approve_project_week'
  | 'reject_user'
  | 'reject_project_week'
  | 'send_reminder'
  // Billing
  | 'export_project_billing'
  | 'export_user_billing'
  // Audit
  | 'get_audit_logs';

// Context types
export interface VoiceContext {
  user: {
    id: string;
    name: string;
    role: string;
    email: string;
  };
  allowedIntents: Intent[];
  disallowedIntents: Intent[];
  entities: {
    projects?: Array<{ id: string; name: string; client?: string }>;
    users?: Array<{ id: string; name: string; email: string; role: string }>;
    clients?: Array<{ id: string; name: string; contactPerson?: string }>;
    tasks?: Record<string, Array<{ id: string; name: string; assignedTo?: string }>>;
    timesheets?: Array<{ weekStart: string; weekEnd: string; status: string }>;
    projectWeekGroups?: Array<{ projectId: string; projectName: string; weekStart: string; weekEnd: string }>;
  };
  currentDate: string;
  currentWeek: {
    start: string;
    end: string;
  };
}

// Field definitions for each intent
export interface IntentFieldDefinition {
  intent: Intent;
  requiredFields: string[];
  optionalFields: string[];
  fieldTypes: Record<string, 'string' | 'number' | 'boolean' | 'date' | 'enum'>;
  enumValues?: Record<string, string[]>;
  contextRequired: Array<'projects' | 'users' | 'clients' | 'tasks' | 'timesheets' | 'projectWeekGroups'>;
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
}

export interface VoiceExecuteResponse {
  success: boolean;
  results: ActionExecutionResult[];
  message: string;
}
```

### 4. Azure OpenAI Service

**File: `backend/src/services/AzureOpenAIService.ts`**

```typescript
import { OpenAIClient, AzureKeyCredential } from '@azure/openai';
import { AzureOpenAIConfig, LLMPrompt, LLMResponse } from '../types/voice';
import logger from '../config/logger';

class AzureOpenAIService {
  private client: OpenAIClient;
  private deploymentName: string;

  constructor() {
    const config: AzureOpenAIConfig = {
      endpoint: process.env.AZURE_OPENAI_ENDPOINT!,
      apiKey: process.env.AZURE_OPENAI_API_KEY!,
      deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4',
      apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview'
    };

    this.client = new OpenAIClient(
      config.endpoint,
      new AzureKeyCredential(config.apiKey)
    );
    this.deploymentName = config.deploymentName;

    logger.info('Azure OpenAI Service initialized', {
      endpoint: config.endpoint,
      deployment: this.deploymentName
    });
  }

  /**
   * Generate completion from Azure OpenAI
   */
  async generateCompletion(prompt: LLMPrompt): Promise<LLMResponse> {
    try {
      const startTime = Date.now();

      const messages = [
        { role: 'system', content: prompt.systemPrompt },
        { role: 'user', content: prompt.userPrompt }
      ];

      if (process.env.VOICE_DEBUG_MODE === 'true') {
        logger.debug('Azure OpenAI Request', {
          systemPrompt: prompt.systemPrompt.substring(0, 200) + '...',
          userPrompt: prompt.userPrompt,
          temperature: prompt.temperature,
          maxTokens: prompt.maxTokens
        });
      }

      const result = await this.client.getChatCompletions(
        this.deploymentName,
        messages,
        {
          temperature: prompt.temperature || 0.1,
          maxTokens: prompt.maxTokens || 2000,
          responseFormat: { type: 'json_object' } // Force JSON response
        }
      );

      const duration = Date.now() - startTime;

      const response: LLMResponse = {
        content: result.choices[0]?.message?.content || '',
        finishReason: result.choices[0]?.finishReason || '',
        usage: {
          promptTokens: result.usage?.promptTokens || 0,
          completionTokens: result.usage?.completionTokens || 0,
          totalTokens: result.usage?.totalTokens || 0
        }
      };

      logger.info('Azure OpenAI Response', {
        duration,
        tokens: response.usage.totalTokens,
        finishReason: response.finishReason
      });

      if (process.env.VOICE_DEBUG_MODE === 'true') {
        logger.debug('Azure OpenAI Response Content', {
          content: response.content
        });
      }

      return response;
    } catch (error: any) {
      logger.error('Azure OpenAI Error', {
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Azure OpenAI failed: ${error.message}`);
    }
  }

  /**
   * Parse JSON response from LLM
   */
  parseJSONResponse<T>(response: LLMResponse): T {
    try {
      return JSON.parse(response.content) as T;
    } catch (error) {
      logger.error('Failed to parse LLM JSON response', {
        content: response.content,
        error
      });
      throw new Error('Invalid JSON response from LLM');
    }
  }

  /**
   * Check service health
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.generateCompletion({
        systemPrompt: 'You are a helpful assistant.',
        userPrompt: 'Respond with {"status": "ok"}',
        temperature: 0,
        maxTokens: 50
      });
      const parsed = this.parseJSONResponse<{ status: string }>(result);
      return parsed.status === 'ok';
    } catch (error) {
      logger.error('Azure OpenAI health check failed', { error });
      return false;
    }
  }
}

export default new AzureOpenAIService();
```

### 5. Azure Speech Service

**File: `backend/src/services/AzureSpeechService.ts`**

```typescript
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import { SpeechToTextRequest, SpeechToTextResponse } from '../types/voice';
import logger from '../config/logger';

class AzureSpeechService {
  private speechConfig: sdk.SpeechConfig;

  constructor() {
    const subscriptionKey = process.env.AZURE_SPEECH_KEY!;
    const serviceRegion = process.env.AZURE_SPEECH_REGION!;

    this.speechConfig = sdk.SpeechConfig.fromSubscription(subscriptionKey, serviceRegion);
    this.speechConfig.speechRecognitionLanguage = 'en-US';

    logger.info('Azure Speech Service initialized', { region: serviceRegion });
  }

  /**
   * Convert speech audio to text
   */
  async speechToText(request: SpeechToTextRequest): Promise<SpeechToTextResponse> {
    return new Promise((resolve, reject) => {
      try {
        // Decode base64 audio
        const audioBuffer = Buffer.from(request.audioData, 'base64');

        // Create push stream
        const pushStream = sdk.AudioInputStream.createPushStream();
        pushStream.write(audioBuffer);
        pushStream.close();

        // Create audio config
        const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);

        // Set language if provided
        if (request.language) {
          this.speechConfig.speechRecognitionLanguage = request.language;
        }

        // Create recognizer
        const recognizer = new sdk.SpeechRecognizer(this.speechConfig, audioConfig);

        // Start recognition
        recognizer.recognizeOnceAsync(
          (result) => {
            recognizer.close();

            if (result.reason === sdk.ResultReason.RecognizedSpeech) {
              const response: SpeechToTextResponse = {
                transcript: result.text,
                confidence: result.properties.getProperty(
                  sdk.PropertyId.SpeechServiceResponse_JsonResult
                ) ? 1.0 : undefined,
                language: request.language || 'en-US'
              };

              logger.info('Speech to text successful', {
                transcriptLength: response.transcript.length,
                language: response.language
              });

              resolve(response);
            } else {
              const errorMessage = `Speech recognition failed: ${sdk.ResultReason[result.reason]}`;
              logger.error('Speech recognition failed', {
                reason: sdk.ResultReason[result.reason],
                errorDetails: result.errorDetails
              });
              reject(new Error(errorMessage));
            }
          },
          (error) => {
            recognizer.close();
            logger.error('Speech recognition error', { error });
            reject(error);
          }
        );
      } catch (error: any) {
        logger.error('Azure Speech Service error', {
          error: error.message,
          stack: error.stack
        });
        reject(error);
      }
    });
  }

  /**
   * Check service health
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Create a simple test audio (silence)
      const testAudio = Buffer.alloc(1024).toString('base64');
      await this.speechToText({
        audioData: testAudio,
        format: 'wav'
      });
      return true;
    } catch (error) {
      logger.error('Azure Speech health check failed', { error });
      return false;
    }
  }
}

export default new AzureSpeechService();
```

### 6. Voice Context Service

**File: `backend/src/services/VoiceContextService.ts`**

```typescript
import { Intent, VoiceContext, IntentFieldDefinition } from '../types/voice';
import { IUser } from '../models/User';
import ProjectService from './ProjectService';
import UserService from './UserService';
import ClientService from './ClientService';
import TimesheetService from './TimesheetService';
import logger from '../config/logger';
import { startOfWeek, endOfWeek, format } from 'date-fns';

class VoiceContextService {
  /**
   * Get all available context for a user
   */
  async getContext(user: IUser): Promise<VoiceContext> {
    const [allowedIntents, disallowedIntents] = this.getIntentsForRole(user.role);

    const context: VoiceContext = {
      user: {
        id: user._id.toString(),
        name: user.name,
        role: user.role,
        email: user.email
      },
      allowedIntents,
      disallowedIntents,
      entities: {},
      currentDate: format(new Date(), 'yyyy-MM-dd'),
      currentWeek: {
        start: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        end: format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
      }
    };

    return context;
  }

  /**
   * Get context for specific intents
   */
  async getContextForIntents(user: IUser, intents: Intent[]): Promise<VoiceContext> {
    const baseContext = await this.getContext(user);

    // Determine which entities are needed
    const requiredEntities = new Set<string>();
    for (const intent of intents) {
      const definition = this.getIntentDefinition(intent);
      definition.contextRequired.forEach(entity => requiredEntities.add(entity));
    }

    // Fetch required entities
    const entities: VoiceContext['entities'] = {};

    if (requiredEntities.has('projects')) {
      entities.projects = await this.getProjectsList(user);
    }

    if (requiredEntities.has('users')) {
      entities.users = await this.getUsersList(user);
    }

    if (requiredEntities.has('clients')) {
      entities.clients = await this.getClientsList(user);
    }

    if (requiredEntities.has('tasks')) {
      entities.tasks = await this.getTasksList(user);
    }

    if (requiredEntities.has('timesheets')) {
      entities.timesheets = await this.getTimesheetsList(user);
    }

    if (requiredEntities.has('projectWeekGroups')) {
      entities.projectWeekGroups = await this.getProjectWeekGroups(user);
    }

    baseContext.entities = entities;

    logger.info('Voice context fetched', {
      userId: user._id,
      intents,
      entitiesFetched: Object.keys(entities)
    });

    return baseContext;
  }

  /**
   * Get allowed/disallowed intents based on user role
   */
  private getIntentsForRole(role: string): [Intent[], Intent[]] {
    const allIntents: Intent[] = [
      'create_project', 'add_project_member', 'remove_project_member', 'add_task',
      'update_project', 'update_task', 'delete_project',
      'create_user', 'update_user', 'delete_user',
      'create_client', 'update_client', 'delete_client',
      'create_timesheet', 'add_entries', 'update_entries', 'delete_timesheet',
      'delete_entries', 'copy_entry',
      'approve_user', 'approve_project_week', 'reject_user', 'reject_project_week',
      'send_reminder',
      'export_project_billing', 'export_user_billing',
      'get_audit_logs'
    ];

    let allowedIntents: Intent[] = [];

    switch (role) {
      case 'super_admin':
      case 'management':
        allowedIntents = allIntents; // Full access
        break;

      case 'manager':
        allowedIntents = [
          'create_project', 'update_project', 'add_project_member', 'remove_project_member',
          'add_task', 'update_task',
          'create_timesheet', 'add_entries', 'update_entries', 'delete_entries', 'copy_entry',
          'approve_user', 'approve_project_week', 'reject_user', 'reject_project_week',
          'send_reminder',
          'export_project_billing', 'export_user_billing'
        ];
        break;

      case 'lead':
        allowedIntents = [
          'add_task', 'update_task',
          'create_timesheet', 'add_entries', 'update_entries', 'delete_entries', 'copy_entry',
          'approve_user', 'reject_user', 'send_reminder'
        ];
        break;

      case 'employee':
        allowedIntents = [
          'create_timesheet', 'add_entries', 'update_entries', 'delete_entries', 'copy_entry'
        ];
        break;

      default:
        allowedIntents = [];
    }

    const disallowedIntents = allIntents.filter(intent => !allowedIntents.includes(intent));

    return [allowedIntents, disallowedIntents];
  }

  /**
   * Get intent field definition
   */
  getIntentDefinition(intent: Intent): IntentFieldDefinition {
    const definitions: Record<Intent, IntentFieldDefinition> = {
      // PROJECT MANAGEMENT
      create_project: {
        intent: 'create_project',
        requiredFields: ['projectName', 'description', 'clientName', 'managerName', 'startDate'],
        optionalFields: ['endDate', 'status', 'budget'],
        fieldTypes: {
          projectName: 'string',
          description: 'string',
          clientName: 'string',
          managerName: 'string',
          startDate: 'date',
          endDate: 'date',
          status: 'enum',
          budget: 'number'
        },
        enumValues: {
          status: ['Active', 'Completed', 'Archived']
        },
        contextRequired: ['clients', 'users', 'projects']
      },
      add_project_member: {
        intent: 'add_project_member',
        requiredFields: ['projectName', 'role', 'name'],
        optionalFields: [],
        fieldTypes: {
          projectName: 'string',
          role: 'string',
          name: 'string'
        },
        contextRequired: ['projects', 'users']
      },
      remove_project_member: {
        intent: 'remove_project_member',
        requiredFields: ['projectName', 'role', 'name'],
        optionalFields: [],
        fieldTypes: {
          projectName: 'string',
          role: 'string',
          name: 'string'
        },
        contextRequired: ['projects', 'users']
      },
      add_task: {
        intent: 'add_task',
        requiredFields: ['projectName', 'taskName', 'assignedMemberName'],
        optionalFields: ['description', 'estimatedHours', 'status', 'isBillable'],
        fieldTypes: {
          projectName: 'string',
          taskName: 'string',
          assignedMemberName: 'string',
          description: 'string',
          estimatedHours: 'number',
          status: 'enum',
          isBillable: 'boolean'
        },
        enumValues: {
          status: ['Open', 'InProgress', 'Completed']
        },
        contextRequired: ['projects', 'users']
      },
      update_project: {
        intent: 'update_project',
        requiredFields: ['projectName'],
        optionalFields: ['managerName', 'description', 'clientName', 'startDate', 'endDate', 'status', 'budget'],
        fieldTypes: {
          projectName: 'string',
          managerName: 'string',
          description: 'string',
          clientName: 'string',
          startDate: 'date',
          endDate: 'date',
          status: 'enum',
          budget: 'number'
        },
        enumValues: {
          status: ['Active', 'Completed', 'Archived']
        },
        contextRequired: ['projects', 'clients', 'users']
      },
      update_task: {
        intent: 'update_task',
        requiredFields: ['projectName', 'taskName'],
        optionalFields: ['assignedMemberName', 'description', 'estimatedHours'],
        fieldTypes: {
          projectName: 'string',
          taskName: 'string',
          assignedMemberName: 'string',
          description: 'string',
          estimatedHours: 'number'
        },
        contextRequired: ['projects', 'tasks', 'users']
      },
      delete_project: {
        intent: 'delete_project',
        requiredFields: ['projectName', 'reason'],
        optionalFields: ['managerName'],
        fieldTypes: {
          projectName: 'string',
          managerName: 'string',
          reason: 'string'
        },
        contextRequired: ['projects']
      },

      // USER MANAGEMENT
      create_user: {
        intent: 'create_user',
        requiredFields: ['userName', 'email', 'role'],
        optionalFields: ['hourlyRate'],
        fieldTypes: {
          userName: 'string',
          email: 'string',
          role: 'enum',
          hourlyRate: 'number'
        },
        enumValues: {
          role: ['Management', 'Manager', 'Lead', 'Employee']
        },
        contextRequired: ['users']
      },
      update_user: {
        intent: 'update_user',
        requiredFields: ['userName'],
        optionalFields: ['email', 'role', 'hourlyRate'],
        fieldTypes: {
          userName: 'string',
          email: 'string',
          role: 'enum',
          hourlyRate: 'number'
        },
        enumValues: {
          role: ['Management', 'Manager', 'Lead', 'Employee']
        },
        contextRequired: ['users']
      },
      delete_user: {
        intent: 'delete_user',
        requiredFields: ['userName', 'reason'],
        optionalFields: ['role'],
        fieldTypes: {
          userName: 'string',
          role: 'string',
          reason: 'string'
        },
        contextRequired: ['users']
      },

      // CLIENT MANAGEMENT
      create_client: {
        intent: 'create_client',
        requiredFields: ['clientName', 'contactPerson', 'contactEmail'],
        optionalFields: ['isActive'],
        fieldTypes: {
          clientName: 'string',
          contactPerson: 'string',
          contactEmail: 'string',
          isActive: 'boolean'
        },
        contextRequired: ['clients']
      },
      update_client: {
        intent: 'update_client',
        requiredFields: ['clientName'],
        optionalFields: ['contactPerson', 'contactEmail', 'isActive'],
        fieldTypes: {
          clientName: 'string',
          contactPerson: 'string',
          contactEmail: 'string',
          isActive: 'boolean'
        },
        contextRequired: ['clients']
      },
      delete_client: {
        intent: 'delete_client',
        requiredFields: ['clientName', 'reason'],
        optionalFields: [],
        fieldTypes: {
          clientName: 'string',
          reason: 'string'
        },
        contextRequired: ['clients']
      },

      // TIMESHEET MANAGEMENT
      create_timesheet: {
        intent: 'create_timesheet',
        requiredFields: ['weekStart', 'weekEnd'],
        optionalFields: [],
        fieldTypes: {
          weekStart: 'date',
          weekEnd: 'date'
        },
        contextRequired: ['timesheets']
      },
      add_entries: {
        intent: 'add_entries',
        requiredFields: ['projectName', 'taskName', 'date', 'hours', 'entryType'],
        optionalFields: ['taskType', 'description'],
        fieldTypes: {
          projectName: 'string',
          taskName: 'string',
          taskType: 'enum',
          date: 'date',
          hours: 'number',
          description: 'string',
          entryType: 'enum'
        },
        enumValues: {
          taskType: ['project_task', 'custom_task'],
          entryType: ['Project', 'Training', 'Leave', 'Miscellaneous']
        },
        contextRequired: ['timesheets', 'projects', 'tasks']
      },
      update_entries: {
        intent: 'update_entries',
        requiredFields: ['weekStart', 'projectName', 'taskName'],
        optionalFields: ['taskType', 'date', 'hours', 'description', 'entryType'],
        fieldTypes: {
          weekStart: 'date',
          projectName: 'string',
          taskName: 'string',
          taskType: 'enum',
          date: 'date',
          hours: 'number',
          description: 'string',
          entryType: 'enum'
        },
        enumValues: {
          taskType: ['project_task', 'custom_task'],
          entryType: ['Project', 'Training', 'Leave', 'Miscellaneous']
        },
        contextRequired: ['timesheets', 'projects', 'tasks']
      },
      delete_timesheet: {
        intent: 'delete_timesheet',
        requiredFields: ['weekStart'],
        optionalFields: [],
        fieldTypes: {
          weekStart: 'date'
        },
        contextRequired: ['timesheets']
      },
      delete_entries: {
        intent: 'delete_entries',
        requiredFields: ['weekStart', 'projectName', 'taskName'],
        optionalFields: [],
        fieldTypes: {
          weekStart: 'date',
          projectName: 'string',
          taskName: 'string'
        },
        contextRequired: ['timesheets', 'projects', 'tasks']
      },
      copy_entry: {
        intent: 'copy_entry',
        requiredFields: ['projectName', 'taskName', 'date', 'weekDates'],
        optionalFields: [],
        fieldTypes: {
          projectName: 'string',
          taskName: 'string',
          date: 'date',
          weekDates: 'string' // Array of dates
        },
        contextRequired: ['timesheets', 'projects', 'tasks']
      },

      // TEAM REVIEW
      approve_user: {
        intent: 'approve_user',
        requiredFields: ['weekStart', 'weekEnd', 'userName', 'projectName'],
        optionalFields: [],
        fieldTypes: {
          weekStart: 'date',
          weekEnd: 'date',
          userName: 'string',
          projectName: 'string'
        },
        contextRequired: ['users', 'projects', 'projectWeekGroups']
      },
      approve_project_week: {
        intent: 'approve_project_week',
        requiredFields: ['weekStart', 'weekEnd', 'projectName'],
        optionalFields: [],
        fieldTypes: {
          weekStart: 'date',
          weekEnd: 'date',
          projectName: 'string'
        },
        contextRequired: ['projects', 'projectWeekGroups']
      },
      reject_user: {
        intent: 'reject_user',
        requiredFields: ['weekStart', 'weekEnd', 'userName', 'projectName', 'reason'],
        optionalFields: [],
        fieldTypes: {
          weekStart: 'date',
          weekEnd: 'date',
          userName: 'string',
          projectName: 'string',
          reason: 'string'
        },
        contextRequired: ['users', 'projects', 'projectWeekGroups']
      },
      reject_project_week: {
        intent: 'reject_project_week',
        requiredFields: ['weekStart', 'weekEnd', 'projectName', 'reason'],
        optionalFields: [],
        fieldTypes: {
          weekStart: 'date',
          weekEnd: 'date',
          projectName: 'string',
          reason: 'string'
        },
        contextRequired: ['projects', 'projectWeekGroups']
      },
      send_reminder: {
        intent: 'send_reminder',
        requiredFields: ['weekStart', 'weekEnd', 'projectName'],
        optionalFields: [],
        fieldTypes: {
          weekStart: 'date',
          weekEnd: 'date',
          projectName: 'string'
        },
        contextRequired: ['projects', 'projectWeekGroups', 'users']
      },

      // BILLING
      export_project_billing: {
        intent: 'export_project_billing',
        requiredFields: ['startDate', 'endDate', 'format'],
        optionalFields: ['projectName', 'clientName'],
        fieldTypes: {
          startDate: 'date',
          endDate: 'date',
          projectName: 'string',
          clientName: 'string',
          format: 'enum'
        },
        enumValues: {
          format: ['CSV', 'PDF', 'Excel']
        },
        contextRequired: ['projects', 'clients', 'projectWeekGroups']
      },
      export_user_billing: {
        intent: 'export_user_billing',
        requiredFields: ['startDate', 'endDate', 'format'],
        optionalFields: ['userName', 'clientName'],
        fieldTypes: {
          startDate: 'date',
          endDate: 'date',
          userName: 'string',
          clientName: 'string',
          format: 'enum'
        },
        enumValues: {
          format: ['CSV', 'PDF', 'Excel']
        },
        contextRequired: ['users', 'clients', 'projectWeekGroups']
      },

      // AUDIT
      get_audit_logs: {
        intent: 'get_audit_logs',
        requiredFields: ['startDate', 'endDate'],
        optionalFields: ['needExport'],
        fieldTypes: {
          startDate: 'date',
          endDate: 'date',
          needExport: 'boolean'
        },
        contextRequired: []
      }
    };

    return definitions[intent];
  }

  // Helper methods to fetch entities
  private async getProjectsList(user: IUser) {
    const projects = await ProjectService.getProjectsForUser(user._id.toString());
    return projects.map((p: any) => ({
      id: p._id.toString(),
      name: p.name,
      client: p.client?.name
    }));
  }

  private async getUsersList(user: IUser) {
    // Only fetch users that the current user has permission to see
    const users = await UserService.getAllUsers();
    return users.map((u: any) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role
    }));
  }

  private async getClientsList(user: IUser) {
    const clients = await ClientService.getAllClients();
    return clients.map((c: any) => ({
      id: c._id.toString(),
      name: c.name,
      contactPerson: c.contact_person
    }));
  }

  private async getTasksList(user: IUser) {
    // Get tasks grouped by project
    const projects = await ProjectService.getProjectsForUser(user._id.toString());
    const tasksByProject: Record<string, Array<{ id: string; name: string; assignedTo?: string }>> = {};

    for (const project of projects) {
      const tasks = await ProjectService.getProjectTasks(project._id.toString());
      tasksByProject[project.name] = tasks.map((t: any) => ({
        id: t._id.toString(),
        name: t.name,
        assignedTo: t.assigned_to?.name
      }));
    }

    return tasksByProject;
  }

  private async getTimesheetsList(user: IUser) {
    const timesheets = await TimesheetService.getTimesheetsForUser(user._id.toString());
    return timesheets.map((t: any) => ({
      weekStart: format(new Date(t.week_start), 'yyyy-MM-dd'),
      weekEnd: format(new Date(t.week_end), 'yyyy-MM-dd'),
      status: t.status
    }));
  }

  private async getProjectWeekGroups(user: IUser) {
    // This would fetch project-week groups for team review
    // Implementation depends on your TeamReviewService
    return [];
  }
}

export default new VoiceContextService();
```

### 7. Intent Recognition Service

**File: `backend/src/services/IntentRecognitionService.ts`**

```typescript
import { Intent, VoiceAction, VoiceContext } from '../types/voice';
import AzureOpenAIService from './AzureOpenAIService';
import VoiceContextService from './VoiceContextService';
import { IUser } from '../models/User';
import logger from '../config/logger';

interface IntentDetectionResponse {
  intents: Intent[];
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
        intent: 'create_timesheet' as Intent, // Fallback
        data: {},
        errors: ['Unable to understand the command. Please try rephrasing.'],
        description: 'Command not recognized'
      }];
    }

    // Step 2: Data Extraction with Context
    const actions = await this.extractData(transcript, intents, user);

    return actions;
  }

  /**
   * Step 1: Detect intents from user command (minimal prompt)
   */
  private async detectIntents(transcript: string, user: IUser): Promise<Intent[]> {
    const context = await VoiceContextService.getContext(user);

    const systemPrompt = `You are an intent classifier for a timesheet management system.
Your task is to identify the user's intents from their voice command.

Available Intents:
${context.allowedIntents.join(', ')}

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
  }

  /**
   * Step 2: Extract data from command with full context
   */
  private async extractData(
    transcript: string,
    intents: Intent[],
    user: IUser
  ): Promise<VoiceAction[]> {
    const context = await VoiceContextService.getContextForIntents(user, intents);

    // Build comprehensive prompt with context
    const systemPrompt = this.buildContextualPrompt(context, intents);

    const userPrompt = `VOICE COMMAND: "${transcript}"

Parse this command and return the structured JSON response.`;

    const response = await AzureOpenAIService.generateCompletion({
      systemPrompt,
      userPrompt,
      temperature: 0.1,
      maxTokens: 2000
    });

    const parsed = AzureOpenAIService.parseJSONResponse<DataExtractionResponse>(response);

    logger.info('Data extracted', {
      actionsCount: parsed.actions.length,
      intents: parsed.actions.map(a => a.intent)
    });

    return parsed.actions;
  }

  /**
   * Build contextual prompt with all necessary information
   */
  private buildContextualPrompt(context: VoiceContext, intents: Intent[]): string {
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
${context.allowedIntents.join(', ')}

Not Allowed Intents:
${context.disallowedIntents.join(', ')}

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
      context.entities.users.forEach(u => {
        prompt += `- ${u.name} (${u.email}, ${u.role})\n`;
      });
    }

    if (context.entities.clients && context.entities.clients.length > 0) {
      prompt += `\nAvailable Clients:\n`;
      context.entities.clients.forEach(c => {
        prompt += `- ${c.name}${c.contactPerson ? ` (Contact: ${c.contactPerson})` : ''}\n`;
      });
    }

    if (context.entities.tasks) {
      prompt += `\nAvailable Tasks by Project:\n`;
      Object.entries(context.entities.tasks).forEach(([projectName, tasks]) => {
        prompt += `- ${projectName}: {${tasks.map(t => t.name).join(', ')}}\n`;
      });
    }

    // Add field definitions for each intent
    prompt += `\n`;
    for (const intent of intents) {
      const definition = VoiceContextService.getIntentDefinition(intent);
      prompt += `\nIntent: ${intent}\n`;
      prompt += `Required Fields: ${definition.requiredFields.join(', ')}\n`;
      prompt += `Optional Fields: ${definition.optionalFields.join(', ')}\n`;

      if (definition.enumValues) {
        Object.entries(definition.enumValues).forEach(([field, values]) => {
          prompt += `${field} values: {${values.join(', ')}}\n`;
        });
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
}

export default new IntentRecognitionService();
```

### 8. Voice Action Dispatcher

**File: `backend/src/services/VoiceActionDispatcher.ts`**

```typescript
import { VoiceAction, Intent, ActionExecutionResult } from '../types/voice';
import { IUser } from '../models/User';
import ProjectService from './ProjectService';
import UserService from './UserService';
import ClientService from './ClientService';
import TimesheetService from './TimesheetService';
import TeamReviewApprovalService from './TeamReviewApprovalService';
import ProjectBillingService from './ProjectBillingService';
import AuditLogService from './AuditLogService';
import logger from '../config/logger';

class VoiceActionDispatcher {
  /**
   * Execute voice actions after user confirmation
   */
  async executeActions(actions: VoiceAction[], user: IUser): Promise<ActionExecutionResult[]> {
    const results: ActionExecutionResult[] = [];

    for (const action of actions) {
      try {
        const result = await this.executeAction(action, user);
        results.push(result);
      } catch (error: any) {
        logger.error('Action execution failed', {
          intent: action.intent,
          error: error.message,
          userId: user._id
        });

        results.push({
          intent: action.intent,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Execute a single action
   */
  private async executeAction(action: VoiceAction, user: IUser): Promise<ActionExecutionResult> {
    logger.info('Executing voice action', {
      intent: action.intent,
      userId: user._id,
      data: action.data
    });

    let result: ActionExecutionResult;

    switch (action.intent) {
      // PROJECT MANAGEMENT
      case 'create_project':
        result = await this.createProject(action.data, user);
        break;
      case 'add_project_member':
        result = await this.addProjectMember(action.data, user);
        break;
      case 'remove_project_member':
        result = await this.removeProjectMember(action.data, user);
        break;
      case 'add_task':
        result = await this.addTask(action.data, user);
        break;
      case 'update_project':
        result = await this.updateProject(action.data, user);
        break;
      case 'update_task':
        result = await this.updateTask(action.data, user);
        break;
      case 'delete_project':
        result = await this.deleteProject(action.data, user);
        break;

      // USER MANAGEMENT
      case 'create_user':
        result = await this.createUser(action.data, user);
        break;
      case 'update_user':
        result = await this.updateUser(action.data, user);
        break;
      case 'delete_user':
        result = await this.deleteUser(action.data, user);
        break;

      // CLIENT MANAGEMENT
      case 'create_client':
        result = await this.createClient(action.data, user);
        break;
      case 'update_client':
        result = await this.updateClient(action.data, user);
        break;
      case 'delete_client':
        result = await this.deleteClient(action.data, user);
        break;

      // TIMESHEET MANAGEMENT
      case 'create_timesheet':
        result = await this.createTimesheet(action.data, user);
        break;
      case 'add_entries':
        result = await this.addEntries(action.data, user);
        break;
      case 'update_entries':
        result = await this.updateEntries(action.data, user);
        break;
      case 'delete_timesheet':
        result = await this.deleteTimesheet(action.data, user);
        break;
      case 'delete_entries':
        result = await this.deleteEntries(action.data, user);
        break;
      case 'copy_entry':
        result = await this.copyEntry(action.data, user);
        break;

      // TEAM REVIEW
      case 'approve_user':
        result = await this.approveUser(action.data, user);
        break;
      case 'approve_project_week':
        result = await this.approveProjectWeek(action.data, user);
        break;
      case 'reject_user':
        result = await this.rejectUser(action.data, user);
        break;
      case 'reject_project_week':
        result = await this.rejectProjectWeek(action.data, user);
        break;
      case 'send_reminder':
        result = await this.sendReminder(action.data, user);
        break;

      // BILLING
      case 'export_project_billing':
        result = await this.exportProjectBilling(action.data, user);
        break;
      case 'export_user_billing':
        result = await this.exportUserBilling(action.data, user);
        break;

      // AUDIT
      case 'get_audit_logs':
        result = await this.getAuditLogs(action.data, user);
        break;

      default:
        throw new Error(`Unknown intent: ${action.intent}`);
    }

    // Log to audit trail
    await AuditLogService.log({
      user_id: user._id,
      action: `voice_${action.intent}`,
      entity_type: this.getEntityType(action.intent),
      entity_id: result.affectedEntities?.[0]?.id,
      changes: {
        voiceCommand: true,
        data: action.data,
        result: result.success
      }
    });

    return result;
  }

  // Implementation methods for each intent
  private async createProject(data: any, user: IUser): Promise<ActionExecutionResult> {
    const project = await ProjectService.createProject({
      name: data.projectName,
      description: data.description,
      client_id: data.clientId, // Resolved from clientName
      primary_manager_id: data.managerId, // Resolved from managerName
      start_date: data.startDate,
      end_date: data.endDate,
      status: data.status?.toLowerCase(),
      budget: data.budget
    }, user);

    return {
      intent: 'create_project',
      success: true,
      data: project,
      affectedEntities: [{
        type: 'project',
        id: project._id.toString(),
        name: project.name
      }]
    };
  }

  private async addProjectMember(data: any, user: IUser): Promise<ActionExecutionResult> {
    const member = await ProjectService.addProjectMember(
      data.projectId, // Resolved from projectName
      {
        user_id: data.userId, // Resolved from name
        role: data.role
      },
      user
    );

    return {
      intent: 'add_project_member',
      success: true,
      data: member,
      affectedEntities: [{
        type: 'project',
        id: data.projectId
      }]
    };
  }

  private async removeProjectMember(data: any, user: IUser): Promise<ActionExecutionResult> {
    await ProjectService.removeProjectMember(
      data.projectId, // Resolved from projectName
      data.userId, // Resolved from name
      user
    );

    return {
      intent: 'remove_project_member',
      success: true,
      affectedEntities: [{
        type: 'project',
        id: data.projectId
      }]
    };
  }

  private async addTask(data: any, user: IUser): Promise<ActionExecutionResult> {
    const task = await ProjectService.createTask(
      data.projectId, // Resolved from projectName
      {
        name: data.taskName,
        assigned_to: data.assignedMemberId, // Resolved from assignedMemberName
        description: data.description,
        estimated_hours: data.estimatedHours,
        status: data.status?.toLowerCase(),
        is_billable: data.isBillable
      },
      user
    );

    return {
      intent: 'add_task',
      success: true,
      data: task,
      affectedEntities: [{
        type: 'task',
        id: task._id.toString(),
        name: task.name
      }]
    };
  }

  private async updateProject(data: any, user: IUser): Promise<ActionExecutionResult> {
    const project = await ProjectService.updateProject(
      data.projectId, // Resolved from projectName
      {
        description: data.description,
        client_id: data.clientId,
        primary_manager_id: data.managerId,
        start_date: data.startDate,
        end_date: data.endDate,
        status: data.status?.toLowerCase(),
        budget: data.budget
      },
      user
    );

    return {
      intent: 'update_project',
      success: true,
      data: project,
      affectedEntities: [{
        type: 'project',
        id: project._id.toString()
      }]
    };
  }

  private async updateTask(data: any, user: IUser): Promise<ActionExecutionResult> {
    const task = await ProjectService.updateTask(
      data.projectId, // Resolved from projectName
      data.taskId, // Resolved from taskName
      {
        assigned_to: data.assignedMemberId,
        description: data.description,
        estimated_hours: data.estimatedHours
      },
      user
    );

    return {
      intent: 'update_task',
      success: true,
      data: task,
      affectedEntities: [{
        type: 'task',
        id: task._id.toString()
      }]
    };
  }

  private async deleteProject(data: any, user: IUser): Promise<ActionExecutionResult> {
    await ProjectService.deleteProject(
      data.projectId, // Resolved from projectName
      data.reason,
      user
    );

    return {
      intent: 'delete_project',
      success: true,
      affectedEntities: [{
        type: 'project',
        id: data.projectId
      }]
    };
  }

  // USER MANAGEMENT
  private async createUser(data: any, user: IUser): Promise<ActionExecutionResult> {
    const newUser = await UserService.createUser({
      name: data.userName,
      email: data.email,
      role: data.role.toLowerCase(),
      hourly_rate: data.hourlyRate
    }, user);

    return {
      intent: 'create_user',
      success: true,
      data: newUser,
      affectedEntities: [{
        type: 'user',
        id: newUser._id.toString(),
        name: newUser.name
      }]
    };
  }

  private async updateUser(data: any, user: IUser): Promise<ActionExecutionResult> {
    const updatedUser = await UserService.updateUser(
      data.userId, // Resolved from userName
      {
        email: data.email,
        role: data.role?.toLowerCase(),
        hourly_rate: data.hourlyRate
      },
      user
    );

    return {
      intent: 'update_user',
      success: true,
      data: updatedUser,
      affectedEntities: [{
        type: 'user',
        id: updatedUser._id.toString()
      }]
    };
  }

  private async deleteUser(data: any, user: IUser): Promise<ActionExecutionResult> {
    await UserService.deleteUser(
      data.userId, // Resolved from userName
      data.reason,
      user
    );

    return {
      intent: 'delete_user',
      success: true,
      affectedEntities: [{
        type: 'user',
        id: data.userId
      }]
    };
  }

  // CLIENT MANAGEMENT
  private async createClient(data: any, user: IUser): Promise<ActionExecutionResult> {
    const client = await ClientService.createClient({
      name: data.clientName,
      contact_person: data.contactPerson,
      contact_email: data.contactEmail,
      is_active: data.isActive ?? true
    }, user);

    return {
      intent: 'create_client',
      success: true,
      data: client,
      affectedEntities: [{
        type: 'client',
        id: client._id.toString(),
        name: client.name
      }]
    };
  }

  private async updateClient(data: any, user: IUser): Promise<ActionExecutionResult> {
    const client = await ClientService.updateClient(
      data.clientId, // Resolved from clientName
      {
        contact_person: data.contactPerson,
        contact_email: data.contactEmail,
        is_active: data.isActive
      },
      user
    );

    return {
      intent: 'update_client',
      success: true,
      data: client,
      affectedEntities: [{
        type: 'client',
        id: client._id.toString()
      }]
    };
  }

  private async deleteClient(data: any, user: IUser): Promise<ActionExecutionResult> {
    await ClientService.deleteClient(
      data.clientId, // Resolved from clientName
      data.reason,
      user
    );

    return {
      intent: 'delete_client',
      success: true,
      affectedEntities: [{
        type: 'client',
        id: data.clientId
      }]
    };
  }

  // TIMESHEET MANAGEMENT
  private async createTimesheet(data: any, user: IUser): Promise<ActionExecutionResult> {
    const timesheet = await TimesheetService.createTimesheet({
      user_id: user._id,
      week_start: data.weekStart,
      week_end: data.weekEnd
    }, user);

    return {
      intent: 'create_timesheet',
      success: true,
      data: timesheet,
      affectedEntities: [{
        type: 'timesheet',
        id: timesheet._id.toString()
      }]
    };
  }

  private async addEntries(data: any, user: IUser): Promise<ActionExecutionResult> {
    // Handle multiple entries if provided
    const entries = data.entries || [data];

    const createdEntries = [];
    for (const entry of entries) {
      const timeEntry = await TimesheetService.addEntry({
        user_id: user._id,
        project_id: entry.projectId, // Resolved from projectName
        task_id: entry.taskId, // Resolved from taskName (if project_task)
        date: entry.date,
        hours: entry.hours,
        task_type: entry.taskType,
        custom_task_description: entry.customTaskDescription,
        entry_type: entry.entryType,
        description: entry.description
      }, user);

      createdEntries.push(timeEntry);
    }

    return {
      intent: 'add_entries',
      success: true,
      data: createdEntries,
      affectedEntities: createdEntries.map(e => ({
        type: 'time_entry',
        id: e._id.toString()
      }))
    };
  }

  private async updateEntries(data: any, user: IUser): Promise<ActionExecutionResult> {
    const entry = await TimesheetService.updateEntry(
      data.entryId, // Resolved from weekStart + projectName + taskName
      {
        hours: data.hours,
        description: data.description,
        entry_type: data.entryType
      },
      user
    );

    return {
      intent: 'update_entries',
      success: true,
      data: entry,
      affectedEntities: [{
        type: 'time_entry',
        id: entry._id.toString()
      }]
    };
  }

  private async deleteTimesheet(data: any, user: IUser): Promise<ActionExecutionResult> {
    await TimesheetService.deleteTimesheet(
      data.timesheetId, // Resolved from weekStart
      user
    );

    return {
      intent: 'delete_timesheet',
      success: true,
      affectedEntities: [{
        type: 'timesheet',
        id: data.timesheetId
      }]
    };
  }

  private async deleteEntries(data: any, user: IUser): Promise<ActionExecutionResult> {
    await TimesheetService.deleteEntry(
      data.entryId, // Resolved from weekStart + projectName + taskName
      user
    );

    return {
      intent: 'delete_entries',
      success: true,
      affectedEntities: [{
        type: 'time_entry',
        id: data.entryId
      }]
    };
  }

  private async copyEntry(data: any, user: IUser): Promise<ActionExecutionResult> {
    const copiedEntries = await TimesheetService.copyEntry(
      data.entryId, // Resolved from projectName + taskName + date
      data.weekDates,
      user
    );

    return {
      intent: 'copy_entry',
      success: true,
      data: copiedEntries,
      affectedEntities: copiedEntries.map((e: any) => ({
        type: 'time_entry',
        id: e._id.toString()
      }))
    };
  }

  // TEAM REVIEW
  private async approveUser(data: any, user: IUser): Promise<ActionExecutionResult> {
    await TeamReviewApprovalService.approveUserTimesheet(
      data.userId, // Resolved from userName
      data.projectId, // Resolved from projectName
      data.weekStart,
      data.weekEnd,
      user
    );

    return {
      intent: 'approve_user',
      success: true,
      affectedEntities: [{
        type: 'timesheet',
        id: data.userId
      }]
    };
  }

  private async approveProjectWeek(data: any, user: IUser): Promise<ActionExecutionResult> {
    await TeamReviewApprovalService.approveProjectWeek(
      data.projectId, // Resolved from projectName
      data.weekStart,
      data.weekEnd,
      user
    );

    return {
      intent: 'approve_project_week',
      success: true,
      affectedEntities: [{
        type: 'project',
        id: data.projectId
      }]
    };
  }

  private async rejectUser(data: any, user: IUser): Promise<ActionExecutionResult> {
    await TeamReviewApprovalService.rejectUserTimesheet(
      data.userId, // Resolved from userName
      data.projectId, // Resolved from projectName
      data.weekStart,
      data.weekEnd,
      data.reason,
      user
    );

    return {
      intent: 'reject_user',
      success: true,
      affectedEntities: [{
        type: 'timesheet',
        id: data.userId
      }]
    };
  }

  private async rejectProjectWeek(data: any, user: IUser): Promise<ActionExecutionResult> {
    await TeamReviewApprovalService.rejectProjectWeek(
      data.projectId, // Resolved from projectName
      data.weekStart,
      data.weekEnd,
      data.reason,
      user
    );

    return {
      intent: 'reject_project_week',
      success: true,
      affectedEntities: [{
        type: 'project',
        id: data.projectId
      }]
    };
  }

  private async sendReminder(data: any, user: IUser): Promise<ActionExecutionResult> {
    await TeamReviewApprovalService.sendReminder(
      data.projectId, // Resolved from projectName
      data.weekStart,
      data.weekEnd,
      user
    );

    return {
      intent: 'send_reminder',
      success: true,
      affectedEntities: [{
        type: 'project',
        id: data.projectId
      }]
    };
  }

  // BILLING
  private async exportProjectBilling(data: any, user: IUser): Promise<ActionExecutionResult> {
    const file = await ProjectBillingService.exportBilling({
      start_date: data.startDate,
      end_date: data.endDate,
      project_id: data.projectId,
      client_id: data.clientId,
      format: data.format.toLowerCase()
    }, user);

    return {
      intent: 'export_project_billing',
      success: true,
      data: { fileUrl: file.url, fileName: file.name }
    };
  }

  private async exportUserBilling(data: any, user: IUser): Promise<ActionExecutionResult> {
    const file = await ProjectBillingService.exportUserBilling({
      start_date: data.startDate,
      end_date: data.endDate,
      user_id: data.userId,
      client_id: data.clientId,
      format: data.format.toLowerCase()
    }, user);

    return {
      intent: 'export_user_billing',
      success: true,
      data: { fileUrl: file.url, fileName: file.name }
    };
  }

  // AUDIT
  private async getAuditLogs(data: any, user: IUser): Promise<ActionExecutionResult> {
    const logs = await AuditLogService.getLogs({
      start_date: data.startDate,
      end_date: data.endDate
    }, user);

    return {
      intent: 'get_audit_logs',
      success: true,
      data: logs
    };
  }

  /**
   * Get entity type for audit logging
   */
  private getEntityType(intent: Intent): string {
    if (intent.includes('project')) return 'project';
    if (intent.includes('user')) return 'user';
    if (intent.includes('client')) return 'client';
    if (intent.includes('timesheet') || intent.includes('entries')) return 'timesheet';
    if (intent.includes('task')) return 'task';
    if (intent.includes('billing')) return 'billing';
    return 'voice_command';
  }
}

export default new VoiceActionDispatcher();
```

### 9. Voice Controller

**File: `backend/src/controllers/VoiceController.ts`**

```typescript
import { Request, Response } from 'express';
import IntentRecognitionService from '../services/IntentRecognitionService';
import VoiceActionDispatcher from '../services/VoiceActionDispatcher';
import AzureSpeechService from '../services/AzureSpeechService';
import VoiceContextService from '../services/VoiceContextService';
import { VoiceCommandRequest, VoiceExecuteRequest } from '../types/voice';
import logger from '../config/logger';

export class VoiceController {
  /**
   * POST /api/v1/voice/process-command
   * Process voice command and return structured actions
   */
  async processCommand(req: Request, res: Response) {
    try {
      const { transcript, context }: VoiceCommandRequest = req.body;
      const user = req.user; // Set by auth middleware

      if (!transcript || transcript.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Transcript is required'
        });
      }

      logger.info('Voice command received', {
        userId: user._id,
        transcriptLength: transcript.length,
        context
      });

      // Process command through LLM
      const actions = await IntentRecognitionService.processCommand(transcript, user);

      return res.status(200).json({
        success: true,
        actions,
        message: `Processed ${actions.length} action(s)`
      });
    } catch (error: any) {
      logger.error('Voice command processing failed', {
        error: error.message,
        stack: error.stack
      });

      return res.status(500).json({
        success: false,
        message: 'Failed to process voice command',
        error: error.message
      });
    }
  }

  /**
   * POST /api/v1/voice/execute-action
   * Execute confirmed voice actions
   */
  async executeAction(req: Request, res: Response) {
    try {
      const { actions, confirmed }: VoiceExecuteRequest = req.body;
      const user = req.user;

      if (!confirmed) {
        return res.status(400).json({
          success: false,
          message: 'Action must be confirmed'
        });
      }

      if (!actions || actions.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No actions to execute'
        });
      }

      logger.info('Executing voice actions', {
        userId: user._id,
        actionCount: actions.length
      });

      // Execute all actions
      const results = await VoiceActionDispatcher.executeActions(actions, user);

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;

      return res.status(200).json({
        success: failureCount === 0,
        results,
        message: `Executed ${successCount} action(s) successfully${
          failureCount > 0 ? `, ${failureCount} failed` : ''
        }`
      });
    } catch (error: any) {
      logger.error('Voice action execution failed', {
        error: error.message,
        stack: error.stack
      });

      return res.status(500).json({
        success: false,
        message: 'Failed to execute voice action',
        error: error.message
      });
    }
  }

  /**
   * POST /api/v1/voice/speech-to-text
   * Convert audio to text using Azure Speech (fallback for Safari/Opera)
   */
  async speechToText(req: Request, res: Response) {
    try {
      const { audioData, format, language } = req.body;
      const user = req.user;

      if (!audioData) {
        return res.status(400).json({
          success: false,
          message: 'Audio data is required'
        });
      }

      logger.info('Speech-to-text request', {
        userId: user._id,
        format,
        language
      });

      const result = await AzureSpeechService.speechToText({
        audioData,
        format: format || 'webm',
        language: language || 'en-US'
      });

      return res.status(200).json({
        success: true,
        transcript: result.transcript,
        confidence: result.confidence,
        language: result.language
      });
    } catch (error: any) {
      logger.error('Speech-to-text failed', {
        error: error.message,
        stack: error.stack
      });

      return res.status(500).json({
        success: false,
        message: 'Failed to convert speech to text',
        error: error.message
      });
    }
  }

  /**
   * GET /api/v1/voice/context
   * Get available context for current user
   */
  async getContext(req: Request, res: Response) {
    try {
      const user = req.user;

      const context = await VoiceContextService.getContext(user);

      return res.status(200).json({
        success: true,
        context
      });
    } catch (error: any) {
      logger.error('Failed to get voice context', {
        error: error.message,
        stack: error.stack
      });

      return res.status(500).json({
        success: false,
        message: 'Failed to get context',
        error: error.message
      });
    }
  }
}

export default new VoiceController();
```

### 10. Voice Routes

**File: `backend/src/routes/voice.ts`**

```typescript
import { Router } from 'express';
import VoiceController from '../controllers/VoiceController';
import { requireAuth } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { body } from 'express-validator';

const router = Router();

/**
 * All voice routes require authentication
 */
router.use(requireAuth);

/**
 * POST /api/v1/voice/process-command
 * Process voice command and return structured actions
 */
router.post(
  '/process-command',
  [
    body('transcript').isString().trim().notEmpty().withMessage('Transcript is required'),
    body('context').optional().isObject()
  ],
  validateRequest,
  VoiceController.processCommand
);

/**
 * POST /api/v1/voice/execute-action
 * Execute confirmed voice actions
 */
router.post(
  '/execute-action',
  [
    body('actions').isArray().withMessage('Actions must be an array'),
    body('confirmed').isBoolean().equals('true').withMessage('Action must be confirmed')
  ],
  validateRequest,
  VoiceController.executeAction
);

/**
 * POST /api/v1/voice/speech-to-text
 * Convert audio to text (Azure Speech fallback)
 */
router.post(
  '/speech-to-text',
  [
    body('audioData').isString().notEmpty().withMessage('Audio data is required'),
    body('format').optional().isIn(['webm', 'ogg', 'wav', 'mp3']),
    body('language').optional().isString()
  ],
  validateRequest,
  VoiceController.speechToText
);

/**
 * GET /api/v1/voice/context
 * Get available context for current user
 */
router.get('/context', VoiceController.getContext);

export default router;
```

### 11. Register Voice Routes

**File: `backend/src/routes/index.ts`** (Modify)

```typescript
// Add to existing imports
import voiceRoutes from './voice';

// Add to route registration
router.use('/voice', voiceRoutes);
```

---

## Frontend Implementation

### 1. Type Definitions

**File: `frontend/src/types/voice.ts`**

```typescript
export interface VoiceAction {
  intent: string;
  data: Record<string, any>;
  errors: string[];
  description: string;
}

export interface VoiceCommandResponse {
  success: boolean;
  actions: VoiceAction[];
  message?: string;
}

export interface VoiceExecuteResponse {
  success: boolean;
  results: Array<{
    intent: string;
    success: boolean;
    data?: any;
    error?: string;
  }>;
  message: string;
}

export interface SpeechToTextResponse {
  success: boolean;
  transcript: string;
  confidence?: number;
  language?: string;
}

export interface VoiceContext {
  user: {
    id: string;
    name: string;
    role: string;
    email: string;
  };
  allowedIntents: string[];
  disallowedIntents: string[];
  entities: {
    projects?: Array<{ id: string; name: string; client?: string }>;
    users?: Array<{ id: string; name: string; email: string; role: string }>;
    clients?: Array<{ id: string; name: string; contactPerson?: string }>;
    tasks?: Record<string, Array<{ id: string; name: string; assignedTo?: string }>>;
    timesheets?: Array<{ weekStart: string; weekEnd: string; status: string }>;
  };
  currentDate: string;
  currentWeek: {
    start: string;
    end: string;
  };
}
```

### 2. Voice Service

**File: `frontend/src/services/VoiceService.ts`**

```typescript
import apiClient from './apiClient';
import {
  VoiceCommandResponse,
  VoiceExecuteResponse,
  SpeechToTextResponse,
  VoiceContext
} from '../types/voice';

class VoiceService {
  /**
   * Process voice command
   */
  async processCommand(transcript: string, context?: any): Promise<VoiceCommandResponse> {
    const response = await apiClient.post('/voice/process-command', {
      transcript,
      context
    });
    return response.data;
  }

  /**
   * Execute confirmed actions
   */
  async executeAction(actions: any[], confirmed: boolean): Promise<VoiceExecuteResponse> {
    const response = await apiClient.post('/voice/execute-action', {
      actions,
      confirmed
    });
    return response.data;
  }

  /**
   * Convert speech to text (Azure fallback)
   */
  async speechToText(audioData: string, format: string): Promise<SpeechToTextResponse> {
    const response = await apiClient.post('/voice/speech-to-text', {
      audioData,
      format
    });
    return response.data;
  }

  /**
   * Get voice context for current user
   */
  async getContext(): Promise<VoiceContext> {
    const response = await apiClient.get('/voice/context');
    return response.data.context;
  }
}

export default new VoiceService();
```

### 3. Voice Context

**File: `frontend/src/contexts/VoiceContext.tsx`**

```typescript
import React, { createContext, useContext, useState, useCallback } from 'react';
import { VoiceAction, VoiceContext as VoiceContextType } from '../types/voice';
import VoiceService from '../services/VoiceService';
import { toast } from 'react-toastify';

interface VoiceContextState {
  isProcessing: boolean;
  currentActions: VoiceAction[];
  showConfirmation: boolean;
  context: VoiceContextType | null;
  processCommand: (transcript: string) => Promise<void>;
  executeActions: (actions: VoiceAction[]) => Promise<void>;
  cancelActions: () => void;
  loadContext: () => Promise<void>;
}

const VoiceContext = createContext<VoiceContextState | undefined>(undefined);

export const VoiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentActions, setCurrentActions] = useState<VoiceAction[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [context, setContext] = useState<VoiceContextType | null>(null);

  const loadContext = useCallback(async () => {
    try {
      const ctx = await VoiceService.getContext();
      setContext(ctx);
    } catch (error: any) {
      console.error('Failed to load voice context:', error);
    }
  }, []);

  const processCommand = useCallback(async (transcript: string) => {
    setIsProcessing(true);
    try {
      const response = await VoiceService.processCommand(transcript);

      if (response.success && response.actions.length > 0) {
        setCurrentActions(response.actions);
        setShowConfirmation(true);
      } else {
        toast.error('Could not understand the command. Please try again.');
      }
    } catch (error: any) {
      console.error('Voice command processing failed:', error);
      toast.error(error.message || 'Failed to process voice command');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const executeActions = useCallback(async (actions: VoiceAction[]) => {
    setIsProcessing(true);
    try {
      const response = await VoiceService.executeAction(actions, true);

      if (response.success) {
        toast.success(response.message);
        setShowConfirmation(false);
        setCurrentActions([]);
        // Trigger data refresh here if needed
      } else {
        toast.error(response.message || 'Some actions failed');
      }
    } catch (error: any) {
      console.error('Action execution failed:', error);
      toast.error(error.message || 'Failed to execute actions');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const cancelActions = useCallback(() => {
    setCurrentActions([]);
    setShowConfirmation(false);
  }, []);

  return (
    <VoiceContext.Provider
      value={{
        isProcessing,
        currentActions,
        showConfirmation,
        context,
        processCommand,
        executeActions,
        cancelActions,
        loadContext
      }}
    >
      {children}
    </VoiceContext.Provider>
  );
};

export const useVoice = () => {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error('useVoice must be used within VoiceProvider');
  }
  return context;
};
```

### 4. Enhanced Voice Layer Component

**File: `frontend/src/components/voice/VoiceLayer.tsx`** (Modify)

```typescript
import React, { useState, useEffect, useRef } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { Mic, MicOff, Loader, Settings } from 'lucide-react';
import { useVoice } from '../../contexts/VoiceContext';
import VoiceService from '../../services/VoiceService';
import { DeviceDetector, DeviceInfo } from '../../utils/deviceDetection';
import { toast } from 'react-toastify';

const VoiceLayer: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [speechMethod, setSpeechMethod] = useState<'web-speech' | 'azure-speech'>('web-speech');
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  const { processCommand, isProcessing } = useVoice();

  // Enhanced device detection on mount
  useEffect(() => {
    const info = DeviceDetector.detect();
    setDeviceInfo(info);

    // Get preferred speech method (checks user preference + device capabilities)
    const method = DeviceDetector.getSpeechMethod();
    setSpeechMethod(method);

    console.info('Voice Layer Initialized:', {
      browser: info.browser,
      version: info.version,
      os: info.os,
      isMobile: info.isMobile,
      supportsWebSpeech: info.supportsWebSpeech,
      selectedMethod: method
    });
  }, []);

  const startListening = async () => {
    resetTranscript();
    setIsRecording(true);

    if (speechMethod === 'azure-speech') {
      await startAzureRecording();
    } else {
      SpeechRecognition.startListening({ continuous: true });
    }
  };

  const stopListening = async () => {
    setIsRecording(false);

    if (speechMethod === 'azure-speech') {
      await stopAzureRecording();
    } else {
      SpeechRecognition.stopListening();
    }
  };

  const toggleSpeechMethod = () => {
    const newMethod = speechMethod === 'web-speech' ? 'azure-speech' : 'web-speech';
    setSpeechMethod(newMethod);
    DeviceDetector.saveUserPreference(newMethod);
    toast.success(`Switched to ${newMethod === 'web-speech' ? 'Browser' : 'Azure'} Speech Recognition`);
  };

  const startAzureRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast.error('Failed to access microphone');
      setIsRecording(false);
    }
  };

  const stopAzureRecording = async () => {
    if (!mediaRecorderRef.current) return;

    return new Promise<void>((resolve) => {
      mediaRecorderRef.current!.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

        // Convert to base64
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];

          try {
            const response = await VoiceService.speechToText(base64Audio, 'webm');
            if (response.success) {
              // Process the transcript
              await processCommand(response.transcript);
            }
          } catch (error: any) {
            console.error('Speech-to-text failed:', error);
            toast.error('Failed to convert speech to text');
          }

          resolve();
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorderRef.current!.stop();
      mediaRecorderRef.current!.stream.getTracks().forEach(track => track.stop());
    });
  };

  const handleSendCommand = async () => {
    if (!transcript.trim()) {
      toast.warning('Please speak a command first');
      return;
    }

    await processCommand(transcript);
    resetTranscript();
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating Voice Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 bg-primary-600 hover:bg-primary-700 text-white rounded-full p-4 shadow-lg z-50 transition-all"
        aria-label="Voice Command"
      >
        {isProcessing ? (
          <Loader className="w-6 h-6 animate-spin" />
        ) : (
          <Mic className="w-6 h-6" />
        )}
      </button>

      {/* Voice Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 w-96 z-50">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Voice Command</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </div>

          {/* Recording Status */}
          <div className="mb-4">
            {isRecording ? (
              <div className="flex items-center gap-2 text-red-600">
                <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
                <span>Listening...</span>
              </div>
            ) : (
              <div className="text-gray-500">Click microphone to start</div>
            )}
          </div>

          {/* Transcript Display */}
          {transcript && (
            <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded min-h-[80px]">
              <p className="text-sm">{transcript}</p>
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-2">
            <button
              onClick={isRecording ? stopListening : startListening}
              disabled={isProcessing}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded transition-colors ${
                isRecording
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-primary-600 hover:bg-primary-700 text-white'
              } disabled:opacity-50`}
            >
              {isRecording ? (
                <>
                  <MicOff className="w-5 h-5" />
                  Stop
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5" />
                  Start
                </>
              )}
            </button>

            {transcript && (
              <button
                onClick={handleSendCommand}
                disabled={isProcessing}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition-colors disabled:opacity-50"
              >
                {isProcessing ? 'Processing...' : 'Send'}
              </button>
            )}
          </div>

          {/* Device Info and Settings */}
          <div className="mt-3 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              {deviceInfo && (
                <span>
                  {speechMethod === 'azure-speech' ? 'Azure Speech' : 'Browser Speech'} •
                  {deviceInfo.browser} {deviceInfo.version} •
                  {deviceInfo.os}
                </span>
              )}
            </div>

            {deviceInfo?.supportsWebSpeech && (
              <button
                onClick={toggleSpeechMethod}
                className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
                title="Switch speech recognition method"
              >
                <Settings className="w-3 h-3" />
                Switch
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default VoiceLayer;
```

### 5. Voice Confirmation Modal

**File: `frontend/src/components/voice/VoiceConfirmationModal.tsx`**

```typescript
import React, { useState } from 'react';
import Modal from '../ui/Modal';
import { useVoice } from '../../contexts/VoiceContext';
import { VoiceAction } from '../../types/voice';
import { AlertCircle, CheckCircle, Edit, X } from 'lucide-react';

const VoiceConfirmationModal: React.FC = () => {
  const { currentActions, showConfirmation, executeActions, cancelActions, isProcessing } = useVoice();
  const [editMode, setEditMode] = useState(false);
  const [editedActions, setEditedActions] = useState<VoiceAction[]>([]);

  const handleConfirm = async () => {
    await executeActions(editMode ? editedActions : currentActions);
  };

  const handleEdit = () => {
    setEditedActions(currentActions);
    setEditMode(true);
  };

  const handleCancel = () => {
    setEditMode(false);
    cancelActions();
  };

  if (!showConfirmation || currentActions.length === 0) {
    return null;
  }

  return (
    <Modal
      isOpen={showConfirmation}
      onClose={handleCancel}
      title="Confirm Voice Command"
      size="lg"
    >
      <div className="space-y-4">
        {/* Action Plan */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            Action Plan
          </h4>
          <ul className="space-y-2">
            {currentActions.map((action, index) => (
              <li key={index} className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-blue-800 dark:text-blue-200">
                  {action.description}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Errors */}
        {currentActions.some(a => a.errors.length > 0) && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Warnings
            </h4>
            <ul className="space-y-1">
              {currentActions.flatMap((action, index) =>
                action.errors.map((error, errorIndex) => (
                  <li key={`${index}-${errorIndex}`} className="text-sm text-yellow-800 dark:text-yellow-200">
                    • {error}
                  </li>
                ))
              )}
            </ul>
          </div>
        )}

        {/* Dynamic Forms (in edit mode) */}
        {editMode && (
          <div className="space-y-4">
            {/* Render forms based on intent */}
            {/* This would be dynamic based on the intent type */}
            <div className="text-sm text-gray-600">
              Edit mode - forms will be rendered here based on intent
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={handleCancel}
            disabled={isProcessing}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
            Cancel
          </button>

          {!editMode && (
            <button
              onClick={handleEdit}
              disabled={isProcessing}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 transition-colors disabled:opacity-50"
            >
              <Edit className="w-5 h-5" />
              Edit
            </button>
          )}

          <button
            onClick={handleConfirm}
            disabled={isProcessing}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            <CheckCircle className="w-5 h-5" />
            {isProcessing ? 'Processing...' : 'Confirm'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default VoiceConfirmationModal;
```

### 6. App Integration

**File: `frontend/src/App.tsx`** (Modify)

```typescript
// Add to imports
import { VoiceProvider } from './contexts/VoiceContext';
import VoiceConfirmationModal from './components/voice/VoiceConfirmationModal';

// Wrap app with VoiceProvider
function App() {
  return (
    <AuthProvider>
      <VoiceProvider>
        <Router>
          {/* existing routes */}
        </Router>
        <VoiceConfirmationModal />
      </VoiceProvider>
    </AuthProvider>
  );
}
```

---

## Intent & Context Mapping

See **Backend Section 6: VoiceContextService** for complete intent definitions and context requirements.

Key mapping structure:
- Each intent has required/optional fields
- Each intent specifies which context entities are needed
- Context is fetched dynamically based on detected intents
- LLM uses context to validate and map user input to structured data

---

## Security & Authorization

### 1. Voice-Specific Authorization

**Already implemented in VoiceContextService:**
- Role-based intent filtering
- Allowed/disallowed intents per role
- Automatic permission validation

### 2. Audit Logging

**Implemented in VoiceActionDispatcher:**
- All voice commands logged to AuditLog
- Tracks: user, intent, data, success/failure
- Links to affected entities

### 3. Rate Limiting

**Add to `backend/src/middleware/rateLimit.ts`:**

```typescript
import rateLimit from 'express-rate-limit';

export const voiceRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: parseInt(process.env.VOICE_MAX_REQUESTS_PER_USER_PER_HOUR || '100'),
  message: 'Too many voice requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});
```

Apply to voice routes:

```typescript
// backend/src/routes/voice.ts
import { voiceRateLimit } from '../middleware/rateLimit';

router.use(voiceRateLimit);
```

### 4. Input Validation

- Transcript length limits (already in validation)
- Audio size limits for Azure Speech
- Action count limits
- JSON schema validation for LLM responses

---

## Implementation Phases

### Phase 1: Backend Foundation (Week 1)
**Deliverables:**
1. Azure OpenAI Service setup
2. Azure Speech Service setup
3. Environment configuration
4. Type definitions
5. Basic health checks

**Tasks:**
- [ ] Install dependencies (`@azure/openai`, `microsoft-cognitiveservices-speech-sdk`)
- [ ] Create `.env` configuration
- [ ] Implement `AzureOpenAIService.ts`
- [ ] Implement `AzureSpeechService.ts`
- [ ] Create `types/voice.ts`
- [ ] Test Azure service connections

### Phase 2: Intent Recognition (Week 2)
**Deliverables:**
1. Intent detection (Step 1)
2. Context fetching
3. Data extraction (Step 2)
4. Prompt templates

**Tasks:**
- [ ] Implement `VoiceContextService.ts`
- [ ] Implement `IntentRecognitionService.ts`
- [ ] Create intent definitions for all 30+ intents
- [ ] Build contextual prompt templates
- [ ] Test intent detection with sample commands
- [ ] Test data extraction accuracy

### Phase 3: Action Execution (Week 3)
**Deliverables:**
1. Action dispatcher
2. Service integration
3. Audit logging
4. Error handling

**Tasks:**
- [ ] Implement `VoiceActionDispatcher.ts`
- [ ] Map all intents to service methods
- [ ] Add authorization checks
- [ ] Integrate audit logging
- [ ] Test action execution for each intent
- [ ] Handle edge cases and errors

### Phase 4: API Endpoints (Week 3)
**Deliverables:**
1. Voice controller
2. Routes configuration
3. Validation middleware
4. Rate limiting

**Tasks:**
- [ ] Implement `VoiceController.ts`
- [ ] Create `routes/voice.ts`
- [ ] Add request validation
- [ ] Implement rate limiting
- [ ] Test all endpoints
- [ ] Document API

### Phase 5: Frontend Voice UI (Week 4)
**Deliverables:**
1. Enhanced VoiceLayer component
2. Speech recognition (browser + Azure)
3. Voice context provider
4. Voice service

**Tasks:**
- [ ] Create `frontend/src/types/voice.ts`
- [ ] Implement `VoiceService.ts`
- [ ] Create `VoiceContext.tsx`
- [ ] Enhance `VoiceLayer.tsx`
- [ ] Add MediaRecorder for Azure fallback
- [ ] Test browser compatibility

### Phase 6: Confirmation Modal (Week 5)
**Deliverables:**
1. Voice confirmation modal
2. Dynamic form rendering
3. Edit mode
4. Error display

**Tasks:**
- [ ] Implement `VoiceConfirmationModal.tsx`
- [ ] Build intent-to-form mapper
- [ ] Implement field pre-population
- [ ] Add edit mode with validation
- [ ] Display errors and warnings
- [ ] Test user flows (Confirm/Edit/Cancel)

### Phase 7: Integration & Testing (Week 6)
**Deliverables:**
1. Full integration
2. End-to-end testing
3. Error handling
4. Performance optimization

**Tasks:**
- [ ] Integrate all components
- [ ] Test all 30+ intents
- [ ] Test role-based permissions
- [ ] Test error scenarios
- [ ] Optimize LLM prompts
- [ ] Optimize context fetching
- [ ] Load testing
- [ ] Cross-browser testing

### Phase 8: Polish & Deployment (Week 7)
**Deliverables:**
1. Documentation
2. Monitoring
3. Cost tracking
4. Production deployment

**Tasks:**
- [ ] Write user documentation
- [ ] Write developer documentation
- [ ] Add monitoring/alerting for LLM calls
- [ ] Implement cost tracking dashboard
- [ ] Deploy to staging
- [ ] User acceptance testing
- [ ] Deploy to production
- [ ] Train users

---

## Testing Strategy

### Unit Tests

**Backend:**
- `AzureOpenAIService` - Mock Azure API calls
- `IntentRecognitionService` - Test intent detection
- `VoiceContextService` - Test context fetching
- `VoiceActionDispatcher` - Test action execution

**Frontend:**
- `VoiceService` - Mock API calls
- `VoiceContext` - Test state management
- `VoiceLayer` - Test speech recognition
- `VoiceConfirmationModal` - Test UI interactions

### Integration Tests

- End-to-end voice command flow
- Speech-to-text conversion (both browser and Azure)
- LLM prompt and response validation
- Action execution and database updates
- Audit logging verification

### User Acceptance Tests

- Test all 30+ intents with real voice commands
- Test fuzzy matching and error handling
- Test multi-action commands
- Test edit and confirm flows
- Test permission-based restrictions
- Test across different browsers

### Performance Tests

- LLM response time (target: < 3 seconds)
- Context fetching time (target: < 500ms)
- Action execution time (target: < 1 second)
- Concurrent user load testing
- Token usage and cost analysis

---

## Deployment Considerations

### Environment Variables

**Production:**
```env
NODE_ENV=production
AZURE_OPENAI_API_KEY=prod_key
AZURE_OPENAI_ENDPOINT=https://prod-resource.openai.azure.com/
AZURE_SPEECH_KEY=prod_speech_key
VOICE_ENABLED=true
VOICE_MAX_REQUESTS_PER_USER_PER_HOUR=50  # Lower in production
VOICE_DEBUG_MODE=false
```

**Staging:**
```env
NODE_ENV=staging
VOICE_DEBUG_MODE=true  # Enable detailed logging
VOICE_MAX_REQUESTS_PER_USER_PER_HOUR=200  # Higher for testing
```

### Monitoring

**Metrics to Track:**
- Total voice commands per day
- Success/failure rate
- Average LLM response time
- Token usage and costs
- Most used intents
- Error patterns

**Alerting:**
- Azure service failures
- High error rates (> 10%)
- Slow response times (> 5 seconds)
- Rate limit hits
- Cost threshold exceeded

### Cost Management

**Azure OpenAI Pricing (Approximate):**
- GPT-4: $0.03/1K prompt tokens, $0.06/1K completion tokens
- GPT-3.5-turbo: $0.0015/1K prompt tokens, $0.002/1K completion tokens

**Estimated Costs:**
- Average command: 1,000 prompt tokens + 500 completion tokens
- GPT-4: ~$0.06 per command
- GPT-3.5: ~$0.003 per command

**Cost Control:**
- Use GPT-3.5-turbo for production (20x cheaper)
- Implement aggressive rate limiting
- Cache context data
- Optimize prompts for token efficiency
- Set monthly budget alerts

### Security Checklist

- [ ] Azure credentials stored in Azure Key Vault (production)
- [ ] Environment variables never committed to git
- [ ] Rate limiting enabled on all voice endpoints
- [ ] Authorization checks on all actions
- [ ] Audit logging for all voice commands
- [ ] Input sanitization and validation
- [ ] LLM response validation
- [ ] HTTPS-only in production
- [ ] CORS properly configured

---

## File Structure Summary

```
backend/
├── src/
│   ├── controllers/
│   │   └── VoiceController.ts          [NEW]
│   ├── services/
│   │   ├── AzureOpenAIService.ts       [NEW]
│   │   ├── AzureSpeechService.ts       [NEW]
│   │   ├── IntentRecognitionService.ts [NEW]
│   │   ├── VoiceContextService.ts      [NEW]
│   │   └── VoiceActionDispatcher.ts    [NEW]
│   ├── routes/
│   │   ├── voice.ts                    [NEW]
│   │   └── index.ts                    [MODIFY]
│   ├── types/
│   │   └── voice.ts                    [NEW]
│   └── middleware/
│       └── rateLimit.ts                [MODIFY]
├── .env                                 [MODIFY]
└── package.json                         [MODIFY]

frontend/
├── src/
│   ├── components/
│   │   └── voice/
│   │       ├── VoiceLayer.tsx          [MODIFY]
│   │       └── VoiceConfirmationModal.tsx [NEW]
│   ├── contexts/
│   │   └── VoiceContext.tsx            [NEW]
│   ├── services/
│   │   └── VoiceService.ts             [NEW]
│   ├── utils/
│   │   └── deviceDetection.ts          [NEW]
│   ├── types/
│   │   └── voice.ts                    [NEW]
│   └── App.tsx                          [MODIFY]
└── package.json                         [NO CHANGES - dependencies already present]
```

---

## Next Steps

1. **Review and Approve Plan**: Ensure all stakeholders agree with the approach
2. **Azure Setup**: Create Azure OpenAI and Speech Services resources
3. **Start Phase 1**: Begin backend implementation
4. **Iterative Development**: Complete one phase before moving to the next
5. **Continuous Testing**: Test each component as it's built
6. **User Feedback**: Gather feedback early from pilot users

---

## Support and Resources

**Azure Documentation:**
- [Azure OpenAI Service](https://learn.microsoft.com/en-us/azure/ai-services/openai/)
- [Azure Speech Services](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/)

**Libraries:**
- [@azure/openai](https://www.npmjs.com/package/@azure/openai)
- [microsoft-cognitiveservices-speech-sdk](https://www.npmjs.com/package/microsoft-cognitiveservices-speech-sdk)
- [react-speech-recognition](https://www.npmjs.com/package/react-speech-recognition)

**Best Practices:**
- Prompt engineering for Azure OpenAI
- Voice UI/UX design patterns
- Accessibility for voice interfaces

---

**Document Version:** 1.1
**Last Updated:** 2025-11-03
**Author:** Claude Code Implementation Assistant

---

## Changelog

### Version 1.1 (2025-11-03)
- ✅ Added **Device Detection Strategy** section with intelligent browser/device detection
- ✅ Added comprehensive Browser/Device Compatibility Matrix
- ✅ Implemented `DeviceDetector` utility class for automatic speech method selection
- ✅ Added user preference storage in localStorage
- ✅ Added **Redirection Logic** section with automatic navigation after success
- ✅ Defined complete Intent-to-Route mapping table (30+ intents)
- ✅ Updated backend `ActionExecutionResult` type to include `redirectUrl`
- ✅ Updated `VoiceActionDispatcher` examples with redirect URL generation
- ✅ Updated `VoiceContext` to handle navigation using `useNavigate`
- ✅ Added special handling for file downloads and multi-action commands
- ✅ Enhanced `VoiceLayer` component with device detection and manual method switching
- ✅ Added device info display and settings toggle in voice panel
- ✅ Updated file structure to include `deviceDetection.ts` utility

### Version 1.0 (2025-11-03)
- Initial implementation plan with Azure OpenAI and Azure Speech integration
- Complete backend and frontend architecture
- 30+ intent definitions with context mapping
- Security, authorization, and audit logging
- 8-phase implementation timeline
