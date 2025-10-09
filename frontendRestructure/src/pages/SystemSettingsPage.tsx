import React, { useState, useEffect } from 'react';
import { SystemSettings } from '../types';
import { settingsService } from '../services/settingsService';
import { useToast } from '../hooks/useToast';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Switch } from '../components/ui/Switch';
import { Badge } from '../components/ui/Badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Separator } from '../components/ui/Separator';
import { 
  Settings, 
  Users, 
  Mail, 
  Shield, 
  Wrench, 
  Plus, 
  X, 
  Save,
  Loader2 
} from 'lucide-react';

interface OAuthProvider {
  name: string;
  key: 'google' | 'microsoft' | 'apple';
  displayName: string;
}

const oauthProviders: OAuthProvider[] = [
  { name: 'Google', key: 'google', displayName: 'Google OAuth' },
  { name: 'Microsoft', key: 'microsoft', displayName: 'Microsoft OAuth' },
  { name: 'Apple', key: 'apple', displayName: 'Apple ID' }
];

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<SystemSettings | null>(null);
  const [newAllowedDomain, setNewAllowedDomain] = useState('');
  const [newBlockedDomain, setNewBlockedDomain] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await settingsService.getSettings();
      if (response.success && response.data) {
        setSettings(response.data);
        setFormData(response.data);
      } else {
        toast.error(response.message || 'Failed to load settings');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData) return;

    setSaving(true);
    try {
      const response = await settingsService.updateSettings(formData);
      if (response.success && response.data) {
        setSettings(response.data);
        setFormData(response.data);
        toast.success('Settings updated successfully');
      } else {
        toast.error(response.message || 'Failed to update settings');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const updateFormData = <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => {
    if (!formData) return;
    setFormData({ ...formData, [key]: value });
  };

  const addAllowedDomain = () => {
    if (!formData || !newAllowedDomain.trim()) return;
    const domain = newAllowedDomain.trim().toLowerCase();
    if (!formData.allowedEmailDomains.includes(domain)) {
      updateFormData('allowedEmailDomains', [...formData.allowedEmailDomains, domain]);
    }
    setNewAllowedDomain('');
  };

  const removeAllowedDomain = (domain: string) => {
    if (!formData) return;
    updateFormData('allowedEmailDomains', formData.allowedEmailDomains.filter(d => d !== domain));
  };

  const addBlockedDomain = () => {
    if (!formData || !newBlockedDomain.trim()) return;
    const domain = newBlockedDomain.trim().toLowerCase();
    if (!formData.blockedEmailDomains.includes(domain)) {
      updateFormData('blockedEmailDomains', [...formData.blockedEmailDomains, domain]);
    }
    setNewBlockedDomain('');
  };

  const removeBlockedDomain = (domain: string) => {
    if (!formData) return;
    updateFormData('blockedEmailDomains', formData.blockedEmailDomains.filter(d => d !== domain));
  };

  const updateOAuthProvider = (provider: 'google' | 'microsoft' | 'apple', updates: any) => {
    if (!formData) return;
    updateFormData('oauthProviders', {
      ...formData.oauthProviders,
      [provider]: {
        ...formData.oauthProviders[provider],
        ...updates
      }
    });
  };

  const hasChanges = () => {
    return JSON.stringify(settings) !== JSON.stringify(formData);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading settings...</span>
        </div>
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Failed to load settings</h2>
          <p className="text-muted-foreground mt-2">Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Settings className="h-8 w-8" />
          <div>
            <h1 className="text-2xl font-bold">System Settings</h1>
            <p className="text-muted-foreground">Manage system-wide configuration settings</p>
          </div>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={!hasChanges() || saving}
          className="flex items-center space-x-2"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          <span>{saving ? 'Saving...' : 'Save Changes'}</span>
        </Button>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>User Registration</span>
          </CardTitle>
          <CardDescription>
            Control how users can register and access the system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Allow Self Registration</Label>
              <p className="text-sm text-muted-foreground">
                Allow users to create accounts without admin approval
              </p>
            </div>
            <Switch
              checked={formData.allowSelfRegistration}
              onCheckedChange={(checked) => updateFormData('allowSelfRegistration', checked)}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Require Email Verification</Label>
              <p className="text-sm text-muted-foreground">
                Users must verify their email address before accessing the system
              </p>
            </div>
            <Switch
              checked={formData.requireEmailVerification}
              onCheckedChange={(checked) => updateFormData('requireEmailVerification', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Email Domain Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Mail className="h-5 w-5" />
            <span>Email Domain Restrictions</span>
          </CardTitle>
          <CardDescription>
            Control which email domains are allowed or blocked for registration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Allowed Domains */}
          <div>
            <Label className="text-base">Allowed Email Domains</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Only users with these email domains can register (leave empty to allow all except blocked)
            </p>
            <div className="flex space-x-2 mb-3">
              <Input
                placeholder="example.com"
                value={newAllowedDomain}
                onChange={(e) => setNewAllowedDomain(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addAllowedDomain()}
              />
              <Button onClick={addAllowedDomain} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.allowedEmailDomains.map((domain) => (
                <Badge key={domain} variant="secondary" className="flex items-center space-x-1">
                  <span>{domain}</span>
                  <button
                    onClick={() => removeAllowedDomain(domain)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          {/* Blocked Domains */}
          <div>
            <Label className="text-base">Blocked Email Domains</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Users with these email domains cannot register
            </p>
            <div className="flex space-x-2 mb-3">
              <Input
                placeholder="blocked.com"
                value={newBlockedDomain}
                onChange={(e) => setNewBlockedDomain(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addBlockedDomain()}
              />
              <Button onClick={addBlockedDomain} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.blockedEmailDomains.map((domain) => (
                <Badge key={domain} variant="destructive" className="flex items-center space-x-1">
                  <span>{domain}</span>
                  <button
                    onClick={() => removeBlockedDomain(domain)}
                    className="ml-1 hover:text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* OAuth Providers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>OAuth Providers</span>
          </CardTitle>
          <CardDescription>
            Configure third-party authentication providers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {oauthProviders.map((provider) => (
            <div key={provider.key} className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">{provider.displayName}</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable {provider.name} OAuth authentication
                  </p>
                </div>
                <Switch
                  checked={formData.oauthProviders[provider.key].enabled}
                  onCheckedChange={(checked) => 
                    updateOAuthProvider(provider.key, { enabled: checked })
                  }
                />
              </div>

              {formData.oauthProviders[provider.key].enabled && (
                <div className="ml-4 space-y-3 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <Label>Client ID</Label>
                    <Input
                      type="text"
                      placeholder={`${provider.name} Client ID`}
                      value={formData.oauthProviders[provider.key].clientId || ''}
                      onChange={(e) => 
                        updateOAuthProvider(provider.key, { clientId: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Client Secret</Label>
                    <Input
                      type="password"
                      placeholder={`${provider.name} Client Secret`}
                      value={formData.oauthProviders[provider.key].clientSecret || ''}
                      onChange={(e) => 
                        updateOAuthProvider(provider.key, { clientSecret: e.target.value })
                      }
                    />
                  </div>
                </div>
              )}
              
              {provider.key !== 'apple' && <Separator />}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* System Maintenance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Wrench className="h-5 w-5" />
            <span>System Maintenance</span>
          </CardTitle>
          <CardDescription>
            Control system-wide maintenance settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Maintenance Mode</Label>
              <p className="text-sm text-muted-foreground">
                Enable maintenance mode to prevent user access during updates
              </p>
            </div>
            <Switch
              checked={formData.maintenanceMode}
              onCheckedChange={(checked) => updateFormData('maintenanceMode', checked)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}