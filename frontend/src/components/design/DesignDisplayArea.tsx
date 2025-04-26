// src/components/design/DesignDisplayArea.tsx
import { DesignResults } from "./DesignResults";
import { GeneratedImage } from '@/services/api/types';
import { Separator } from "@/components/ui/separator"; // Optional separator

interface DesignDisplayAreaProps {
  isLoading: boolean; // Overall loading, primarily for the initial fetch/poll
  initialImages: GeneratedImage[];
  variantGroups: Map<string, GeneratedImage[]>; // Key: parentImageId, Value: variants[]
  // Handlers passed down to DesignResults
  onFeedback: (imageId: string, isPositive: boolean) => void;
  onSave: (imageId: string) => void;
  onRefine: (imageId: string) => void;
  onModify: (imageId: string) => void;
}

export function DesignDisplayArea({
  isLoading,
  initialImages,
  variantGroups,
  onFeedback,
  onSave,
  onRefine,
  onModify
}: DesignDisplayAreaProps) {

  // Determine if we should show the main loading indicator
  const showInitialLoading = isLoading && initialImages.length === 0 && variantGroups.size === 0;

  // Determine if there's anything to show at all yet
  const hasContent = initialImages.length > 0 || variantGroups.size > 0;

  return (
    <div className="space-y-8"> {/* Vertical spacing between sections */}

      {/* --- Initial Design Section --- */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">
           初始設計概念
        </h2>
        {showInitialLoading ? (
           <div className="flex items-center justify-center h-[300px]">
             <div className="animate-pulse text-primary text-lg">生成中，請稍候...</div>
           </div>
         ) : initialImages.length > 0 ? (
          <DesignResults
            // No separate isLoading prop needed here if showInitialLoading handles it
            images={initialImages}
            isInitialResult={true} // Mark these as initial results
            onFeedback={onFeedback}
            onSave={onSave}
            onRefine={onRefine}
            onModify={onModify}
          />
        ) : !isLoading ? ( // Only show if not loading and no initial images
            <p className="text-muted-foreground text-center py-8">
              尚未生成任何設計，請使用左側面板開始。
            </p>
        ) : null /* Loading is handled above */}
      </section>

      {/* --- Design Variants Section (Dynamically Rendered) --- */}
      {/* Render this section only if there are variant groups */}
      {variantGroups.size > 0 && (
        <section>
           <Separator className="my-6" /> {/* Optional visual separation */}
          <h2 className="text-2xl font-semibold mb-4">
            設計變體
          </h2>
          <div className="space-y-6"> {/* Spacing between each variant group */}
            {Array.from(variantGroups.entries()).map(([parentId, variants]) => {
               // Find the parent image URL for context if needed (optional)
               const parentImage = initialImages.find(img => img.id === parentId);
               return (
                 <div key={parentId} className="p-4 border rounded-lg bg-card/50"> {/* Group variants visually */}
                   <h3 className="text-lg font-medium mb-3">
                     基於設計 <span className="font-mono text-sm bg-muted px-1.5 py-0.5 rounded">{parentId.substring(0, 6)}...</span> 的變體
                     {/* Optional: Show parent thumbnail? */}
                     {/* {parentImage && <img src={parentImage.url} alt="" className="inline-block h-8 w-8 ml-2 rounded"/>} */}
                   </h3>
                   <DesignResults
                     // Variants usually don't need individual loading state if polling is global
                     images={variants}
                     // isInitialResult={false} // Explicitly false or omit (defaults to false)
                     onFeedback={onFeedback}
                     onSave={onSave}
                     onRefine={onRefine} // Should refine work on variants too? Decide based on requirements
                     onModify={onModify}
                   />
                 </div>
               );
              })}
          </div>
        </section>
      )}

       {/* Fallback message if loading finished but absolutely nothing was generated */}
       {!isLoading && !hasContent && (
            <p className="text-muted-foreground text-center py-12">
                點擊左側按鈕開始生成您的設計概念...
            </p>
       )}
    </div>
  );
}