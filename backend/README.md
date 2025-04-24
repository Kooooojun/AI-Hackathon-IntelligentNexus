<<<<<<< HEAD
安裝環境

.env 設定

專案結構說明

如何啟動與測試 API（含 Swagger UI）

你可以直接複製貼上到 backend/README.md：
=======
## Reference
https://chatgpt.com/share/680a3afa-0e3c-800a-8532-56a679c1a99e

## /backend
├── main.py                 ← FastAPI 入口
├── requirements.txt        ← 套件依賴
├── .env                    ← AWS 憑證或設定（暫時空）
│
├── models/
│   └── schema.py           ← 資料結構 (Pydantic Models)
│
├── db/
│   └── dynamo.py           ← 與 DynamoDB 互動（後續補上）
│   └── s3.py               ← 與 S3 互動（後續補上）
│
├── routes/
│   └── cases.py            ← 機殼案例 API
│   └── feedback.py         ← 評分 API（後續加）
│
├── utils/
│   └── helpers.py          ← 共用小工具

## 🚀 啟動專案

#### 1. 建立虛擬環境（可略）
記得先進到backend

python -m venv venv

source venv/bin/activate      # Windows 請用 venv\Scripts\activate

#### 2. 安裝套件
pip install -r requirements.txt

#### 3. 執行 FastAPI 伺服器
uvicorn main:app --reload 或是 python -m uvicorn main:app --reload

之後如果沒問題 你可以在瀏覽器打開：http://127.0.0.1:8000/docs

就會看到 Swagger UI，能馬上測試 /cases 的 GET、POST、GET by id。

## 詳細內容
### 🔹 Step 1: 機殼資料 API (CRUD)
目標：打造 RESTful API 操作 CoolerMasterCases
>>>>>>> fb8381b4d816fac00127723a85657882f2a8f578

markdown
複製
編輯
# 🧠 AI Design Backend (Flask + Swagger + AWS)

本專案為 AI Hackathon 使用，提供 REST API 接收設計需求，呼叫 SageMaker / Bedrock 圖像生成模型，並回傳圖片網址給前端。整合 Swagger UI 方便調試，支援 S3 儲存與 DynamoDB 記錄。

---

## 🚀 快速啟動

<<<<<<< HEAD
### 1. 下載專案

```bash
git clone https://github.com/YOUR_TEAM/ai-design-backend.git
cd ai-design-backend/backend
2. 建立虛擬環境
bash
複製
編輯
python -m venv venv
# 啟動 venv（Windows）
venv\Scripts\activate
# 或（macOS/Linux）
source venv/bin/activate
3. 安裝套件依賴
bash
複製
編輯
pip install -r requirements.txt
4. 設定環境變數
複製 .env.example 為 .env，並填入你個人的 AWS 憑證與 SageMaker Endpoint：

bash
複製
編輯
cp .env.example .env
修改 .env：

env
複製
編輯
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
SAGEMAKER_ENDPOINT=your-sagemaker-endpoint-name
🧪 執行程式
bash
複製
編輯
python main.py
啟動成功後預設運行在：

Swagger UI: http://localhost:8000/apidocs

API base path: http://localhost:8000/api
=======
### 🔹 Step 2: 圖片管理 API (S3)
目標：支援前端/使用者將圖片上傳到 uploads/，或從 generated/ 讀取圖片

功能建議：

功能	Method	路由	描述
上傳圖片	POST	/upload	上傳圖片至 uploads/
取得圖片連結	GET	/images?folder=generated	回傳所有圖片 URL
刪除圖片	DELETE	/images/{image_name}	從 S3 移除圖片（可選）
### 🔹 Step 3: 圖片評分 / 回饋 API
目標：使用者針對某個圖片提交喜好評分（如 1~5 分、喜歡/不喜歡等）

功能建議：

功能	Method	路由	描述
提交評分	POST	/feedback	提交單一圖片評分資料
查詢評分	GET	/feedback/{generation_id}	查詢特定圖片的所有評分
分析統計	GET	/feedback/stats	回傳評分統計數據（平均值、數量等）
### 🔹 Step 4: 前後端連接與測試
建議使用 Postman 或 curl 測試後端 API

可以在前端頁面上開始串接 /cases 與 /feedback 資料

若未部署 AWS，可先 mock 資料回傳、或建立本地 JSON 檔替代查詢結果

### 🧭 下一步（你現在可以做的）

項目	建議動作
本地開發啟動	建立 FastAPI 初始專案並跑起 main.py
建立 schema	建立 CaseSchema, FeedbackSchema
撰寫 API	先完成 /cases 路由的 GET 與 POST 功能
測試	使用 curl 或 Postman 測後端回傳資料


>>>>>>> fb8381b4d816fac00127723a85657882f2a8f578
