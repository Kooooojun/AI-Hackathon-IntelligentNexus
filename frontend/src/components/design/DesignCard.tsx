// src/components/design/DesignCard.tsx

import React from "react"; // 建議總是導入 React
import { Save, RefreshCcw, Edit, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "../ui/button"; // VERIFY PATH
import {
  Tooltip,
  TooltipContent,
  TooltipProvider, // 導入 TooltipProvider
  TooltipTrigger,
} from "../ui/tooltip"; // VERIFY PATH
import { Card, CardContent } from "../ui/card"; // VERIFY PATH
import { GeneratedImage } from '@/services/api/types'; // VERIFY PATH

// Props接口定義了組件需要接收的數據和函數
interface DesignCardProps {
  image: GeneratedImage; // 要顯示的圖片對象
  feedbackGiven: boolean; // 是否已對此圖片給予回饋
  isSaved: boolean;      // 此圖片是否已被收藏
  // 事件處理回呼函數
  onFeedback: (imageId: string, isPositive: boolean) => void;
  onSave: (imageId: string) => void;
  onRefine: (imageId: string) => void; // "生成變體" 的回呼
  onModify: (imageId: string) => void; // "修改" 的回呼
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
    // 使用 TooltipProvider 包裹以啟用 Tooltip 功能
    <TooltipProvider delayDuration={100}>
      <Card className="overflow-hidden flex flex-col h-full shadow-md hover:shadow-lg transition-shadow duration-200 bg-card"> {/* Ensure card background */}
        <CardContent className="p-0 flex-1 flex flex-col">
          {/* 圖片容器 - 使用 aspect-square 和 object-cover 確保填滿和比例 */}
          <div className="relative flex-1 aspect-square bg-muted/30">
            <img
              src={image.url}
              alt={`Generated design ${image.id.substring(0, 6)}`}
              className="w-full h-full object-cover" // 使用 object-cover
              loading="lazy" // 延遲加載圖片
            />
          </div>
          {/* 操作按鈕區域 */}
          <div className="flex justify-between items-center p-2 border-t bg-background/90 backdrop-blur-sm">
            {/* 左側：回饋按鈕 */}
            <div className="flex gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onFeedback(image.id, true)}
                    disabled={feedbackGiven} // 如果已給回饋則禁用
                    className="h-8 w-8 text-muted-foreground hover:text-green-500 hover:bg-green-500/10 disabled:opacity-50"
                  >
                    <ThumbsUp className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>喜歡這個設計</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onFeedback(image.id, false)}
                    disabled={feedbackGiven} // 如果已給回饋則禁用
                    className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 disabled:opacity-50"
                  >
                    <ThumbsDown className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>不太滿意</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* 右側：主要操作按鈕 */}
            <div className="flex gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onSave(image.id)}
                    disabled={isSaved} // 如果已收藏則禁用
                    // 如果已收藏，改變圖標顏色
                    className={`h-8 w-8 text-muted-foreground hover:text-primary ${isSaved ? 'text-primary' : ''}`}
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {/* 根據狀態顯示不同提示 */}
                  <p>{isSaved ? '已收藏' : '收藏此設計'}</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRefine(image.id)} // 觸發生成變體
                    className="h-8 w-8 text-muted-foreground hover:text-blue-500"
                  >
                    {/* 使用 RefreshCcw 代表生成變體/Refine */}
                    <RefreshCcw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>生成變體</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onModify(image.id)} // 觸發修改
                    className="h-8 w-8 text-muted-foreground hover:text-orange-500"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>修改並重新生成</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}