// frontend/src/components/design/DesignInputs.tsx

import { FileText, Loader2 } from "lucide-react"; // 確保 Loader2 被 import
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast"; // 假設 useToast hook 路徑正確
import { Textarea } from "../ui/textarea"; // 假設 Shadcn UI 元件路徑正確
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
// import { cn } from "@/lib/utils"; // 如果需要 cn 函數來合併 classNames

// 定義從 API 獲取或傳遞給 MainContent 的圖片結構
interface GeneratedImage {
  url: string;
  id: string;
}

// 定義輪詢結果的結構
interface PollResult {
    status: "processing" | "succeeded" | "failed";
    image_url?: string; // 後端成功時返回
    error?: string;     // 後端失敗時返回
}

// --- 設定值 ---
// 從環境變數讀取後端 URL，提供本地開發的預設值
// !!! 部署前務必在 .env 或環境變數中設定 VITE_BACKEND_API_URL !!!
const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL || "http://127.0.0.1:8000"; // 使用你的後端端口
const API_GENERATE_ENDPOINT = `${BACKEND_API_URL}/api/generate`;

const MAX_UPLOAD_SIZE_MB = 5; // 限制上傳大小 (MB)
const POLLING_INTERVAL = 4000; // 輪詢間隔 (毫秒) - 4 秒
const MAX_POLLING_ATTEMPTS = 30; // 最大輪詢次數 (4 * 30 = 120 秒)

