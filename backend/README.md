# 🧠 AI Design Backend (Flask + Swagger + AWS)

本專案為 AI Hackathon 設計，旨在提供一個後端 REST API 服務。此服務接收前端傳來的設計需求（文字描述、風格標籤等），呼叫圖像生成模型（如 AWS SageMaker 或 Bedrock），並將生成的結果（例如圖片 URL）回傳給前端。專案整合了 Swagger UI (`/apidocs`) 以方便 API 的測試與調試，並預留了使用 AWS S3 進行圖片儲存和 DynamoDB 記錄使用者回饋的擴充點（目前為模擬/Stub 狀態）。

## 環境先決條件 (Prerequisites)

- Python 3.x
- pip (Python 套件管理器)
- Git
- 一個有效的 AWS 帳號
- 具有呼叫 SageMaker Endpoint (或 Bedrock) 以及未來可能需要的 S3、DynamoDB 權限的 AWS Access Key ID 和 Secret Access Key。

## 安裝與設定 (Setup and Installation)

1.  **下載專案並進入後端目錄:**

    ```bash
    git clone [https://github.com/YOUR_TEAM/ai-design-backend.git](https://github.com/YOUR_TEAM/ai-design-backend.git)
    cd ai-design-backend/backend
    ```

    _(請將 `https://github.com/YOUR_TEAM/ai-design-backend.git` 替換為您團隊的實際儲存庫 URL)_

2.  **建立並啟動 Python 虛擬環境 (建議):**

    ```bash
    # 建立虛擬環境
    python -m venv venv

    # 啟動虛擬環境 (Windows)
    .\venv\Scripts\activate

    # 啟動虛擬環境 (macOS/Linux)
    source venv/bin/activate
    ```

3.  **安裝依賴套件:**

    ```bash
    pip install -r requirements.txt
    ```

4.  **設定環境變數:**
    複製環境變數範例檔 `.env.example` 為 `.env`，然後填入您的 AWS 憑證和服務端點名稱。
    ```bash
    cp .env.example .env
    ```
    接著，編輯 `.env` 檔案，填入以下必要資訊：
    ```dotenv
    AWS_REGION=ap-northeast-1  # 或您使用的 AWS 區域
    AWS_ACCESS_KEY_ID=your_access_key_id
    AWS_SECRET_ACCESS_KEY=your_secret_access_key
    SAGEMAKER_ENDPOINT=your-sagemaker-endpoint-name # 或是 Bedrock 的相關設定 (如果使用 Bedrock)
    # 可能還有 S3_BUCKET_NAME, DYNAMODB_TABLE_NAME 等，依據 s3.py 和 dynamo.py 的實作加入
    ```
    **重要:** 請務必將 `.env` 檔案加入到您的 `.gitignore` 檔案中，以防止意外將敏感的 AWS 憑證提交到版本控制系統！

## 執行應用程式 (Running the Application)

在 `backend` 目錄下執行以下命令啟動 Flask 開發伺服器：

```bash
python main.py
```

backend/
 ├── main.py                # Flask 入口
 ├── requirements.txt       # 套件依賴
 ├── .env.example           # AWS 設定範例
 │
 ├── app/
 │   ├── __init__.py        # create_app(), 註冊 Blueprint
 │   ├── config.py          # 設定讀取（.env）
 │
 │   ├── routes/
 │   │   ├── generate.py    # /api/generate endpoint    # 前端(下prompt的部分)
 │   │   └── feedback.py    # /api/feedback endpoint    # 前端(user 回饋)
 │
 │   ├── services/
 │   │   ├── prompt_engine.py     # Prompt 組合邏輯     # 拉 generate.py 的 prompt 去組合成一段text
 │   │   ├── sagemaker_client.py  # 模型呼叫（SageMaker or Bedrock）
 │   │   └── bedrock_client.py    # Bedrock（Titan Image stub） # 生成圖片後 要接回前端 如果approve -> 接 s3.py 存圖片
 │
 │   ├── db/
 │   │   ├── dynamo.py      # 儲存回饋（stub）存到 s3 csv?
 │   │   └── s3.py          # 上傳圖片（stub）
 │
 │   └── utils/
 │       └── logger.py      # 共用 logger 工具
