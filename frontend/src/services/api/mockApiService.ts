// src/services/api/mockApiService.ts

import { v4 as uuidv4 } from 'uuid';
import {
  ApiService,
  Payload,
  FeedbackPayload,
  FeedbackResponse,
  SaveDesignPayload,
  SaveDesignResponse,
  StartGenerationResponse,
  JobStatusResponse,
  dImage,
  DesignParameters // 確保導入 DesignParameters
} from './types';
import { MockDesignData, MockFeedbackResponse } from '@/utils/mockData'; // VERIFY PATH

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface MockJobState {
  status: 'pending' | 'processing' | 'succeeded' | 'failed';
  images?: dImage[];
  error?: string;
  originalImageId?: string; // reference image id if variation
  parameters?: DesignParameters; // features (使用 DesignParameters 類型)
}

export class MockApiService implements ApiService {
  private jobStore: Map<string, MockJobState> = new Map();

  async startGeneration(payload: Payload): Promise<StartGenerationResponse> {
    console.log('Mock API - Start Generation:', payload);
    await delay(100);
    const jobId = uuidv4();

    // 存儲 Job 狀態，parentId 應該是 undefined
    this.jobStore.set(jobId, {
      status: 'pending',
      originalImageId: undefined, // 初始生成沒有 parent
      parameters: payload.features
    });

    // 模擬後台任務
    this.simulateBackgroundJob(jobId); // 傳 jobId 即可，參數從 jobStore 讀取

    return { job_id: jobId, message: "Generation started" };
  }

  async Variants(payload: { reference_image_id: string; base_parameters?: DesignParameters }): Promise<StartGenerationResponse> {
    console.log('Mock API - Start Variant Generation (using Variants method):', payload);
    await delay(100); // 模擬網絡延遲

    const jobId = uuidv4();
    const parentId = payload.reference_image_id;

    // 從 payload 或預設值獲取基礎參數
    const parametersForVariant = payload.base_parameters ?? { style: 'gaming', color: 'random', lighting: Math.random() > 0.5, description: `Variant of ${parentId.substring(0,6)}` };

    // 存儲 Job 狀態，這次要設置 originalImageId
    this.jobStore.set(jobId, {
      status: 'pending',
      originalImageId: parentId, // 關鍵：設置父 ID
      parameters: parametersForVariant
    });

    // 調用相同的模擬邏輯，它會從 jobStore 讀取狀態
    this.simulateBackgroundJob(jobId);

    // 返回新的 Job ID
    return { job_id: jobId, message: "Variant generation started" };
  }


  async checkJobStatus(jobId: string): Promise<JobStatusResponse> {
    await delay(150);
    const jobState = this.jobStore.get(jobId);
    console.log(`[MockAPI] checkJobStatus for ${jobId}:`, jobState);

    if (!jobState) {
      return { job_id: jobId, status: 'failed', error: 'Job not found' };
    }
    return {
      job_id: jobId,
      status: jobState.status,
      images: jobState.images, // 返回存儲的圖片
      error: jobState.error
    };
  }

  // 修改 simulateBackgroundJob 使其只接收 jobId，從 jobStore 讀取所需信息
  private simulateBackgroundJob(jobId: string) {
    const jobInfo = this.jobStore.get(jobId);
    if (!jobInfo) {
      console.error(`[MockAPI] Cannot simulate job, job ${jobId} not found in store.`);
      return;
    }

    // 模擬 pending -> processing
    setTimeout(() => {
      const currentJobInfo = this.jobStore.get(jobId);
      // 確保任務還在 store 中且狀態是 pending
      if (currentJobInfo && currentJobInfo.status === 'pending') {
        console.log(`[MockAPI] Job ${jobId} changing status to processing.`);
        currentJobInfo.status = 'processing';
        this.jobStore.set(jobId, currentJobInfo); // 更新狀態
      }
    }, 200); // 短暫延遲後進入 processing

    // 模擬 processing -> succeeded/failed
    const processingTime = 1500 + Math.random() * 1000; // 模擬不同的處理時間
    setTimeout(() => {
      const currentJobInfo = this.jobStore.get(jobId);
       // 確保任務還在 store 中且狀態是 processing
      if (currentJobInfo && currentJobInfo.status === 'processing') {
        const shouldSucceed = true
        // const shouldSucceed = false; // 模擬失敗

        if (shouldSucceed) {
          currentJobInfo.status = 'succeeded';
          const isVariation = !!currentJobInfo.originalImageId;

          // 使用 mockData 中的工具生成數據
          const mockResult = MockDesignData(
            2, // 每次生成 2 張圖
            currentJobInfo.parameters, // 使用存儲的參數
            currentJobInfo.originalImageId // 傳遞 parentId (如果存在)
          );

          // 將 job_id 添加回圖片數據中
          currentJobInfo.images = mockResult.images.map(img => ({ ...img, job_id: jobId }));
          console.log(`[MockAPI] Job ${jobId} succeeded. Images:`, currentJobInfo.images);
        } else {
          currentJobInfo.status = 'failed';
          currentJobInfo.error = 'Simulated processing error';
          console.log(`[MockAPI] Job ${jobId} failed.`);
        }
        this.jobStore.set(jobId, currentJobInfo); // 更新最終狀態
      }
    }, 200 + processingTime); // processing 狀態持續時間
  }

  async submitFeedback(payload: FeedbackPayload): Promise<FeedbackResponse> {
    console.log('Mock API - Submit Feedback:', payload);
    await delay(500);
    return MockFeedbackResponse();
  }

  async saveDesign(payload: SaveDesignPayload): Promise<SaveDesignResponse> {
    console.log('Mock API - Save Design:', payload);
    await delay(500);
    return {
      status: 'success',
      message: 'Design saved successfully'
    };
  }
}