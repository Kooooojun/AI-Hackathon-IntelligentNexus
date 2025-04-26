
import { v4 as uuidv4 } from 'uuid';
import { GenerationResult, FeedbackResponse } from '@/services/api/types';

// Mock image URLs (placeholders)
const placeholderImages = [
  "https://images.unsplash.com/photo-1649972904349-6e44c42644a7",
  "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b",
  "https://images.unsplash.com/photo-1518770660439-4636190af475",
  "https://images.unsplash.com/photo-1461749280684-dccba630e2f6",
  "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158"
];

export const generateMockDesignData = (count: number = 2): GenerationResult => {
  const generation_id = uuidv4();
  
  const styles = ["gaming", "minimalist", "highairflow", "futuristic"];
  const colors = ["black", "white", "silver", "gray"];
  const descriptions = [
    "Modern gaming PC case with RGB accents",
    "Minimalist design with clean lines",
    "High airflow focused case with mesh panels",
    "Futuristic design with unique geometry"
  ];
  
  return {
    generation_id,
    images: Array.from({ length: count }).map((_, index) => ({
      id: `${generation_id}-${index}`,
      url: placeholderImages[index % placeholderImages.length],
      parameters: {
        style: styles[index % styles.length],
        color: colors[index % colors.length],
        lighting: index % 2 === 0,
        description: descriptions[index % descriptions.length]
      }
    }))
  };
};

export const generateMockFeedbackResponse = (): FeedbackResponse => ({
  status: 'success',
  message: 'Feedback recorded successfully'
});

export const generateMockSaveResponse = () => ({
  status: 'success',
  message: 'Design saved successfully'
});
