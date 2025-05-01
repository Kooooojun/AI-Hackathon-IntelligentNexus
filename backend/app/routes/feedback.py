# backend/app/routes/feedback.py
from flask import Blueprint, request, jsonify
from flasgger import swag_from
import logging

# 導入 Supabase client function
try:
    from ..db.supabase_client import save_feedback
except ImportError:
    logging.error("Failed to import save_feedback from supabase_client")
    def save_feedback(data): print("STUB: save_feedback")

logger = logging.getLogger(__name__)
bp = Blueprint("feedback", __name__)

@bp.route("/feedback", methods=["POST"])
@swag_from({ # Use the user's latest spec
    "tags": ["Feedback"],
    "summary": "Submit feedback for a d image",
    # ... parameters (request_id, rating, comment, tags)...
    # ... responses ...
})
def submit_feedback():
    data = request.get_json()
    logger.info(f"Received POST /api/feedback request: {data}")

    if not data or 'request_id' not in data or 'rating' not in data:
        logger.warning("Missing required fields in feedback request.")
        return jsonify({"error": "Missing required fields: request_id, rating"}), 400

    # Prepare data for Supabase (match DB schema)
    feedback_to_save = {
        "request_id": data["request_id"],
        "rating": data["rating"], # Ensure this matches DB type (e.g., int or text)
        "comment": data.get("comment"),
        "tags": data.get("tags") # Ensure DB column type is array (e.g., text[])
    }
    # Remove None values if DB doesn't handle them well
    feedback_to_save = {k: v for k, v in feedback_to_save.items() if v is not None}


    try:
        save_feedback(feedback_to_save) # Call Supabase client function
        logger.info(f"Feedback for request_id {data['request_id']} processed.")
        return jsonify({"status": "ok"})
    except Exception as e:
        logger.error(f"Error saving feedback via Supabase client: {e}", exc_info=True)
        return jsonify({"error": "Failed to save feedback"}), 500