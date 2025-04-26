// src/components/design/DesignNode.tsx
import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { GeneratedImage } from '@/services/api/types';
import { DesignCard } from './DesignCard'; // Import your DesignCard

// Define the structure of the data passed to the node
export interface DesignNodeData {
  image: GeneratedImage;
  feedbackGivenMap: Record<string, boolean>;
  savedImageMap: Record<string, boolean>;
  onFeedback: (imageId: string, isPositive: boolean) => void;
  onSave: (imageId: string) => void;
  onRefine: (imageId: string) => void;
  onModify: (imageId: string) => void;
}

// Use memo for performance optimization with react-flow
const DesignNode: React.FC<NodeProps<DesignNodeData>> = ({ data }) => {
  if (!data) {
    // Handle case where data might be missing, though react-flow usually ensures it
    console.error("DesignNode received invalid props: data is missing");
    return <div>Error: Missing node data</div>;
   }

   const {
       image,
       feedbackGivenMap,
       savedImageMap,
       onFeedback,
       onSave,
       onRefine,
       onModify
   } = data;

   // Determine status for this specific card
   const feedbackGiven = feedbackGivenMap[image.id] ?? false;
   const isSaved = savedImageMap[image.id] ?? false;

  return (
    <>
      {/* Target Handle (Left side for incoming connection from parent) */}
      <Handle
        type="target"
        position={Position.Left}
        id={`target-${image.id}`}
        style={{ background: '#555', width: '8px', height: '8px' }} // Basic styling
        isConnectable={false} // Typically false if layout is automatic
      />

      {/* Render your existing DesignCard */}
      {/* Ensure DesignCard doesn't have excessive margins */}
      <div style={{ width: 256 }}> {/* Optional: Enforce width consistency */}
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

      {/* Source Handle (Right side for outgoing connections to children) */}
      <Handle
        type="source"
        position={Position.Right}
        id={`source-${image.id}`}
        style={{ background: '#555', width: '8px', height: '8px' }} // Basic styling
        isConnectable={false} // Typically false if layout is automatic
      />
    </>
  );
};

export default memo(DesignNode); // Use memo for performance