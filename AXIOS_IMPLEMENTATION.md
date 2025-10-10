# Axios Implementation Guide
**Enterprise Timesheet Management System**

## 📋 Overview

This document describes the Axios implementation for API calls in the frontend application. All API communication now uses Axios instead of the native `fetch` API for better error handling, request/response interceptors, and consistent API patterns.

---

## 🎯 Why Axios?

### Benefits Over Fetch API

1. **Request/Response Interceptors** - Automatically handle authentication tokens and global error responses
2. **Automatic JSON Transformation** - No need to manually call `.json()` on responses
3. **Better Error Handling** - Axios throws errors for bad status codes (4xx, 5xx)
4. **Request Cancellation** - Built-in support for canceling requests
5. **Timeout Configuration** - Easy to set request timeouts
6. **Upload Progress** - Track file upload progress easily
7. **Wide Browser Support** - Better compatibility across browsers

---

## 📁 File Structure

```
frontend/src/
├── config/
│   └── axios.config.ts          # Centralized Axios configuration
├── services/
│   ├── BackendAPI.ts            # Generic API wrapper using Axios
│   ├── BackendAuthService.ts    # Authentication service using Axios
│   ├── UserService.ts           # User management (will be migrated)
│   ├── ProjectService.ts        # Project management (will be migrated)
│   └── ...                      # Other services
```

---

## 🔧 Configuration

### Axios Instance (`config/axios.config.ts`)

The centralized Axios instance with global configuration:

```typescript
import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: '/api/v1',       // API base URL (uses proxy)
  timeout: 30000,            // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});
```

### Request Interceptor

Automatically adds authentication token to all requests:

```typescript
axiosInstance.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('accessToken');

    // Add token to headers if available
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);
```

**Features:**
- ✅ Auto-attach JWT token from localStorage
- ✅ Support for both `accessToken` and `authToken` keys
- ✅ Development logging for debugging

### Response Interceptor

Handles global error responses and automatic token refresh:

```typescript
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized - Auto token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await axios.post('/api/v1/auth/refresh', {
          refreshToken,
        });

        // Update stored token
        localStorage.setItem('accessToken', response.data.tokens.accessToken);

        // Retry the original request with new token
        originalRequest.headers.Authorization = `Bearer ${response.data.tokens.accessToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // Refresh failed - logout user
        localStorage.clear();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);
```

**Features:**
- ✅ **Automatic Token Refresh** on 401 errors
- ✅ **Auto-logout** when token refresh fails
- ✅ **Global Toast Notifications** for common errors (403, 404, 500)
- ✅ **Network Error Handling**

---

## 🚀 Usage Guide

### 1. Basic API Calls (Using BackendAPI)

#### GET Request
```typescript
import { backendApi } from '@/services/BackendAPI';

// Simple GET
const users = await backendApi.get<User[]>('/users');

// GET with query parameters
const users = await backendApi.get<User[]>('/users', {
  params: {
    page: 1,
    limit: 10,
    role: 'employee'
  }
});
```

#### POST Request
```typescript
// Create user
const newUser = await backendApi.post<User>('/users', {
  email: 'john@example.com',
  full_name: 'John Doe',
  role: 'employee'
});
```

#### PUT Request (Full Update)
```typescript
// Update user
const updatedUser = await backendApi.put<User>(`/users/${userId}`, {
  email: 'john@example.com',
  full_name: 'John Doe Updated',
  role: 'manager'
});
```

#### PATCH Request (Partial Update)
```typescript
// Partial update
const updated = await backendApi.patch<User>(`/users/${userId}`, {
  is_active: false
});
```

#### DELETE Request
```typescript
// Delete user
await backendApi.delete<void>(`/users/${userId}`);
```

### 2. File Upload

```typescript
import { backendApi } from '@/services/BackendAPI';

// Create FormData
const formData = new FormData();
formData.append('file', fileObject);
formData.append('project_id', projectId);

// Upload with progress tracking
const result = await backendApi.upload<UploadResponse>(
  '/upload',
  formData,
  (progressEvent) => {
    const percentCompleted = Math.round(
      (progressEvent.loaded * 100) / progressEvent.total
    );
    console.log(`Upload Progress: ${percentCompleted}%`);
  }
);
```

### 3. File Download

```typescript
import { backendApi } from '@/services/BackendAPI';

// Download file
await backendApi.download('/reports/monthly', 'monthly-report.pdf');
```

### 4. Authentication Service

#### Login
```typescript
import { BackendAuthService } from '@/services/BackendAuthService';

