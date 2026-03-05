import os
import json
import base64
import io
import uuid
import time
import logging
from functools import wraps
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from dotenv import load_dotenv
from PIL import Image

# New Google Gen AI SDK
from google import genai
from google.genai import types

# Resolve paths relative to this file, not the working directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Load environment variables from the .env next to this file
load_dotenv(os.path.join(BASE_DIR, '.env'))

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
app.secret_key = os.getenv("FLASK_SECRET_KEY", os.urandom(24))
if not os.getenv("FLASK_SECRET_KEY"):
    logger.warning("FLASK_SECRET_KEY not set — sessions will not persist across restarts")

# Configure Gemini API
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    logger.warning("GOOGLE_API_KEY not found in .env file")

# Load users from environment variables
USERS = {}
for i in range(1, 4):
    username = os.getenv(f"USER{i}_USERNAME", "").strip()
    password = os.getenv(f"USER{i}_PASSWORD", "").strip()
    if username and password:
        USERS[username] = password


def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'username' not in session:
            return redirect(url_for('login', next=request.path))
        return f(*args, **kwargs)
    return decorated


# Load catalog
with open(os.path.join(BASE_DIR, 'catalog.json'), 'r') as f:
    catalog_data = json.load(f)

# In-memory generation history (per session, max 20 items)
generation_history = {}


def get_client():
    """Get a configured Gemini client"""
    return genai.Client(api_key=GOOGLE_API_KEY)


def decode_base64_image(image_b64):
    """Decode base64 image to PIL Image"""
    if ',' in image_b64:
        image_b64 = image_b64.split(',')[1]
    image_bytes = base64.b64decode(image_b64)
    return Image.open(io.BytesIO(image_bytes))


def pil_to_base64(pil_image):
    """Convert PIL Image to base64 string"""
    buffer = io.BytesIO()
    pil_image.save(buffer, format='PNG')
    return base64.b64encode(buffer.getvalue()).decode('utf-8')


def extract_image_from_response(response):
    """Extract base64 image from new SDK response"""
    for part in response.parts:
        if part.inline_data:
            return base64.b64encode(part.inline_data.data).decode('utf-8')
    return None


def get_session_id():
    """Get or create a session ID"""
    if 'session_id' not in session:
        session['session_id'] = str(uuid.uuid4())
    return session['session_id']


def save_to_history(session_id, entry):
    """Save a generation to history"""
    if session_id not in generation_history:
        generation_history[session_id] = []
    generation_history[session_id].insert(0, entry)
    generation_history[session_id] = generation_history[session_id][:20]


@app.route('/login', methods=['GET', 'POST'])
def login():
    if 'username' in session:
        return redirect(url_for('index'))
    error = None
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '').strip()
        if username in USERS and USERS[username] == password:
            session['username'] = username
            next_page = request.args.get('next', '/')
            return redirect(next_page)
        error = 'Invalid username or password'
    return render_template('login.html', error=error)


@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))


@app.route('/')
@login_required
def index():
    return render_template('index.html', username=session['username'])


@app.route('/playground')
@login_required
def playground():
    return render_template('playground.html', username=session['username'])


@app.route('/catalog')
@login_required
def get_catalog():
    return jsonify(catalog_data)


@app.route('/history', methods=['GET'])
@login_required
def get_history():
    session_id = get_session_id()
    history = generation_history.get(session_id, [])
    # Return without full image data for listing (just thumbnail info)
    return jsonify(history)


@app.route('/history', methods=['DELETE'])
@login_required
def clear_history():
    session_id = get_session_id()
    if session_id in generation_history:
        del generation_history[session_id]
    return jsonify({'success': True})


