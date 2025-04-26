import { useState } from "react";
import { Save, RefreshCcw, Edit, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "../ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../ui/tooltip";
import { Card, CardContent } from "../ui/card";
import { ScrollArea } from "../ui/scroll-area";

interface GeneratedImage {
  url: string;
  id: string;
}

interface DesignCanvasProps {
  isLoading: boolean;
  images: GeneratedImage[];
  onFeedback: (imageId: string, isPositive: boolean) => void;
  onSave: (imageId: string) => void;
  onRefine: (imageId: string) => void;
  onModify: (imageId: string) => void;
}

interface FeedbackState {
  [key: string]: boolean;
}

export function DesignCanvas({ 
  isLoading, 
  images, 
  onFeedback, 
  onSave,
  onRefine,
  onModify
}: DesignCanvasProps) {
  const [feedbackGiven, setFeedbackGiven] = useState<FeedbackState>({});
  const [savedImages, setSavedImages] = useState<string[]>([]);

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

  const handleSave = (imageId: string) => {
    setSavedImages(prev => [...prev, imageId]);
    onSave(imageId);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">🖼️ AI 生成結果</h2>
      
      {images.length === 0 ? (
        <div className="text-muted-foreground text-center py-12">
          點擊左側按鈕開始生成您的設計概念...
        </div>
      ) : (
        <ScrollArea className="h-[calc(100vh-250px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8">
            {images.map((image) => (
              <Card key={image.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <img
                    src={image.url}
                    alt="Generated design"
                    className="w-full object-cover aspect-square"
                  />
                  <div className="flex justify-between items-center p-3 bg-background/80 backdrop-blur-sm">
                    <div className="flex gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleFeedback(image.id, true)}
                            disabled={feedbackGiven[image.id]}
                            className="h-8 w-8 hover:bg-primary/20"
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
                            className="h-8 w-8 hover:bg-destructive/20"
                          >
                            <ThumbsDown className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>不太滿意</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    <div className="flex gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleSave(image.id)}
                            disabled={savedImages.includes(image.id)}
                            className={`h-8 w-8 ${savedImages.includes(image.id) ? 'text-primary' : ''}`}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>收藏此設計</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onRefine(image.id)}
                            className="h-8 w-8"
                          >
                            <RefreshCcw className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>生成變體</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onModify(image.id)}
                            className="h-8 w-8"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>修改並重新生成</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}