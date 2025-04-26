// src/components/MainContent.tsx

import { useState, useEffect, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast"; // VERIFY PATH: Adjust if your hook path is different
// import { DesignDisplayArea } from "./design/DesignDisplayArea"; // VERIFY PATH: Ensure this points to your refactored component
import { useApiService } from '@/services/api/apiServiceFactory'; // VERIFY PATH: Your API service hook
import { FeedbackPayload, SaveDesignPayload, GeneratedImage } from '@/services/api/types';
import { DesignHierarchyDisplay } from "./design/DesignHierarchyDisplay"; // Import the new display component

export function MainContent() {
  // --- State ---
  const [isLoading, setIsLoading] = useState(false); // Global loading indicator, mainly for polling/initial load
  const [initialImages, setInitialImages] = useState<GeneratedImage[]>([]);
  const [variantMap, setVariantMap] = useState<Map<string, GeneratedImage[]>>(new Map());
  const [pollingJobId, setPollingJobId] = useState<string | null>(null);
  const pollingIntervalRef = useRef<number | null>(null); // To store the interval ID for cleanup
  const { toast } = useToast();
  const apiService = useApiService(); // Get API service instance

  // --- Polling Logic (Memoized with useCallback) ---
  const stopPolling = useCallback(() => {
    // Check if interval exists before clearing
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      console.log(`Polling stopped.`); // Simplified log
    }
  }, []); // No external dependencies needed

  const startPolling = useCallback((jobId: string, parentId?: string | null) => {
      // ... (previous logic including setting isLoading, interval, calling stopPolling) ...
      stopPolling();
      console.log(`DEBUG: startPolling called. Job ID: ${jobId}, Parent ID: ${parentId}`);
      setPollingJobId(jobId);
      // We don't need pollingParentId state anymore if metadata has parentId
      setIsLoading(true);
      console.log(`Starting polling interval for Job ID: ${jobId}`);
      pollingIntervalRef.current = window.setInterval(async () => {
          const currentJobId = jobId;
          if (!currentJobId) { /* ... stop ... */ return; }
          try {
              const statusResponse = await apiService.checkJobStatus(currentJobId);
              if (statusResponse?.status === 'succeeded' && statusResponse?.images) {
                  console.log(`DEBUG: Job ${currentJobId} succeeded! Preparing event.`);
                  // Pass parentId from the startPolling closure context
                  const eventDetail = {
                      images: statusResponse.images,
                      generation_metadata: {
                          generation_id: currentJobId,
                          parentImageId: parentId // Pass the correct parentId
                      }
                  };
                  stopPolling(); // Stop *after* success confirmed
                  console.log(`DEBUG: Dispatching designGenerated event:`, eventDetail);
                  window.dispatchEvent(new CustomEvent("designGenerated", { detail: eventDetail }));
              } else if (statusResponse?.status === 'failed') {
                console.error(`Polling detected FAILURE for job ${currentJobId}:`, statusResponse.error);
                stopPolling();
                setIsLoading(false); // Stop loading on explicit failure
                toast({
                  title: "生成失敗",
                  description: statusResponse.error || "任務處理時發生未知錯誤。", // 使用 API 回傳的錯誤訊息
                  variant: "destructive",
                });
              } else if (statusResponse?.status === 'processing' || statusResponse?.status === 'pending') {
                console.log(`Job ${currentJobId} is still ${statusResponse.status}...`);
                // Keep isLoading true - Ensure it stays true if it was somehow set to false
                if (!isLoading) setIsLoading(true);
              } else {
                // Handle unexpected or missing status
                const statusVal = statusResponse?.status ?? 'undefined';
                console.error(`Polling unexpected status for job ${currentJobId}:`, statusVal);
                stopPolling();
                setIsLoading(false);
                toast({
                    title: "生成出錯",
                    description: `任務狀態未知或無效 (${statusVal})`,
                    variant: "destructive",
                });
              }
          } catch (error) {
             /* ... handle error ... */
              
          }
      }, 3000);
  }, [stopPolling, apiService, toast, isLoading]); // Add other necessary dependencies


  // --- Event Handlers ---
  const handleStartInitialPolling = useCallback((event: CustomEvent<{ job_id: string }>) => {
    // ... (previous logic, calls startPolling without parentId) ...
    const { job_id } = event.detail ?? {};
    if (job_id) startPolling(job_id);
  }, [startPolling]);


   // --- Modified handleDesignGenerated ---
  const handleDesignGenerated = useCallback((event: CustomEvent<{
      images: GeneratedImage[],
      generation_metadata: { generation_id: string, parentImageId?: string | null }
    }>) => {
      console.log('DEBUG: handleDesignGenerated CALLED. Event detail:', event.detail);
      if (!event.detail?.images || !event.detail?.generation_metadata) { /* ... error handling ... */ setIsLoading(false); return; }

      const { images, generation_metadata } = event.detail;
      const { generation_id, parentImageId } = generation_metadata;
      const processedImages = images.map(img => ({ ...img, job_id: img.job_id || generation_id }));

      if (parentImageId) {
        // --- Add to variantMap ---
        console.log(`DEBUG: Updating variantMap for parent ${parentImageId}`);
        setVariantMap(prevMap => {
          const newMap = new Map(prevMap);
          const currentVariants = newMap.get(parentImageId) || [];
          const existingVariantIds = new Set(currentVariants.map(v => v.id));
          const newVariants = processedImages.filter(img => !existingVariantIds.has(img.id));
          if (newVariants.length > 0) {
            console.log(`Adding ${newVariants.length} new variants for parent ${parentImageId}`);
            newMap.set(parentImageId, [...currentVariants, ...newVariants]);
          }
          return newMap; // Return the new map to update state
        });
        // --------------------------
      } else {
        // --- Add to initialImages ---
        console.log(`DEBUG: Calling setInitialImages with ${processedImages.length} images.`);
        setInitialImages(prev => {
            const existingIds = new Set(prev.map(img => img.id));
            const newImages = processedImages.filter(img => !existingIds.has(img.id));
            return newImages.length > 0 ? [...prev, ...newImages] : prev;
        });
        // --------------------------
      }

      console.log('DEBUG: Calling setIsLoading(false) at the end of handleDesignGenerated');
      setIsLoading(false);
  }, [toast]); // Dependency on toast


  // --- Effect for Setting Up Global Event Listeners ---
  useEffect(() => {
    console.log("MainContent Effect: Setting up event listeners...");

    // Type assertion needed because addEventListener expects EventListener type
    const startHandler = handleStartInitialPolling as EventListener;
    const generatedHandler = handleDesignGenerated as EventListener;

    window.addEventListener("startPollingJob", startHandler);
    window.addEventListener("designGenerated", generatedHandler);

    // Cleanup function: ONLY remove these listeners
    return () => {
      console.log("MainContent Effect Cleanup: Removing listeners...");
      window.removeEventListener("startPollingJob", startHandler);
      window.removeEventListener("designGenerated", generatedHandler);
    };
    // Dependencies: The stable handler functions created with useCallback.
  }, [handleStartInitialPolling, handleDesignGenerated]);


  // --- Effect for Unmount Cleanup ---
  // Ensures polling stops if the component is removed from the DOM.
  useEffect(() => {
    return () => {
        console.log("MainContent UNMOUNTING - Stopping polling");
        stopPolling();
    };
  }, [stopPolling]); // Depends only on the stable stopPolling function


  // --- Action Handlers (Feedback, Save, Refine, Modify - Use useCallback) ---

  // --- Action Handlers (useCallback and potentially update findImageDetails) ---
  const findImageDetails = useCallback((imageId: string): GeneratedImage | undefined => {
    console.log(`DEBUG: Searching for image ${imageId}...`)
    // Search initial images
    const initial = initialImages.find(img => img.id === imageId);
    if (initial) {
        console.log(`DEBUG: Found in initialImages.`);
        return initial;
    }
    // Search recursively in variantMap (can be simplified if only needing direct children)
    // For a full search, we might need a different approach or store all images flatly.
    // Let's try searching only one level deep in variants for now for simplicity,
    // assuming actions are primarily on visible images whose parents are known.
    // A more robust search might be needed for complex interactions.
    for (const variants of variantMap.values()) {
        const variant = variants.find(img => img.id === imageId);
        if (variant) {
             console.log(`DEBUG: Found in variantMap.`);
             return variant;
        }
    }
    console.warn(`DEBUG: Image ${imageId} not found in initialImages or variantMap values.`);
    return undefined; // Or implement recursive search if necessary
  }, [initialImages, variantMap]);

  const handleFeedback = useCallback(async (imageId: string, isPositive: boolean) => { /* ... */ }, [findImageDetails, apiService, toast]);
  const handleSave = useCallback(async (imageId: string) => { /* ... */ }, [apiService, toast]);

  // Handle Refine Action (Triggers VARIANT generation)
  const handleRefine = useCallback(async (imageId: string) => {
        const selectedImage = findImageDetails(imageId);
        if (!selectedImage) {
            console.error("Cannot refine: Image details not found for ID:", imageId);
            toast({ title: "操作失敗", description: "找不到所選圖片的詳細資訊。", variant: "destructive"});
            return;
        }
        console.log(`Starting variant generation based on image: ${imageId}`);
        toast({ title: "正在啟動變體生成...", description: `基於圖片 ${imageId.substring(0,6)}...` });

        try {
            // --- Replace with your ACTUAL API call to start variant generation ---
            const response = await apiService.generateVariants({
              reference_image_id: imageId,
              base_parameters: selectedImage.parameters // 傳遞父圖片參數
            });
            // --------------------------------------------------------------------

            if (response && response.job_id) {
                console.log(`Variant generation job started: ${response.job_id}, Parent: ${imageId}`);
                startPolling(response.job_id, imageId); // Call the memoized startPolling with parentId
            } else {
                console.error("Variant generation API did not return a job_id.", response);
                toast({ title: "啟動變體生成失敗", description: "未收到有效的任務 ID。", variant: "destructive" });
            }
        } catch (error: any) {
            console.error("Failed to start variant generation API call:", error);
            toast({ title: "啟動變體生成失敗", description: error.message || '無法連接伺服器', variant: "destructive" });
            // Ensure loading is potentially reset if startPolling wasn't called
             if (!pollingIntervalRef.current) {
                setIsLoading(false);
             }
        }
  }, [findImageDetails, apiService, toast, startPolling]); // Depends on startPolling

  // Handle Modify Action (Dispatches event for UI changes)
  const handleModify = useCallback((imageId: string) => {
        const selectedImage = findImageDetails(imageId);
        if (!selectedImage) {
            console.error("Cannot modify: Image details not found for ID:", imageId);
            toast({ title: "操作失敗", description: "找不到所選圖片的詳細資訊。", variant: "destructive"});
            return;
        }

        // Optional: Check if parameters exist
        if (!selectedImage.parameters) {
           console.warn(`Image ${imageId} is missing 'parameters' for modification.`);
        }

        console.log('Dispatching modifyDesign event for:', { imageId, parameters: selectedImage.parameters });
        toast({ title: "加載參數以修改", description: "請在左側調整參數後重新生成。" });

        // Dispatch event for DesignInputs (or other listener) to pre-fill the form
        window.dispatchEvent(new CustomEvent("modifyDesign", {
            detail: {
                imageId: selectedImage.id,
                imageUrl: selectedImage.url,
                parameters: selectedImage.parameters // Pass parameters
            }
        }));
  }, [findImageDetails, toast]); // Depends on findImageDetails, toast

  // --- Render ---
  console.log('[MainContent RENDER] isLoading:', isLoading, 'initialImages:', initialImages.length, 'variantMap size:', variantMap.size, 'pollingJobId:', pollingJobId);

  return (
    <main className="flex-1 p-4 md:p-6 bg-gradient-to-br from-background to-muted/30">
      <div className="glass-panel bg-card/80 backdrop-blur-lg rounded-xl shadow-lg p-4 md:p-6 border border-border/20">
        {/* Header */}
        <div className="mb-6">
             <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary via-blue-500 to-secondary bg-clip-text text-transparent mb-2">
               Cooler Master AI Designer
             </h1>
             <p className="text-sm md:text-base text-muted-foreground">
              使用 AI 設計你的電腦機殼概念。從左側開始，或對生成的結果進行調整。
             </p>
        </div>

        {/* Display Area - Renders Initial Images and Variant Groups */}
        <DesignHierarchyDisplay
            isLoading={isLoading && initialImages.length === 0 && variantMap.size === 0} // Adjust loading condition
            initialImages={initialImages}
            variantMap={variantMap}
            onFeedback={handleFeedback}
            onSave={handleSave}
            onRefine={handleRefine}
            onModify={handleModify}
         />
      </div>
    </main>
  );
}