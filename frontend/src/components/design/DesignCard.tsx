// src/components/design/DesignCard.tsx
import React from "react";
import { Save, RefreshCcw, Edit, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "../ui/button"; // VERIFY PATH
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip"; // VERIFY PATH
import { Card, CardContent } from "../ui/card"; // VERIFY PATH
import { dImage } from '@/services/api/types'; // VERIFY PATH

interface DesignCardProps {
  image: dImage;
  feedbackGiven: boolean;
  isSaved: boolean;
  onFeedback: (imageId: string, isPositive: boolean) => void;
  onSave: (imageId: string) => void;
  onRefine: (imageId: string) => void;
  onModify: (imageId: string) => void;
}

export function DesignCard({
  image,
  feedbackGiven,
  isSaved,
  onFeedback,
  onSave,
  onRefine,
  onModify
}: DesignCardProps) {
  return (
    <TooltipProvider delayDuration={100}>
      <Card className="overflow-hidden flex flex-col h-full shadow-md hover:shadow-lg transition-shadow duration-200 bg-card w-64"> {/* Fixed width example */}
        <CardContent className="p-0 flex-1 flex flex-col">
          {/* Image Container - Set fixed height or aspect ratio for consistency */}
          <div className="relative w-full aspect-square bg-muted/30 overflow-hidden"> {/* Fixed aspect ratio */}
            <img
              src={image.url}
              alt={`d design ${image.id.substring(0, 6)}`}
              // --- 使用 object-contain 避免擠壓 ---
              className="w-full h-full object-contain"
              // ------------------------------------
              loading="lazy"
            />
          </div>
          {/* Actions Footer */}
          <div className="flex justify-between items-center p-2 border-t bg-background/90 backdrop-blur-sm">
             {/* Feedback Actions */}
             <div className="flex gap-1">
                {/* ThumbsUp Button */}
                <Tooltip>
                    <TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => onFeedback(image.id, true)} disabled={feedbackGiven} className="h-8 w-8 text-muted-foreground hover:text-green-500 hover:bg-green-500/10 disabled:opacity-50"><ThumbsUp className="h-4 w-4" /></Button></TooltipTrigger>
                    <TooltipContent><p>喜歡</p></TooltipContent>
                </Tooltip>
                {/* ThumbsDown Button */}
                 <Tooltip>
                    <TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => onFeedback(image.id, false)} disabled={feedbackGiven} className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 disabled:opacity-50"><ThumbsDown className="h-4 w-4" /></Button></TooltipTrigger>
                    <TooltipContent><p>不喜歡</p></TooltipContent>
                 </Tooltip>
             </div>
             {/* Main Actions */}
             <div className="flex gap-1">
                 {/* Save Button */}
                  <Tooltip>
                    <TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => onSave(image.id)} disabled={isSaved} className={`h-8 w-8 text-muted-foreground hover:text-primary ${isSaved ? 'text-primary' : ''}`}><Save className="h-4 w-4" /></Button></TooltipTrigger>
                    <TooltipContent><p>{isSaved ? '已收藏' : '收藏'}</p></TooltipContent>
                  </Tooltip>
                  {/* Refine Button */}
                  <Tooltip>
                     <TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => onRefine(image.id)} className="h-8 w-8 text-muted-foreground hover:text-blue-500"><RefreshCcw className="h-4 w-4" /></Button></TooltipTrigger>
                     <TooltipContent><p>生成變體</p></TooltipContent>
                  </Tooltip>
                  {/* Modify Button */}
                  <Tooltip>
                     <TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => onModify(image.id)} className="h-8 w-8 text-muted-foreground hover:text-orange-500"><Edit className="h-4 w-4" /></Button></TooltipTrigger>
                     <TooltipContent><p>修改</p></TooltipContent>
                  </Tooltip>
             </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}