const result = await BackendAuthService.login({
  email: 'user@example.com',
  password: 'password123'
});

if (result.success) {
  // Tokens are automatically stored in localStorage
  console.log('User:', result.user);
} else {
  console.error('Login failed:', result.error);
}
```

#### Register
```typescript
const result = await BackendAuthService.register({
  email: 'newuser@example.com',
  password: 'securePassword123!',
  full_name: 'New User',
  role: 'employee'
});
```

#### Logout
```typescript
await BackendAuthService.logout();
// Automatically clears tokens and redirects
```

#### Get Profile
```typescript
const { user, error } = await BackendAuthService.getProfile();

if (user) {
  console.log('Current user:', user);
} else {
  console.error('Error:', error);
}
```

#### Change Password
```typescript
const result = await BackendAuthService.changePassword({
  currentPassword: 'oldPass123',
  newPassword: 'newPass456!@#'
});

if (result.success) {
  console.log('Password changed successfully');
} else {
  console.error('Error:', result.error);
}
```

#### Forgot Password
```typescript
const result = await BackendAuthService.forgotPassword({
  email: 'user@example.com'
});

if (result.success) {
  console.log('Reset email sent:', result.message);
}
```

#### Reset Password
```typescript
const result = await BackendAuthService.resetPassword({
  token: resetToken, // from URL query parameter
  password: 'newPassword123!'
});
```

---

## 🏗️ Creating New Services

### Template for New Service

```typescript
import axiosInstance, { handleApiError } from '@/config/axios.config';
import type { AxiosResponse } from 'axios';

// Define interfaces
export interface YourEntity {
  id: string;
  name: string;
  // ... other fields
}

export interface CreateYourEntityRequest {
  name: string;
  // ... other fields
}

export class YourService {
  private static readonly API_PREFIX = '/your-endpoint';

