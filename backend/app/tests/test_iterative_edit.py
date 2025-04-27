#!/usr/bin/env python3
"""
測試使用先前生成的圖片進行第二階段編輯。
接受命令列參數，不依賴本地檔案系統。

使用方式:
$ python3 test_second_edit.py "https://s3-url-from-first-run" "新的提示詞"
"""

import sys, os
import argparse

# 加入專案路徑
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from app.services.bedrock_client import BedrockClient

def main():
    # 處理命令列參數
    parser = argparse.ArgumentParser(description="使用先前生成的圖片URL進行二次編輯")
    parser.add_argument("image_url", help="上一步生成的圖片URL")
    parser.add_argument("prompt", help="新的編輯提示詞")
    parser.add_argument("--width", type=int, default=768, help="圖片寬度")
    parser.add_argument("--height", type=int, default=768, help="圖片高度")
    
    args = parser.parse_args()
    
    print(f"使用圖片 URL: {args.image_url}")
    print(f"提示詞: {args.prompt}")
    
    # 調用 BedrockClient 的 titan_image_edit 方法
    client = BedrockClient()
    result_urls = client.titan_image_edit(
        prompt=args.prompt,
        image_paths=args.image_url,  # 使用命令列提供的 URL
        width=args.width,
        height=args.height,
        num_output_images=2
    )
    
    print("\n🎨 第二次編輯生成的圖片 URL(s):")
    for i, url in enumerate(result_urls, 1):
        print(f"  • 圖片 {i}: {url}")

if __name__ == "__main__":
    main()