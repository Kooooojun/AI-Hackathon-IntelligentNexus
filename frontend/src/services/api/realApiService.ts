import {
  ApiService,
  GeneratePayload,
  StartGenerationResponse,
  JobStatusResponse,
  FeedbackPayload,
  FeedbackResponse,
  SaveDesignPayload,
  SaveDesignResponse,
  DesignParameters
} from './types';

const API_BASE = "http://127.0.0.1:8000/api"; // Flask API 的 URL，根據實際情況修改

export class RealApiService implements ApiService {
  private baseUrl: string;

  constructor(baseUrl = API_BASE) {
    this.baseUrl = baseUrl;
  }
  
   /* ---------- 產圖 ---------- */
  async startGeneration(payload: GeneratePayload): Promise<StartGenerationResponse> {
    const formData = new FormData();
    formData.append("style", payload.features.style);
    formData.append("lighting", payload.features.lighting ? "on" : "off");
    formData.append("colors", payload.features.color);
    formData.append("description", payload.description);

    // ✔️ 只有一個 /，而且帶上 generate
    const response = await fetch(`${this.baseUrl}/generate`, {
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
    const response = await fetch(`${this.baseUrl}/generate/${jobId}`);
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

  async generateVariants(payload: { reference_image_id: string; base_parameters?: DesignParameters }): Promise<StartGenerationResponse> {
    // ❗你的後端還沒有這個 endpoint，這裡暫時用 startGeneration 模擬或回傳錯誤
    throw new Error("Not implemented: /generateVariants");
  }

  async submitFeedback(payload: FeedbackPayload): Promise<FeedbackResponse> {
    // ❗尚未定義對應後端 API
    return {
      status: "success",
      message: "Feedback received (stub)"
    };
  }

  async saveDesign(payload: SaveDesignPayload): Promise<SaveDesignResponse> {
    // ❗尚未定義對應後端 API
    return {
      status: "success",
      message: "Design saved (stub)"
    };
  }
}
