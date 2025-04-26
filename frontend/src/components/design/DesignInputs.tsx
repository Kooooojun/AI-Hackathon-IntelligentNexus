
import { FileText } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { useApiService } from '@/services/api/apiServiceFactory';
import { GeneratePayload } from '@/services/api/types';

export function DesignInputs() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [style, setStyle] = useState("");
  const [color, setColor] = useState("");
  const [lighting, setLighting] = useState("no");
  const [referenceImageId, setReferenceImageId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const apiService = useApiService();

  useEffect(() => {
    const handleRefineDesign = (event: CustomEvent<{ imageId: string, imageUrl: string }>) => {
      setReferenceImageId(event.detail.imageId);
      if (event.detail.imageUrl && !imagePreview) {
        setImagePreview(event.detail.imageUrl);
      }
      toast({
        title: "準備生成變體",
        description: "系統已準備好基於所選設計生成變體。點擊「生成設計概念圖」繼續。",
      });
    };

    const handleModifyDesign = (event: CustomEvent<{ imageId: string, imageUrl: string, parameters?: any }>) => {
      setReferenceImageId(event.detail.imageId);
      if (event.detail.imageUrl && !imagePreview) {
        setImagePreview(event.detail.imageUrl);
      }

      // Update form with existing parameters if provided
      if (event.detail.parameters) {
        const { style: designStyle, color: designColor, lighting: designLighting, description: designDescription } = event.detail.parameters;
        if (designStyle) setStyle(designStyle);
        if (designColor) setColor(designColor);
        if (designLighting !== undefined) setLighting(designLighting ? "yes" : "no");
        if (designDescription) setDescription(designDescription);
      }

      toast({
        title: "修改設計參數",
        description: "您可以調整參數後點擊「生成設計概念圖」以獲取新的設計。",
      });
    };

    window.addEventListener("refineDesign" as any, handleRefineDesign);
    window.addEventListener("modifyDesign" as any, handleModifyDesign);

    return () => {
      window.removeEventListener("refineDesign" as any, handleRefineDesign);
      window.removeEventListener("modifyDesign" as any, handleModifyDesign);
    };
  }, [toast, imagePreview]);

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
    if (!description && !referenceImageId) {
      toast({
        title: "請輸入設計描述或選擇參考圖",
        description: "請在設計描述欄位中輸入您的設計概念或選擇參考圖片。",
        variant: "destructive",
      });
      return;
    }

    if (!style || !color) {
      toast({
        title: "請選擇風格和顏色",
        description: "請確保已選擇設計風格和主要顏色。",
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

    if (referenceImageId) {
      payload.reference_image_id = referenceImageId;
    }

    try {
      window.dispatchEvent(new CustomEvent("designGenerating"));
      setIsGenerating(true);

      if (selectedFile) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64String = reader.result as string;
          payload.base64_image = base64String.split(',')[1];
          await sendGenerateRequest(payload);
        };
        reader.readAsDataURL(selectedFile);
      } else if (imagePreview && imagePreview.startsWith('data:')) {
        payload.base64_image = imagePreview.split(',')[1];
        await sendGenerateRequest(payload);
      } else {
        await sendGenerateRequest(payload);
      }
    } catch (error) {
      console.error("Generation error:", error);
      setIsGenerating(false);
      toast({
        title: "生成失敗",
        description: "請稍後再試。如果問題持續發生，請聯繫支援團隊。",
        variant: "destructive",
      });
    }
  };

  const sendGenerateRequest = async (payload: GeneratePayload) => {
    try {
      const result = await apiService.generateDesigns(payload);
      
      window.dispatchEvent(new CustomEvent("designGenerated", { 
        detail: {
          images: result.images.map(img => ({
            url: img.url,
            id: img.id,
          })),
          generation_metadata: result,
        },
      }));
      
      setReferenceImageId(null);
    } catch (error) {
      console.error("API error:", error);
      toast({
        title: "生成失敗",
        description: "請稍後再試。如果問題持續發生，請聯繫支援團隊。",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
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

      <Button 
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
        size="lg"
        onClick={handleGenerate}
        disabled={isGenerating}
      >
        {isGenerating ? '⏳ 生成中...' : '✨ 生成設計概念圖'}
      </Button>
    </div>
  );
}
