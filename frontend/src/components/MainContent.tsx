// src/components/MainContent.tsx
import React, { useState, useEffect, useRef, useCallback } from "react"; // Import React
import { useToast } from "@/hooks/use-toast"; // VERIFY PATH
import { DesignHierarchyDisplay } from "./design/DesignHierarchyDisplay"; // VERIFY PATH & NAME
import { useApiService } from '@/services/api/apiServiceFactory'; // VERIFY PATH
import { FeedbackPayload, SaveDesignPayload, GeneratedImage, DesignParameters, ApiService, StartGenerationResponse, JobStatusResponse, FeedbackResponse, SaveDesignResponse } from '@/services/api/types'; // VERIFY PATH & Types

// Imports for the new UI Shell
import { ArrowRight, Layers, GitBranch, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "./ui/button"; // VERIFY PATH
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible"; // VERIFY PATH

export function MainContent() {
  // --- State ---
  const [isLoading, setIsLoading] = useState(false); // Global loading/polling indicator
  const [initialImages, setInitialImages] = useState<GeneratedImage[]>([]);
  const [variantMap, setVariantMap] = useState<Map<string, GeneratedImage[]>>(new Map()); // parentId -> children[]
  const [pollingJobId, setPollingJobId] = useState<string | null>(null); // Track current polling job
  const [isOpen, setIsOpen] = useState(true); // State for collapsible hero (default open)

  const [feedbackGivenMap, setFeedbackGivenMap] = useState<Record<string, boolean>>({});
  const [savedImageMap, setSavedImageMap] = useState<Record<string, boolean>>({});

  // --- Refs and Hooks ---
  const pollingIntervalRef = useRef<number | null>(null);
  const { toast } = useToast();
  const apiService = useApiService(); // Get API service instance

  // --- Polling Logic (Memoized with useCallback) ---
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      console.log(`Polling stopped.`);
    }
  }, []);

  const startPolling = useCallback((jobId: string, parentId?: string | null) => {
    stopPolling();
    console.log(`DEBUG: startPolling called. Job ID: ${jobId}, Parent ID: ${parentId}`);
    setPollingJobId(jobId);
    setIsLoading(true);
    console.log(`Starting polling interval for Job ID: ${jobId}`);
    pollingIntervalRef.current = window.setInterval(async () => {
      const currentJobId = jobId;
      if (!currentJobId) { stopPolling(); setIsLoading(false); return; }
      try {
        const statusResponse = await apiService.checkJobStatus(currentJobId);
        console.log(`Polling response for ${currentJobId}:`, statusResponse?.status);
        if (statusResponse?.status === 'succeeded' && statusResponse?.images) {
          const eventDetail = { images: statusResponse.images, generation_metadata: { generation_id: currentJobId, parentImageId: parentId } };
          stopPolling();
          console.log(`DEBUG: Dispatching designGenerated event:`, eventDetail);
          window.dispatchEvent(new CustomEvent("designGenerated", { detail: eventDetail }));
        } else if (statusResponse?.status === 'failed') {
          stopPolling(); setIsLoading(false);
          toast({ title: "生成失敗", description: statusResponse.error || "任務處理時發生未知錯誤。", variant: "destructive", });
        } else if (statusResponse?.status === 'processing' || statusResponse?.status === 'pending') {
          if (!isLoading) setIsLoading(true);
        } else {
          const statusVal = statusResponse?.status ?? 'undefined';
          stopPolling(); setIsLoading(false);
          toast({ title: "生成出錯", description: `任務狀態未知或無效 (${statusVal})`, variant: "destructive", });
        }
      } catch (error: any) {
        stopPolling(); setIsLoading(false);
        toast({ title: "輪詢檢查失敗", description: error.message || "無法獲取任務狀態。", variant: "destructive", });
      }
    }, 3000);
  }, [stopPolling, apiService, toast, isLoading]);


  // --- Event Handlers (Memoized) ---
  const handleStartInitialPolling = useCallback((event: CustomEvent<{ job_id: string }>) => {
    console.log('DEBUG: handleStartInitialPolling triggered! Event Detail:', event.detail);
    const { job_id } = event.detail ?? {};
    if (job_id) { startPolling(job_id); }
     else { console.error("handleStartInitialPolling received event without job_id:", event.detail); }
  }, [startPolling]);

  const handleDesignGenerated = useCallback((event: CustomEvent<{
      images: GeneratedImage[],
      generation_metadata: { generation_id: string, parentImageId?: string | null }
    }>) => {
    console.log('DEBUG: handleDesignGenerated CALLED. Event detail:', event.detail);
    if (!event.detail?.images || !event.detail?.generation_metadata) { setIsLoading(false); toast({ title: "處理結果失敗", description: "數據不完整。", variant: "destructive" }); return; }
    const { images, generation_metadata } = event.detail;
    const { generation_id, parentImageId } = generation_metadata;
    const processedImages = images.map(img => ({ ...img, job_id: img.job_id || generation_id }));

    if (parentImageId) {
      console.log(`DEBUG: Updating variantMap for parent ${parentImageId}`);
      setVariantMap(prevMap => {
        const newMap = new Map(prevMap);
        const currentVariants = newMap.get(parentImageId) || [];
        const existingVariantIds = new Set(currentVariants.map(v => v.id));
        const newVariants = processedImages.filter(img => !existingVariantIds.has(img.id));
        if (newVariants.length > 0) { newMap.set(parentImageId, [...currentVariants, ...newVariants]); }
        return newMap;
      });
    } else {
      console.log(`DEBUG: Calling setInitialImages with ${processedImages.length} images.`);
      setInitialImages(prev => {
        const existingIds = new Set(prev.map(img => img.id));
        const newImages = processedImages.filter(img => !existingIds.has(img.id));
        return newImages.length > 0 ? [...prev, ...newImages] : prev;
      });
    }
    console.log('DEBUG: Calling setIsLoading(false) at the end of handleDesignGenerated');
    setIsLoading(false);
  }, [toast]);


  // --- Effect for Listeners ---
  useEffect(() => {
    console.log("MainContent Effect: Setting up event listeners...");
    const startHandler = handleStartInitialPolling as EventListener;
    const generatedHandler = handleDesignGenerated as EventListener;
    window.addEventListener("startPollingJob", startHandler);
    window.addEventListener("designGenerated", generatedHandler);
    return () => {
      console.log("MainContent Effect Cleanup: Removing listeners...");
      window.removeEventListener("startPollingJob", startHandler);
      window.removeEventListener("designGenerated", generatedHandler);
    };
  }, [handleStartInitialPolling, handleDesignGenerated]);

  // --- Effect for Unmount Cleanup ---
  useEffect(() => {
    return () => {
      console.log("MainContent UNMOUNTING - Stopping polling");
      stopPolling();
    };
  }, [stopPolling]);


  // --- Action Handlers (Memoized) ---
  // Recursive helper for findImageDetails
  const findImageRecursive = (imageId: string, currentImages: GeneratedImage[], map: Map<string, GeneratedImage[]>): GeneratedImage | undefined => {
      for (const img of currentImages) {
          if (img.id === imageId) {
              return img;
          }
          const children = map.get(img.id);
          if (children) {
              const foundInChildren = findImageRecursive(imageId, children, map);
              if (foundInChildren) {
                  return foundInChildren;
              }
          }
      }
      return undefined;
  };

  const findImageDetails = useCallback((imageId: string): GeneratedImage | undefined => {
    console.log(`DEBUG: Searching for image ${imageId}...`)
    // Search initial images then recursively search variants
    const found = findImageRecursive(imageId, initialImages, variantMap);
    if (!found) {
        console.warn(`DEBUG: Image ${imageId} not found.`);
    }
    return found;
  }, [initialImages, variantMap]);

  const handleFeedback = useCallback(async (imageId: string, isPositive: boolean) => {
    const image = findImageDetails(imageId); // Use the recursive finder
    const generationIdForFeedback = image?.job_id;
    if (!generationIdForFeedback) { toast({ title: "無法提交回饋", description: "缺少生成任務信息。", variant: "destructive"}); return; }
    console.log(`Submitting feedback for image ${imageId} (Job: ${generationIdForFeedback}) - Positive: ${isPositive}`);
    const feedbackPayload: FeedbackPayload = { generation_id: generationIdForFeedback, image_id: imageId, rating: isPositive ? 'up' : 'down' };
    try {
        await apiService.submitFeedback(feedbackPayload);
        toast({ title: "回饋已提交", description: `圖片 ${imageId.substring(0,6)}... 已標記。` });
    } catch (error: any) { toast({ title: "提交回饋失敗", description: error.message || '無法連接伺服器', variant: "destructive"}); }
  }, [findImageDetails, apiService, toast]);

  const handleSave = useCallback(async (imageId: string) => {
    console.log(`Saving image ${imageId}`);
    const savePayload: SaveDesignPayload = { image_id: imageId };
    try {
        await apiService.saveDesign(savePayload);
        toast({ title: "設計已儲存", description: `圖片 ${imageId.substring(0,6)}... 已儲存。` });
    } catch (error: any) { toast({ title: "儲存失敗", description: error.message || '無法連接伺服器', variant: "destructive"}); }
  }, [apiService, toast]);

  const handleRefine = useCallback(async (imageId: string) => {
    const selectedImage = findImageDetails(imageId); // Use the recursive finder
    if (!selectedImage) { toast({ title: "操作失敗", description: "找不到所選圖片的詳細資訊。", variant: "destructive"}); return; }
    console.log(`Starting variant generation based on image: ${imageId}`);
    toast({ title: "正在啟動變體生成...", description: `基於圖片 ${imageId.substring(0,6)}...` });
    try {
      const response = await apiService.generateVariants({
         reference_image_id: imageId,
         base_parameters: selectedImage.parameters // Pass parameters
      });
      if (response && response.job_id) {
        startPolling(response.job_id, imageId); // Pass parentId!
      } else { toast({ title: "啟動變體生成失敗", description: "未收到有效的任務 ID。", variant: "destructive" }); }
    } catch (error: any) {
        toast({ title: "啟動變體生成失敗", description: error.message || '無法連接伺服器', variant: "destructive" });
        if (!pollingIntervalRef.current) { setIsLoading(false); } // Reset loading if poll didn't start
    }
  }, [findImageDetails, apiService, toast, startPolling]); // Added setIsLoading dependency

  const handleModify = useCallback((imageId: string) => {
    const selectedImage = findImageDetails(imageId); // Use the recursive finder
    if (!selectedImage) { toast({ title: "操作失敗", description: "找不到所選圖片的詳細資訊。", variant: "destructive"}); return; }
    if (!selectedImage.parameters) { console.warn(`Image ${imageId} is missing 'parameters' for modification.`); }
    console.log('Dispatching modifyDesign event for:', { imageId, parameters: selectedImage.parameters });
    toast({ title: "加載參數以修改", description: "請在左側調整參數後重新生成。" });
    window.dispatchEvent(new CustomEvent("modifyDesign", { detail: { imageId: selectedImage.id, imageUrl: selectedImage.url, parameters: selectedImage.parameters } }));
  }, [findImageDetails, toast]);


  // --- Render ---
  console.log('[MainContent RENDER] isLoading:', isLoading, 'initialImages:', initialImages.length, 'variantMap size:', variantMap.size, 'pollingJobId:', pollingJobId);

  return (
    // Use the New UI Shell
    <main className="flex-1 p-6 overflow-hidden">
      {/* Applying h-screen or equivalent might be needed if calc doesn't work reliably */}
      <div className="glass-panel rounded-lg p-6 h-[calc(100vh-3rem)] flex flex-col border border-border/10 shadow-lg"> {/* Adjusted height & styling */}
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="flex flex-col flex-grow min-h-0"> {/* Allow collapsible to grow and enable child scrolling */}
          <CollapsibleContent className="space-y-6 transition-all duration-300">
            {/* Hero Section Content */}
            <div className="space-y-6 border-b border-white/10 pb-10">
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Multi-Level Design Evolution
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-3xl"> {/* Adjusted text size */}
                Experience unlimited creative exploration with our new multi-level variant generation.
                Create, refine, and evolve designs through infinite iterations for precise design perfection.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 md:gap-6 pt-4"> {/* Adjusted gap */}
                <div className="flex-1 glass-panel p-4 rounded-lg backdrop-blur-lg border border-white/5">
                  <div className="flex items-start gap-3">
                    <Layers className="h-7 w-7 md:h-8 md:w-8 text-primary mt-1 flex-shrink-0" /> {/* Adjusted size */}
                    <div>
                      <h3 className="font-semibold text-md md:text-lg">深度變體生成</h3> {/* Adjusted size */}
                      <p className="text-sm md:text-base text-muted-foreground">從任何設計（初始或變體）生成新變體，不受層級限制</p> {/* Adjusted size */}
                    </div>
                  </div>
                </div>
                <div className="flex-1 glass-panel p-4 rounded-lg backdrop-blur-lg border border-white/5">
                  <div className="flex items-start gap-3">
                    <GitBranch className="h-7 w-7 md:h-8 md:w-8 text-secondary mt-1 flex-shrink-0" /> {/* Adjusted size */}
                    <div>
                      <h3 className="font-semibold text-md md:text-lg">層次結構設計</h3> {/* Adjusted size */}
                      <p className="text-sm md:text-base text-muted-foreground">使用層次結構直觀地顯示設計演變，清晰追踪設計靈感來源</p> {/* Adjusted size */}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleContent>

          {/* Sticky Trigger - Placed after content but before scrollable area */}
          <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md py-3 border-b border-border/10"> {/* Adjusted background & padding */}
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost" // Changed to ghost for less emphasis
                className="group text-sm" // Adjusted size/styling
                // size="lg" // Removed specific size, let padding define it
              >
                {isOpen ? "隱藏介紹" : "顯示介紹"}
                {isOpen ? (
                  <ChevronUp className="ml-2 h-4 w-4 transition-transform group-data-[state=open]:rotate-180" /> // Correct icon logic
                ) : (
                  <ChevronDown className="ml-2 h-4 w-4 transition-transform group-data-[state=closed]:rotate-0" /> // Correct icon logic
                )}
              </Button>
            </CollapsibleTrigger>
          </div>

          {/* Design Display Area - Takes remaining space and becomes scrollable */}
           {/* Use flex-grow and min-h-0 on the parent of ScrollArea if needed */}
          <div className={`flex-1 min-h-0 transition-opacity duration-500 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
             {/* Render only when open or specifically needed */}
             {isOpen && (
                 <DesignHierarchyDisplay
                     isLoading={isLoading && initialImages.length === 0 && variantMap.size === 0} // Loading only on initial empty state
                     feedbackGivenMap={feedbackGivenMap}
                     savedImageMap={savedImageMap} 
                     initialImages={initialImages}
                     variantMap={variantMap}
                     onFeedback={handleFeedback}
                     onSave={handleSave}
                     onRefine={handleRefine}
                     onModify={handleModify}
                 />
              )}
          </div>
        </Collapsible>
      </div>
    </main>
  );
}