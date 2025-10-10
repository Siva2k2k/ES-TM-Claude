/**
 * Backend API Service for Frontend Integration
 * Provides a simple interface for making API calls to the backend
 * Now uses Axios with interceptors for better error handling and request/response transformation
 */

import axiosInstance, { handleApiError } from '../config/axios.config';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';

class BackendAPI {
  /**
   * Generic GET request
   */
  async get<T>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await axiosInstance.get(endpoint, config);
      return response.data;
    } catch (error) {
      const { error: errorMessage } = handleApiError(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Generic POST request
   */
  async post<T>(
    endpoint: string,
    data?: Record<string, unknown>,
    config?: AxiosRequestConfig
  ): Promise<T> {
    try {
      const response: AxiosResponse<T> = await axiosInstance.post(endpoint, data, config);
      return response.data;
    } catch (error) {
      const { error: errorMessage } = handleApiError(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Generic PUT request
   */
  async put<T>(
    endpoint: string,
    data?: Record<string, unknown>,
    config?: AxiosRequestConfig
  ): Promise<T> {
    try {
      const response: AxiosResponse<T> = await axiosInstance.put(endpoint, data, config);
      return response.data;
    } catch (error) {
      const { error: errorMessage } = handleApiError(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Generic PATCH request
   */
  async patch<T>(
    endpoint: string,
    data?: Record<string, unknown>,
    config?: AxiosRequestConfig
  ): Promise<T> {
    try {
      const response: AxiosResponse<T> = await axiosInstance.patch(endpoint, data, config);
      return response.data;
    } catch (error) {
      const { error: errorMessage } = handleApiError(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Generic DELETE request
   */
  async delete<T>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await axiosInstance.delete(endpoint, config);
      return response.data;
    } catch (error) {
      const { error: errorMessage } = handleApiError(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Upload file(s) with multipart/form-data
   */
  async upload<T>(
    endpoint: string,
    formData: FormData,
    onUploadProgress?: (progressEvent: any) => void
  ): Promise<T> {
    try {
      const response: AxiosResponse<T> = await axiosInstance.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress,
      });
      return response.data;
    } catch (error) {
      const { error: errorMessage } = handleApiError(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Download file
   */
  async download(endpoint: string, filename: string): Promise<void> {
    try {
      const response = await axiosInstance.get(endpoint, {
        responseType: 'blob',
      });

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      const { error: errorMessage } = handleApiError(error);
      throw new Error(errorMessage);
    }
  }
}

export const backendApi = new BackendAPI();