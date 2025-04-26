// src/components/design/DesignHierarchyDisplay.tsx
import React from 'react';
import { GeneratedImage } from '@/services/api/types'; // VERIFY PATH
import { ImageNode } from './ImageNode'; // VERIFY PATH
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"; // VERIFY PATH

interface DesignHierarchyDisplayProps {
  isLoading: boolean;
  initialImages: GeneratedImage[];
  variantMap: Map<string, GeneratedImage[]>;
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
     return ( <div className="flex items-center justify-center h-[calc(100%-4rem)]"> <p className="text-muted-foreground text-center py-8">尚未生成任何設計。</p> </div> );
  }

  return (
    // ScrollArea needs to allow horizontal scroll
     <ScrollArea className="w-full h-full whitespace-nowrap border rounded-md"> {/* Added border for clarity */}
         {/* Inner container uses inline-flex for horizontal layout of roots */}
         <div className="inline-flex space-x-6 p-4 h-full">
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
         {/* Ensure ScrollBar is present */}
         <ScrollBar orientation="horizontal" />
      </ScrollArea>
  );
}