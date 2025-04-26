#!/usr/bin/env python
"""
txt2img.py
----------
命令列工具：輸入文字 Prompt，呼叫 Bedrock Titan 生成圖片並回傳 S3 URL。

使用方式
$ python txt2img.py "A cyberpunk PC case with hex-mesh front panel, glowing purple LEDs"
$ python txt2img.py "A minimalist white ATX tower" --width 1024 --height 1024
"""

import argparse
import sys
from pathlib import Path

# 若放在專案根目錄，加入 backend 進 sys.path 方便 import
PROJECT_ROOT = Path(__file__).resolve().parent
sys.path.append(str(PROJECT_ROOT))

from app.services.bedrock_client import BedrockClient


def main():
    parser = argparse.ArgumentParser(
        description="Generate image(s) from text prompt using AWS Bedrock Titan"
    )
    parser.add_argument("prompt", help="Text prompt for image generation")
    parser.add_argument("--width", type=int, default=768, help="Image width (default: 768)")
    parser.add_argument("--height", type=int, default=768, help="Image height (default: 768)")

    args = parser.parse_args()

    client = BedrockClient()  # 會自動讀取 AWS_... 環境變數
    urls = client.titan_image(args.prompt, width=args.width, height=args.height)

    print("🎨  Titan generated image URL(s):")
    for url in urls:
        print("  •", url)


if __name__ == "__main__":
    main()