// --- 元件定義 ---
export function DesignInputs() {
  // --- State Declarations ---
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [style, setStyle] = useState(""); // 儲存 Select 的 value
  const [color, setColor] = useState(""); // 儲存 Select 的 value
  const [lighting, setLighting] = useState("no"); // 儲存 RadioGroup 的 value ('yes' or 'no')
  const [isGenerating, setIsGenerating] = useState(false); // Loading 狀態
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null); // 追蹤當前請求 ID
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null); // 儲存輪詢 interval ID
  const fileInputRef = useRef<HTMLInputElement>(null); // 用於清除檔案輸入

  const { toast } = useToast();

  // --- Cleanup polling on component unmount ---
  useEffect(() => {
    // 當元件卸載時清除任何正在進行的輪詢
    return () => {
      if (pollingIntervalRef.current) {
        console.log("DesignInputs unmounting, clearing polling interval.");
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

  // --- File Handling ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
       const fileSizeMB = file.size / (1024 * 1024);
       if (fileSizeMB > MAX_UPLOAD_SIZE_MB) {
           toast({ title: "檔案過大", description: `圖片大小請勿超過 ${MAX_UPLOAD_SIZE_MB}MB。`, variant: "destructive"});
           e.target.value = ''; // 清除選擇
           setSelectedFile(null);
           setImagePreview(null);
           return;
       }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => { setImagePreview(reader.result as string); };
      reader.readAsDataURL(file);
    } else {
        setSelectedFile(null);
        setImagePreview(null);
    }
  };

  const clearFileInput = () => {
      setSelectedFile(null);
      setImagePreview(null);
      // 清除檔案輸入框的視覺顯示
      if (fileInputRef.current) {
          fileInputRef.current.value = '';
      }
  }

  // --- Keyword Appending ---
  const keywords = ["Hexagonal Mesh", "Brushed Aluminum", "Tempered Glass", "CM Logo", "High Airflow Vents", "RGB Strip"];
  const appendKeyword = (keyword: string) => {
    const currentDescription = description;
    // 考慮使用 | 或 , 作為分隔符可能比空格更好
    const separator = currentDescription ? " | " : "";
    const newText = `${currentDescription}${separator}${keyword}`;
    setDescription(newText);
  };

  // --- Polling Function ---
  const pollForResult = async (requestId: string) => {
    let attempts = 0;
    // Loading 狀態應由 handleGenerate 控制

    const poll = async () => {
      // 檢查輪詢是否應該停止 (元件卸載或新的請求開始)
      if (currentRequestId !== requestId || !pollingIntervalRef.current) {
          console.log(`Polling stopped for ${requestId}. Current request ID: ${currentRequestId}`);
          if(pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
          // 只有當這個輪詢是當前活躍的輪詢時才改變 loading 狀態
          if (currentRequestId === requestId) {
             setIsGenerating(false);
             setCurrentRequestId(null);
          }
          return;
      }

      if (attempts >= MAX_POLLING_ATTEMPTS) {
        console.warn(`Polling timed out for ${requestId} after ${attempts} attempts.`);
        toast({ title: "查詢超時", description: "生成可能仍在進行，請稍後或刷新頁面。", variant: "warning" });
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        setIsGenerating(false); // 結束 Loading
        setCurrentRequestId(null);
        return;
      }
      attempts++;
      console.log(`Polling attempt ${attempts}/${MAX_POLLING_ATTEMPTS} for ${requestId}...`);

      try {
        const response = await fetch(`${API_GENERATE_ENDPOINT}/${requestId}`);

        if (!response.ok && response.status !== 404) {
           const errorText = await response.text();
           throw new Error(`Polling failed: ${response.status} - ${errorText}`);
        }
        if (response.status === 404) {
            console.log(`Status 404 for ${requestId}, assuming still processing...`);
            return; // 等待下一次 interval
        }

        const result: PollResult = await response.json();
        console.log(`Polling result for ${requestId}:`, result);

        // ** 只根據 API 回應的 result.status 做判斷 **
        if (result.status === "succeeded") {
          console.log(`Generation Succeeded for ${requestId}! URL: ${result.image_url}`);
          if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null; // 清除 ref

          if (result.image_url) {
            // 觸發事件，將結果傳遞給 MainContent
            window.dispatchEvent(new CustomEvent("designGenerated", {
              detail: {
                images: [{ url: result.image_url, id: `${requestId}-0` }], // 假設回傳單一 URL
              },
            }));
            toast({ title: "🎉 生成成功！" });
          } else {
             toast({ title: "處理異常", description: "後端狀態成功但未返回圖片 URL。", variant: "warning" });
          }
          setIsGenerating(false); // **結束 Loading**
          setCurrentRequestId(null);

        } else if (result.status === "failed") {
          console.error(`Generation Failed for ${requestId}: ${result.error}`);
          if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
          toast({ title: "生成失敗", description: result.error || "未知後端錯誤", variant: "destructive" });
          setIsGenerating(false); // **結束 Loading**
          setCurrentRequestId(null);

        } else if (result.status === "processing") {
          console.log(`Status for ${requestId} is still 'processing'...`);
          // 等待下一次 interval 自動觸發，不做任何事
        } else {
           console.warn(`Unknown status received for ${requestId}: ${result.status}`);
           if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
           pollingIntervalRef.current = null;
           toast({ title: "收到未知狀態", description: `後端返回狀態: ${result.status}`, variant: "destructive" });
           setIsGenerating(false); // **結束 Loading**
           setCurrentRequestId(null);
        }

      } catch (error) {
        console.error("Polling error:", error);
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        toast({ title: "查詢結果出錯", description: error.message, variant: "destructive" });
        setIsGenerating(false); // **結束 Loading**
        setCurrentRequestId(null);
      }
    }; // end of poll function

    // --- 啟動輪詢 ---
    // 清理可能存在的舊 interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    // 設定新的 interval 並儲存 ID
    pollingIntervalRef.current = setInterval(poll, POLLING_INTERVAL);
    // 立即執行一次以快速獲取初始狀態（可選，但能更快得到結果）
    // await poll(); // 如果後端響應快，立即執行可能更好
    // -----------------

  }; // <-- pollForResult 函數結束


  // --- Generate Button Handler (使用真實 API) ---
  const handleGenerate = async () => {
    // 1. 輸入驗證
    if (!description) { toast({ title: "請輸入設計描述", variant: "destructive" }); return; }
    if (!style) { toast({ title: "請選擇風格", variant: "destructive" }); return; } // 檢查 style
    if (!color) { toast({ title: "請選擇顏色", variant: "destructive" }); return; } // 檢查 color

    // 停止並清除任何正在進行的舊輪詢
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      console.log("Cleared previous polling interval before new request.");
    }
    setCurrentRequestId(null); // 清除舊 ID

    setIsGenerating(true); // **設置 Loading 狀態**
    // 可選：立即清空上次結果
    window.dispatchEvent(new CustomEvent("designGenerated", { detail: { images: [] } }));

    // 2. 建立 FormData
    const formData = new FormData();
    formData.append('description', description);
    formData.append('style', style);
    formData.append('color', color); // 後端接收的是字串，如果需要 HEX，前端選擇時 value 應為 HEX
    formData.append('lighting', lighting); // 'yes' or 'no'

    // 3. 添加檔案
    if (selectedFile) {
      formData.append('images', selectedFile, selectedFile.name);
    }

    // 4. 發送 POST 請求
    try {
      console.log("Sending POST /api/generate request...");
      const response = await fetch(API_GENERATE_ENDPOINT, {
        method: "POST",
        body: formData,
        // Content-Type 由瀏覽器自動設定
      });

      // 檢查網路或伺服器層級錯誤
      if (!response.ok) {
        let errorMsg = `請求提交失敗: ${response.status}`;
        try {
          const errorData = await response.json(); // 嘗試讀取後端 JSON 錯誤
          errorMsg = errorData.error || errorMsg;
        } catch (parseError) {
          errorMsg = `${errorMsg} (無法解析回應)`;
        }
        throw new Error(errorMsg);
      }

      // 解析成功提交後的回應
      const data = await response.json();
      console.log("Generation task submitted response:", data);

      // 檢查後端返回的狀態和 request_id
      if (data.status === "succeeded" && data.request_id) {
        const newRequestId = data.request_id;
        setCurrentRequestId(newRequestId); // **保存新的 Request ID**
        toast({
          title: "✅ 請求已提交",
          description: `開始生成，請稍候...`, // 簡化提示
        });

        // 5. **開始輪詢結果**
        await pollForResult(newRequestId);

      } else {
         // 如果後端直接返回錯誤或格式不對
         throw new Error(data.error || "後端未返回有效的 request_id。");
      }

    } catch (error) {
      console.error("Failed to call POST /api/generate:", error);
      toast({
        title: "提交生成請求失敗",
        description: error.message,
        variant: "destructive",
      });
      setIsGenerating(false); // **確保初始請求失敗時結束 Loading**
      setCurrentRequestId(null); // 清除 ID
      // 清除可能存在的 interval
      if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
      }
    }
    // **注意：Loading 狀態由 pollForResult 內部結束**
  };

  // --- JSX Return ---
  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Design Description */}
      <div className="space-y-2">
        <Label htmlFor="description-area" className="flex items-center gap-2 text-lg font-semibold">
          <FileText className="h-5 w-5" />
          📝 設計描述
        </Label>
        <Textarea
          id="description-area"
          placeholder="請描述您的設計概念，例如：一個流線型的白色機殼，帶有藍色呼吸燈和大量散熱網孔..."
          className="min-h-[150px] bg-background/50 text-base"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {/* Keywords Section */}
      <div className="space-y-2">
        <Label className="text-base font-medium">💡 點選加入提示詞 (可選)</Label>
        <div className="flex flex-wrap gap-2">
          {keywords.map((keyword) => (
            <Button
              key={keyword}
              variant="outline"
              size="sm"
              onClick={() => appendKeyword(keyword)}
              className="bg-background/50 hover:bg-primary/20 transition-colors duration-150 text-sm"
            >
              {keyword}
            </Button>
          ))}
        </div>
      </div>

      {/* Core Features Section using Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         {/* Style Dropdown */}
         <div className="space-y-2">
            <Label htmlFor="style-select" className="text-base font-medium">🎨 風格</Label>
            <Select value={style} onValueChange={setStyle}>
              <SelectTrigger id="style-select" className="text-base">
                <SelectValue placeholder="選擇風格..." />
              </SelectTrigger>
              <SelectContent>
                 <SelectItem value="Gaming">Gaming</SelectItem>
                 <SelectItem value="Minimalist">Minimalist</SelectItem>
                 <SelectItem value="High Airflow">High Airflow</SelectItem>
                 <SelectItem value="Silent">Silent</SelectItem>
                 <SelectItem value="Futuristic">Futuristic</SelectItem>
                 <SelectItem value="Industrial">Industrial</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Color Dropdown */}
          <div className="space-y-2">
             <Label htmlFor="color-select" className="text-base font-medium">🌈 主要顏色</Label>
             <Select value={color} onValueChange={setColor}>
               <SelectTrigger id="color-select" className="text-base">
                 <SelectValue placeholder="選擇顏色..." />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="Black">Black</SelectItem>
                 <SelectItem value="White">White</SelectItem>
                 <SelectItem value="Silver">Silver</SelectItem>
                 <SelectItem value="Gray">Gray</SelectItem>
                 <SelectItem value="Gunmetal">Gunmetal</SelectItem>
                 {/* Example of adding HEX color */}
                 {/* <SelectItem value="#6A0DAD">Purple</SelectItem> */}
               </SelectContent>
             </Select>
           </div>

           {/* Lighting Radio Buttons */}
           <div className="space-y-2">
             <Label className="text-base font-medium">💡 是否有燈效</Label>
             <RadioGroup value={lighting} onValueChange={setLighting} className="flex gap-4 pt-2">
               <div className="flex items-center space-x-2">
                 <RadioGroupItem value="yes" id="light-yes" />
                 <Label htmlFor="light-yes" className="text-base">Yes</Label>
               </div>
               <div className="flex items-center space-x-2">
                 <RadioGroupItem value="no" id="light-no" />
                 <Label htmlFor="light-no" className="text-base">No</Label>
               </div>
             </RadioGroup>
           </div>
      </div>

      {/* File Upload */}
      <div className="space-y-2">
        <Label htmlFor="file-upload" className="text-base font-medium">
          🚀 上傳參考圖片/草圖 (可選)
        </Label>
        <div className="flex flex-col gap-4">
          <input
            id="file-upload"
            ref={fileInputRef} // Add ref for clearing
            type="file"
            accept=".png,.jpg,.jpeg,.webp"
            onChange={handleFileChange}
            className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
          />
          {imagePreview && (
            <div className="relative w-40 h-40 border rounded-lg overflow-hidden">
              <img src={imagePreview} alt="Preview" className="object-cover w-full h-full" />
               <Button
                   variant="destructive"
                   size="icon"
                   className="absolute top-1 right-1 h-6 w-6 rounded-full opacity-70 hover:opacity-100 z-10"
                   onClick={clearFileInput} // Use clear function
                   aria-label="Remove uploaded image" // Accessibility
                 >
                   X
                 </Button>
            </div>
          )}
        </div>
      </div>

      {/* Generate Button */}
      <Button
        className="w-full text-lg font-semibold mt-4" // Added margin top
        size="lg"
        onClick={handleGenerate}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            生成中...
          </>
        ) : (
          "✨ 生成設計概念圖"
        )}
      </Button>
    </div>
  );
}
