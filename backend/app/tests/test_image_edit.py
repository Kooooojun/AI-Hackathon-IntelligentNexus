#!/usr/bin/env python3
"""
測試從本地圖片開始進行圖片編輯，並將結果儲存到 S3。
使用雲端友好的方法直接從記憶體上傳到 S3，無需臨時文件。

使用方式:
$ python3 test_initial_edit.py
"""

import sys, os
from pathlib import Path

# 加入專案路徑
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from app.services.bedrock_client import BedrockClient

def main():
    # 設定測試圖片目錄
    test_dir = Path(__file__).parent / "test_images"
    
    if not test_dir.exists():
        print(f"錯誤：找不到測試圖片目錄 {test_dir}")
        return
    
    # 獲取所有 PNG 和 JPG 圖片
    image_files = list(test_dir.glob("*.png")) + list(test_dir.glob("*.jpg")) + \
                 list(test_dir.glob("*.jpeg")) + list(test_dir.glob("*.webp"))
    
    if not image_files:
        print(f"錯誤：在 {test_dir} 中找不到任何圖片檔案")
        return
    
    # 限制為最多 2 張圖片
    image_files = image_files[:2]
    image_paths = [str(img) for img in image_files]
    
    print(f"使用的圖片檔案: {[os.path.basename(p) for p in image_paths]}")
    
    # PC 機殼相關的提示詞
    prompt = "Transform this PC case into a black and brown style without RGB lighting and a futuristic design"
    
    print(f"提示詞: {prompt}")
    
    # 調用 BedrockClient 的 titan_image_edit 方法
    client = BedrockClient()
    result_urls = client.titan_image_edit(
        prompt=prompt,
        image_paths=image_paths,
        width=768,
        height=768,
        num_output_images=2
    )
    
    print("\n🎨 生成的圖片 URL(s):")
    for i, url in enumerate(result_urls, 1):
        print(f"  • 圖片 {i}: {url}")
    
    # 複製這段文字以備下一個腳本使用
    print("\n要進行二次編輯，請執行以下命令 (複製其中一個 URL):")
    if result_urls:
        print(f"python3 backend/app/tests/test_second_edit.py \"{result_urls[0]}\" \"修改提示詞\"")

if __name__ == "__main__":
    main()