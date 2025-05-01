import logging
import jwt
from functools import wraps
from flask import request, current_app, g, jsonify
from werkzeug.exceptions import Unauthorized, Forbidden
from typing import Optional, Dict, List

from app.models.schemas import UserProfile

logger = logging.getLogger(__name__)

class AuthServiceError(Exception):
    """Custom exception for Auth Service errors."""
    pass

def _decode_jwt(token: str) -> Optional[Dict]:
    """Decodes and verifies the JWT."""
    jwt_secret = current_app.config['SUPABASE_JWT_SECRET']
    if not jwt_secret:
        logger.error("SUPABASE_JWT_SECRET is not configured.")
        raise AuthServiceError("JWT secret not configured on server.")

    try:
        # Verify signature and expiration
        payload = jwt.decode(
            token,
            jwt_secret,
            algorithms=["HS256"],
            audience="authenticated" # Default Supabase audience
        )
        logger.debug(f"JWT decoded successfully: {payload}")
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("JWT verification failed: Token has expired.")
        raise Unauthorized("Token has expired.")
    except jwt.InvalidTokenError as e:
        logger.warning(f"JWT verification failed: Invalid token - {e}")
        raise Unauthorized(f"Invalid token: {e}")
    except Exception as e:
        logger.error(f"An unexpected error occurred during JWT decoding: {e}", exc_info=True)
        raise AuthServiceError("Could not decode token.")


def get_current_user() -> Optional[UserProfile]:
    """Gets the current user from the request context (set by @jwt_required)."""
    return g.get('user', None)


def jwt_required(f):
    """Decorator to protect routes requiring a valid JWT."""
    @wraps(f)
    async def decorated_function(*args, **kwargs): # Make decorator async
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            logger.warning("Missing or invalid Authorization header.")
            raise Unauthorized("Authorization header is missing or invalid.")

        token = auth_header.split(" ")[1]
        try:
            payload = _decode_jwt(token)
            # Extract user information from payload
            user_id = payload.get('sub') # Standard JWT subject claim for user ID
            roles = payload.get('roles', []) # Assuming 'roles' is the custom claim name

            if not user_id:
                 logger.error("User ID (sub) not found in JWT payload.")
                 raise Unauthorized("Invalid token payload.")

            # Store user info in Flask's request context (g)
            g.user = UserProfile(user_id=user_id, roles=roles)
            logger.info(f"Authenticated user {user_id} with roles: {roles}")

        except (Unauthorized, Forbidden, AuthServiceError) as e:
             # Re-raise auth specific exceptions to be handled by Flask error handlers
             raise e
        except Exception as e:
             logger.error(f"Unexpected error during token processing: {e}", exc_info=True)
             raise InternalServerError("Could not process authentication token.")

        # Call the original async route function
        return await f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    """Decorator ensuring the user has the admin role."""
    @wraps(f)
    @jwt_required # Depends on @jwt_required to set g.user
    async def decorated_function(*args, **kwargs): # Make decorator async
        user = get_current_user()
        admin_role = current_app.config['ADMIN_ROLE_NAME']

        if not user or admin_role not in user.roles:
            logger.warning(f"Admin access denied for user {user.user_id if user else 'None'}. Required role: '{admin_role}', User roles: {user.roles if user else 'N/A'}")
            raise Forbidden("Administrator access required.")

        logger.info(f"Admin access granted for user {user.user_id}")
        # Call the original async route function
        return await f(*args, **kwargs)
    return decorated_function