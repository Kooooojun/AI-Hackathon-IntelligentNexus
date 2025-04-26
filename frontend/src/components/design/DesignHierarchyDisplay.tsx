// src/components/design/DesignHierarchyDisplay.tsx
import React from 'react';
import { GeneratedImage } from '@/services/api/types';
import { ImageNode } from './ImageNode'; // Import the recursive component

interface DesignHierarchyDisplayProps {
  isLoading: boolean;
  initialImages: GeneratedImage[];
  variantMap: Map<string, GeneratedImage[]>; // parentId -> children[]
  // Handlers to pass down
  onFeedback: (imageId: string, isPositive: boolean) => void;
  onSave: (imageId: string) => void;
  onRefine: (imageId: string) => void;
  onModify: (imageId: string) => void;
}

export function DesignHierarchyDisplay({
  isLoading,
  initialImages,
  variantMap,
  onFeedback,
  onSave,
  onRefine,
  onModify
}: DesignHierarchyDisplayProps) {

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <div className="animate-pulse text-primary text-lg">生成中，請稍候...</div>
      </div>
    );
  }

  if (initialImages.length === 0 && variantMap.size === 0) {
     return (
       <p className="text-muted-foreground text-center py-8">
         尚未生成任何設計，請使用左側面板開始。
       </p>
     );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold mb-4">
         設計結果
      </h2>
      <div className="space-y-4">
        {initialImages.map(image => (
          <ImageNode
            key={image.id}
            image={image}
            variantMap={variantMap}
            level={0} // Initial images are at level 0
            onFeedback={onFeedback}
            onSave={onSave}
            onRefine={onRefine}
            onModify={onModify}
          />
        ))}
      </div>
       {/* Optional: Message if only variants exist but no initial images? */}
       {initialImages.length === 0 && variantMap.size > 0 && (
          <p className="text-muted-foreground text-center py-4">
              正在顯示變體結果。
          </p>
       )}
    </div>
  );
}