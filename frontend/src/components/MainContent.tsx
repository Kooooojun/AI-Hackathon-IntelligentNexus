// src/components/MainContent.tsx

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast"; // VERIFY PATH
import { useApiService } from '@/services/api/apiServiceFactory'; // VERIFY PATH
import {
    FeedbackPayload,
    SaveDesignPayload,
    GeneratedImage,
    DesignParameters,
    ApiService, // Assuming you have this interface defined
    StartGenerationResponse,
    JobStatusResponse,
    FeedbackResponse,
    SaveDesignResponse
} from '@/services/api/types'; // VERIFY PATH & Types

// Imports for the new UI Shell
import { Layers, GitBranch, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "./ui/button"; // VERIFY PATH
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible"; // VERIFY PATH

// --- React Flow Imports ---
import { Node, Edge, Position, MarkerType } from 'reactflow'; // Import types
import { FlowDisplay } from './design/FlowDisplay'; // VERIFY PATH & NAME
import { DesignNodeData } from "./design/DesignNode"; // Import node data type // VERIFY PATH & NAME

// --- Layout Constants (Adjust as needed) ---
const NODE_WIDTH = 500 + 30; // Card width + horizontal spacing
const NODE_HEIGHT = 350 + 40; // Estimated Card height + vertical spacing

export function MainContent() {
  // --- State ---
  const [isLoading, setIsLoading] = useState(false);
  const [initialImages, setInitialImages] = useState<GeneratedImage[]>([]);
  const [variantMap, setVariantMap] = useState<Map<string, GeneratedImage[]>>(new Map());
  const [pollingJobId, setPollingJobId] = useState<string | null>(null);
  const [isIntroOpen, setIsIntroOpen] = useState(true); // For collapsible hero
  const [feedbackGivenMap, setFeedbackGivenMap] = useState<Record<string, boolean>>({});
  const [savedImageMap, setSavedImageMap] = useState<Record<string, boolean>>({});

  // --- React Flow State ---
  const [rfNodes, setRfNodes] = useState<Node<DesignNodeData>[]>([]);
  const [rfEdges, setRfEdges] = useState<Edge[]>([]);

  // --- Refs and Hooks ---
  const pollingIntervalRef = useRef<number | null>(null);
  const { toast } = useToast();
  const apiService = useApiService();

  // --- Polling Logic (Memoized) ---
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


  // --- **** ACTION HANDLERS DEFINED BEFORE useEffect that depends on them **** ---
  const findImageRecursive = useCallback((imageId: string, currentImages: GeneratedImage[], map: Map<string, GeneratedImage[]>): GeneratedImage | undefined => {
      for (const img of currentImages) {
          if (img.id === imageId) return img;
          const children = map.get(img.id);
          if (children) {
              const foundInChildren = findImageRecursive(imageId, children, map);
              if (foundInChildren) return foundInChildren;
          }
      }
      return undefined;
  }, []); // No external deps needed directly

  const findImageDetails = useCallback((imageId: string): GeneratedImage | undefined => {
    console.log(`DEBUG: Searching for image ${imageId}...`)
    const found = findImageRecursive(imageId, initialImages, variantMap);
    if (!found) { console.warn(`DEBUG: Image ${imageId} not found.`); }
    return found;
  }, [initialImages, variantMap, findImageRecursive]); // Depends on state and the helper

  const handleFeedback = useCallback(async (imageId: string, isPositive: boolean) => {
    const image = findImageDetails(imageId);
    const generationIdForFeedback = image?.job_id;
    if (!generationIdForFeedback) { toast({ title: "無法提交回饋", description: "缺少生成任務信息。", variant: "destructive"}); return; }
    setFeedbackGivenMap(prev => ({...prev, [imageId]: true})); // Optimistic update
    const payload: FeedbackPayload = { generation_id: generationIdForFeedback, image_id: imageId, rating: isPositive ? 'up' : 'down' };
    try {
        await apiService.submitFeedback(payload);
        toast({ title: "回饋已提交" });
    } catch (error: any) {
        toast({ title: "提交回饋失敗", variant: "destructive"});
        setFeedbackGivenMap(prev => { const newState = {...prev}; delete newState[imageId]; return newState; }); // Revert
    }
  }, [findImageDetails, apiService, toast, setFeedbackGivenMap]);

  const handleSave = useCallback(async (imageId: string) => {
    setSavedImageMap(prev => ({...prev, [imageId]: true})); // Optimistic update
    const payload: SaveDesignPayload = { image_id: imageId };
    try {
        await apiService.saveDesign(payload);
        toast({ title: "設計已儲存" });
    } catch (error: any) {
        toast({ title: "儲存失敗", variant: "destructive"});
         setSavedImageMap(prev => { const newState = {...prev}; delete newState[imageId]; return newState; }); // Revert
    }
  }, [apiService, toast, setSavedImageMap]);

  const handleRefine = useCallback(async (imageId: string) => {
    const selectedImage = findImageDetails(imageId);
    if (!selectedImage) { toast({ title: "操作失敗", description: "找不到圖片資訊。", variant: "destructive"}); return; }
    toast({ title: "正在啟動變體生成...", description: `基於 ${imageId.substring(0,6)}...` });
    try {
      const response = await apiService.generateVariants({ reference_image_id: imageId, base_parameters: selectedImage.parameters });
      if (response && response.job_id) { startPolling(response.job_id, imageId); }
      else { toast({ title: "啟動變體生成失敗", description: "未收到任務 ID。", variant: "destructive" }); setIsLoading(false); } // Reset loading if start failed
    } catch (error: any) {
        toast({ title: "啟動變體生成失敗", description: error.message || '無法連接伺服器', variant: "destructive" });
        if (!pollingIntervalRef.current) { setIsLoading(false); } // Reset loading if poll didn't start
    }
  }, [findImageDetails, apiService, toast, startPolling, setIsLoading]); // Added setIsLoading

  const handleModify = useCallback((imageId: string) => {
    const selectedImage = findImageDetails(imageId);
    if (!selectedImage) { toast({ title: "操作失敗", description: "找不到圖片資訊。", variant: "destructive"}); return; }
    if (!selectedImage.parameters) { console.warn(`Image ${imageId} is missing 'parameters'.`); }
    toast({ title: "加載參數以修改", description: "請在左側調整參數後重新生成。" });
    window.dispatchEvent(new CustomEvent("modifyDesign", { detail: { imageId: selectedImage.id, imageUrl: selectedImage.url, parameters: selectedImage.parameters } }));
  }, [findImageDetails, toast]);
  // --- **** END OF MOVED HANDLERS **** ---


  // --- Event Handlers for polling/generation (Can stay here) ---
  const handleStartInitialPolling = useCallback((event: CustomEvent<{ job_id: string }>) => {
    console.log('DEBUG: handleStartInitialPolling triggered! Event Detail:', event.detail);
    const { job_id } = event.detail ?? {};
    if (job_id) { startPolling(job_id); } else { console.error("handleStartInitialPolling received event without job_id:", event.detail); }
  }, [startPolling]);

  const handleDesignGenerated = useCallback((event: CustomEvent<{ images: GeneratedImage[], generation_metadata: { generation_id: string, parentImageId?: string | null } }>) => {
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


  // --- **** React Flow Data Transformation useEffect **** ---
  // This useEffect now runs AFTER the handlers above are defined
  useEffect(() => {
      console.log("Transforming data for React Flow...");
      const newNodes: Node<DesignNodeData>[] = [];
      const newEdges: Edge[] = [];
      let yPos = 0; // Tracks Y position for roots

      // Keep track of calculated Y positions to avoid overlap with deeper branches
      const levelMaxY: Record<number, number> = {};

      const processNode = (image: GeneratedImage, level: number, parentY: number | null) => {
          const xPos = level * NODE_WIDTH;
          // Adjust Y position based on levelMaxY to prevent vertical overlap
          const calculatedY = parentY === null
              ? (levelMaxY[level] ?? yPos) // Use max Y for this level or global Y
              : parentY; // Children start aligned with parent vertically for now

          // Place the current node
          newNodes.push({
              id: image.id, type: 'designNode', position: { x: xPos, y: calculatedY },
              data: { image: image, feedbackGivenMap, savedImageMap, onFeedback: handleFeedback, onSave: handleSave, onRefine: handleRefine, onModify: handleModify, },
              sourcePosition: Position.Right, targetPosition: Position.Left,
          });

           // Update max Y for the current level
           levelMaxY[level] = Math.max(levelMaxY[level] ?? 0, calculatedY + NODE_HEIGHT);
           if (level === 0) {
               yPos = levelMaxY[level]; // Update global yPos for next root
           }

           // Process children
           const children = variantMap.get(image.id) || [];
           const totalChildrenHeight = children.length * NODE_HEIGHT;
           // Calculate starting offset for children relative to parent's Y
           let childOffsetY = calculatedY - (totalChildrenHeight / 2) + (NODE_HEIGHT / 2) ;

           if (children.length > 0) {
              children.forEach((child) => {
                 // Ensure child Y doesn't overlap with siblings at the same level
                 const requiredChildY = Math.max(childOffsetY, levelMaxY[level+1] ?? 0);

                 newEdges.push({
                     id: `e-${image.id}-to-${child.id}`, source: image.id, target: child.id, type: 'smoothstep',
                     markerEnd: { type: MarkerType.ArrowClosed, width: 15, height: 15, color: 'hsl(var(--primary))' },
                     style: { strokeWidth: 1.5, stroke: 'hsl(var(--primary) / 0.6)' },
                 });
                 // Pass calculated requiredChildY as the new 'parentY' for children positioning
                 processNode(child, level + 1, requiredChildY);
                 childOffsetY = requiredChildY + NODE_HEIGHT; // Increment offset based on placed child
              });
              // Update max Y for level 0 based on children extent if needed
              if (level === 0) {
                  yPos = Math.max(yPos, childOffsetY);
              }
           }
      }; // End of processNode definition

      initialImages.forEach((img) => { processNode(img, 0, null); }); // Start processing

      console.log(`Setting ${newNodes.length} nodes and ${newEdges.length} edges for React Flow.`);
      setRfNodes(newNodes);
      setRfEdges(newEdges);
  // Dependencies: Re-run whenever source data or status maps change, or handlers change
  }, [initialImages, variantMap, feedbackGivenMap, savedImageMap, handleFeedback, handleSave, handleRefine, handleModify]); // Keep handlers as deps


  // --- Other useEffect Hooks (Listeners and Unmount) ---
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

  useEffect(() => {
    return () => { console.log("MainContent UNMOUNTING - Stopping polling"); stopPolling(); };
  }, [stopPolling]);


  // --- Render ---
  console.log('[MainContent RENDER] isLoading:', isLoading, 'initialImages:', initialImages.length, 'variantMap size:', variantMap.size, 'rfNodes:', rfNodes.length);

  return (
    <main className="flex-1 p-4 md:p-6 overflow-hidden">
      <div className="glass-panel rounded-lg p-4 md:p-6 h-[calc(100vh-2rem)] md:h-[calc(100vh-3rem)] flex flex-col border border-border/10 shadow-lg">
         <Collapsible open={isIntroOpen} onOpenChange={setIsIntroOpen} className="flex flex-col flex-shrink-0"> {/* Intro part doesn't grow */}
              {/* Trigger */}
              <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md py-2 border-b border-border/10">
                  <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="group text-sm h-8 px-3">
                          {isIntroOpen ? "隱藏介紹" : "顯示介紹"}
                          {isIntroOpen ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />}
                      </Button>
                  </CollapsibleTrigger>
              </div>
              {/* Content */}
              <CollapsibleContent className="space-y-4 md:space-y-6 pb-4 md:pb-6 border-b border-white/10 overflow-hidden transition-all data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                   <div className="pt-4"> {/* Hero Section Content */}
                      <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Multi-Level Design Evolution</h1>
                      <p className="text-base md:text-lg text-muted-foreground max-w-3xl mt-2">Experience unlimited creative exploration...</p>
                      <div className="flex flex-col sm:flex-row gap-4 pt-2">{/* Feature cards */}
                        <div className="flex-1 glass-panel p-3 rounded-lg backdrop-blur-lg border border-white/5"> {/* Feature 1 */}
                          <div className="flex items-start gap-2"> <Layers className="h-6 w-6 md:h-7 md:w-7 text-primary mt-1 flex-shrink-0" /> <div> <h3 className="font-semibold text-base md:text-lg">深度變體生成</h3> <p className="text-sm text-muted-foreground">從任何設計生成新變體</p> </div> </div>
                        </div>
                        <div className="flex-1 glass-panel p-3 rounded-lg backdrop-blur-lg border border-white/5"> {/* Feature 2 */}
                           <div className="flex items-start gap-2"> <GitBranch className="h-6 w-6 md:h-7 md:w-7 text-secondary mt-1 flex-shrink-0" /> <div> <h3 className="font-semibold text-base md:text-lg">層次結構設計</h3> <p className="text-sm text-muted-foreground">直觀顯示設計演變</p> </div> </div>
                        </div>
                      </div>
                   </div>
              </CollapsibleContent>
          </Collapsible>

          {/* React Flow Display Area */}
          <div className="flex-1 min-h-0 pt-2 md:pt-4"> {/* Reduced padding top */}
              <FlowDisplay
                  nodes={rfNodes}
                  edges={rfEdges}
                  isLoading={isLoading && rfNodes.length === 0 && initialImages.length > 0} // Show loading only if polling but no nodes yet
              />
          </div>
      </div>
    </main>
  );
}