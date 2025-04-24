from app import create_app

app = create_app()

if __name__ == "__main__":
    # debug=True 僅限本機測試
    app.run(host="0.0.0.0", port=8000, debug=True)
