# backend/run.py

import os
from dotenv import load_dotenv

# --- Load environment variables first ---
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)
    print("Loaded .env file")
else:
    print("Warning: .env file not found.")

# --- Import the app factory after loading .env ---
from app import create_app

# --- Create the Flask app instance ---
app = create_app()

# --- Get host and port for printing links ---
# Use 127.0.0.1 for clickable links, even if Flask listens on 0.0.0.0
host = '127.0.0.1'
port = int(os.environ.get("PORT", 5001)) # Default Flask dev port is 5000, but we used 5001 before
debug_mode = app.debug # Check if debug mode is enabled

# --- Print helpful links before starting the server ---
print("-" * 40)
print(f"Flask App '{app.name}' is configured.")
print(f"Debug mode: {'on' if debug_mode else 'off'}")
print("Starting development server...")
print(f" * Running on http://{host}:{port}/")
print(f" * API Docs available at http://{host}:{port}/apidocs/")
print("-" * 40)
print("(Press CTRL+C to quit)") # Standard Flask message

# --- Run the Flask development server ---
if __name__ == "__main__":
    # Use the host '0.0.0.0' to make it accessible from network if needed,
    # but the printed links use 127.0.0.1 for local access.
    app.run(host='0.0.0.0', port=port)

