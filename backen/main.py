from fastapi import FastAPI
from routes import cases

app = FastAPI(title="Cooler Master Backend API")

# 路由註冊
app.include_router(cases.router, prefix="/cases", tags=["Cooler Master Cases"])

@app.get("/")
def root():
    return {"message": "Welcome to Cooler Master API Backend"}