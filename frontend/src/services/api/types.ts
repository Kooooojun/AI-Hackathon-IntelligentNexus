
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

export interface DesignParameters {
  style: string;
  color: string;
  lighting: boolean;
  description: string;
}

export interface GeneratedImage {
  id: string;
  url: string;
  parameters: DesignParameters;
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
  generateDesigns(payload: GeneratePayload): Promise<GenerationResult>;
  submitFeedback(payload: FeedbackPayload): Promise<FeedbackResponse>;
  saveDesign(payload: SaveDesignPayload): Promise<SaveDesignResponse>;
}
