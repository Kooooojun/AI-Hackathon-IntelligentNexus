
export interface GeneratePayload {
  description: string;
  features: {
    style: string;
    color: string;
    lighting: boolean;
  };
  base64_image?: string;
  reference_image_id?: string;
}

// Response when starting the generation job
export interface StartGenerationResponse {
  job_id: string; // Or request_id, task_id, etc.
  message?: string; // e.g., "Generation started"
}

// Response when checking the job status
export interface JobStatusResponse {
  job_id: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed';
  images?: GeneratedImage[]; // Only present when status is 'succeeded'
  error?: string;           // Only present when status is 'failed'
  // You might include generation_id here if needed for feedback
  generation_id?: string;
}

export interface DesignParameters {
  style: string;
  color: string;
  lighting: boolean;
  description: string;
}

export interface GeneratedImage {
  id: string;
  url: string;
  job_id?: string; // Important for reliable feedback/actions
  parameters?: DesignParameters; // Important for modify/refine context
  parentId?: string; // Provided by mockData, ensure API also provides if possible
  // Add any other relevant fields from your API or mock data
}


export interface GenerationResult {
  generation_id: string;
  images: GeneratedImage[];
}

export interface FeedbackPayload {
  generation_id: string;
  image_id: string;
  rating: 'up' | 'down';
}

export interface FeedbackResponse {
  status: string;
  message: string;
}

export interface SaveDesignPayload {
  image_id: string;
  name?: string;
}

export interface SaveDesignResponse {
  status: string;
  message: string;
}

export interface ApiService {
  startGeneration(payload: GeneratePayload): Promise<StartGenerationResponse>;
  checkJobStatus(jobId: string): Promise<JobStatusResponse>;
  generateVariants(payload: { reference_image_id: string; base_parameters?: DesignParameters }): Promise<StartGenerationResponse>;
  submitFeedback(payload: FeedbackPayload): Promise<FeedbackResponse>;
  saveDesign(payload: SaveDesignPayload): Promise<SaveDesignResponse>;
}