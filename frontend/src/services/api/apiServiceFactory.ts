
import { ApiService } from './types';
import { MockApiService } from './mockApiService';
import { RealApiService } from './realApiService';

// Environment-based API service selection
const useMockApi = import.meta.env.VITE_USE_MOCK_API === 'true' || import.meta.env.MODE === 'development';

// API URL can be overridden by environment variables
const apiUrl = import.meta.env.VITE_API_URL || 'https://api.example.com';

export const getApiService = (): ApiService => {
  if (useMockApi) {
    console.log('Using mock API service');
    return new MockApiService();
  } else {
    console.log('Using real API service with URL:', apiUrl);
    return new RealApiService(apiUrl);
  }
};

// Singleton instance
let apiServiceInstance: ApiService | null = null;

export const useApiService = (): ApiService => {
  if (!apiServiceInstance) {
    apiServiceInstance = getApiService();
  }
  return apiServiceInstance;
};
