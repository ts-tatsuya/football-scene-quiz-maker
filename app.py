import os
import json
import base64
import cv2
import numpy as np
from flask import Flask, render_template, request, jsonify
from ultralytics import YOLO

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

model = YOLO('models/yolo26n-seg.pt')

HUMAN_CLASSES = {0}
BALL_CLASSES = {32}

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}

MIME_MAP = {'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'webp': 'image/webp'}


# Check if uploaded filename has an allowed image extension
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


# Run YOLO segmentation on the image and return binary masks for humans and the ball
def generate_masks(image):
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    h, w = image.shape[:2]
    results = model(image_rgb, verbose=False)[0]

    human_mask = np.zeros((h, w), dtype=np.uint8)
    ball_mask = np.zeros((h, w), dtype=np.uint8)

    if results.masks is not None:
        for i, cls in enumerate(results.boxes.cls):
            cls_id = int(cls)
            mask_np = results.masks.data[i].cpu().numpy()
            mask_np = cv2.resize(mask_np, (w, h))
            mask_bin = (mask_np > 0.5).astype(np.uint8)

            if cls_id in HUMAN_CLASSES:
                human_mask = cv2.bitwise_or(human_mask, mask_bin)
            elif cls_id in BALL_CLASSES:
                ball_mask = cv2.bitwise_or(ball_mask, mask_bin)

    return human_mask, ball_mask


# Encode a binary mask as a colored RGBA PNG data URL
def mask_to_data_url(mask, color):
    rgba = np.zeros((*mask.shape, 4), dtype=np.uint8)
    rgba[mask == 1] = (*color, 255)
    success, buffer = cv2.imencode('.png', cv2.cvtColor(rgba, cv2.COLOR_RGBA2BGRA))
    if not success:
        return None
    b64 = base64.b64encode(buffer).decode('utf-8')
    return f'data:image/png;base64,{b64}'


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/create')
def create():
    return render_template('create.html')


@app.route('/play/<quiz_id>')
def play(quiz_id):
    return render_template('play.html', quiz_id=quiz_id)


# Accept an image upload, run YOLO segmentation, return original + mask data URLs
@app.route('/api/upload-image', methods=['POST'])
def upload_image():
    if 'file' not in request.files:
        return jsonify({'error': 'No file'}), 400
    file = request.files['file']
    if file.filename == '' or not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file'}), 400

    file_bytes = file.read()
    ext = file.filename.rsplit('.', 1)[1].lower()
    mime = MIME_MAP.get(ext, 'image/jpeg')
    img_b64 = base64.b64encode(file_bytes).decode('utf-8')
    img_data_url = f'data:{mime};base64,{img_b64}'

    nparr = np.frombuffer(file_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if image is None:
        return jsonify({'error': 'Invalid image'}), 400

    human_mask, ball_mask = generate_masks(image)
    human_data_url = mask_to_data_url(human_mask, (255, 255, 255))
    ball_data_url = mask_to_data_url(ball_mask, (255, 255, 255))

    return jsonify({
        'image_data': img_data_url,
        'human_mask_data': human_data_url,
        'ball_mask_data': ball_data_url
    })


if __name__ == '__main__':
    app.run(debug=True)
