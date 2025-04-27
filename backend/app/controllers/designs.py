# backend/app/controllers/designs.controller.py
import logging
from flask import request, jsonify, g
# Ensure this path is correct for your SQLite functions
from ..db.sqlite import save_design, record_feedback # Import DB functions
from ..services.api.types import FeedbackPayload, SaveDesignPayload, SaveDesignResponse, FeedbackResponse

logger = logging.getLogger(__name__)

# Controller for POST /api/designs/save
async def save_design_controller():
    user_id = getattr(g, 'user', {}).get('id')
    if not user_id: return jsonify({'message': 'Auth required.'}), 401

    payload: SaveDesignPayload = request.get_json()
    image_id = payload.get('image_id')
    if not image_id: return jsonify({'message': 'Missing image_id.'}), 400

    try:
        success = await save_design(user_id, image_id)
        if success:
             logger.info(f"Design {image_id} saved successfully for user {user_id}")
             return jsonify({"status": "success", "message": "Design saved."}), 200
        else:
             logger.warning(f"Failed to save design {image_id} for user {user_id} (not found or forbidden?).")
             return jsonify({'message': 'Failed to save design (not found or forbidden?).'}), 400 # Or appropriate status
    except Exception as e:
        logger.error(f"Error saving design {image_id} for user {user_id}: {e}", exc_info=True)
        return jsonify({'message': 'Failed to save design due to server error.'}), 500

# Controller for POST /api/designs/feedback
async def submit_feedback_controller():
    user_id = getattr(g, 'user', {}).get('id')
    if not user_id: return jsonify({'message': 'Auth required.'}), 401

    payload: FeedbackPayload = request.get_json()
    job_id = payload.get('job_id') # Ensure frontend sends this if needed by DB
    image_id = payload.get('image_id')
    rating = payload.get('rating')

    if not job_id or not image_id or not rating or rating not in ['up', 'down']:
         logger.warning(f"Submit feedback request missing/invalid fields: {payload}")
         return jsonify({'message': 'Missing or invalid fields (job_id, image_id, rating).'}), 400

    try:
        # Optional: Add authorization check here - does user own the job/image?
        # metadata = await get_image_metadata(image_id)
        # if not metadata or metadata.get('user_id') != user_id: return jsonify({'message': 'Forbidden'}), 403

        success = await record_feedback(user_id, job_id, image_id, rating)
        if success:
            logger.info(f"Feedback recorded for image {image_id} (Job: {job_id}) by user {user_id}")
            return jsonify({"status": "success", "message": "Feedback recorded."}), 200
        else:
            logger.warning(f"Failed to record feedback for image {image_id}")
            return jsonify({'message': 'Failed to record feedback.'}), 400 # Or 500 if it was DB error
    except Exception as e:
        logger.error(f"Error recording feedback for {image_id}: {e}", exc_info=True)
        return jsonify({'message': 'Failed to record feedback due to server error.'}), 500