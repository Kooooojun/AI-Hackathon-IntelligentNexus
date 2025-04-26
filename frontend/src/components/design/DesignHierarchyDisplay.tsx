// src/components/design/DesignHierarchyDisplay.tsx
import React from 'react';
import { GeneratedImage } from '@/services/api/types'; // VERIFY PATH
import { ImageNode } from './ImageNode'; // VERIFY PATH
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"; // VERIFY PATH - Import ScrollBar

interface DesignHierarchyDisplayProps {
  isLoading: boolean;
  initialImages: GeneratedImage[];
  variantMap: Map<string, GeneratedImage[]>; // parentId -> children[]
  feedbackGivenMap: Record<string, boolean>;
  savedImageMap: Record<string, boolean>;
  onFeedback: (imageId: string, isPositive: boolean) => void;
  onSave: (imageId: string) => void;
  onRefine: (imageId: string) => void;
  onModify: (imageId: string) => void;
}

export function DesignHierarchyDisplay({
  isLoading,
  initialImages,
  variantMap,
  feedbackGivenMap,
  savedImageMap,
  onFeedback,
  onSave,
  onRefine,
  onModify
}: DesignHierarchyDisplayProps) {

  if (isLoading) {
     return ( <div className="flex items-center justify-center h-[calc(100%-4rem)]"> <div className="animate-pulse text-primary text-lg">載入中...</div> </div> );
   }

  if (initialImages.length === 0 && variantMap.size === 0) {
     return ( <div className="flex items-center justify-center h-[calc(100%-4rem)]"> <p className="text-muted-foreground text-center py-8">尚未生成任何設計，請使用左側面板開始。</p> </div> );
  }

  return (
    // Use ScrollArea with HORIZONTAL scrolling capability
     <ScrollArea className="w-full h-full whitespace-nowrap"> {/* Allow horizontal scrolling, prevent wrapping */}
         {/* Use an inner div that can grow horizontally */}
         <div className="inline-flex space-x-6 p-4 h-full"> {/* Use inline-flex and space-x for horizontal layout of initial nodes */}
           {initialImages.map(image => (
             <ImageNode
               key={image.id}
               image={image}
               variantMap={variantMap}
               level={0}
               feedbackGivenMap={feedbackGivenMap}
               savedImageMap={savedImageMap}
               onFeedback={onFeedback}
               onSave={onSave}
               onRefine={onRefine}
               onModify={onModify}
             />
           ))}

            {initialImages.length === 0 && variantMap.size > 0 && ( <p className="text-muted-foreground text-center py-4 self-center">正在顯示變體結果。</p> )}
         </div>
         {/* Add the horizontal scrollbar */}
         <ScrollBar orientation="horizontal" />
      </ScrollArea>
  );
}