import os

def extract_image_features(image_paths):
    """
    暫時只是回傳檔名清單。未來可替換為 image-to-text 模型。
    """
    # TODO: Replace with real model (e.g., BLIP, MiniGPT-4)
    return [f"reference image: {os.path.basename(path)}" for path in image_paths]

def build_prompt(style, lighting, colors, description, image_paths=None):
    """
    將使用者輸入組合為一段清楚、具風格的 prompt。
    """
    prompt_parts = []
    prompt_parts.append("Create a photo of a product with the following features:")

    # 1.設計風格 + 燈效
    if style:
        prompt_parts.append(f"Design style: {style}")
    if lighting:
        prompt_parts.append(f"Lighting: {lighting}")

    # 2.顏色
    if colors:
        color_str = ", ".join(colors)
        prompt_parts.append(f"color scheme: {color_str}")

    # 3. 使用者文字描述
    if description:
        prompt_parts.append(f"{description}")

    # 4. 圖片描述（stub）
    if image_paths:
        image_descriptions = extract_image_features(image_paths)
        prompt_parts.append(f"The image should be similar to: {', '.join(image_descriptions)}")
        
    # 組合成單一段落
    prompt = " | ".join(prompt_parts)
    return prompt