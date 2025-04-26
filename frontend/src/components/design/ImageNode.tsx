// src/components/design/ImageNode.tsx
import React, { useState, useCallback } from 'react';
import { GeneratedImage } from '@/services/api/types'; // VERIFY PATH
import { DesignCard } from './DesignCard'; // VERIFY PATH
import { Button } from "@/components/ui/button"; // VERIFY PATH
import { ChevronDown, ChevronRight, GitBranch, CornerDownRight } from "lucide-react"; // Added CornerDownRight for visual cue

interface ImageNodeProps {
  image: GeneratedImage;
  variantMap: Map<string, GeneratedImage[]>;
  level: number; // Keep level for potential styling or logic, though not for indent
  feedbackGivenMap: Record<string, boolean>;
  savedImageMap: Record<string, boolean>;
  onFeedback: (imageId: string, isPositive: boolean) => void;
  onSave: (imageId: string) => void;
  onRefine: (imageId: string) => void;
  onModify: (imageId: string) => void;
}

export function ImageNode({
  image,
  variantMap,
  level, // Keep level if needed elsewhere
  feedbackGivenMap,
  savedImageMap,
  onFeedback,
  onSave,
  onRefine,
  onModify
}: ImageNodeProps) {

  // ******** DEBUG START ********
  console.log(`DEBUG: ImageNode rendering for image ID: ${image?.id}, Level: ${level}`);
  console.log(`DEBUG: Received feedbackGivenMap:`, feedbackGivenMap);
  console.log(`DEBUG: Received savedImageMap:`, savedImageMap);

  // Explicit check before accessing might prevent crash, but hides the root cause
  if (typeof feedbackGivenMap === 'undefined' || typeof savedImageMap === 'undefined') {
      console.error(`ERROR in ImageNode for ${image?.id}: feedbackGivenMap or savedImageMap is undefined!`);
      // You might return null or a placeholder here to avoid crashing during debug
      // return <div>Error loading status maps for {image?.id}</div>;
  }
  // ******** DEBUG END ********

  const [isExpanded, setIsExpanded] = useState(true);

  const directVariants = variantMap.get(image.id) || [];
  const hasVariants = directVariants.length > 0;

  const toggleExpand = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasVariants) {
        setIsExpanded(prev => !prev);
    }
  }, [hasVariants]);

  const feedbackGiven = feedbackGivenMap[image.id] ?? false;
  const isSaved = savedImageMap[image.id] ?? false;

  return (
    // Outermost container is now a flex row, aligning items at the start
    <div className={`flex items-start gap-4 p-2`}> {/* Use gap for spacing */}

      {/* 1. Parent Node Section (Card + Optional Toggle) */}
      <div className="flex flex-col items-center flex-shrink-0"> {/* Container for card and its button */}
        <div className="w-full sm:w-auto max-w-xs"> {/* Control card width */}
          <DesignCard
            image={image}
            feedbackGiven={feedbackGiven}
            isSaved={isSaved}
            onFeedback={onFeedback}
            onSave={onSave}
            onRefine={onRefine}
            onModify={onModify}
          />
        </div>
        {/* Expand/Collapse button below the card if it has variants */}
        {hasVariants && (
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleExpand}
            className="mt-1 text-muted-foreground hover:text-foreground"
            aria-label={isExpanded ? "收起變體" : "展開變體"}
          >
            {isExpanded ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronRight className="h-4 w-4 mr-1" />}
            <span>{isExpanded ? `收起 ${directVariants.length} 個變體` : `展開 ${directVariants.length} 個變體`}</span>
          </Button>
        )}
      </div>

      {/* Optional: Visual connector (simple example) */}
       {hasVariants && isExpanded && (
            <div className="pt-16"> {/* Adjust vertical alignment */}
                 <CornerDownRight className="h-6 w-6 text-muted-foreground" />
            </div>
       )}

      {/* 2. Children Variants Section (Rendered Horizontally) */}
      {hasVariants && isExpanded && (
         // This container uses flex to lay out children horizontally
        <div className="flex items-start space-x-4 pt-4 pl-2 border-l border-dashed border-muted"> {/* Horizontal layout for children + border */}
          {directVariants.map(variant => (
            <ImageNode // Recursive call
              key={variant.id}
              image={variant}
              variantMap={variantMap}
              level={level + 1} // Pass level down
              feedbackGivenMap={feedbackGivenMap}
              savedImageMap={savedImageMap}
              onFeedback={onFeedback}
              onSave={onSave}
              onRefine={onRefine}
              onModify={onModify}
            />
          ))}
        </div>
      )}
    </div>
  );
}