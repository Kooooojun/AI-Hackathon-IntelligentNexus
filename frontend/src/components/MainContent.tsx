import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { DesignCanvas } from "./design/DesignCanvas";
import { useApiService } from '@/services/api/apiServiceFactory';
import { FeedbackPayload, SaveDesignPayload } from '@/services/api/types';

interface GeneratedImage {
  url: string;
  id: string;
}

export function MainContent() {
  const [isLoading, setIsLoading] = useState(false);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [currentGenerationId, setCurrentGenerationId] = useState<string | null>(null);
  const { toast } = useToast();
  const apiService = useApiService();

  useEffect(() => {
    const handleDesignGenerating = () => {
      setIsLoading(true);
    };
    
    const handleDesignGenerated = (event: CustomEvent<{ 
      images: GeneratedImage[],
      generation_metadata: { generation_id: string }
    }>) => {
      setIsLoading(false);
      setImages(event.detail.images);
      setCurrentGenerationId(event.detail.generation_metadata.generation_id);
    };

    window.addEventListener("designGenerating" as any, handleDesignGenerating);
    window.addEventListener("designGenerated" as any, handleDesignGenerated);

    return () => {
      window.removeEventListener("designGenerating" as any, handleDesignGenerating);
      window.removeEventListener("designGenerated" as any, handleDesignGenerated);
    };
  }, []);

  const handleFeedback = async (imageId: string, isPositive: boolean) => {
    if (!currentGenerationId) {
      console.error("No current generation ID available for feedback");
      return;
    }

    const feedbackPayload: FeedbackPayload = {
      generation_id: currentGenerationId,
      image_id: imageId,
      rating: isPositive ? 'up' : 'down'
    };

    try {
      await apiService.submitFeedback(feedbackPayload);
      
      toast({
        title: isPositive ? "感謝您的喜歡！" : "感謝您的回饋！",
        description: "您的意見將幫助我們改進設計生成系統。",
      });
    } catch (error) {
      console.error("Feedback submission error:", error);
      toast({
        title: "回饋提交失敗",
        description: "請稍後再試。",
        variant: "destructive",
      });
    }
  };

  const handleSave = async (imageId: string) => {
    const savePayload: SaveDesignPayload = {
      image_id: imageId
    };
    
    try {
      await apiService.saveDesign(savePayload);
      
      toast({
        title: "已收藏此設計",
        description: "設計已成功加入收藏夾。",
      });
    } catch (error) {
      console.error("Save design error:", error);
      toast({
        title: "收藏失敗",
        description: "請稍後再試。",
        variant: "destructive",
      });
    }
  };

  const handleRefine = (imageId: string) => {
    const imageUrl = images.find(img => img.id === imageId)?.url;
    
    toast({
      title: "開始生成變體",
      description: "系統將基於此設計生成變體設計。",
    });
    
    console.log('Generating variations for:', { imageId, imageUrl });
    // Dispatch event for sidebar to get image and parameters
    window.dispatchEvent(new CustomEvent("refineDesign", {
      detail: { imageId, imageUrl }
    }));
  };

  const handleModify = (imageId: string) => {
    const selectedImage = images.find(img => img.id === imageId);
    if (!selectedImage) return;

    const designParameters = (selectedImage as any).parameters;
    
    toast({
      title: "修改設計參數",
      description: "請在左側調整參數後重新生成。",
    });
    
    console.log('Modifying design:', { imageId, imageUrl: selectedImage.url, parameters: designParameters });
    
    window.dispatchEvent(new CustomEvent("modifyDesign", {
      detail: { 
        imageId, 
        imageUrl: selectedImage.url,
        parameters: designParameters
      }
    }));
  };

  return (
    <main className="flex-1 p-6">
      <div className="glass-panel rounded-lg p-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Cooler Master AI Designer
        </h1>
        <p className="mt-4 text-muted-foreground">
          Welcome to your AI-powered design assistant. Start by selecting options from the sidebar.
        </p>
        <div className="mt-8">
          <DesignCanvas
            isLoading={isLoading}
            images={images}
            onFeedback={handleFeedback}
            onSave={handleSave}
            onRefine={handleRefine}
            onModify={handleModify}
          />
        </div>
      </div>
    </main>
  );
}
