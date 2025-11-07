import { PublicClientApplication, LogLevel, Configuration, PopupRequest, RedirectRequest } from '@azure/msal-browser';

/**
 * MSAL Configuration for Microsoft Authentication
 * Supports both popup and redirect flows for browser-based authentication
 */

// MSAL configuration
export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_MICROSOFT_CLIENT_ID || '',
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_MICROSOFT_TENANT_ID || 'common'}`,
    redirectUri: import.meta.env.VITE_MICROSOFT_REDIRECT_URI || window.location.origin,
    postLogoutRedirectUri: window.location.origin,
    navigateToLoginRequestUrl: false,
  },
  cache: {
    cacheLocation: 'localStorage', // Use localStorage for persistent storage
    storeAuthStateInCookie: false, // Set to true for IE11 support
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) {
          return;
        }
        switch (level) {
          case LogLevel.Error:
            console.error(message);
            return;
          case LogLevel.Info:
            console.info(message);
            return;
          case LogLevel.Verbose:
            console.debug(message);
            return;
          case LogLevel.Warning:
            console.warn(message);
            return;
          default:
            return;
        }
      },
      piiLoggingEnabled: false,
      logLevel: LogLevel.Warning,
    },
    windowHashTimeout: 60000,
    iframeHashTimeout: 6000,
    loadFrameTimeout: 0,
  },
};

// Initialize MSAL instance
export const msalInstance = new PublicClientApplication(msalConfig);

// Initialize MSAL (moved to async function to avoid top-level await)
export const initializeMsal = async (): Promise<void> => {
  await msalInstance.initialize();
  
  // Account selection logic
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length > 0) {
    msalInstance.setActiveAccount(accounts[0]);
  }
};

// Login request configuration
export const loginRequest: PopupRequest | RedirectRequest = {
  scopes: ['openid', 'profile', 'email', 'User.Read'],
  prompt: 'select_account', // Force account selection
};

// Silent login request (for SharePoint seamless auth)
export const silentRequest = {
  scopes: ['openid', 'profile', 'email', 'User.Read'],
  forceRefresh: false,
};

// Graph API configuration
export const graphConfig = {
  graphMeEndpoint: 'https://graph.microsoft.com/v1.0/me',
};

/**
 * Check if MSAL is configured
 */
export const isMsalConfigured = (): boolean => {
  return Boolean(import.meta.env.VITE_MICROSOFT_CLIENT_ID);
};

export default msalInstance;
