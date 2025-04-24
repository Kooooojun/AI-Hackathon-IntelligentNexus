安裝環境

.env 設定

專案結構說明

如何啟動與測試 API（含 Swagger UI）

你可以直接複製貼上到 backend/README.md：

markdown
複製
編輯
# 🧠 AI Design Backend (Flask + Swagger + AWS)

本專案為 AI Hackathon 使用，提供 REST API 接收設計需求，呼叫 SageMaker / Bedrock 圖像生成模型，並回傳圖片網址給前端。整合 Swagger UI 方便調試，支援 S3 儲存與 DynamoDB 記錄。

---

## 🚀 快速啟動

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