import {
  ApiService,
  Payload,
  StartGenerationResponse,
  JobStatusResponse,
  FeedbackPayload,
  FeedbackResponse,
  SaveDesignPayload,
  SaveDesignResponse,
  DesignParameters
} from './types';

const API_BASE = "http://127.0.0.1:8000"; // Flask API 的 URL，根據實際情況修改
// const API_BASE = "http://ec2-35-94-193-98.us-west-2.compute.amazonaws.com/api";


const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class RealApiService implements ApiService {
  private baseUrl: string;

  constructor(baseUrl = API_BASE) {
    this.baseUrl = baseUrl;
  }
  
   /* ---------- 產圖 ---------- */
  async startGeneration(payload: Payload): Promise<StartGenerationResponse> {
    const formData = new FormData();
    formData.append("style", payload.features.style);
    formData.append("lighting", payload.features.lighting ? "on" : "off");
    formData.append("colors", payload.features.color);
    formData.append("description", payload.description);

    // ✔️ 只有一個 /，而且帶上 
    const response = await fetch(`${this.baseUrl}/`, {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to start generation: ${text}`);
    }

    const data = await response.json();
    return {
      job_id: data.request_id,
      message: data.message ?? "Generation started"
    };
  }

  /* ---------- 查狀態 ---------- */
  async checkJobStatus(jobId: string): Promise<JobStatusResponse> {
    const response = await fetch(`${this.baseUrl}//${jobId}`);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to fetch job status: ${text}`);
    }

    const data = await response.json();

    // 根據你的後端設計來包裝成前端需要的格式
    if (data.status === "succeeded") {
      return {
        job_id: jobId,
        status: data.status,
        images: [
          {
            id: jobId + "-0",
            url: data.image_url,
            job_id: jobId,
            parameters: undefined,
            parentId: undefined
          }
        ]
      };
    }

    return {
      job_id: jobId,
      status: data.status,
      error: data.error
    };
  }

  async Variants(payload: { reference_image_id: string; base_parameters?: DesignParameters }): Promise<StartGenerationResponse> {
    // ❗你的後端還沒有這個 endpoint，這裡暫時用 startGeneration 模擬或回傳錯誤
    throw new Error("Not implemented: /Variants");
  }

  async submitFeedback(payload: FeedbackPayload): Promise<FeedbackResponse> {
    // 1) 把 rating 轉成後端要的整數
    //    up → 1, down → -1，或依你想要的 1~5 映射
    const ratingValue = payload.rating === 'up' ? 1 : -1;
  
    const response = await fetch(`${this.baseUrl}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        generation_id: payload.generation_id,
        image_id: payload.image_id,
        rating: ratingValue,
        // comment 之後要加也放這
      }),
    });
  
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to submit feedback: ${text}`);
    }
  
    // 後端回 {"status":"stored"}
    return await response.json();  // 型別剛好是 FeedbackResponse
  }

  async saveDesign(payload: SaveDesignPayload): Promise<SaveDesignResponse> {
    // ❗尚未定義對應後端 API
    return {
      status: "success",
      message: "Design saved (stub)"
    };
  }
}
