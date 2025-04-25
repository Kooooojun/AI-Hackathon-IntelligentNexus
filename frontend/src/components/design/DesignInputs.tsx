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
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Generation failed");
      }

      const data = await response.json();
      window.dispatchEvent(new CustomEvent("designGenerated", { 
        detail: {
          images: data.image_urls.map((url: string) => ({
            url,
            id: `${data.generation_id}-${Math.random()}`,
          })),
        },
      }));
    } catch (error) {
      toast({
        title: "生成失敗",
        description: "請稍後再試。如果問題持續發生，請聯繫支援團隊。",
        variant: "destructive",
      });
    }
  };

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