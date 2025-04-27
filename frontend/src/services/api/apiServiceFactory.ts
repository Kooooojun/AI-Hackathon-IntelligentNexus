// apiServiceFactory.ts
import { ApiService } from './types';
// import { MockApiService } from './mockApiService';
import { RealApiService } from './realApiService';

// Environment-based API service selection flase/true 
const useMockApi = import.meta.env.VITE_USE_MOCK_API === 'False' || import.meta.env.MODE === 'development';

// API URL can be overridden by environment variables
const apiUrl =  'http://127.0.0.1:8000/api';//import.meta.env.VITE_API_URL ||

export const getApiService = (): ApiService => {
  if (useMockApi) {
    console.log('Using real API service with URL:', apiUrl);
    return new RealApiService(apiUrl); // ✅ 無需參數，內部已寫死 base URL
    // console.log('Using mock API service');
    // // return new MockApiService();
    // throw new Error("Mock API disabled. Uncomment if needed.");
  } else {
    
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
