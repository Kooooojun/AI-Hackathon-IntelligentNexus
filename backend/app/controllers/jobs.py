# backend/app/controllers/jobs.controller.py
import logging
from flask import jsonify, g
# Import DB functions directly (adjust path if needed)
from ..db.sqlite import get_job, get_images_for_job
from ..services.api.types import JobStatusResponse, GeneratedImage # Import types

logger = logging.getLogger(__name__)

# Controller for GET /api/jobs/{jobId}/status
async def get_job_status_controller(jobId: str):
    user_id = getattr(g, 'user', {}).get('id')
    if not user_id:
        logger.warning(f"Auth required for job status check: {jobId}")
        return jsonify({'message': 'Authentication required.'}), 401

    try:
        # 1. Get job basic info from DB
        job_info = await get_job(jobId)
        if not job_info:
            logger.warning(f"Job status check failed: Job {jobId} not found.")
            return jsonify({'message': 'Job not found.'}), 404

        # 2. Authorization Check: Does the requesting user own this job?
        if job_info.get('user_id') != user_id:
            logger.warning(f"User {user_id} forbidden from accessing job {jobId} owned by {job_info.get('user_id')}.")
            return jsonify({'message': 'Forbidden: Cannot access this job status.'}), 403
        # -------------------------------------------------

        # 3. Prepare base response
        response_data: JobStatusResponse = {
            "job_id": jobId,
            "status": job_info.get('status', 'failed'), # Default to failed if status missing
        }

        # 4. If succeeded, fetch and attach image metadata
        if job_info.get('status') == 'succeeded':
             images_metadata: List[GeneratedImage] = await get_images_for_job(jobId)
             # IMPORTANT: Return only metadata needed by frontend (NO S3 keys/buckets)
             response_data["images"] = [
                 {
                    "id": img.get("id"),
                    "parentId": img.get("parentId"), # Crucial for frontend hierarchy
                    "parameters": img.get("parameters") # Needed for modify/refine context
                 }
                 for img in images_metadata if img and img.get("id") # Filter out potential None values or incomplete records
             ]
             logger.info(f"Job {jobId} succeeded. Returning status and {len(response_data['images'])} image metadata.")
        elif job_info.get('status') == 'failed':
            response_data["error"] = job_info.get('error', 'Unknown error')
            logger.info(f"Job {jobId} failed. Returning status and error.")
        else:
             logger.info(f"Job {jobId} status: {response_data['status']}. Returning status only.")


        return jsonify(response_data), 200

    except Exception as e:
        logger.error(f"Error getting job status for {jobId}: {e}", exc_info=True)
        return jsonify({'message': 'Failed to get job status.'}), 500