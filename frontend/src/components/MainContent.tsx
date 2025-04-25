import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { DesignResults } from "./design/DesignResults";

interface GeneratedImage {
  url: string;
  id: string;
}

export function MainContent() {
  const [isLoading, setIsLoading] = useState(false);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const handleDesignGenerated = (event: CustomEvent<{ images: GeneratedImage[] }>) => {
      setIsLoading(false);
      setImages(event.detail.images);
    };

    window.addEventListener("designGenerated" as any, handleDesignGenerated);

    return () => {
      window.removeEventListener("designGenerated" as any, handleDesignGenerated);
    };
  }, []);

  const handleFeedback = async (imageId: string, isPositive: boolean) => {
    // We'll implement feedback handling later
    toast({
      title: isPositive ? "感謝您的喜歡！" : "感謝您的回饋！",
      description: "您的意見將幫助我們改進設計生成系統。",
    });
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
          <DesignResults
            isLoading={isLoading}
            images={images}
            onFeedback={handleFeedback}
          />
        </div>
      </div>
    </main>
  );
}
