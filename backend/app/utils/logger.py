import logging
import sys

def setup_logging(log_level=logging.INFO):
    """Configures basic logging."""
    log_formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    root_logger = logging.getLogger()

    # Clear existing handlers
    if root_logger.hasHandlers():
        root_logger.handlers.clear()

    # Console Handler
    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setFormatter(log_formatter)
    root_logger.addHandler(stream_handler)

    # Set Level
    root_logger.setLevel(log_level)

    # Optionally add File Handler
    # file_handler = logging.FileHandler("backend.log")
    # file_handler.setFormatter(log_formatter)
    # root_logger.addHandler(file_handler)

    logging.getLogger("werkzeug").setLevel(logging.WARNING) # Quieten Werkzeug logs unless warning/error
    logging.getLogger("supabase").setLevel(logging.INFO) # Adjust Supabase log level
    logging.getLogger("celery").setLevel(logging.INFO)  # Adjust Celery log level

    logger = logging.getLogger(__name__)
    logger.info(f"Logging configured with level: {logging.getLevelName(log_level)}")

# You would call setup_logging() early in your application setup,
# possibly within the app factory (`create_app`) or `run.py`.
# Example call in create_app:
# if app.debug:
#     setup_logging(logging.DEBUG)
# else:
#     setup_logging(logging.INFO)