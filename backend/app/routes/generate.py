import logging
import uuid
from flask import request, jsonify, current_app
from werkzeug.exceptions import BadRequest, NotFound, InternalServerError
from pydantic import ValidationError
from flasgger import swag_from

from app.services import grok_service, task_queue_service

from app.services.auth_service import admin_required, get_current_user
from app.services import generation_service
from app.db import supabase_client
from app.models.schemas import Response, StatusResponse

from flask import Blueprint

generate_bp = Blueprint('generate', __name__) 

logger = logging.getLogger(__name__)

@generate_bp.route('/generate', methods=['POST'])
@admin_required # Only admins can 
@swag_from('../swagger_docs/generate_post.yml')

async def submit_generation():
    """Submits a new image generation request (Admin Only)."""
    user = get_current_user()
    if not user:
         raise InternalServerError("User context not found after auth check.") # Should not happen

    # Check content type - expect multipart/form-data
    if not request.content_type or 'multipart/form-data' not in request.content_type.lower():
         raise BadRequest("Content-Type must be multipart/form-data")

    # --- 1. Extract Data ---
    prompt = request.form.get('prompt')
    reference_image_file = request.files.get('reference_image')
    # Convert string flags from form data to boolean
    analyze_image_flag = request.form.get('analyze_image', 'false').lower() == 'true'
    optimize_prompt_flag = request.form.get('optimize_prompt', 'false').lower() == 'true'

    if not prompt:
        raise BadRequest("Missing required field: 'prompt'")

    logger.info(f"Received generation request from admin {user.user_id} with prompt: '{prompt}'")

    # --- 2. Handle Reference Image (Optional) ---
    reference_image_path = None
    reference_image_url = None # Needed if analyze_image is true
    if reference_image_file:
        logger.info(f"Processing reference image: {reference_image_file.filename}")
        reference_image_path = await supabase_client.upload_reference_image(
            reference_image_file, user.user_id, str(uuid.uuid4()) #  temporary ID for path if needed before request_id
        )
        if not reference_image_path:
            logger.error("Failed to upload reference image.")
            # Decide if this is a fatal error or just proceed without ref image
            # raise InternalServerError("Failed to upload reference image.")
        else:
             # Get public URL if needed for analysis
             try:
                 # Construct the URL based on bucket and path - adjust as per your Supabase setup
                 bucket_name = "reference-images" # Example bucket
                 reference_image_url = f"{current_app.config['SUPABASE_URL']}/storage/v1/object/public/{bucket_name}/{reference_image_path}"
                 logger.info(f"Reference image uploaded to path: {reference_image_path}, URL: {reference_image_url}")
             except Exception as url_err:
                 logger.error(f"Could not construct public URL for {reference_image_path}: {url_err}")
                 # Proceed without analysis if URL fails?
                 analyze_image_flag = False


    # --- 3. Image Analysis / Prompt Optimization (Optional) ---
    final_prompt = prompt
    if reference_image_url and analyze_image_flag:
        logger.info("Analyzing reference image...")
        image_description = await grok_service.analyze_image_with_grok(reference_image_url)
        if image_description:
            # Combine description with original prompt (strategy depends on desired behavior)
            final_prompt = f"{prompt} (based on reference image: {image_description})" # Example combination
            logger.info(f"Prompt updated with image analysis: '{final_prompt}'")
        else:
            logger.warning("Image analysis failed or returned no description.")

    if optimize_prompt_flag:
        logger.info("Optimizing prompt...")
        optimized_prompt = await grok_service.optimize_prompt_with_grok(final_prompt) # Optimize potentially combined prompt
        if optimized_prompt:
            final_prompt = optimized_prompt
            logger.info(f"Prompt optimized: '{final_prompt}'")
        else:
            logger.warning("Prompt optimization failed or returned no result.")


    # --- 4. Store Initial Request State & Trigger Worker ---
    request_id = str(uuid.uuid4())
    stored = await supabase_client.store_generation_request(
        request_id=request_id,
        user_id=user.user_id,
        prompt=final_prompt, # Store the final prompt used
        status='processing',
        ref_image_path=reference_image_path
        # Store original_prompt, analyzed_description etc. if needed
    )

    if not stored:
        raise InternalServerError("Failed to store initial request state.")

    task_sent = task_queue_service.send_generation_task(
        request_id=request_id,
        user_id=user.user_id,
        final_prompt=final_prompt,
        reference_image_path=reference_image_path
    )

    if not task_sent:
        # Consider trying to update status to 'failed' here
        raise InternalServerError("Failed to send generation task to worker queue.")

    # --- 5. Return Request ID ---
    logger.info(f"Successfully submitted generation request {request_id}")
    response_data = Response(request_id=request_id)
    return jsonify(response_data.dict()), 202 # 202 Accepted


@generate_bp.route('/<string:request_id>', methods=['GET'])
@admin_required # Only admins can check status (consistent with POST)
@swag_from('../swagger_docs/generate_get_status.yml') #
async def get_status(request_id):
    """Gets the status of a specific generation request (Admin Only)."""
    user = get_status() # For logging/auditing if needed
    if not user:
         raise InternalServerError("User context not found after auth check.")

    logger.info(f"Admin {user.user_id} checking status for request_id: {request_id}")

    status_data = await supabase_client.get_generation_status(request_id)

    if status_data is None:
        raise NotFound(f"Request ID '{request_id}' not found.")

    try:
        # Validate the data structure before returning
        response_model = StatusResponse(**status_data)
        return jsonify(response_model.dict()), 200
    except ValidationError as e:
        logger.error(f"Data validation error for status response {request_id}: {e}")
        raise InternalServerError("Invalid status data format retrieved.")
    except Exception as e:
        logger.error(f"Unexpected error forming status response for {request_id}: {e}", exc_info=True)
        raise InternalServerError("Failed to process status response.")