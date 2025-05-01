# Cooler Master AI 設計平台 (GenAI Hackathon 專案)

## 📝 專案簡介

本專案旨在響應 Cooler Master 於「2025 雲湧智生：臺灣生成式 AI 應用黑客松競賽」提出的「Cooler Master 智造工坊」命題。目標是開發一個 AI 驅動的設計輔助平台，旨在加速 Cooler Master (特別是 PC 機殼產品) 的早期設計概念發想流程，建立並利用其獨特的產品設計 DNA，提高設計效率與創新性，同時確保品牌風格的一致性。

平台允許設計師透過文字描述、選擇關鍵設計特徵（風格、顏色、燈效等）以及上傳參考圖片或草圖作為輸入，利用 AI 模型（Amazon Bedrock）生成新的設計概念圖。平台也支持設計師對結果進行迭代（例如基於某張圖片再次生成）和提供反饋。

## 🎬 Demo 影片

![專案 Demo](data/demo.gif)

## ✨ 主要功能 (MVP 及規劃)

* **AI 圖像生成:**
    * 支援**文字轉圖片 (Text-to-Image)**：根據文字描述和特徵生成設計。
    * 支援**圖片轉圖片 (Image-to-Image)**：允許上傳參考圖/草圖 [cite: 4]，結合文字描述進行修改或風格轉換。
    * 支援**設計特徵輸入:** 可選擇風格、主要顏色、燈效等關鍵參數。
    * **Prompt 輔助:** 前端提供關鍵字標籤點選，輔助設計師構建 Prompt。
* **異步處理與結果查詢:** 生成請求提交後立即返回任務 ID，前端透過輪詢 (Polling) 獲取最終的圖片結果。
* **結果展示與反饋:** 在前端展示生成的圖片，並允許使用者提交評價（👍/👎）。
* **(規劃中) 設計 DNA 資料庫:**
    * 收集和標記 Cooler Master 產品的設計特徵（風格、顏色、燈效、材質、關鍵字等）[cite: 3]。 (MVP 階段手動標記)
    * 提供前端頁面供設計師瀏覽和參考 DNA 資料庫內容。
    * 將 DNA 特徵整合進 Prompt Engine，引導 AI 生成更符合品牌風格的結果 [cite: 4]。

## 🛠️ 技術棧 (Tech Stack)

* **前端 (Frontend):**
    * 框架: React + TypeScript
    * 建構工具: Vite
    * UI 庫: Shadcn/ui (基於 Radix UI & Tailwind CSS)
    * HTTP 客戶端: Fetch API (瀏覽器內建)
    * 狀態管理: React Hooks (`useState`, `useRef`, `useEffect`, `useCallback`)
* **後端 (Backend):**
    * 框架: Python + Flask
    * API 文件: Flasgger (整合 Swagger UI)
    * AWS SDK: Boto3
    * 環境變數管理: python-dotenv
* **雲端服務 (AWS):**
    * **API 閘道:** Amazon API Gateway (接收前端請求，觸發 Lambda)
    * **運算:** AWS Lambda (運行 Flask 後端應用邏輯)
    * **AI - Prompt 工程:** Amazon Bedrock (使用 Claude 等 LLM)
    * **AI - 圖像生成:** Amazon SageMaker JumpStart (部署 Stable Diffusion XL 等模型，提供 Endpoint)
    * **儲存:** Amazon S3 (儲存使用者上傳的參考圖和 AI 生成的結果圖)
    * **資料庫:** Amazon DynamoDB (儲存異步任務狀態、使用者反饋、設計 DNA 資料)

## 🏗️ 系統架構概觀

本應用採用前後端分離架構，並利用 AWS 雲服務實現 AI 功能和異步處理：

1.  **前端 (React/TSX)** 負責使用者互動、收集輸入並透過 **API Gateway** 發送請求。
2.  **API Gateway** 將請求路由到 **AWS Lambda** 中運行的 **Flask** 後端應用。
3.  對於生成請求 (`POST /api/generate`)：
    * Flask 應用驗證輸入，(可選)將上傳圖片存至 **S3**。
    * 調用 **Bedrock** (LLM) 服務生成優化的 Prompt。
    * 產生 `request_id`，在 **DynamoDB** 中記錄任務初始狀態 (`processing`)。
    * 觸發一個**背景任務**（在 Lambda 中用 Threading 模擬，或用 SQS/Lambda 實現）。
    * **立即**返回 `request_id` 給前端。
