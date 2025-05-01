// src/components/MainContent.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast"; // VERIFY PATH
import { useApiService } from '@/services/api/apiServiceFactory'; // VERIFY PATH
import {
    FeedbackPayload,
    SaveDesignPayload,
    dImage,
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
const NODE_WIDTH = 256 + 60; // Card width + horizontal spacing
const NODE_HEIGHT = 350 + 40; // Estimated Card height + vertical spacing

// +++ Placeholder Images (defined locally or imported) +++
const placeholderImages = [
  "https://a.storyblok.com/f/281110/600x600/ea0afeb9de/elite-301-white-overview-600x600.png/m/600x0/smart",
  "https://a.storyblok.com/f/281110/600x600/627da3e4e0/mb600-overview-600x600.png/m/600x0/smart",
  "https://a.storyblok.com/f/281110/960x960/39f09cd23c/elite-301-white-gallery-02.png/m/960x0/smart",
  "https://a.storyblok.com/f/281110/f379480f5f/td500-mesh-v2-chun-li-380x380-1.png/m/1200x0/smart",
  "https://a.storyblok.com/f/281110/cb15588e1a/c700m-black-gallery-1.png/m/1920x0/smart",
];
// +++++++++++++++++++++++++++++++++++++++++++++++++++++

export function MainContent() {
  // --- State ---
  const [isLoading, setIsLoading] = useState(false);
  const [initialImages, setInitialImages] = useState<dImage[]>([]);
  const [variantMap, setVariantMap] = useState<Map<string, dImage[]>>(new Map());
  const [pollingJobId, setPollingJobId] = useState<string | null>(null);
  const [isIntroOpen, setIsIntroOpen] = useState(true);
  const [feedbackGivenMap, setFeedbackGivenMap] = useState<Record<string, boolean>>({});
  const [savedImageMap, setSavedImageMap] = useState<Record<string, boolean>>({});
  const [rfNodes, setRfNodes] = useState<Node<DesignNodeData>[]>([]);
  const [rfEdges, setRfEdges] = useState<Edge[]>([]);

  // --- Refs and Hooks ---
  const pollingIntervalRef = useRef<number | null>(null);
  const { toast } = useToast();
  const apiService = useApiService();

  // --- Polling Logic ---
  const stopPolling = useCallback(() => {
      if (pollingIntervalRef.current) { clearInterval(pollingIntervalRef.current); pollingIntervalRef.current = null; console.log(`Polling stopped.`); }
  }, []);

  const startPolling = useCallback((jobId: string, parentId?: string | null) => {
      stopPolling(); console.log(`DEBUG: startPolling called. Job ID: ${jobId}, Parent ID: ${parentId}`);
      setPollingJobId(jobId); setIsLoading(true);
      console.log(`Starting polling interval for Job ID: ${jobId}`);
      pollingIntervalRef.current = window.setInterval(async () => {
          const currentJobId = jobId;
          if (!currentJobId) { stopPolling(); setIsLoading(false); return; }
          try {
              const statusResponse = await apiService.checkJobStatus(currentJobId);
              console.log(`Polling response for ${currentJobId}:`, statusResponse?.status);
              if (statusResponse?.status === 'succeeded' && statusResponse?.images) {
                  const eventDetail = { images: statusResponse.images, generation_metadata: { generation_id: currentJobId, parentImageId: parentId } };
                  stopPolling(); console.log(`DEBUG: Dispatching designd event:`, eventDetail);
                  window.dispatchEvent(new CustomEvent("designd", { detail: eventDetail }));
              } else if (statusResponse?.status === 'failed') {
                  stopPolling(); setIsLoading(false); toast({ title: "生成失敗", description: statusResponse.error || "任務處理時發生未知錯誤。", variant: "destructive", });
              } else if (statusResponse?.status === 'processing' || statusResponse?.status === 'pending') {
                  if (!isLoading) setIsLoading(true);
              } else { const statusVal = statusResponse?.status ?? 'undefined'; stopPolling(); setIsLoading(false); toast({ title: "生成出錯", description: `任務狀態未知或無效 (${statusVal})`, variant: "destructive", }); }
          } catch (error: any) { stopPolling(); setIsLoading(false); toast({ title: "輪詢檢查失敗", description: error.message || "無法獲取任務狀態。", variant: "destructive", }); }
      }, 3000);
  }, [stopPolling, apiService, toast, isLoading]);

  // --- Action Handlers ---
  const findImageRecursive = useCallback((imageId: string, currentImages: dImage[], map: Map<string, dImage[]>): dImage | undefined => {
      for (const img of currentImages) { if (img.id === imageId) return img; const children = map.get(img.id); if (children) { const foundInChildren = findImageRecursive(imageId, children, map); if (foundInChildren) return foundInChildren; } } return undefined;
  }, []);

  const findImageDetails = useCallback((imageId: string): dImage | undefined => {
      console.log(`DEBUG: Searching for image ${imageId}...`); const found = findImageRecursive(imageId, initialImages, variantMap); if (!found) { console.warn(`DEBUG: Image ${imageId} not found.`); } return found;
  }, [initialImages, variantMap, findImageRecursive]);

  const handleFeedback = useCallback(async (imageId: string, isPositive: boolean) => {
      const image = findImageDetails(imageId); const generationIdForFeedback = image?.job_id; if (!generationIdForFeedback) { toast({ title: "無法提交回饋", description: "缺少生成任務信息。", variant: "destructive"}); return; } setFeedbackGivenMap(prev => ({...prev, [imageId]: true})); const payload: FeedbackPayload = { generation_id: generationIdForFeedback, image_id: imageId, rating: isPositive ? 'up' : 'down' }; try { await apiService.submitFeedback(payload); toast({ title: "回饋已提交" }); } catch (error: any) { toast({ title: "提交回饋失敗", variant: "destructive"}); setFeedbackGivenMap(prev => { const newState = {...prev}; delete newState[imageId]; return newState; }); }
  }, [findImageDetails, apiService, toast, setFeedbackGivenMap]);

  const handleSave = useCallback(async (imageId: string) => {
      setSavedImageMap(prev => ({...prev, [imageId]: true})); const payload: SaveDesignPayload = { image_id: imageId }; try { await apiService.saveDesign(payload); toast({ title: "設計已儲存" }); } catch (error: any) { toast({ title: "儲存失敗", variant: "destructive"}); setSavedImageMap(prev => { const newState = {...prev}; delete newState[imageId]; return newState; }); }
  }, [apiService, toast, setSavedImageMap]);

  // --- handleRefine using MOCK DATA ---
  const handleRefine = useCallback((imageId: string) => {
      const parentImage = findImageDetails(imageId); if (!parentImage) { toast({ title: "操作失敗", description: "找不到父圖片資訊。", variant: "destructive"}); return; } const parentId = parentImage.id; toast({ title: "正在生成模擬變體...", description: `基於 ${parentId.substring(0,6)}...` }); setIsLoading(true);
      const mockVariants: dImage[] = []; const numberOfVariants = 2;
      for (let i = 0; i < numberOfVariants; i++) { const mockId = `${parentId}-mockv${Date.now()}-${i}`; const imageUrl = placeholderImages[(initialImages.length + variantMap.size + i) % placeholderImages.length]; mockVariants.push({ id: mockId, url: imageUrl, parentId: parentId, parameters: { style: `variant-style-${i+1}`, color: ['red', 'blue', 'green'][i % 3], lighting: i % 2 === 0, description: `Mock variant ${i+1} of ${parentId.substring(0,6)}` }, job_id: `mockjob-${Date.now()}` }); }
      setTimeout(() => { console.log(`DEBUG: Adding mock variants for parent ${parentId}:`, mockVariants); setVariantMap(prevMap => { const newMap = new Map(prevMap); const existingVariants = newMap.get(parentId) || []; newMap.set(parentId, [...existingVariants, ...mockVariants]); return newMap; }); setIsLoading(false); toast({ title: "模擬變體已添加！"}); }, 1000);
      /* Original API Call Logic
      try { const response = await apiService.Variants({ reference_image_id: imageId, base_parameters: selectedImage.parameters }); if (response && response.job_id) { startPolling(response.job_id, imageId); } else { toast({ title: "啟動變體生成失敗", description: "未收到任務 ID。", variant: "destructive" }); setIsLoading(false); } } catch (error: any) { toast({ title: "啟動變體生成失敗", description: error.message || '無法連接伺服器', variant: "destructive" }); if (!pollingIntervalRef.current) { setIsLoading(false); } }
      */
  }, [findImageDetails, toast, setIsLoading, setVariantMap, initialImages.length, variantMap.size]); // Dependencies for mock version

  const handleModify = useCallback((imageId: string) => {
      const selectedImage = findImageDetails(imageId); if (!selectedImage) { toast({ title: "操作失敗", description: "找不到圖片資訊。", variant: "destructive"}); return; } if (!selectedImage.parameters) { console.warn(`Image ${imageId} is missing 'parameters'.`); } toast({ title: "加載參數以修改", description: "請在左側調整參數後重新生成。" }); window.dispatchEvent(new CustomEvent("modifyDesign", { detail: { imageId: selectedImage.id, imageUrl: selectedImage.url, parameters: selectedImage.parameters } }));
  }, [findImageDetails, toast]);


  // --- Event Handlers for polling/generation ---
  const handleStartInitialPolling = useCallback((event: CustomEvent<{ job_id: string }>) => {
      console.log('DEBUG: handleStartInitialPolling triggered! Event Detail:', event.detail); const { job_id } = event.detail ?? {}; if (job_id) { startPolling(job_id); } else { console.error("handleStartInitialPolling received event without job_id:", event.detail); }
  }, [startPolling]);

  // --- CORRECTED handleDesignd Type Hint ---
  const handleDesignd = useCallback((event: CustomEvent<{
      images: dImage[];
      generation_metadata: {
          generation_id: string;
          parentImageId?: string | null;
      };
  }>) => {
      console.log('DEBUG: handleDesignd CALLED. Event detail:', event.detail);
      if (!event.detail?.images || !event.detail?.generation_metadata) { setIsLoading(false); toast({ title: "處理結果失敗", description: "收到的數據缺少必要欄位。", variant: "destructive" }); return; }
      const { images, generation_metadata } = event.detail;
      const { generation_id, parentImageId } = generation_metadata;
      const processedImages = images.map(img => ({ ...img, job_id: img.job_id || generation_id, parentId: img.parentId === undefined ? parentImageId : img.parentId }));
      if (parentImageId) {
          console.log(`DEBUG: Updating variantMap for parent ${parentImageId}`);
          setVariantMap(prevMap => { const newMap = new Map(prevMap); const currentVariants = newMap.get(parentImageId) || []; const existingVariantIds = new Set(currentVariants.map(v => v.id)); const newVariants = processedImages.filter(img => !existingVariantIds.has(img.id)); if (newVariants.length > 0) { newMap.set(parentImageId, [...currentVariants, ...newVariants]); } return newMap; });
      } else {
          console.log(`DEBUG: Calling setInitialImages with ${processedImages.length} images.`);
          setInitialImages(prev => { const existingIds = new Set(prev.map(img => img.id)); const newImages = processedImages.filter(img => !existingIds.has(img.id)); return newImages.length > 0 ? [...prev, ...newImages] : prev; });
      }
      console.log('DEBUG: Calling setIsLoading(false) at the end of handleDesignd');
      setIsLoading(false);
  }, [toast, setIsLoading, setInitialImages, setVariantMap]); // Added setters to deps


  // --- React Flow Data Transformation useEffect ---
  useEffect(() => {
      console.log("Transforming data for React Flow...");
      const newNodes: Node<DesignNodeData>[] = [];
      const newEdges: Edge[] = [];
      let yPos = 0;
      const levelMaxY: Record<number, number> = {};

      const processNode = (image: dImage, level: number, parentY: number | null) => {
          const xPos = level * NODE_WIDTH;
          const calculatedY = parentY === null ? (levelMaxY[level] ?? yPos) : parentY;
          newNodes.push({
              id: image.id, type: 'designNode', position: { x: xPos, y: calculatedY },
              data: { image: image, feedbackGivenMap, savedImageMap, onFeedback: handleFeedback, onSave: handleSave, onRefine: handleRefine, onModify: handleModify, },
              sourcePosition: Position.Right, targetPosition: Position.Left,
          });
          levelMaxY[level] = Math.max(levelMaxY[level] ?? 0, calculatedY + NODE_HEIGHT);
          if (level === 0) { yPos = levelMaxY[level]; }
          const children = variantMap.get(image.id) || [];
          const totalChildrenHeight = children.length * NODE_HEIGHT;
          let childOffsetY = calculatedY - (totalChildrenHeight / 2) + (NODE_HEIGHT / 2) ;
          if (children.length > 0) {
              children.forEach((child) => {
                 const requiredChildY = Math.max(childOffsetY, levelMaxY[level+1] ?? 0);
                 newEdges.push({ id: `e-${image.id}-to-${child.id}`, source: image.id, target: child.id, type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed, width: 15, height: 15, color: 'hsl(var(--primary))' }, style: { strokeWidth: 1.5, stroke: 'hsl(var(--primary) / 0.6)' }, });
                 processNode(child, level + 1, requiredChildY);
                 childOffsetY = requiredChildY + NODE_HEIGHT;
              });
              if (level === 0) { yPos = Math.max(yPos, childOffsetY); }
          }
      }; // End of processNode definition

      initialImages.forEach((img) => { processNode(img, 0, null); });
      console.log(`Setting ${newNodes.length} nodes and ${newEdges.length} edges for React Flow.`);
      setRfNodes(newNodes);
      setRfEdges(newEdges);
  }, [initialImages, variantMap, feedbackGivenMap, savedImageMap, handleFeedback, handleSave, handleRefine, handleModify]); // Keep handlers as deps

  // --- Other useEffect Hooks ---
  useEffect(() => {
      console.log("MainContent Effect: Setting up event listeners...");
      const startHandler = handleStartInitialPolling as EventListener;
      const dHandler = handleDesignd as EventListener;
      window.addEventListener("startPollingJob", startHandler);
      window.addEventListener("designd", dHandler);
      return () => {
          console.log("MainContent Effect Cleanup: Removing listeners...");
          window.removeEventListener("startPollingJob", startHandler);
          window.removeEventListener("designd", dHandler);
      };
  }, [handleStartInitialPolling, handleDesignd]);

  useEffect(() => {
      return () => { console.log("MainContent UNMOUNTING - Stopping polling"); stopPolling(); };
  }, [stopPolling]);


  // --- Render ---
  console.log('[MainContent RENDER] isLoading:', isLoading, 'initialImages:', initialImages.length, 'variantMap size:', variantMap.size, 'rfNodes:', rfNodes.length);

  return (
    <main className="flex-1 p-4 md:p-6 overflow-hidden">
      <div className="glass-panel rounded-lg p-4 md:p-6 h-[calc(100vh-2rem)] md:h-[calc(100vh-3rem)] flex flex-col border border-border/10 shadow-lg">
         <Collapsible open={isIntroOpen} onOpenChange={setIsIntroOpen} className="flex flex-col flex-shrink-0">
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
          <div className="flex-1 min-h-0 pt-2 md:pt-4">
              <FlowDisplay
                  nodes={rfNodes}
                  edges={rfEdges}
                  // Adjust loading state condition if needed
                  isLoading={isLoading && rfNodes.length === 0}
              />
          </div>
      </div>
    </main>
  );
}