@app.route('/try-on', methods=['POST'])
@login_required
def try_on():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        user_image_b64 = data.get('user_image')
        item_id = data.get('item_id')

        if not user_image_b64 or not item_id:
            return jsonify({'error': 'Missing user_image or item_id'}), 400

        item = next((i for i in catalog_data['items'] if i['id'] == item_id), None)
        if not item:
            return jsonify({'error': f'Item {item_id} not found in catalog'}), 404

        if not GOOGLE_API_KEY:
            return jsonify({'error': 'GOOGLE_API_KEY not configured'}), 500

        logger.info(f"Processing try-on for item: {item['name']}")

        user_img = decode_base64_image(user_image_b64)

        garment_path = os.path.join(BASE_DIR, 'static', item['image'])
        if not os.path.exists(garment_path):
            return jsonify({'error': f'Garment image not found: {garment_path}'}), 404
        garment_img = Image.open(garment_path)

        prompt = f"""You are a virtual try-on assistant. Your task is to show how a person would look wearing a specific garment.

INSTRUCTIONS:
1. Take the person from the first image (their face, hair, body, pose, skin tone)
2. Take the garment from the second image
3. Generate a new image showing this exact person wearing this exact garment
4. The result should look natural and photorealistic
5. Preserve the person's identity perfectly - same face, same hair, same skin tone
6. The garment should fit naturally on their body

GARMENT DETAILS:
{item['prompt']}

Generate the try-on image now."""

        logger.info("Calling Gemini API for try-on...")
        client = get_client()

        response = client.models.generate_content(
            model='gemini-2.5-flash-image',
            contents=[prompt, user_img, garment_img],
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE"],
                image_config=types.ImageConfig(aspect_ratio="3:4"),
            ),
        )

        generated_image_b64 = extract_image_from_response(response)

        if not generated_image_b64:
            return jsonify({'error': 'No image generated by the model.'}), 500

        logger.info("Successfully generated try-on image")

        # Save to history
        session_id = get_session_id()
        save_to_history(session_id, {
            'id': str(uuid.uuid4()),
            'timestamp': time.time(),
            'mode': 'virtual-try-on',
            'prompt': item['name'],
            'image': f'data:image/png;base64,{generated_image_b64}',
        })

        return jsonify({
            'success': True,
            'generated_image': f'data:image/png;base64,{generated_image_b64}',
            'item_name': item['name']
        })

    except Exception as e:
        logger.exception("Error in try-on")
        return jsonify({'error': f'Server error: {str(e)}'}), 500


def build_mode_prompt(mode, user_prompt, negative_prompt=None):
    """Build the appropriate prompt based on the generation mode"""
    mode_prompts = {
        'text-to-image': user_prompt,
        'image-editing': f"""You are an image editing assistant. Modify the provided image according to the instructions below.

INSTRUCTIONS:
{user_prompt}

Apply the changes naturally and seamlessly while preserving the overall composition and quality.""",
        'style-transfer': f"""You are a style transfer assistant. Apply the artistic style from the style reference image to the content image.

INSTRUCTIONS:
{user_prompt}

The first image is the content. The second image is the style reference.
Preserve the structure of the content image while applying the colors, textures, and artistic techniques from the style reference.""",
        'inpainting': f"""You are an image inpainting assistant. Fill in the masked area of the image.

White areas in the mask = regions to modify. Black areas = preserve as-is.

INSTRUCTIONS:
{user_prompt}

Fill the masked area with content that blends seamlessly with the surrounding image.""",
        'outpainting': f"""You are an image outpainting assistant. Extend the image beyond its original boundaries.

INSTRUCTIONS:
{user_prompt}

Generate content that logically continues the scene, matching the style, lighting, and perspective of the original."""
    }

    result = mode_prompts.get(mode, user_prompt)
    if negative_prompt:
        result += f"\n\nIMPORTANT - Avoid the following: {negative_prompt}"
    return result


