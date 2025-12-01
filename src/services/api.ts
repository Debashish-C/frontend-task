import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Use different API URLs for web vs mobile
const API_URL = Platform.OS === 'web'
  ? (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8001')
  : (process.env.EXPO_PUBLIC_API_URL || 'http://192.168.232.7:8001');

class ApiService {
  private getToken = async (): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return localStorage.getItem('auth_token');
    } else {
      return await SecureStore.getItemAsync('auth_token');
    }
  };

  private setToken = async (token: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.setItem('auth_token', token);
    } else {
      await SecureStore.setItemAsync('auth_token', token);
    }
  };

  private removeToken = async (): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.removeItem('auth_token');
    } else {
      await SecureStore.deleteItemAsync('auth_token');
    }
  };

  private getHeaders = async (additionalHeaders: Record<string, string> = {}) => {
    const token = await this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...additionalHeaders,
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  };

  private async request(
    method: string,
    endpoint: string,
    body?: Record<string, any>
  ) {
    const url = `${API_URL}${endpoint}`;
    console.log(`🌐 API Request: ${method} ${url}`);

    try {
      const headers = await this.getHeaders();
      const options: RequestInit = {
        method,
        headers,
      };

      if (body) {
        options.body = JSON.stringify(body);
        console.log('📤 Request Body:', JSON.stringify(body, null, 2));
      }

      console.log('⏳ Making request...');
      const response = await fetch(url, options);
      console.log(`📥 Response Status: ${response.status}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ API Error:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        throw new Error(
          errorData.message ||
          errorData.detail ||
          `HTTP Error: ${response.status}`
        );
      }

      const data = await response.json();
      console.log('✅ API Success:', data);
      return data;
    } catch (error: any) {
      console.error('💥 Network Error:', {
        url,
        method,
        message: error.message,
        stack: error.stack
      });
      throw new Error(error.message || 'Network connection lost');
    }
  }

  // Auth endpoints
  async signUp(email: string, password: string, name: string) {
    return this.request('POST', '/auth/register', {
      email,
      password,
      name,
    });
  }

  async signIn(email: string, password: string) {
    const data = await this.request('POST', '/auth/login', {
      email,
      password,
    });

    if (data.access_token) {
      await this.setToken(data.access_token);
    }
    return data;
  }

  // User endpoints
  async getUser() {
    return this.request('GET', '/users/me');
  }

  async updateUser(userData: Record<string, any>) {
    return this.request('PUT', '/users/me', userData);
  }

  async logout() {
    await this.removeToken();
    return { success: true };
  }
}

export const apiService = new ApiService();
