// src/components/design/ImageNode.tsx
import React, { useState, useCallback, useRef, useLayoutEffect } from 'react'; // Import useRef, useLayoutEffect
import { FeedbackPayload, SaveDesignPayload, GeneratedImage, DesignParameters, ApiService, StartGenerationResponse, JobStatusResponse, FeedbackResponse, SaveDesignResponse } from '@/services/api/types'; // VERIFY PATH & Types
import { DesignCard } from './DesignCard'; // VERIFY PATH
import { Button } from "@/components/ui/button"; // VERIFY PATH
import { Layers, GitBranch, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// --- React Flow Imports ---
import { Node, Edge, Position, MarkerType } from 'reactflow'; // Import types
import { FlowDisplay } from './design/FlowDisplay'; // Import the new display component
import { DesignNodeData } from "./design/DesignNode"; // Import node data type

// --- Layout Constants (Adjust these based on DesignCard size and desired spacing) ---
const NODE_WIDTH = 256 + 30; // Card width (e.g., 256px from DesignNode) + horizontal spacing
const NODE_HEIGHT = 350 + 40; // Estimated Card height + vertical spacing

interface ImageNodeProps {
  image: GeneratedImage;
  variantMap: Map<string, GeneratedImage[]>;
  level: number;
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
  level,
  feedbackGivenMap,
  savedImageMap,
  onFeedback,
  onSave,
  onRefine,
  onModify
}: ImageNodeProps) {

  const [showChildren, setShowChildren] = useState(true); // Default expanded
  const [svgPaths, setSvgPaths] = useState<SvgPathData[]>([]); // State to store calculated SVG paths

  // Refs to measure element positions
  const nodeContainerRef = useRef<HTMLDivElement>(null); // Ref for the main container of this node
  const parentCardRef = useRef<HTMLDivElement>(null); // Ref for the parent's card container
  const childrenContainerRef = useRef<HTMLDivElement>(null); // Ref for the container holding children nodes

  const directVariants = variantMap.get(image.id) || [];
  const hasVariants = directVariants.length > 0;

  const toggleChildren = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasVariants) { setShowChildren(prev => !prev); }
  }, [hasVariants]);

  // --- Calculate SVG Paths using useLayoutEffect ---
  // useLayoutEffect runs synchronously after DOM mutations but before paint
  useLayoutEffect(() => {
    if (hasVariants && showChildren && nodeContainerRef.current && parentCardRef.current && childrenContainerRef.current) {
      const nodeRect = nodeContainerRef.current.getBoundingClientRect();
      const parentRect = parentCardRef.current.getBoundingClientRect();
      const childrenRect = childrenContainerRef.current.getBoundingClientRect();

      // --- Connection Points Calculation ---
      // Parent connection point (e.g., middle right of the card)
      // Coordinates relative to the nodeContainerRef's top-left
      const startX = parentRect.right - nodeRect.left;
      const startY = parentRect.top + parentRect.height / 2 - nodeRect.top;

      // Children connection points (e.g., middle left of the children container)
      // This is a simplification. For precise lines to each child card,
      // you'd need refs on each child and calculate their positions.
      const endX = childrenRect.left - nodeRect.left;
      const endY = childrenRect.top + childrenRect.height / 2 - nodeRect.top; // Midpoint of container
      const endYTop = childrenRect.top - nodeRect.top + 10; // Near top of container (example offset)
      const endYBottom = childrenRect.bottom - nodeRect.top - 10; // Near bottom of container (example offset)


      // --- Calculate Path Data (Example: Simple Elbow Connector) ---
      const newPaths: SvgPathData[] = [];
      const midX = startX + (endX - startX) / 2; // Horizontal midpoint for the turn

      // Example: One path from parent middle-right to children container middle-left
      newPaths.push({
          id: `${image.id}-connector`,
          // M = Move To, H = Horizontal Line To, V = Vertical Line To
          d: `M ${startX} ${startY} H ${midX} V ${endY} H ${endX}`
      });

      // --- OPTIONAL: More complex paths to individual children ---
      // If you had refs for each child card (childRefs):
      // directVariants.forEach((child, index) => {
      //   const childRef = childRefs.current[index];
      //   if (childRef) {
      //     const childRect = childRef.getBoundingClientRect();
      //     const childEndX = childRect.left - nodeRect.left;
      //     const childEndY = childRect.top + childRect.height / 2 - nodeRect.top;
      //     const childMidX = startX + (childEndX - startX) / 2;
      //     newPaths.push({
      //       id: `${image.id}-to-${child.id}`,
      //       d: `M ${startX} ${startY} H ${childMidX} V ${childEndY} H ${childEndX}`
      //     });
      //   }
      // });


      setSvgPaths(newPaths);
    } else {
      // Clear paths if children are hidden or don't exist
      setSvgPaths([]);
    }
    // Rerun effect if children visibility changes or potentially on resize (requires ResizeObserver)
  }, [hasVariants, showChildren, image.id, directVariants]); // Dependencies


  const feedbackGiven = feedbackGivenMap[image.id] ?? false;
  const isSaved = savedImageMap[image.id] ?? false;

  return (
    // Main container for the node, needed for relative positioning of SVG potentially
    <div ref={nodeContainerRef} className="flex items-start relative py-2"> {/* Added relative */}

      {/* 1. Current Node (Card + Toggle Button) */}
      {/* Wrap card in a div with ref for measurement */}
      <div ref={parentCardRef} className="flex-shrink-0 z-10"> {/* Ensure card is above SVG lines */}
        <DesignCard
          image={image}
          feedbackGiven={feedbackGiven}
          isSaved={isSaved}
          onFeedback={onFeedback}
          onSave={onSave}
          onRefine={onRefine}
          onModify={onModify}
        />
         {/* Toggle Button */}
         {hasVariants && (
           <Button
             variant="outline"
             size="icon"
             onClick={toggleChildren}
             // Adjusted positioning: maybe centered below card?
             className="absolute left-1/2 -translate-x-1/2 -bottom-3 z-20 h-6 w-6 rounded-full bg-background hover:bg-muted border shadow-md p-0"
             aria-label={showChildren ? "隱藏變體" : "顯示變體"}
           >
             {showChildren ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
           </Button>
         )}
      </div>

      {/* --- SVG Canvas for Connectors --- */}
      {/* Positioned absolutely to span between parent and child areas */}
      {/* Dimensions need to be calculated or large enough */}
      {svgPaths.length > 0 && (
          <svg
              // Adjust positioning and size carefully
              className="absolute top-0 left-0 w-full h-full pointer-events-none z-0"
              // preserveAspectRatio="none" // Or adjust viewBox dynamically
          >
             {/* Add padding/offset to path coordinates if SVG isn't perfectly aligned */}
             {svgPaths.map(path => (
                <path
                    key={path.id}
                    d={path.d}
                    stroke="hsl(var(--primary))" // Use theme color
                    strokeWidth="2" // Thicker line
                    fill="none"
                    // Optional: add markers, dasharray etc.
                    // markerEnd="url(#arrow)"
                />
             ))}
             {/* Optional: Define markers like arrowheads */}
             {/* <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--primary))" />
                </marker>
             </defs> */}
          </svg>
      )}


      {/* 2. Children Branch Container */}
      {/* Needs ref for measurement. Position relative to parent via flex gap/margin */}
      {hasVariants && showChildren && (
        <div ref={childrenContainerRef} className="flex flex-col space-y-4 pl-8 pt-4 ml-8"> {/* Added margin-left */}
          {directVariants.map((variant, index) => (
             // TODO: Need refs on these children if drawing lines *to* them individually
             // Could wrap ImageNode in a div with a ref managed by parent
            <ImageNode
              key={variant.id}
              image={variant}
              variantMap={variantMap}
              level={level + 1}
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