@app.route('/generate', methods=['POST'])
@login_required
def generate():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        user_prompt = data.get('prompt')
        mode = data.get('mode', 'text-to-image')
        image_b64 = data.get('image')
        mask_b64 = data.get('mask')
        style_b64 = data.get('style_image')
        negative_prompt = data.get('negative_prompt')

        # Settings - now all actually used
        model_name = data.get('model', 'gemini-2.5-flash-image')
        aspect_ratio = data.get('aspect_ratio')
        image_size = data.get('image_size')
        temperature = data.get('temperature', 1.0)
        seed = data.get('seed')

        if not user_prompt:
            return jsonify({'error': 'Missing prompt'}), 400

        if not GOOGLE_API_KEY:
            return jsonify({'error': 'GOOGLE_API_KEY not configured'}), 500

        logger.info(f"Processing {mode} | model={model_name} | aspect={aspect_ratio} | size={image_size} | temp={temperature}")

        prompt = build_mode_prompt(mode, user_prompt, negative_prompt)
        contents = [prompt]

        # Add images based on mode
        if mode == 'text-to-image':
            if image_b64:
                contents.append(decode_base64_image(image_b64))
        elif mode == 'image-editing':
            if not image_b64:
                return jsonify({'error': 'Source image required for image editing mode'}), 400
            contents.append(decode_base64_image(image_b64))
        elif mode == 'style-transfer':
            if not image_b64:
                return jsonify({'error': 'Content image required for style transfer mode'}), 400
            if not style_b64:
                return jsonify({'error': 'Style reference image required for style transfer mode'}), 400
            contents.append(decode_base64_image(image_b64))
            contents.append(decode_base64_image(style_b64))
        elif mode in ['inpainting', 'outpainting']:
            if not image_b64:
                return jsonify({'error': f'Source image required for {mode} mode'}), 400
            if not mask_b64:
                return jsonify({'error': f'Mask image required for {mode} mode'}), 400
            contents.append(decode_base64_image(image_b64))
            contents.append(decode_base64_image(mask_b64))

        # Build image config
        image_config_kwargs = {}
        if aspect_ratio:
            image_config_kwargs['aspect_ratio'] = aspect_ratio
        if image_size:
            image_config_kwargs['image_size'] = image_size

        # Build generation config
        config_kwargs = {
            'response_modalities': ["IMAGE"],
            'temperature': float(temperature),
        }
        if image_config_kwargs:
            config_kwargs['image_config'] = types.ImageConfig(**image_config_kwargs)
        if seed is not None:
            config_kwargs['seed'] = int(seed)

        logger.info("Calling Gemini API...")
        client = get_client()

        response = client.models.generate_content(
            model=model_name,
            contents=contents,
            config=types.GenerateContentConfig(**config_kwargs),
        )

        generated_image_b64 = extract_image_from_response(response)

        if not generated_image_b64:
            # Try to get text response for debugging
            text_parts = [p.text for p in response.parts if hasattr(p, 'text') and p.text]
            error_msg = 'No image generated by the model.'
            if text_parts:
                error_msg += f' Model response: {" ".join(text_parts)}'
            return jsonify({'error': error_msg}), 500

        logger.info(f"Successfully generated image | mode={mode}")

        # Save to history
        session_id = get_session_id()
        save_to_history(session_id, {
            'id': str(uuid.uuid4()),
            'timestamp': time.time(),
            'mode': mode,
            'prompt': user_prompt[:200],
            'model': model_name,
            'settings': {'aspect_ratio': aspect_ratio, 'image_size': image_size},
            'image': f'data:image/png;base64,{generated_image_b64}',
        })

        return jsonify({
            'success': True,
            'generated_image': f'data:image/png;base64,{generated_image_b64}',
            'mode': mode
        })

    except Exception as e:
        logger.exception("Error in generate")
        return jsonify({'error': f'Server error: {str(e)}'}), 500


@app.route('/optimize-prompt', methods=['POST'])
@login_required
def optimize_prompt():
    """Use Gemini text model to enhance the user's prompt for better image generation"""
    try:
        data = request.get_json()
        user_prompt = data.get('prompt', '').strip()
        mode = data.get('mode', 'text-to-image')

        if not user_prompt:
            return jsonify({'error': 'Missing prompt'}), 400

        if not GOOGLE_API_KEY:
            return jsonify({'error': 'GOOGLE_API_KEY not configured'}), 500

        mode_guidelines = {
            'text-to-image': 'Add lighting, composition, artistic style, mood, camera angle, depth of field, quality indicators (4K, highly detailed, professional photography).',
            'image-editing': 'Be precise about the changes. Specify areas, colors, styles. Keep edits targeted and clear.',
            'style-transfer': 'Describe the style transfer clearly. Mention artistic movement, technique, brush strokes, color palette.',
            'inpainting': 'Describe exactly what should fill the masked area. Match surrounding context, lighting, perspective.',
            'outpainting': 'Describe what continues beyond the borders. Match the existing scene logically.'
        }

        system_instruction = f"""You are an expert at writing prompts for AI image generation (NanoBanana/Gemini).
Mode: {mode}

Transform the user's prompt into a detailed, effective prompt for high-quality image generation.

Guidelines:
- {mode_guidelines.get(mode, 'Add specific visual details, lighting, composition, style, mood.')}
- Keep the core intent of the original prompt
- Max 200 words
- Return ONLY the optimized prompt, nothing else"""

        client = get_client()
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=f"Optimize this image generation prompt: {user_prompt}",
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.7,
            ),
        )

        optimized = response.text.strip()
        return jsonify({'success': True, 'optimized_prompt': optimized})

    except Exception as e:
        logger.exception("Error in optimize-prompt")
        return jsonify({'error': f'Server error: {str(e)}'}), 500


if __name__ == '__main__':
    if not os.path.exists(os.path.join(BASE_DIR, '.env')):
        logger.warning(".env file not found! Please create one with your GOOGLE_API_KEY")
    debug = os.getenv('FLASK_DEBUG', 'false').lower() == 'true'
    port = int(os.getenv('PORT', 5000))
    app.run(debug=debug, host='0.0.0.0', port=port)
