# backend/app/services/generation_service.py

import logging
import uuid
from typing import Optional
from werkzeug.datastructures import FileStorage # For type hinting file uploads
from flask import current_app

# Import necessary components from other modules within the app
from app.db import supabase_client
from app.services import grok_service, task_queue_service

logger = logging.getLogger(__name__)

class GenerationSubmissionError(Exception):
    """Custom exception for errors during the generation submission process."""
    pass

async def process_generation_submission(
    user_id: str,
    prompt: str,
    reference_image_file: Optional[FileStorage] = None,
    analyze_image_flag: bool = False,
    optimize_prompt_flag: bool = False
) -> str:
    """
    Processes a new generation request submission:
    1. Uploads reference image (if provided).
    2. Optionally analyzes image and/or optimizes prompt using Grok.
    3. Stores the initial request state in the database.
    4. Sends the generation task to the background worker queue.
    Returns the unique request_id for the submitted job.
    Raises GenerationSubmissionError on failure.
    """
    request_id = str(uuid.uuid4())
    logger.info(f"Processing generation submission for user {user_id}. New request_id: {request_id}")

    reference_image_path: Optional[str] = None
    reference_image_url: Optional[str] = None
    final_prompt: str = prompt

    # --- 1. Handle Reference Image Upload (if provided) ---
    if reference_image_file and reference_image_file.filename:
        logger.info(f"Attempting to upload reference image: {reference_image_file.filename} for request {request_id}")
        try:
            # Pass user_id and request_id for structured storage path
            reference_image_path = await supabase_client.upload_reference_image(
                file_storage=reference_image_file,
                user_id=user_id,
                request_id=request_id
            )
            if reference_image_path:
                logger.info(f"Reference image uploaded successfully for request {request_id}. Path: {reference_image_path}")
                # Construct the public URL for potential analysis
                try:
                    # Adjust bucket_name based on your actual Supabase bucket
                    bucket_name = "reference-images"
                    # Ensure SUPABASE_URL is accessible, e.g., via current_app.config
                    base_url = current_app.config.get('SUPABASE_URL')
                    if base_url:
                         reference_image_url = f"{base_url}/storage/v1/object/public/{bucket_name}/{reference_image_path}"
                         logger.info(f"Constructed reference image URL: {reference_image_url}")
                    else:
                         logger.warning(f"SUPABASE_URL not configured, cannot construct public URL for image analysis for request {request_id}.")
                         analyze_image_flag = False # Cannot analyze without URL

                except Exception as url_err:
                    logger.error(f"Failed to construct reference image URL for request {request_id}, path {reference_image_path}: {url_err}", exc_info=True)
                    analyze_image_flag = False # Cannot analyze without URL
            else:
                # Decide how critical image upload failure is
                logger.error(f"Reference image upload failed for request {request_id}.")
                # Option 1: Raise immediately
                # raise GenerationSubmissionError("Failed to upload reference image.")
                # Option 2: Log and continue without reference image features
                analyze_image_flag = False

        except Exception as upload_err:
            logger.error(f"Exception during reference image upload for request {request_id}: {upload_err}", exc_info=True)
            # Option 1: Raise immediately
            # raise GenerationSubmissionError(f"Failed to upload reference image: {upload_err}")
            # Option 2: Log and continue
            analyze_image_flag = False


    # --- 2. Optional Image Analysis ---
    if analyze_image_flag and reference_image_url:
        logger.info(f"Analyzing reference image for request {request_id}...")
        try:
            image_description = await grok_service.analyze_image_with_grok(reference_image_url)
            if image_description:
                # Example: Append description to the prompt
                final_prompt = f"{prompt} (Reference detail: {image_description})"
                logger.info(f"Prompt updated with image analysis result for request {request_id}. New prompt length: {len(final_prompt)}")
            else:
                logger.warning(f"Grok Vision analysis returned no description for request {request_id}.")
        except Exception as analyze_err:
             logger.error(f"Error during Grok Vision analysis for request {request_id}: {analyze_err}", exc_info=True)
             # Continue with the current prompt if analysis fails

    # --- 3. Optional Prompt Optimization ---
    if optimize_prompt_flag:
        logger.info(f"Optimizing prompt for request {request_id}...")
        try:
            # Optimize the potentially updated prompt
            optimized_prompt = await grok_service.optimize_prompt_with_grok(final_prompt)
            if optimized_prompt and optimized_prompt != final_prompt: # Check if optimization actually changed something
                 final_prompt = optimized_prompt
                 logger.info(f"Prompt optimized by Grok LLM for request {request_id}. New prompt length: {len(final_prompt)}")
            elif optimized_prompt:
                 logger.info(f"Grok LLM returned same prompt for request {request_id}, no change.")
            else:
                 logger.warning(f"Grok LLM optimization returned empty result for request {request_id}.")
        except Exception as optimize_err:
             logger.error(f"Error during Grok LLM optimization for request {request_id}: {optimize_err}", exc_info=True)
             # Continue with the current prompt if optimization fails


    # --- 4. Store Initial Request State ---
    logger.info(f"Storing initial 'processing' state for request {request_id}...")
    try:
        stored_successfully = await supabase_client.store_generation_request(
            request_id=request_id,
            user_id=user_id,
            prompt=final_prompt, # Store the final version of the prompt
            status='processing',
            ref_image_path=reference_image_path
            # Consider storing original prompt, flags used, etc. for auditing
        )
        if not stored_successfully:
            raise GenerationSubmissionError(f"Failed to store initial state for request {request_id} in database.")
        logger.info(f"Initial state stored successfully for request {request_id}.")
    except Exception as db_err:
        logger.error(f"Database error while storing initial state for request {request_id}: {db_err}", exc_info=True)
        raise GenerationSubmissionError(f"Database error during submission: {db_err}")


    # --- 5. Send Task to Background Worker ---
    logger.info(f"Sending generation task to queue for request {request_id}...")
    try:
        task_sent = task_queue_service.send_generation_task(
            request_id=request_id,
            user_id=user_id,
            final_prompt=final_prompt,
            reference_image_path=reference_image_path
        )
        if not task_sent:
            # If sending fails, attempt to mark the DB record as failed immediately
            logger.error(f"Failed to send task to queue for request {request_id}. Attempting to mark as failed in DB.")
            # Add a function in supabase_client to update status/error_message
            # await supabase_client.update_request_status(request_id, 'failed', 'Failed to queue task')
            raise GenerationSubmissionError(f"Failed to send task to worker queue for request {request_id}.")
        logger.info(f"Generation task for request {request_id} sent to queue successfully.")
    except Exception as queue_err:
        logger.error(f"Error sending task to queue for request {request_id}: {queue_err}", exc_info=True)
        # Attempt to mark as failed
        # await supabase_client.update_request_status(request_id, 'failed', f'Failed to queue task: {queue_err}')
        raise GenerationSubmissionError(f"Queue error during submission: {queue_err}")

    # --- 6. Return Request ID on Success ---
    return request_id