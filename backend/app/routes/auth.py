# backend/app/routes/auth.py

import logging
from flask import jsonify, Blueprint # Import Blueprint
from flasgger import swag_from

# --- Define the Blueprint for this file's routes ---
# This line defines the blueprint, replacing the incorrect 'from . import auth_bp'
auth_bp = Blueprint('auth', __name__)

# --- Import necessary services ---
# Use 'app.' prefix as they are in different directories within the 'app' package
from app.services.auth_service import jwt_required, get_current_user

logger = logging.getLogger(__name__)

# --- Route Definitions ---

# @auth_bp.route('/me', methods=['GET'])
# @jwt_required
# @swag_from('../swagger_docs/auth_me.yml') # Ensure this path is correct
# async def get_me():
    # """
    # Returns information about the currently authenticated user.
    # Relies on the @jwt_required decorator to populate user context.
    # """
    # user = get_current_user()
    # if not user:
    #     # This should ideally not be reached if @jwt_required works correctly
    #     logger.warning("User context not found in /me route despite @jwt_required.")
    #     # Return 401 explicitly, although @jwt_required should handle it
    #     return jsonify({"error": "Authentication required or token invalid."}), 401

    # logger.info(f"Returning profile for user {user.user_id}")
    # try:
    #     # Assuming user object (Pydantic model) has a .dict() method
    #     return jsonify(user.dict()), 200
    # except AttributeError:
    #     # Fallback if .dict() doesn't exist or user isn't a Pydantic model
    #     logger.error(f"User object for {user.user_id} does not have a .dict() method.")
    #     # Return manually constructed dict - adjust fields as needed
    #     return jsonify({"user_id": user.user_id, "roles": user.roles}), 200
    # except Exception as e:
    #     logger.error(f"Error creating response for /me route for user {user.user_id}: {e}", exc_info=True)
    #     return jsonify({"error": "Failed to process user profile."}), 500
