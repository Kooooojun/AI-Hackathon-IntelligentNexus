import os
import sys
import logging
from pathlib import Path

# 設定日誌
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 添加專案根目錄到 Python 路徑
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

# 引入 BedrockClient
from app.services.bedrock_client import BedrockClient

def test_image_to_text():
    """
    測試 BedrockClient 的 image_to_text 功能
    專門處理 COSMOS C700P 黑化版 資料夾中的 .webp 圖片
    """
    # 初始化 BedrockClient
    client = BedrockClient()
    
    # 指定要測試的資料夾路徑
    target_folder = Path("/Users/justitu/School/comp&hackathon/AI-Hackathon-IntelligentNexus/data/COSMOS C700P 黑化版")
    
    # 檢查資料夾是否存在
    if not target_folder.exists():
        logger.error(f"找不到指定的資料夾: {target_folder}")
        return
    
    # 收集資料夾中所有 .webp 圖片
    image_paths = list(target_folder.glob("*.webp"))
    
    if not image_paths:
        logger.error(f"在 {target_folder} 中找不到 .webp 圖片")
        return
    
    # 顯示找到的圖片數量
    logger.info(f"找到 {len(image_paths)} 張 .webp 圖片")
    
    # 處理每張圖片
    for i, image_path in enumerate(image_paths):
        logger.info(f"\n處理圖片 {i+1}/{len(image_paths)}: {image_path.name}")
        
        try:
            # 呼叫 image_to_text 方法
            description = client.image_to_text(str(image_path))
            
            # 顯示結果
            logger.info(f"圖片路徑: {image_path}")
            logger.info(f"生成描述: {description}")
            logger.info("-" * 80)
        except Exception as e:
            logger.error(f"處理圖片 {image_path} 時發生錯誤: {str(e)}")

if __name__ == "__main__":
    test_image_to_text()