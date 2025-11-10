import crypto from 'crypto';
import { logger } from '@/config/logger';

/**
 * Microsoft Authentication Utilities
 * Helper functions for Microsoft OAuth2 authentication flow
 */

/**
 * Generate a random state string for CSRF protection
 */
export const generateState = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Validate state parameter to prevent CSRF attacks
 */
export const validateState = (receivedState: string, expectedState: string): boolean => {
  return receivedState === expectedState;
};

/**
 * Exchange authorization code for Microsoft access token and user info
 */
export const exchangeCodeForToken = async (code: string) => {
  try {
    logger.info('Exchanging authorization code for Microsoft token');

    // Check if Microsoft SSO is configured
    if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET || !process.env.MICROSOFT_REDIRECT_URI) {
      throw new Error('Microsoft SSO not properly configured - missing required environment variables');
    }

    // Basic validation of authorization code
    if (!code || typeof code !== 'string' || code.length < 10) {
      throw new Error('Invalid authorization code provided');
    }

    // Log the code length and first/last few characters for debugging (without exposing full code)
    logger.info(`Authorization code validation: length=${code.length}, starts=${code.substring(0, 4)}, ends=${code.substring(code.length - 4)}`);

    // Exchange code for token using direct HTTP request
    const tenantId = process.env.MICROSOFT_TENANT_ID || 'common';
    const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    
    const tokenRequestParams = {
      client_id: process.env.MICROSOFT_CLIENT_ID,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: process.env.MICROSOFT_REDIRECT_URI,
      scope: 'openid profile email User.Read'
    };

    // Log request params (without sensitive data)
    logger.info('Token exchange request:', {
      endpoint: tokenEndpoint,
      client_id: process.env.MICROSOFT_CLIENT_ID,
      grant_type: 'authorization_code',
      redirect_uri: process.env.MICROSOFT_REDIRECT_URI,
      scope: 'openid profile email User.Read',
      code_length: code.length,
      tenant_id: tenantId
    });

    const tokenResponse = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(tokenRequestParams)
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      logger.error('Token exchange failed - Status:', tokenResponse.status);
      logger.error('Token exchange failed - Status Text:', tokenResponse.statusText);
      logger.error('Token exchange failed - Response:', errorText);
      
      // Try to parse the error response for more details
      try {
        const errorData = JSON.parse(errorText);
        logger.error('Parsed Microsoft error:', errorData);
        
        if (errorData.error_description) {
          throw new Error(`Microsoft OAuth error: ${errorData.error} - ${errorData.error_description}`);
        }
      } catch (parseError) {
        // If we can't parse the error, just use the raw response
        logger.error('Could not parse error response:', parseError);
      }
      
      throw new Error(`Failed to exchange code for token: ${tokenResponse.status} ${tokenResponse.statusText} - ${errorText}`);
    }

    const tokenData = await tokenResponse.json() as any;
    
    if (!tokenData.access_token) {
      throw new Error('No access token received from Microsoft');
    }

    // Get user info from Microsoft Graph API
    const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      logger.error('Microsoft Graph API error:', errorText);
      throw new Error(`Failed to get user info from Microsoft Graph: ${userResponse.status} ${userResponse.statusText}`);
    }

    const userData = await userResponse.json() as any;

    // Validate required user data
    if (!userData.id) {
      throw new Error('No user ID received from Microsoft Graph');
    }

    const userInfo = {
      microsoftId: userData.id,
      email: userData.mail || userData.userPrincipalName || userData.email,
      name: userData.displayName || userData.name || '',
      givenName: userData.givenName || '',
      surname: userData.surname || '',
    };

    // Ensure we have an email
    if (!userInfo.email) {
      throw new Error('No email address found in Microsoft user profile');
    }

    logger.info(`Successfully authenticated Microsoft user: ${userInfo.email}`);

    return {
      success: true,
      userInfo,
      tokenData, // Include token data for potential future use
    };
  } catch (error: any) {
    logger.error('Failed to exchange code for token:', error);
    return {
      success: false,
      error: error.message || 'Failed to authenticate with Microsoft',
    };
  }
};

/**
 * Validate Microsoft access token (if needed for token-based auth)
 * This can be used when frontend sends Microsoft token directly
 */
export const validateMicrosoftToken = async (accessToken: string) => {
  try {
    // Decode token to get user info
    // Note: For production, you should validate the token signature
    const base64Url = accessToken.split('.')[1];
    // eslint-disable-next-line unicorn/prefer-string-replace-all
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      Buffer.from(base64, 'base64')
        .toString('ascii')
        .split('')
        // eslint-disable-next-line unicorn/prefer-code-point
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    const payload = JSON.parse(jsonPayload);

    // Check token expiry
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      throw new Error('Token has expired');
    }

    return {
      success: true,
      userInfo: {
        microsoftId: payload.oid || payload.sub,
        email: payload.preferred_username || payload.email,
        name: payload.name || '',
      },
    };
  } catch (error: any) {
    logger.error('Failed to validate Microsoft token:', error);
    return {
      success: false,
      error: error.message || 'Invalid Microsoft token',
    };
  }
};

/**
 * Extract user information from Microsoft Graph API
 * (Alternative method if using Graph API directly)
 */
export const getMicrosoftUserProfile = async (accessToken: string) => {
  try {
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user profile from Microsoft Graph');
    }

    const profile = await response.json() as any;

    return {
      success: true,
      profile: {
        microsoftId: profile.id,
        email: profile.mail || profile.userPrincipalName,
        name: profile.displayName,
        givenName: profile.givenName,
        surname: profile.surname,
      },
    };
  } catch (error: any) {
    logger.error('Failed to get Microsoft user profile:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch user profile',
    };
  }
};

export default {
  generateState,
  validateState,
  exchangeCodeForToken,
  validateMicrosoftToken,
  getMicrosoftUserProfile,
};
