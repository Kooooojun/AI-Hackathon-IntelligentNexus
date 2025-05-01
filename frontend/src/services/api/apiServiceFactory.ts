// apiServiceFactory.ts
import { ApiService } from './types';
import { MockApiService } from './mockApiService'; // 取消註解
import { RealApiService } from './realApiService';

//使用Real API 時改成false
const useMockApi = "false"


// 真實 API 的 URL 
const apiUrl = 'http://127.0.0.1:8000';

export const getApiService = (): ApiService => {
  if (useMockApi) {
    console.log('Using mock API service');
    return new MockApiService(); // 返回 Mock 服務實例
  } else {
    console.log('Using real API service with URL:', apiUrl);
    return new RealApiService(apiUrl); // 返回真實服務實例，並傳入 API URL
  }
};

// Singleton instance (保持不變)
let apiServiceInstance: ApiService | null = null;

export const useApiService = (): ApiService => {
  if (!apiServiceInstance) {
    apiServiceInstance = getApiService();
  }
  return apiServiceInstance;
};