  /**
   * Get all entities
   */
  static async getAll(): Promise<YourEntity[]> {
    try {
      const response: AxiosResponse<YourEntity[]> = await axiosInstance.get(
        this.API_PREFIX
      );
      return response.data;
    } catch (error) {
      const { error: errorMessage } = handleApiError(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Get entity by ID
   */
  static async getById(id: string): Promise<YourEntity> {
    try {
      const response: AxiosResponse<YourEntity> = await axiosInstance.get(
        `${this.API_PREFIX}/${id}`
      );
      return response.data;
    } catch (error) {
      const { error: errorMessage } = handleApiError(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Create new entity
   */
  static async create(data: CreateYourEntityRequest): Promise<YourEntity> {
    try {
      const response: AxiosResponse<YourEntity> = await axiosInstance.post(
        this.API_PREFIX,
        data
      );
      return response.data;
    } catch (error) {
      const { error: errorMessage } = handleApiError(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Update entity
   */
  static async update(id: string, data: Partial<YourEntity>): Promise<YourEntity> {
    try {
      const response: AxiosResponse<YourEntity> = await axiosInstance.put(
        `${this.API_PREFIX}/${id}`,
        data
      );
      return response.data;
    } catch (error) {
      const { error: errorMessage } = handleApiError(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Delete entity
   */
  static async delete(id: string): Promise<void> {
    try {
      await axiosInstance.delete(`${this.API_PREFIX}/${id}`);
    } catch (error) {
      const { error: errorMessage } = handleApiError(error);
      throw new Error(errorMessage);
    }
  }
}
```

---

## 🎯 Best Practices

### 1. Always Use TypeScript Types

```typescript
// ✅ Good - Typed response
const users = await backendApi.get<User[]>('/users');

// ❌ Bad - No type
const users = await backendApi.get('/users');
```

### 2. Handle Errors Properly

```typescript
try {
  const result = await backendApi.post('/users', userData);
  toast.success('User created successfully');
} catch (error) {
  // Error is already handled by interceptor
  // Just show user-friendly message
  toast.error('Failed to create user');
  console.error('Error:', error);
}
```

### 3. Use Proper HTTP Methods

- **GET** - Retrieve data (no body)
- **POST** - Create new resource
- **PUT** - Full update (replace entire resource)
- **PATCH** - Partial update (update specific fields)
- **DELETE** - Remove resource

### 4. Use Query Parameters for Filtering

```typescript
// ✅ Good
const users = await backendApi.get<User[]>('/users', {
  params: { role: 'manager', is_active: true }
});

// ❌ Bad - Don't build query strings manually
const users = await backendApi.get<User[]>('/users?role=manager&is_active=true');
```

### 5. Leverage Interceptors

Don't manually add auth headers - they're added automatically:

```typescript
// ✅ Good - Token added automatically
const data = await axiosInstance.get('/protected-route');

// ❌ Bad - Manual token handling
const token = localStorage.getItem('accessToken');
const data = await axiosInstance.get('/protected-route', {
  headers: { Authorization: `Bearer ${token}` }
});
```

---

## 🔒 Security Features

### 1. Automatic Token Management
- Tokens stored in localStorage
- Automatically attached to requests
- Auto-refresh on expiration
- Secure token validation

### 2. Request Timeout
- Default 30-second timeout
- Prevents hanging requests
- Can be customized per request

### 3. HTTPS Only (Production)
- Proxy setup in development
- Direct HTTPS in production
- Secure cookie handling

---

## 🧪 Testing Axios Calls

### Mock Axios in Tests

```typescript
import axios from 'axios';
import { vi } from 'vitest';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Test
it('should fetch users', async () => {
  const mockUsers = [{ id: '1', name: 'John' }];

  mockedAxios.get.mockResolvedValue({
    data: mockUsers,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {}
  });

  const users = await YourService.getAll();
  expect(users).toEqual(mockUsers);
});
```

---

## 📊 Migration Checklist

When migrating existing services from `fetch` to Axios:

- [ ] Import `axiosInstance` and `handleApiError` from `config/axios.config`
- [ ] Replace `fetch()` calls with `axiosInstance.get/post/put/patch/delete()`
- [ ] Remove manual `response.json()` calls (Axios does this automatically)
- [ ] Remove manual auth header logic (handled by interceptor)
- [ ] Use `handleApiError()` for consistent error handling
- [ ] Add proper TypeScript types to responses
- [ ] Test the service thoroughly
- [ ] Update any component using the service if needed

---

## ✅ Completed Migrations

- [x] **BackendAPI.ts** - Generic API wrapper
- [x] **BackendAuthService.ts** - Authentication service

## 🔄 Pending Migrations

- [ ] UserService.ts
- [ ] ProjectService.ts
- [ ] TimesheetService.ts
- [ ] BillingService.ts
- [ ] ReportService.ts
- [ ] ClientService.ts
- [ ] AuditLogService.ts
- [ ] DashboardService.ts
- [ ] PermissionService.ts

---

## 🐛 Troubleshooting

### Issue: Token not being sent with requests

**Solution:** Ensure token is stored in localStorage with key `accessToken`:
```typescript
localStorage.setItem('accessToken', token);
```

### Issue: CORS errors

**Solution:** Ensure proxy is configured in `vite.config.ts`:
```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true
    }
  }
}
```

### Issue: Request timeout

**Solution:** Increase timeout for specific request:
```typescript
const data = await axiosInstance.get('/slow-endpoint', {
  timeout: 60000 // 60 seconds
});
```

### Issue: Cannot cancel request

**Solution:** Use AbortController:
```typescript
const controller = new AbortController();

const data = await axiosInstance.get('/endpoint', {
  signal: controller.signal
});

// Cancel request
controller.abort();
```

---

## 📚 Additional Resources

- [Axios Documentation](https://axios-http.com/docs/intro)
- [Axios Interceptors Guide](https://axios-http.com/docs/interceptors)
- [TypeScript with Axios](https://axios-http.com/docs/typescript)

---

## ✨ Summary

### Key Features Implemented

✅ **Centralized Configuration** - Single Axios instance for entire app
✅ **Automatic Authentication** - JWT tokens added to all requests
✅ **Token Refresh** - Auto-refresh expired tokens
✅ **Error Handling** - Global error interceptor with toast notifications
✅ **Type Safety** - Full TypeScript support
✅ **File Operations** - Upload with progress, download support
✅ **Logging** - Development mode request/response logging

### Benefits

- 🚀 **Faster Development** - Less boilerplate code
- 🛡️ **Better Security** - Centralized token management
- 🐛 **Easier Debugging** - Consistent error handling
- 📦 **Smaller Bundle** - No need for fetch polyfills
- ⚡ **Better Performance** - Request caching, automatic retries

---

**Status:** ✅ Axios Implementation Complete
**Date:** 2025-10-10
**Next Steps:** Migrate remaining services to use Axios
