# backend/app/routes/__init__.py

from flask import Blueprint

# Import the actual blueprints defined in other files within this 'routes' directory.
# Make sure you have 'generate.py' defining 'generate_bp' and 'auth.py' defining 'auth_bp'.
from .generate import generate_bp
from .auth import auth_bp