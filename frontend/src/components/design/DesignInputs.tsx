// frontend/src/components/design/DesignInputs.tsx

import { FileText, Loader2 } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react"; // 加入 useCallback
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Label } from "../ui/label";
import { Button } from "../ui/button";

// --- Interfaces and Constants ---
interface GeneratedImage { url: string; id: string; }
interface PollResult { status: "processing" | "succeeded" | "failed"; image_url?: string; error?: string; }
const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL || "http://127.0.0.1:8000";
const API_GENERATE_ENDPOINT = `${BACKEND_API_URL}/api/generate`;
const MAX_UPLOAD_SIZE_MB = 5;
const POLLING_INTERVAL = 4000;
const MAX_POLLING_ATTEMPTS = 30;
// -----------------------------

export function DesignInputs() {
  // --- State Declarations ---
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [style, setStyle] = useState("");
  const [color, setColor] = useState("");
  const [lighting, setLighting] = useState("no");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingAttemptsRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  // --- Cleanup Function ---
  // 使用 useCallback 包裝 stopPolling，避免在 useEffect 中產生依賴變化警告
  const stopPolling = useCallback((reason: string, requestIdToClear?: string) => {
    // 只有當這個停止請求是針對當前正在進行的請求時才更新狀態
    // 或者無條件停止（例如元件卸載）
    if (requestIdToClear === undefined || currentRequestId === requestIdToClear) {
        if (pollingIntervalRef.current) {
            console.log(`Stopping polling for ${requestIdToClear ?? 'any active interval'}. Reason: ${reason}`);
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
        setIsGenerating(false);
        // 只有在確認是當前請求結束時才清除 ID
        if (currentRequestId === requestIdToClear) {
             setCurrentRequestId(null);
        }
    } else {
        console.log(`Received stop request for ${requestIdToClear}, but current ID is ${currentRequestId}. Ignoring stop.`);
    }
  }, [currentRequestId]); // 依賴 currentRequestId

  // --- Cleanup polling on component unmount ---
  useEffect(() => {
    return () => {
      // 元件卸載時，無條件停止任何進行中的輪詢
      stopPolling("Component unmounted");
    };
  }, [stopPolling]); // 依賴 useCallback 包裝過的 stopPolling


  // --- File Handling & Keyword Appending ---
  const keywords = ["Hexagonal Mesh", "Brushed Aluminum", "Tempered Glass", "CM Logo", "High Airflow Vents", "RGB Strip"];
  const appendKeyword = (keyword: string) => {
    const currentDescription = description;
    // 考慮使用 | 或 , 作為分隔符可能比空格更好
    const separator = currentDescription ? " | " : "";
    const newText = `${currentDescription}${separator}${keyword}`;
    setDescription(newText);
  };

  // -----------------------------------------------------


  // --- Polling Function (被 setInterval 調用) ---
  // 使用 useCallback 並傳入依賴項，確保函數在依賴不變時引用穩定
  const poll = useCallback(async (requestId: string) => {
    // 在函數開頭立即檢查 ID 是否匹配，如果不匹配則提前停止
    if (currentRequestId !== requestId) {
        console.log(`Poll function called for ${requestId}, but state's currentRequestId is ${currentRequestId}. Stopping this poll instance.`);
        stopPolling("Request ID mismatch", requestId); // 嘗試停止對應的 interval
        return;
    }

    pollingAttemptsRef.current += 1;
    const attempt = pollingAttemptsRef.current; // 保存當前嘗試次數
    console.log(`Polling attempt ${attempt}/${MAX_POLLING_ATTEMPTS} for ${requestId}...`);

    if (attempt > MAX_POLLING_ATTEMPTS) {
        console.warn(`Polling timed out for ${requestId}.`);
        toast({ title: "查詢超時", description: "生成可能仍在進行，請稍後查看。", variant: "warning" });
        stopPolling("Timeout", requestId);
        return;
    }

    try {
      const response = await fetch(`${API_GENERATE_ENDPOINT}/${requestId}`);

      // 再次檢查 ID 是否在 fetch 返回後仍然匹配，防止請求過程中 ID 已改變
      if (currentRequestId !== requestId) {
          console.log(`Request ID changed during fetch for ${requestId}. Stopping poll.`);
          stopPolling("Request ID changed during fetch", requestId);
          return;
      }

      if (!response.ok && response.status !== 404) {
         const errorText = await response.text();
         throw new Error(`Polling request failed: ${response.status} - ${errorText}`);
      }
      if (response.status === 404) {
          console.log(`Status 404 for ${requestId}, assuming still processing...`);
          // 404 繼續輪詢，不需停止
          return;
      }

      const result: PollResult = await response.json();
      console.log(`Polling result for ${requestId} (Attempt ${attempt}):`, result);

      if (result.status === "succeeded") {
        console.log(`Generation Succeeded for ${requestId}! URL: ${result.image_url}`);
        if (result.image_url) {
          window.dispatchEvent(new CustomEvent("designGenerated", { detail: { images: [{ url: result.image_url, id: `${requestId}-0` }] } }));
          toast({ title: "🎉 生成成功！" });
        } else {
           toast({ title: "處理異常", description: "後端狀態成功但未返回圖片 URL。", variant: "warning" });
        }
        stopPolling("Succeeded", requestId); // 成功，停止輪詢

      } else if (result.status === "failed") {
        console.error(`Generation Failed for ${requestId}: ${result.error}`);
        toast({ title: "生成失敗", description: result.error || "未知後端錯誤", variant: "destructive" });
        stopPolling("Failed", requestId); // 失敗，停止輪詢

      } else if (result.status === "processing") {
        console.log(`Status for ${requestId} is still 'processing'...`);
        // 狀態仍在處理中，等待下一次 interval
      } else {
         console.warn(`Unknown status received for ${requestId}: ${result.status}`);
         toast({ title: "收到未知狀態", description: `後端返回狀態: ${result.status}`, variant: "destructive" });
         stopPolling("Unknown Status", requestId); // 未知狀態，停止輪詢
      }

    } catch (error) {
      console.error(`Polling error for ${requestId} (Attempt ${attempt}):`, error);
      toast({ title: "查詢結果出錯", description: error.message, variant: "destructive" });
      stopPolling("Fetch Error", requestId); // 發生錯誤，停止輪詢
    }
  }, [currentRequestId, toast, stopPolling]); // poll 函數依賴這些

    // --- *** 新增：useEffect Hook 來啟動輪詢 *** ---
    useEffect(() => {
      // 只有當 currentRequestId 有值 (表示剛提交新請求) 且 isGenerating 是 true 時才啟動輪詢
      if (currentRequestId && isGenerating) {
          console.log(`useEffect detected new currentRequestId: ${currentRequestId}. Starting polling.`);
          // 清理可能存在的舊 interval (雙重保險)
          if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
          }
          // 重置嘗試次數
          pollingAttemptsRef.current = 0;
          // 立即執行一次檢查
          poll(currentRequestId);
          // 設定 Interval，並將 ID 存入 Ref
          // 將 currentRequestId 傳給 poll 函數的閉包
          pollingIntervalRef.current = setInterval(() => poll(currentRequestId), POLLING_INTERVAL);
      }
  
      // 這個 effect 的清理函數會在 currentRequestId 改變或元件卸載時執行
      // 但主要的清理工作已交給 stopPolling
      return () => {
          // 可以在這裡也加一道保險，但 stopPolling 應該已經處理了
          // if (pollingIntervalRef.current) {
          //    clearInterval(pollingIntervalRef.current);
          // }
      };
    }, [currentRequestId, isGenerating, poll]); // *** 監聽 currentRequestId 和 isGenerating 的變化 ***
    // ---------------------------------------------

  // --- Generate Button Handler ---
  const handleGenerate = async () => {
    // 1. 輸入驗證
    if (!description) { toast({ title: "請輸入設計描述", variant: "destructive" }); return; }
    if (!style) { toast({ title: "請選擇風格", variant: "destructive" }); return; }
    if (!color) { toast({ title: "請選擇顏色", variant: "destructive" }); return; }

    // 2. 停止舊輪詢並準備新請求
    stopPolling("New request started by user"); // 清理舊狀態和 interval

    setIsGenerating(true); // **設置 Loading 狀態**
    // setCurrentRequestId(null); // stopPolling 會處理
    window.dispatchEvent(new CustomEvent("designGenerated", { detail: { images: [] } })); // 清空上次結果

    // 3. 建立 FormData
    const formData = new FormData();
    formData.append('description', description);
    formData.append('style', style);
    formData.append('colors', color);
    formData.append('lighting', lighting);
    if (selectedFile) { formData.append('images', selectedFile, selectedFile.name); }

    // 4. 發送 POST 請求
    try {
      console.log("Sending POST /api/generate request...");
      const response = await fetch(API_GENERATE_ENDPOINT, { method: "POST", body: formData });

      if (!response.ok) { /* ... 處理錯誤 (同之前) ... */ throw new Error(`請求提交失敗: ${response.status}`); }

      const data = await response.json();
      console.log("Generation task submitted response:", data);

      if (data.status === "succeeded" && data.request_id) {
        const newRequestId = data.request_id;
        toast({ title: "✅ 請求已提交", description: `開始檢查結果...` });
        // **關鍵：只設定 Request ID state，讓 useEffect 去啟動輪詢**
        setCurrentRequestId(newRequestId);
        // **不再直接呼叫 poll 或 pollForResult**

      } else { throw new Error(data.error || "後端未返回有效的 request_id。"); }

    } catch (error) {
      console.error("Failed to call POST /api/generate:", error);
      toast({ title: "提交生成請求失敗", description: error.message, variant: "destructive" });
      setIsGenerating(false); // **初始請求失敗時結束 Loading**
      setCurrentRequestId(null); // 清除 ID
    }
    // **Loading 狀態由 poll 或 stopPolling 結束**
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (file) {
    if (file.size > MAX_UPLOAD_SIZE_MB * 1024 * 1024) {
      toast({
        title: "檔案太大",
        description: `檔案大小不能超過 ${MAX_UPLOAD_SIZE_MB} MB`,
        variant: "destructive",
      });
      return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }
};

  // --- JSX Return ---
  return (
    <div className="space-y-6">
      {/* Design Description */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm">
          <FileText className="h-4 w-4" />
          📝 設計描述 (Design Description)
        </Label>
        <Textarea 
          placeholder="請描述您的設計概念..."
          className="min-h-[120px] bg-background/50"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          ref={textareaRef}
        />
      </div>

      {/* Keywords Section */}
      <div className="space-y-2">
        <Label className="text-sm">💡 點選加入提示詞 (可選)</Label>
        <div className="flex flex-wrap gap-2">
          {keywords.map((keyword) => (
            <Button
              key={keyword}
              variant="outline"
              size="sm"
              onClick={() => appendKeyword(keyword)}
              className="bg-background/50 hover:bg-primary/20"
            >
              {keyword}
            </Button>
          ))}
        </div>
      </div>

      {/* Style Dropdown */}
      <div className="space-y-2">
        <Label className="text-sm">🎨 風格 (Style)</Label>
        <Select value={style} onValueChange={setStyle}>
          <SelectTrigger>
            <SelectValue placeholder="選擇風格..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gaming">Gaming</SelectItem>
            <SelectItem value="minimalist">Minimalist</SelectItem>
            <SelectItem value="highairflow">High Airflow</SelectItem>
            <SelectItem value="silent">Silent</SelectItem>
            <SelectItem value="futuristic">Futuristic</SelectItem>
            <SelectItem value="industrial">Industrial</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Color Dropdown */}
      <div className="space-y-2">
        <Label className="text-sm">🌈 主要顏色 (Color)</Label>
        <Select value={color} onValueChange={setColor}>
          <SelectTrigger>
            <SelectValue placeholder="選擇顏色..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="black">Black</SelectItem>
            <SelectItem value="white">White</SelectItem>
            <SelectItem value="silver">Silver</SelectItem>
            <SelectItem value="gray">Gray</SelectItem>
            <SelectItem value="gunmetal">Gunmetal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lighting Radio Buttons */}
      <div className="space-y-2">
        <Label className="text-sm">💡 是否有燈效 (Lighting)</Label>
        <RadioGroup value={lighting} onValueChange={setLighting} className="flex gap-4">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="yes" />
            <Label htmlFor="yes">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="no" />
            <Label htmlFor="no">No</Label>
          </div>
        </RadioGroup>
      </div>

      {/* File Upload */}
      <div className="space-y-2">
        <Label className="text-sm">
          🚀 上傳參考圖片/草圖 (可選)
        </Label>
        <div className="flex flex-col gap-4">
          <input
            type="file"
            accept=".png,.jpg,.jpeg,.webp"
            onChange={handleFileChange}
            className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0
            file:text-sm file:font-semibold file:bg-primary/10 file:text-primary
            hover:file:bg-primary/20 cursor-pointer"
          />
          {imagePreview && (
            <div className="relative w-40 h-40">
              <img
                src={imagePreview}
                alt="Preview"
                className="rounded-lg object-cover w-full h-full"
              />
            </div>
          )}
        </div>
      </div>

      {/* Generate Button */}
      <Button 
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
        size="lg"
        onClick={handleGenerate}
      >
        ✨ 生成設計概念圖
      </Button>
    </div>
  );
}