4.  **背景任務** 執行：
    * 調用 **SageMaker Endpoint** 執行圖像生成（Text2Img 或 Img2Img）。
    * 將生成的圖片存儲到 **S3**。
    * 更新 **DynamoDB** 中的任務狀態為 `succeeded` (含圖片 URL) 或 `failed` (含錯誤訊息)。
5.  **前端** 使用 `request_id` **輪詢** `GET /api/generate/{id}` 端點。
6.  Flask 應用查詢 **DynamoDB** 返回任務狀態，直到 `succeeded` 或 `failed`。
7.  前端獲取結果 URL 並顯示圖片。
8.  對於反饋請求 (`POST /api/feedback`)，Flask 應用直接將數據寫入 **DynamoDB**。

(可以參考之前生成的 Mermaid 圖表，將其圖片嵌入或連結於此)

## 📁 專案結構

```
.
├── .gitignore
├── README.md
├── requirements.txt # (合併前後端，或各自有)
├── .env.example     # 環境變數範本
│
├── backend/         # 後端 Flask 應用
│   ├── main.py
│   ├── requirements.txt
│   ├── .env.example
│   └── app/
│       ├── __init__.py
│       ├── config.py
│       ├── routes/      # API 路由 (generate.py, feedback.py, dna.py)
│       ├── services/    # 核心邏輯 (prompt_engine.py, sagemaker_client.py)
│       ├── db/          # 資料庫/儲存互動 (dynamo.py, s3.py)
│       └── utils/       # 工具函數 (logger.py)
│
├── frontend/        # 前端 React 應用
│   ├── public/
│   ├── src/
│   │   ├── components/  # UI 元件 (design/, ui/, etc.)
│   │   ├── hooks/       # 自訂 Hooks (e.g., useToast)
│   │   ├── pages/       # 頁面元件 (DnaDatabasePage.tsx)
│   │   ├── lib/         # 工具函數 (e.g., utils.ts from shadcn)
│   │   ├── App.tsx      # 主應用/路由
│   │   └── main.tsx     # 應用入口
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
└── scripts/         # 輔助腳本
    ├── load_db.py
    └── cases_data.csv
```

## ⚙️ 設定與安裝

**後端 (Backend):**

1.  `cd backend`
2.  `python -m venv venv` (建立虛擬環境)
3.  `source venv/bin/activate` (macOS/Linux) 或 `.\venv\Scripts\activate` (Windows) (啟用虛擬環境)
4.  `pip install -r requirements.txt` (安裝依賴)
5.  複製 `.env.example` 為 `.env` (`cp .env.example .env`)
6.  編輯 `.env` 檔案。

**前端 (Frontend):**

1.  `cd frontend`
2.  `npm install` (或 `yarn install`) (安裝依賴)
3.  複製 `.env.example` (如果有的話) 為 `.env.local`
4.  編輯 `.env.local` 檔案，設定 `VITE_BACKEND_API_URL` 指向你的後端地址 (例如 `http://127.0.0.1:8000`)。

## ▶️ 本地運行

1.  **啟動後端:**
    * 開啟一個終端機。
    * `cd backend`
    * `source venv/bin/activate` (或 Windows 的 activate)
    * `python main.py`
    * 後端預設運行在 `http://127.0.0.1:8000`，API 文件在 `http://127.0.0.1:8000/docs/`。

2.  **啟動前端:**
    * 開啟**另一個**終端機。
    * `cd frontend`
    * `npm run dev` (或 `yarn dev`)
    * 前端預設運行在 `http://localhost:8080` (或其他 Vite 指定的端口)。
    * 在瀏覽器中打開前端地址即可開始使用。
  



## 後端重建 (Backend Rebuild)

主要目標：
* 使用grok生成圖片，資料存在supabase + 背景 Worker 模式。
* 引入身份驗證 (Admin/Demo 模式)。
* 使用 Celery 處理背景圖片生成任務。
* 整合 Flasgger 提供 API 文件。

目前的狀態：
* 後端伺服器已可運行。
* API 文件可在 /apidocs/ 查看。

循序圖(Sequence Diagram)

