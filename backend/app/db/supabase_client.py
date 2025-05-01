import logging
from supabase import create_client, Client
from flask import current_app, g
from typing import Optional, Dict 

logger = logging.getLogger(__name__)

def get_supabase_client() -> Client:
    """Gets the Supabase client for the current request context."""
    if 'supabase_client' not in g:
        g.supabase_client = create_client(
            current_app.config['SUPABASE_URL'],
            current_app.config['SUPABASE_SERVICE_ROLE_KEY'] # Use service role key for backend operations
        )
        logger.info("Supabase client initialized for request context.")
    return g.supabase_client

def init_supabase(app):
    """Initializes Supabase client setup (can be called in app factory)."""
    # This function could potentially do more setup if needed
    logger.info("Supabase client setup registered.")
    # Teardown context could be added if complex cleanup is needed,
    # but typically Supabase client doesn't require explicit closing per request.
    # @app.teardown_appcontext
    # def teardown_db(exception):
    #     client = g.pop('supabase_client', None)
    #     if client is not None:
    #          # Cleanup if necessary
    #          pass

# --- Database Interaction Functions ---

async def store_generation_request(request_id: str, user_id: str, prompt: str, status: str = 'processing', ref_image_path: Optional[str] = None) -> bool:
    """Stores initial generation request details."""
    client = get_supabase_client()
    try:
        data = {
            'id': request_id,
            'user_id': user_id,
            'prompt': prompt,
            'status': status,
            'reference_image_path': ref_image_path,
            # Add other fields like original_prompt, analyzed_prompt etc. if needed
            'created_at': 'now()', # Use Supabase 'now()' function
            'updated_at': 'now()'
        }
        response = await client.table('generation_requests').insert(data).execute()
        logger.info(f"Stored generation request {request_id}: {response}")
        # Simple check: Check if response indicates success (e.g., data is present)
        return bool(response.data)
    except Exception as e:
        logger.error(f"Error storing generation request {request_id}: {e}", exc_info=True)
        return False

async def get_generation_status(request_id: str) -> Optional[dict]:
    """Retrieves the status and result URL for a generation request."""
    client = get_supabase_client()
    try:
        # Select only necessary columns
        response = await client.table('generation_requests') \
                         .select('id', 'status', 'result_url', 'error_message') \
                         .eq('id', request_id) \
                         .maybe_single() \
                         .execute()

        logger.debug(f"Status query response for {request_id}: {response}")
        if response.data:
            # Map db field names to StatusResponse field names if they differ
            return {
                "request_id": response.data.get("id"),
                "status": response.data.get("status"),
                "result_url": response.data.get("result_url"),
                "error_message": response.data.get("error_message")
            }
        else:
            logger.warning(f"Generation request {request_id} not found.")
            return None
    except Exception as e:
        logger.error(f"Error retrieving status for {request_id}: {e}", exc_info=True)
        return None

# --- Storage Interaction Functions ---

async def upload_reference_image(file_storage, user_id: str, request_id: str) -> Optional[str]:
    """Uploads a reference image to Supabase Storage."""
    client = get_supabase_client()
    if not file_storage or not file_storage.filename:
        return None

    file_ext = file_storage.filename.rsplit('.', 1)[1].lower() if '.' in file_storage.filename else 'png' # Default extension
    # Construct a unique path, e.g., user_id/request_id/reference.ext
    file_path = f"{user_id}/{request_id}/reference.{file_ext}"
    bucket_name = "reference-images" # Or your configured bucket name

    try:
        # Ensure bucket exists or handle creation elsewhere if needed
        # Upload file content. Ensure file_storage is read correctly.
        # The Supabase client might need bytes.
        file_content = file_storage.read()
        response = await client.storage.from_(bucket_name).upload(
            path=file_path,
            file=file_content,
            file_options={"content-type": file_storage.content_type, "upsert": "true"} # Upsert allows overwriting
        )
        logger.info(f"Uploaded reference image to {file_path}: {response}")

        # Check response, Supabase client might raise exception on failure or return specific structure
        # Construct the public URL or return the path depending on needs
        # This gets the path, not necessarily the public URL directly
        # public_url_response = client.storage.from_(bucket_name).get_public_url(file_path)
        # return public_url_response
        return file_path # Return the path stored in DB

    except Exception as e:
        logger.error(f"Error uploading reference image {file_path}: {e}", exc_info=True)
        return None