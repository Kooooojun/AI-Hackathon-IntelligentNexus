
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { Button } from "../ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../ui/tooltip";
import { useState } from "react";

interface GeneratedImage {
  url: string;
  id: string;
}

interface DesignResultsProps {
  isLoading: boolean;
  images: GeneratedImage[];
  onFeedback: (imageId: string, isPositive: boolean) => void;
}

interface FeedbackState {
  [key: string]: boolean;
}

export function DesignResults({ isLoading, images, onFeedback }: DesignResultsProps) {
  const [feedbackGiven, setFeedbackGiven] = useState<FeedbackState>({});

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="animate-pulse text-primary">生成中...</div>
      </div>
    );
  }

  const handleFeedback = (imageId: string, isPositive: boolean) => {
    setFeedbackGiven(prev => ({
      ...prev,
      [imageId]: true
    }));
    onFeedback(imageId, isPositive);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">🖼️ AI 生成結果</h2>
      
      {images.length === 0 ? (
        <div className="text-muted-foreground text-center py-12">
          點擊左側按鈕開始生成您的設計概念...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {images.map((image) => (
            <div key={image.id} className="space-y-2">
              <img
                src={image.url}
                alt="Generated design"
                className="w-full rounded-lg object-cover aspect-square"
              />
              <div className="flex justify-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleFeedback(image.id, true)}
                      disabled={feedbackGiven[image.id]}
                      className="hover:bg-primary/20"
                    >
                      <ThumbsUp className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>喜歡這個設計</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleFeedback(image.id, false)}
                      disabled={feedbackGiven[image.id]}
                      className="hover:bg-destructive/20"
                    >
                      <ThumbsDown className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>不太滿意</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}