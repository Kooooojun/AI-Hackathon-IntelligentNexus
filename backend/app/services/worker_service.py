# src/services/worker_service.py
# This simulates the logic that would run in a separate worker process/lambda
import logging
import threading
import time
from uuid import v4 as uuidv4
from ..config import Config
from .bedrock_client import BedrockClient # Import Bedrock client
from ..db.s3 import upload_image_data # Import S3 upload function
from ..db.sqlite import update_job_status, save_image_metadata, get_job # Import DB functions
from .api.types import DesignParameters

logger = logging.getLogger(__name__)

# Initialize Bedrock client once (or pass it in)
try:
    bedrock_client = BedrockClient()
except Exception as e:
     logger.error(f"Failed to initialize BedrockClient for worker: {e}")
     bedrock_client = None # Handle initialization failure

# --- The function executed by the background thread ---
def background_generation_task(job_id: str, user_id: str, parameters: DesignParameters, parent_id: str = None):
    """
    Simulates the background worker task.
    1. Calls AI model (Bedrock)
    2. Uploads result to S3
    3. Saves metadata to DB
    4. Updates job status in DB
    """
    logger.info(f"WORKER [Thread-{threading.get_ident()}]: Starting job {job_id} for user {user_id}, parent: {parent_id}")

    if not bedrock_client:
         logger.error(f"WORKER [Thread-{threading.get_ident()}]: Bedrock client not available. Failing job {job_id}.")
         update_job_status(job_id, 'failed', 'Bedrock client initialization failed.')
         return

    try:
        # --- 1. Generate Prompt (if needed, or assume params has full prompt) ---
        # Example: Use prompt_engine if structure is complex
        # from .prompt_engine import build_prompt # Assuming available
        # prompt_text = build_prompt(parameters.get('style'), ...)
        # For Bedrock Titan, parameters likely *is* the prompt string or needs simple extraction
        prompt_text = parameters.get('description', 'Default prompt') # Adjust based on actual params
        logger.info(f"WORKER [Thread-{threading.get_ident()}]: Using prompt: {prompt_text[:100]}...")

        # --- 2. Call AI Model (Bedrock Titan) ---
        # Assuming titan_image now returns List[bytes]
        image_bytes_list = bedrock_client.titan_image(prompt=prompt_text) # Add width/height if needed
        logger.info(f"WORKER [Thread-{threading.get_ident()}]: Received {len(image_bytes_list)} image(s) from Bedrock for job {job_id}.")

        if not image_bytes_list:
             raise RuntimeError("Bedrock returned no image data.")

        image_metadata_list = []
        # --- 3. Upload each image to S3 & 4. Save Metadata ---
        for i, img_bytes in enumerate(image_bytes_list):
            image_id = f"{job_id}-img{i}" # Simple unique ID for the image
            content_type = 'image/png' # Titan usually returns PNG

            # Upload to S3
            s3_info = await upload_image_data(user_id, job_id, image_id, img_bytes, content_type)

            # Save metadata to DB (pass parent_id!)
            await save_image_metadata(
                image_id=image_id,
                user_id=user_id,
                job_id=job_id,
                s3_bucket=s3_info['bucket'],
                s3_key=s3_info['key'],
                parameters=parameters, # Save the parameters used
                parent_id=parent_id    # Save the parent link!
            )
            image_metadata_list.append({"id": image_id, "s3_key": s3_info['key']}) # Store basic info

        # --- 5. Update Job Status to Succeeded ---
        await update_job_status(job_id, 'succeeded')
        logger.info(f"WORKER [Thread-{threading.get_ident()}]: Job {job_id} completed successfully. Saved {len(image_metadata_list)} images.")

    except Exception as e:
        logger.error(f"WORKER [Thread-{threading.get_ident()}]: Job {job_id} failed: {e}", exc_info=True)
        # --- Update Job Status to Failed ---
        await update_job_status(job_id, 'failed', str(e))

# --- Helper to start the thread (called by controller) ---
def start_background_job(job_id: str, user_id: str, parameters: DesignParameters, parent_id: str = None):
     # For hackathon, directly start thread. Production use SQS.
     logger.info(f"Dispatching background thread for job {job_id}")
     thread = threading.Thread(
         target=background_generation_task,
         args=(job_id, user_id, parameters, parent_id),
         daemon=True # Allows main process to exit even if thread is running
     )
     thread.start()