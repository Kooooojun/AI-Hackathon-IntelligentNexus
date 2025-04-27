# backend/app/controllers/generate.controller.py
import logging
from flask import request, jsonify, g # Import g for user context
from uuid import v4 as uuidv4
# Assuming types are defined correctly relative to app
from ..services.api.types import GeneratePayload, DesignParameters, GenerateVariantsPayload
# Import NEW services/helpers (adjust path if structure differs slightly)
from ..db.sqlite import create_job, get_image_metadata # Import DB functions directly
from ..services.worker_service import start_background_job # Import thread/worker starter

logger = logging.getLogger(__name__)

# Controller for POST /api/generate
async def start_initial_generation_controller():
    # Assumes token_required middleware added g.user
    user_id = getattr(g, 'user', {}).get('id')
    if not user_id:
        logger.warning("Auth required but user ID not found in g")
        return jsonify({'message': 'Authentication required.'}), 401

    # Use request.get_json() for JSON payloads
    payload: GeneratePayload = request.get_json()
    if not payload or not payload.get('features') or not payload.get('description'):
        logger.warning(f"Initial generation request missing fields: {payload}")
        return jsonify({'message': 'Missing description or features.'}), 400

    try:
        job_id = uuidv4()
        parameters = payload['features']
        # Ensure description is included if needed by worker/prompt engine
        parameters['description'] = payload['description']

        # 1. Create job in DB (status: pending)
        await create_job(user_id, job_id, parameters) # No parent_id for initial

        # 2. Start background task (using threading for hackathon)
        start_background_job(job_id, user_id, parameters, None) # Pass None for parent_id

        # 3. Respond immediately
        logger.info(f"Initial generation job {job_id} accepted for user {user_id}")
        return jsonify({'job_id': job_id, 'message': 'Generation request accepted.'}), 202 # 202 Accepted

    except Exception as e:
        logger.error(f"Error starting initial generation for user {user_id}: {e}", exc_info=True)
        return jsonify({'message': 'Failed to start generation job.'}), 500

# Controller for POST /api/generate/variants
async def start_variant_generation_controller():
    user_id = getattr(g, 'user', {}).get('id')
    if not user_id:
        logger.warning("Auth required but user ID not found in g")
        return jsonify({'message': 'Authentication required.'}), 401

    payload: GenerateVariantsPayload = request.get_json()
    reference_image_id = payload.get('reference_image_id')
    base_parameters_from_payload = payload.get('base_parameters') # Optional from frontend

    if not reference_image_id:
        logger.warning(f"Variant generation request missing reference_image_id: {payload}")
        return jsonify({'message': 'Missing reference_image_id.'}), 400

    try:
         # --- Authorization & Parameter Fetching ---
         # Get metadata of the parent image to check ownership and get parameters
         parent_metadata = await get_image_metadata(reference_image_id)
         if not parent_metadata:
             logger.warning(f"Reference image {reference_image_id} not found for variant generation.")
             return jsonify({'message': 'Reference image not found.'}), 404

         # Check if the authenticated user owns the parent image
         if parent_metadata.get('user_id') != user_id:
             logger.warning(f"User {user_id} forbidden from using image {reference_image_id} as variant parent.")
             return jsonify({'message': 'Forbidden: Cannot generate variants from this image.'}), 403

         # Use parameters from payload if provided, otherwise use parent's parameters
         actual_base_params = base_parameters_from_payload or parent_metadata.get('parameters')
         if not actual_base_params:
              # This case might happen if parent image metadata didn't store parameters
              logger.warning(f"Could not determine base parameters for variant generation from parent {reference_image_id}")
              # Fallback to a default or return error
              # For now, let's try to proceed with a minimal structure if possible
              actual_base_params = {} # Or return 400 error
              # return jsonify({'message': 'Could not determine base parameters for variant.'}), 400
         # -----------------------------------------

         job_id = uuidv4()
         # 1. Create job in DB (pass reference_image_id as parent_id)
         await create_job(user_id, job_id, actual_base_params, reference_image_id)

         # 2. Start background task (pass parent_id)
         start_background_job(job_id, user_id, actual_base_params, reference_image_id)

         # 3. Respond immediately
         logger.info(f"Variant generation job {job_id} accepted for user {user_id}, parent: {reference_image_id}")
         return jsonify({'job_id': job_id, 'message': 'Variant generation request accepted.'}), 202

    except Exception as e:
        logger.error(f"Error starting variant generation for user {user_id}, parent {reference_image_id}: {e}", exc_info=True)
        return jsonify({'message': 'Failed to start variant generation job.'}), 500