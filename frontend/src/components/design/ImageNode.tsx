// src/components/design/ImageNode.tsx
import React, { useState } from 'react';
import { GeneratedImage } from '@/services/api/types';
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ThumbsDown, ThumbsUp, WandSparkles, Pencil, Save, ChevronDown, ChevronRight } from "lucide-react";

interface ImageNodeProps {
  image: GeneratedImage;
  variantMap: Map<string, GeneratedImage[]>;
  level: number; // Nesting level for indentation/styling
  // Handlers
  onFeedback: (imageId: string, isPositive: boolean) => void;
  onSave: (imageId: string) => void;
  onRefine: (imageId: string) => void;
  onModify: (imageId: string) => void;
}

export function ImageNode({
  image,
  variantMap,
  level,
  onFeedback,
  onSave,
  onRefine,
  onModify
}: ImageNodeProps) {

  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, boolean>>({});
  const [isExpanded, setIsExpanded] = useState(true); // State to control variant visibility

  const directVariants = variantMap.get(image.id) || [];
  const hasVariants = directVariants.length > 0;

  const handleFeedback = (imageId: string, isPositive: boolean) => {
    setFeedbackGiven(prev => ({ ...prev, [imageId]: true }));
    onFeedback(imageId, isPositive);
  };

  const toggleExpand = () => {
    if (hasVariants) {
        setIsExpanded(!isExpanded);
    }
  };

  return (
    <div className={`ml-${level * 4} p-3 border-l-2 ${level > 0 ? 'border-muted pl-4 mt-2' : 'border-transparent'}`}> {/* Indentation and border */}
      <div className="group relative overflow-hidden rounded-lg border shadow-sm transition-shadow hover:shadow-md mb-2 w-full sm:w-64 md:w-72 inline-block align-top"> {/* Adjust width as needed */}
          {/* --- Image Display --- */}
          <img
            src={image.url}
            alt={`Generated design ${image.id.substring(0, 6)}`}
            className="w-full h-auto object-cover aspect-square transition-transform duration-300 ease-in-out group-hover:scale-105"
            loading="lazy"
          />
          {/* --- Action Buttons Overlay --- */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center p-1">
             <TooltipProvider delayDuration={100}>
                 <div className="flex justify-center items-center gap-1 bg-card/80 backdrop-blur-sm p-1 rounded-md">
                    {/* Feedback */}
                    <Tooltip>
                      <TooltipTrigger asChild><Button variant="ghost" size="icon-xs" onClick={() => handleFeedback(image.id, true)} disabled={feedbackGiven[image.id]} className="text-white hover:bg-primary/30 h-6 w-6"><ThumbsUp className="h-3 w-3" /></Button></TooltipTrigger>
                      <TooltipContent><p>喜歡</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild><Button variant="ghost" size="icon-xs" onClick={() => handleFeedback(image.id, false)} disabled={feedbackGiven[image.id]} className="text-white hover:bg-destructive/30 h-6 w-6"><ThumbsDown className="h-3 w-3" /></Button></TooltipTrigger>
                       <TooltipContent><p>不喜歡</p></TooltipContent>
                    </Tooltip>
                    {/* Refine */}
                    <Tooltip>
                       <TooltipTrigger asChild><Button variant="ghost" size="icon-xs" onClick={() => onRefine(image.id)} className="text-white hover:bg-blue-500/30 h-6 w-6"><WandSparkles className="h-3 w-3" /></Button></TooltipTrigger>
                       <TooltipContent><p>生成變體</p></TooltipContent>
                    </Tooltip>
                    {/* Modify */}
                     <Tooltip>
                       <TooltipTrigger asChild><Button variant="ghost" size="icon-xs" onClick={() => onModify(image.id)} className="text-white hover:bg-green-500/30 h-6 w-6"><Pencil className="h-3 w-3" /></Button></TooltipTrigger>
                       <TooltipContent><p>以此修改</p></TooltipContent>
                     </Tooltip>
                    {/* Save */}
                    <Tooltip>
                       <TooltipTrigger asChild><Button variant="ghost" size="icon-xs" onClick={() => onSave(image.id)} className="text-white hover:bg-yellow-500/30 h-6 w-6"><Save className="h-3 w-3" /></Button></TooltipTrigger>
                       <TooltipContent><p>儲存</p></TooltipContent>
                    </Tooltip>
                 </div>
             </TooltipProvider>
          </div>
          {/* --- Expand/Collapse Toggle --- */}
          {hasVariants && (
              <button
                  onClick={toggleExpand}
                  className="absolute top-1 right-1 bg-card/70 backdrop-blur-sm rounded-full p-0.5 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  aria-label={isExpanded ? "收起變體" : "展開變體"}
              >
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
          )}
      </div>

      {/* --- Recursive Rendering of Variants --- */}
      {hasVariants && isExpanded && (
        <div className="mt-2"> {/* Container for children */}
          {/* Optional: Add a small indicator line */}
          {/* <div className="border-l-2 border-muted pl-4"> */}
              {directVariants.map(variant => (
                <ImageNode
                  key={variant.id}
                  image={variant}
                  variantMap={variantMap}
                  level={level + 1} // Increase level for children
                  onFeedback={onFeedback}
                  onSave={onSave}
                  onRefine={onRefine}
                  onModify={onModify}
                />
              ))}
          {/* </div> */}
        </div>
      )}
    </div>
  );
}
// Note: You might need to configure Tailwind CSS JIT to recognize dynamic classes like `ml-4`, `ml-8` etc.
// or define them explicitly if using standard Tailwind. Add `size-icon-xs` to global CSS if needed.
// Example: .size-icon-xs { @apply h-6 w-6; }