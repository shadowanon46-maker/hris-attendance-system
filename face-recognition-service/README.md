# Face Recognition Service

Python FastAPI service for face detection, recognition, and liveness detection using InsightFace.

## Features

- **Face Detection**: Detect faces in images
- **Face Recognition**: Extract 512-dimensional face embeddings
- **Face Verification**: Compare faces and verify identity
- **Liveness Detection**: Basic anti-spoofing checks
- **Face Registration**: Complete registration flow with quality checks

## Tech Stack

- FastAPI
- InsightFace (buffalo_l model)
- OpenCV
- ONNX Runtime

## API Endpoints

### `GET /`
Health check endpoint

### `GET /health`
Detailed health status with model loading info

### `POST /detect`
Detect faces in an image
- **Input**: Image file (multipart/form-data)
- **Output**: Face detection result with bounding box

### `POST /extract-embedding`
Extract face embedding from image
- **Input**: Image file
- **Output**: 512-dimensional embedding vector

### `POST /compare`
Compare two face embeddings
- **Input**: JSON with two embedding arrays
- **Output**: Similarity score and match result

### `POST /verify`
Verify face against stored embedding
- **Input**: Image file + stored embedding (optional)
- **Output**: Verification result with similarity

### `POST /liveness`
Check if image is from live person
- **Input**: Image file
- **Output**: Liveness result with confidence

### `POST /register`
Complete face registration with all checks
- **Input**: Image file
- **Output**: Face embedding if all checks pass

## Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run server
python main.py
# or
uvicorn main:app --reload
```

## Docker

```bash
# Build image
docker build -t face-recognition-service .

# Run container
docker run -p 8000:8000 face-recognition-service
```

## Usage Examples

### Python Client
```python
import requests

# Detect face
with open('photo.jpg', 'rb') as f:
    response = requests.post('http://localhost:8000/detect', files={'file': f})
    print(response.json())

# Extract embedding
with open('photo.jpg', 'rb') as f:
    response = requests.post('http://localhost:8000/extract-embedding', files={'file': f})
    embedding = response.json()['embedding']

# Compare faces
response = requests.post('http://localhost:8000/compare', json={
    'embedding1': embedding1,
    'embedding2': embedding2
})
print(response.json())
```

### JavaScript/Next.js Client
```javascript
// Extract embedding
const formData = new FormData();
formData.append('file', imageFile);

const response = await fetch('http://localhost:8000/extract-embedding', {
  method: 'POST',
  body: formData
});

const data = await response.json();
console.log(data.embedding);
```

## Liveness Detection

Basic liveness detection based on:
- Face size ratio (not too small/large)
- Texture variation (real faces have more variation than photos)
- Image sharpness (photos of photos are usually blurry)

**Note**: This is basic liveness. For production, consider:
- Active liveness (blink detection, head movement)
- Infrared/depth sensors
- Challenge-response mechanisms

## Face Matching Threshold

Default similarity threshold: **0.5**
- Similarity > 0.5: Match
- Similarity ≤ 0.5: No match

Adjust based on your security requirements:
- Higher threshold (0.6-0.7): More strict, fewer false positives
- Lower threshold (0.3-0.4): More lenient, fewer false negatives

## Model Information

**InsightFace buffalo_l**
- Embedding size: 512 dimensions
- Detection model: RetinaFace
- Recognition model: ArcFace
- Age/Gender detection: Yes

## Performance Notes

- CPU mode is used by default (CPUExecutionProvider)
- For GPU acceleration, install `onnxruntime-gpu` and use CUDAExecutionProvider
- First request may be slower due to model initialization
- Detection time: ~100-300ms per image (CPU)
- Embedding extraction: ~50-100ms per face (CPU)

## Security Considerations

1. **CORS**: Update allowed origins for production
2. **Rate Limiting**: Implement rate limiting for API endpoints
3. **Image Size**: Limit upload file size (recommended: max 5MB)
4. **Authentication**: Add API key or JWT authentication
5. **HTTPS**: Always use HTTPS in production

## Troubleshooting

### Model Download Issues
Models are downloaded automatically on first run. If download fails:
```bash
# Manual download (optional)
python -c "from insightface.app import FaceAnalysis; app = FaceAnalysis(name='buffalo_l'); app.prepare(ctx_id=0)"
```

### Memory Issues
If running out of memory:
- Reduce detection size: `det_size=(320, 320)` instead of `(640, 640)`
- Use lighter model: `buffalo_s` instead of `buffalo_l`

### Slow Performance
- Use GPU if available
- Reduce image resolution before sending
- Implement caching for repeated verifications
