# app/routes/generate.py
from flask import Blueprint, request, jsonify
from flasgger.utils import swag_from
from ..services.prompt_engine import build_prompt
from ..services.sagemaker_client import generate_image

bp = Blueprint("generate", __name__)

@bp.route("/generate", methods=["POST"])
@swag_from({
    "tags": ["Generate"],
    "summary": "Send design prompt & get image URLs",
    "description": "Combine user description, brand DNA, call image model.",
    "parameters": [
        {
            "name": "body",
            "in": "body",
            "required": True,
            "schema": {
                "type": "object",
                "properties": {
                    "description": {"type": "string"},
                    "style_tags": {
                        "type": "array",
                        "items": {"type": "string"}
                    },
                    "use_bedrock": {"type": "boolean", "default": False}
                },
                "required": ["description"]
            }
        }
    ],
    "responses": {
        200: {
            "description": "Success",
            "schema": {
                "type": "object",
                "properties": {
                    "image_urls": {
                        "type": "array",
                        "items": {"type": "string"}
                    },
                    "prompt": {"type": "string"}
                }
            }
        },
        400: {"description": "Bad input"}
    }
})
def generate():
    data = request.get_json()
    # --- 1. 組 Prompt ---
    prompt = build_prompt(data["description"], data.get("style_tags", []))
    # --- 2. 呼叫模型 ---
    urls = generate_image(prompt, use_bedrock=data.get("use_bedrock", False))
    return jsonify({"image_urls": urls, "prompt": prompt})
