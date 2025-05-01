import logging
from app import celery_app # Import the Celery app instance from __init__

logger = logging.getLogger(__name__)

# Define the name of the task as defined in the worker project
IMAGE_GENERATION_TASK_NAME = 'worker.tasks.generation_task._image_task'

def send_generation_task(request_id: str, user_id: str, final_prompt: str, reference_image_path: str | None = None):
    """Sends the image generation task to the Celery queue."""
    try:
        logger.info(f"Sending task '{IMAGE_GENERATION_TASK_NAME}' to queue for request_id: {request_id}")
        # Pass arguments needed by the worker task
        task_args = {
            'request_id': request_id,
            'user_id': user_id,
            'prompt': final_prompt,
            'reference_image_path': reference_image_path
            # Add any other necessasry parameters
        }
        celery_app.send_task(IMAGE_GENERATION_TASK_NAME, kwargs=task_args)
        logger.info(f"Task for request_id {request_id} sent successfully.")
        return True
    except Exception as e:
        logger.error(f"Failed to send task for request_id {request_id} to Celery queue: {e}", exc_info=True)
        return False