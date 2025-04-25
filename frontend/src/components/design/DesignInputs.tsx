import { FileText } from "lucide-react";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";

interface GeneratePayload {
  description: string;
  features: {
    style: string;
    color: string;
    lighting: boolean;
  };
  base64_image?: string;
}

export function DesignInputs() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [style, setStyle] = useState("");
  const [color, setColor] = useState("");
  const [lighting, setLighting] = useState("no");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const keywords = [
    "Hexagonal Mesh",
    "Brushed Aluminum", 
    "Tempered Glass",
    "CM Logo",
    "High Airflow Vents",
    "RGB Strip"
  ];

  const appendKeyword = (keyword: string) => {
    const newText = description ? `${description} ${keyword}` : keyword;
    setDescription(newText);
  };

  const handleGenerate = async () => {
    if (!description) {
      toast({
        title: "請輸入設計描述",
        description: "請在設計描述欄位中輸入您的設計概念。",
        variant: "destructive",
      });
      return;
    }

    if (!style || !color) {
      toast({
        title: "請選擇風格和顏色",
        description: "請確保您已選擇設計風格和主要顏色。",
        variant: "destructive",
      });
      return;
    }

    const payload: GeneratePayload = {
      description,
      features: {
        style,
        color,
        lighting: lighting === "yes",
      },
    };

    if (selectedFile) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        payload.base64_image = base64String.split(',')[1];
        await sendGenerateRequest(payload);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      await sendGenerateRequest(payload);
    }
  };

  const sendGenerateRequest = async (payload: GeneratePayload) => {
  // --- 開始模擬 (React/TSX 版本) ---

  // 1. 觸發 Loading 狀態
  //    注意：isLoading 狀態是在 MainContent 中管理的。
  //    你需要有一種機制從這裡觸發 MainContent 的 setIsLoading(true)。
  //    這可能需要將 setIsLoading 作為 prop 傳遞下來，或者使用 Context/Zustand 等狀態管理。
  //    在這個模擬範例中，我們假設 Loading 狀態的觸發在別處處理，這裡只打印日誌。
  console.log("Triggering loading state (should be handled in parent/context)...");

  console.log("Simulating API Request with payload:", payload);

  try {
    // 2. 模擬網路延遲 (例如 1.5 秒)
    await new Promise(resolve => setTimeout(resolve, 1500));

    // 3. 創建模擬的回應數據
    const mockGenerationId = `mock-gen-${Date.now()}`;
    const mockImageUrls = [
      'https://a.storyblok.com/f/281110/6f713abe1c/haf-700-white-gallery-02.png/m/1920x0/smart',
      'https://a.storyblok.com/f/281110/90624ca23f/haf-700-white-gallery-01.png/m/1920x0/smart'  
    ];

    const mockResponseData = {
        generation_id: mockGenerationId,
        image_urls: mockImageUrls
        // 確保這個結構符合 MainContent 中 handleDesignGenerated 事件處理器期待的格式
        // 或者符合你與後端最終約定的 /api/generate 回應格式
    };
    console.log("Simulated API Response:", mockResponseData);


    // 4. 觸發 'designGenerated' 事件，讓 MainContent 接收數據
    window.dispatchEvent(new CustomEvent("designGenerated", {
      detail: {
        // 組裝成 MainContent 期待的 { images: GeneratedImage[] } 格式
        images: mockResponseData.image_urls.map((url: string, index: number) => ({
          url: url,
          id: `${mockGenerationId}-${index}`, // 為每個圖片產生唯一的模擬 ID
        })),
      },
    }));
    console.log("Dispatched 'designGenerated' event with mock data.");

    // 5. 使用 useToast 顯示成功提示
    toast({
      title: "模擬生成成功！",
      description: "已使用模擬數據更新結果。",
    });


  } catch (error) {
    // 即使是模擬，也保留錯誤處理框架
    console.error("Error during mock API simulation:", error);
    // 6. 使用 useToast 顯示錯誤提示
    toast({
      title: "模擬生成失敗",
      description: "在模擬過程中發生錯誤。",
      variant: "destructive",
    });

  } finally {
     // 7. 結束 Loading 狀態
     //    同樣，需要一種機制觸發 MainContent 的 setIsLoading(false)
     console.log("Triggering loading state end (should be handled in parent/context)...");
  }
};


  // True API call
  // const sendGenerateRequest = async (payload: GeneratePayload) => {
  //   try {
  //     const response = await fetch("/api/generate", {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //       },
  //       body: JSON.stringify(payload),
  //     });

  //     if (!response.ok) {
  //       throw new Error("Generation failed");
  //     }

  //     const data = await response.json();
  //     window.dispatchEvent(new CustomEvent("designGenerated", { 
  //       detail: {
  //         images: data.image_urls.map((url: string) => ({
  //           url,
  //           id: `${data.generation_id}-${Math.random()}`,
  //         })),
  //       },
  //     }));
  //   } catch (error) {
  //     toast({
  //       title: "生成失敗",
  //       description: "請稍後再試。如果問題持續發生，請聯繫支援團隊。",
  //       variant: "destructive",
  //     });
  //   }
  // };

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