import { apiService } from './api';
import { ApiResponse, SystemSettings } from '../types';

export interface UpdateSettingsRequest {
  allowSelfRegistration?: boolean;
  allowedEmailDomains?: string[];
  blockedEmailDomains?: string[];
  requireEmailVerification?: boolean;
  oauthProviders?: {
    google?: {
      enabled?: boolean;
      clientId?: string;
      clientSecret?: string;
    };
    microsoft?: {
      enabled?: boolean;
      clientId?: string;
      clientSecret?: string;
    };
    apple?: {
      enabled?: boolean;
      clientId?: string;
      clientSecret?: string;
    };
  };
  maintenanceMode?: boolean;
}

class SettingsService {
  async getSettings(): Promise<ApiResponse<SystemSettings>> {
    return apiService.get('/admin/settings');
  }

  async updateSettings(updates: UpdateSettingsRequest): Promise<ApiResponse<SystemSettings>> {
    return apiService.put('/admin/settings', updates);
  }
}

export const settingsService = new SettingsService();
export default settingsService;