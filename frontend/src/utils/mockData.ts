// src/utils/mockData.ts
import { v4 as uuidv4 } from 'uuid';
import { GenerationResult, FeedbackResponse, dImage, DesignParameters } from '@/services/api/types'; 

// Mock image URLs
const placeholderImages = [
  "https://a.storyblok.com/f/281110/600x600/ea0afeb9de/elite-301-white-overview-600x600.png/m/600x0/smart",
  "https://a.storyblok.com/f/281110/600x600/627da3e4e0/mb600-overview-600x600.png/m/600x0/smart",
  "https://a.storyblok.com/f/281110/600x600/afe905824c/masterbox-nr200p-v2-overview-600x600-1.png/m/600x0/smart",
  "https://a.storyblok.com/f/281110/f379480f5f/td500-mesh-v2-chun-li-380x380-1.png/m/1200x0/smart",
  "https://a.storyblok.com/f/281110/cb15588e1a/c700m-black-gallery-1.png/m/1920x0/smart",
];

// 用來稍微調整 base 參數，產生變體
function createVariationParameters(baseParams: DesignParameters, variationIndex: number): DesignParameters {
  const styles = ["gaming", "minimalist", "highairflow", "futuristic", "silent", "industrial"];
  const colors = ["black", "white", "silver", "gray", "gunmetal"];
  const variationKeywords = ["enhanced cooling", "sleek profile", "customizable RGB", "optimized airflow"];

  const variedParams = { ...baseParams };

  switch (variationIndex % 3) {
    case 0: 
      const currentColorIndex = colors.indexOf(baseParams.color);
      variedParams.color = colors[(currentColorIndex + 1) % colors.length];
      variedParams.description = `${baseParams.description} (new color: ${variedParams.color})`;
      break;
    case 1:
      variedParams.lighting = !baseParams.lighting;
      variedParams.description = `${baseParams.description} (lighting ${variedParams.lighting ? 'added' : 'removed'})`;
      break;
    case 2:
      const currentStyleIndex = styles.indexOf(baseParams.style);
      if (currentStyleIndex < styles.length - 1 && currentStyleIndex !== -1) {
        variedParams.style = styles[(currentStyleIndex + 1) % styles.length];
        variedParams.description = `${baseParams.description} (style variant: ${variedParams.style})`;
      } else {
        variedParams.description = `${baseParams.description}, now with ${variationKeywords[variationIndex % variationKeywords.length]}`;
      }
      break;
    default:
      variedParams.description = `${baseParams.description} (subtle variation ${variationIndex + 1})`;
      break;
  }

  return variedParams;
}

// 核心生成功能：可以產生初始設計，也可以產生變體
export const generateMockDesignData = (
  count: number = 2,
  baseParameters?: DesignParameters,
  parentId?: string
): GenerationResult => {

  const generation_id = uuidv4();

  const defaultStyles = ["gaming", "minimalist", "highairflow", "futuristic"];
  const defaultColors = ["black", "white", "silver", "gray"];
  const defaultDescriptions = [
    "Modern gaming PC case with RGB accents",
    "Minimalist design with clean lines",
    "High airflow focused case with mesh panels",
    "Futuristic design with unique geometry"
  ];

  const isVariation = !!(baseParameters && parentId);

  const images: GeneratedImage[] = Array.from({ length: count }).map((_, index) => {
    let imageId: string;
    let parameters: DesignParameters;
    let imageUrl: string;
    let linkToParentId: string | undefined = undefined;

    if (isVariation) {
      // ➔ 生成變體
      imageId = `${parentId}-v${index + 1}`;
      parameters = createVariationParameters(baseParameters!, index);
      imageUrl = placeholderImages[(index + 1) % placeholderImages.length];
      linkToParentId = parentId;
    } else {
      // ➔ 生成初始設計
      imageId = `${generation_id}-${index}`;
      parameters = {
        style: defaultStyles[Math.floor(Math.random() * defaultStyles.length)],
        color: defaultColors[Math.floor(Math.random() * defaultColors.length)],
        lighting: Math.random() > 0.5,
        description: defaultDescriptions[Math.floor(Math.random() * defaultDescriptions.length)]
      };
      imageUrl = placeholderImages[index % placeholderImages.length];
    }

    return {
      id: imageId,
      url: imageUrl,
      parameters: parameters,
      parentId: linkToParentId, // <== ✅ 關鍵：只有變體有 parentId
    };
  });

  return {
    generation_id,
    images,
  };
};

// --- 其他 mock 功能保持不變 ---
export const generateMockFeedbackResponse = (): FeedbackResponse => ({
  status: 'success',
  message: 'Feedback recorded successfully',
});

export const generateMockSaveResponse = () => ({
  status: 'success',
  message: 'Design saved successfully',
});
