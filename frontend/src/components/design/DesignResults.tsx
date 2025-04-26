// src/components/design/DesignResults.tsx
import { ThumbsDown, ThumbsUp, WandSparkles, Pencil, Save } from "lucide-react"; // Added icons
import { Button } from "@/components/ui/button"; // Corrected path assuming ui components are in @/components/ui
import {
  Tooltip,
  TooltipContent,
  TooltipProvider, // Recommended for tooltips
  TooltipTrigger,
} from "@/components/ui/tooltip"; // Corrected path
import { useState } from "react";
import { GeneratedImage } from '@/services/api/types'; // Assuming type path

interface DesignResultsProps {
  isLoading?: boolean;
  images: GeneratedImage[];
  onFeedback: (imageId: string, isPositive: boolean) => void;
  onSave: (imageId: string) => void;
  onRefine: (imageId: string) => void; // "生成變體" action
  onModify: (imageId: string) => void; // "以此修改" action
}

interface FeedbackState {
  [key: string]: boolean;
}

export function DesignResults({
  isLoading = false, // Default to false
  images,
  onFeedback,
  onSave,
  onRefine,
  onModify
}: DesignResultsProps) {

  const [feedbackGiven, setFeedbackGiven] = useState<FeedbackState>({});

  // This local loading might be shown briefly while images load for this specific group
  if (isLoading && images.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px]"> {/* Reduced height */}
        <div className="animate-pulse text-primary">載入中...</div>
      </div>
    );
  }

  // Handle case where images array is empty but not loading (e.g., initial state)
  if (images.length === 0) {
     // Avoid showing this if it's meant for variants and the parent hasn't generated any yet
    return null; // Or a more specific placeholder if needed within context
  }

  const handleFeedback = (imageId: string, isPositive: boolean) => {
    setFeedbackGiven(prev => ({
      ...prev,
      [imageId]: true
    }));
    onFeedback(imageId, isPositive);
  };

  return (
    // Use TooltipProvider at a higher level if possible, else wrap here
    <TooltipProvider delayDuration={100}>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4"> {/* Responsive grid */}
        {images.map((image) => (
          <div key={image.id} className="group relative overflow-hidden rounded-lg border shadow-sm transition-shadow hover:shadow-md">
             {/* Image */}
            <img
              src={image.url}
              alt={`Generated design ${image.id.substring(0, 6)}`}
              className="w-full h-auto object-cover aspect-square transition-transform duration-300 ease-in-out group-hover:scale-105"
              loading="lazy" // Add lazy loading for potentially many images
            />

             {/* Overlay for Actions - Appears on Hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center p-2">
              <div className="flex justify-center items-center gap-1.5 bg-card/80 backdrop-blur-sm p-1.5 rounded-md">
                {/* Feedback Buttons */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost" // Use ghost for overlay actions
                      size="icon-sm" // Smaller icon button size
                      onClick={() => handleFeedback(image.id, true)}
                      disabled={feedbackGiven[image.id]}
                      className="text-white hover:bg-primary/30 hover:text-primary-foreground disabled:opacity-50"
                    >
                      <ThumbsUp className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>喜歡這個設計</p></TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleFeedback(image.id, false)}
                      disabled={feedbackGiven[image.id]}
                      className="text-white hover:bg-destructive/30 hover:text-destructive-foreground disabled:opacity-50"
                    >
                      <ThumbsDown className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>不太滿意</p></TooltipContent>
                </Tooltip>

                {/* Action Buttons */}
                {/* Conditionally show Refine only for initial results? Or always allow? */}
                {/* Assuming Refine is primarily for initial images based on description */}
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon-sm" onClick={() => onRefine(image.id)} className="text-white hover:bg-blue-500/30 hover:text-white">
                      <WandSparkles className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>生成變體</p></TooltipContent>
                </Tooltip>


                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon-sm" onClick={() => onModify(image.id)} className="text-white hover:bg-green-500/30 hover:text-white">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>以此參數修改</p></TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon-sm" onClick={() => onSave(image.id)} className="text-white hover:bg-yellow-500/30 hover:text-white">
                      <Save className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>儲存設計</p></TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
}

// Add this to your globals.css or equivalent if you don't have it
/*
.size-icon-sm {
  @apply h-7 w-7; // Adjust size as needed
}
*/