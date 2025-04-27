# backend/app/controllers/images.controller.py
import logging
from flask import jsonify, g
# Import DB and S3 service functions (adjust path if needed)
from ..db.sqlite import get_image_metadata
from ..db.s3 import generate_presigned_url
from ..services.api.types import SignedUrlResponse # Import response type

logger = logging.getLogger(__name__)

# Controller for GET /api/images/{imageId}/url
async def get_image_signed_url_controller(imageId: str):
    user_id = getattr(g, 'user', {}).get('id')
    if not user_id:
        logger.warning(f"Auth required for signed URL request: {imageId}")
        return jsonify({'message': 'Authentication required.'}), 401

    try:
        # 1. Get image metadata from DB (includes owner user_id, s3_bucket, s3_key)
        metadata = await get_image_metadata(imageId)
        if not metadata:
            logger.warning(f"Signed URL request failed: Image {imageId} not found.")
            return jsonify({'message': 'Image not found.'}), 404

        # --- 2. Authorization Check ---
        # Does the authenticated user own this image?
        if metadata.get('user_id') != user_id:
            logger.warning(f"User {user_id} forbidden from accessing image {imageId} owned by {metadata.get('user_id')}.")
            return jsonify({'message': 'Forbidden: Cannot access this image.'}), 403
        # --- ----------------------- ---

        s3_bucket = metadata.get('s3_bucket')
        s3_key = metadata.get('s3_key')

        # Check if essential S3 info exists in metadata
        if not s3_bucket or not s3_key:
             logger.error(f"Missing S3 bucket or key for image {imageId} in DB.")
             return jsonify({'message': 'Image location information missing.'}), 500

        # 3. Generate presigned URL using S3 service
        signed_url = await generate_presigned_url(s3_bucket, s3_key)

        response_data: SignedUrlResponse = {
            "signedUrl": signed_url,
            "imageId": imageId # Include imageId for frontend matching
        }
        logger.info(f"Generated signed URL for image {imageId} for user {user_id}")
        return jsonify(response_data), 200

    except Exception as e:
        logger.error(f"Error getting signed URL for {imageId}: {e}", exc_info=True)
        # Catch specific errors if needed (e.g., from get_presigned_url)
        return jsonify({'message': 'Failed to get signed URL.'}), 500