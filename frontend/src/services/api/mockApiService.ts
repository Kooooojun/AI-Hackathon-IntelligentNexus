
import { 
  ApiService, 
  GeneratePayload, 
  GenerationResult, 
  FeedbackPayload, 
  FeedbackResponse,
  SaveDesignPayload,
  SaveDesignResponse
} from './types';
import { generateMockDesignData, generateMockFeedbackResponse } from '@/utils/mockData';

// Simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class MockApiService implements ApiService {
  async generateDesigns(payload: GeneratePayload): Promise<GenerationResult> {
    console.log('Mock API - Generate Designs:', payload);
    
    // Simulate API delay
    await delay(1500);
    
    // Generate mock data (2 images by default)
    const mockData = generateMockDesignData(2);
    
    // If there's a reference image, we could do something special here
    // For now we'll just add it to our console log
    if (payload.reference_image_id) {
      console.log('Mock API - Generating based on reference image:', payload.reference_image_id);
    }
    
    return mockData;
  }
  
  async submitFeedback(payload: FeedbackPayload): Promise<FeedbackResponse> {
    console.log('Mock API - Submit Feedback:', payload);
    
    // Simulate API delay
    await delay(500);
    
    return generateMockFeedbackResponse();
  }
  
  async saveDesign(payload: SaveDesignPayload): Promise<SaveDesignResponse> {
    console.log('Mock API - Save Design:', payload);
    
    // Simulate API delay
    await delay(500);
    
    return {
      status: 'success',
      message: 'Design saved successfully'
    };
  }
}
