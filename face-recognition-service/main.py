from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import cv2
import numpy as np
import insightface
from insightface.app import FaceAnalysis
import base64
from typing import Optional, List
import io
from PIL import Image

app = FastAPI(title="Face Recognition Service", version="1.0.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize InsightFace
face_app = None

@app.on_event("startup")
async def startup_event():
    """Initialize face detection and recognition models"""
    global face_app
    try:
        face_app = FaceAnalysis(
            name='buffalo_l',
            providers=['CPUExecutionProvider']
        )
        face_app.prepare(ctx_id=0, det_size=(640, 640))
        print("✅ Face Recognition models loaded successfully")
    except Exception as e:
        print(f"❌ Error loading models: {e}")
        raise

# Pydantic models
class FaceDetectResponse(BaseModel):
    face_detected: bool
    num_faces: int
    confidence: Optional[float] = None
    bbox: Optional[List[float]] = None
    message: str

class FaceEmbeddingResponse(BaseModel):
    success: bool
    embedding: Optional[List[float]] = None
    face_detected: bool
    num_faces: int
    message: str

class FaceCompareRequest(BaseModel):
    embedding1: List[float]
    embedding2: List[float]

class FaceCompareResponse(BaseModel):
    similarity: float
    is_match: bool
    message: str

class LivenessCheckResponse(BaseModel):
    is_live: bool
    confidence: float
    message: str

# Helper functions
def decode_image(image_data: bytes) -> np.ndarray:
    """Decode image from bytes to numpy array"""
    try:
        nparr = np.frombuffer(image_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Failed to decode image")
        return img
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image format: {str(e)}")

def calculate_similarity(emb1: np.ndarray, emb2: np.ndarray) -> float:
    """Calculate cosine similarity between two embeddings"""
    from sklearn.metrics.pairwise import cosine_similarity
    sim = cosine_similarity([emb1], [emb2])[0][0]
    return float(sim)

def check_liveness(face_img: np.ndarray, bbox) -> dict:
    """
    Basic liveness detection based on face quality metrics
    In production, use more sophisticated methods
    """
    try:
        # Extract face region
        x1, y1, x2, y2 = map(int, bbox)
        face_region = face_img[y1:y2, x1:x2]
        
        # Check face size (too small might be photo of photo)
        face_area = (x2 - x1) * (y2 - y1)
        img_area = face_img.shape[0] * face_img.shape[1]
        face_ratio = face_area / img_area
        
        # Check brightness variation (real faces have more variation)
        gray = cv2.cvtColor(face_region, cv2.COLOR_BGR2GRAY)
        std_dev = np.std(gray)
        
        # Check sharpness (blurry images might be photos)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        # Simple scoring system
        confidence = 0.0
        
        # Face should be reasonably sized (5-70% of image)
        if 0.05 < face_ratio < 0.7:
            confidence += 0.3
        
        # Good texture variation (not flat photo)
        if std_dev > 20:
            confidence += 0.35
        
        # Sharp enough (not blurry photo of photo)
        if laplacian_var > 100:
            confidence += 0.35
        
        is_live = confidence > 0.6
        
        return {
            "is_live": is_live,
            "confidence": round(confidence, 2),
            "metrics": {
                "face_ratio": round(face_ratio, 3),
                "std_dev": round(float(std_dev), 2),
                "sharpness": round(float(laplacian_var), 2)
            }
        }
    except Exception as e:
        return {
            "is_live": False,
            "confidence": 0.0,
            "error": str(e)
        }

# API Endpoints

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "Face Recognition API",
        "status": "running",
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check():
    """Health check with model status"""
    return {
        "status": "healthy",
        "models_loaded": face_app is not None
    }

@app.post("/detect", response_model=FaceDetectResponse)
async def detect_face(file: UploadFile = File(...)):
    """
    Detect faces in the uploaded image
    Returns number of faces and bounding box of the first face
    """
    try:
        # Read and decode image
        image_data = await file.read()
        img = decode_image(image_data)
        
        # Detect faces
        faces = face_app.get(img)
        
        if len(faces) == 0:
            return FaceDetectResponse(
                face_detected=False,
                num_faces=0,
                message="No face detected"
            )
        
        if len(faces) > 1:
            return FaceDetectResponse(
                face_detected=True,
                num_faces=len(faces),
                message="Multiple faces detected. Please ensure only one face is visible."
            )
        
        # Get first face info
        face = faces[0]
        bbox = face.bbox.tolist()
        confidence = float(face.det_score)
        
        return FaceDetectResponse(
            face_detected=True,
            num_faces=1,
            confidence=confidence,
            bbox=bbox,
            message="Face detected successfully"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/extract-embedding", response_model=FaceEmbeddingResponse)
async def extract_embedding(file: UploadFile = File(...)):
    """
    Extract face embedding from uploaded image
    Returns 512-dimensional embedding vector
    """
    try:
        # Read and decode image
        image_data = await file.read()
        img = decode_image(image_data)
        
        # Detect faces
        faces = face_app.get(img)
        
        if len(faces) == 0:
            return FaceEmbeddingResponse(
                success=False,
                face_detected=False,
                num_faces=0,
                message="No face detected"
            )
        
        if len(faces) > 1:
            return FaceEmbeddingResponse(
                success=False,
                face_detected=True,
                num_faces=len(faces),
                message="Multiple faces detected. Please ensure only one face is visible."
            )
        
        # Extract embedding
        face = faces[0]
        embedding = face.embedding.tolist()
        
        return FaceEmbeddingResponse(
            success=True,
            embedding=embedding,
            face_detected=True,
            num_faces=1,
            message="Face embedding extracted successfully"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/compare", response_model=FaceCompareResponse)
async def compare_faces(request: FaceCompareRequest):
    """
    Compare two face embeddings
    Returns similarity score and match result
    """
    try:
        emb1 = np.array(request.embedding1)
        emb2 = np.array(request.embedding2)
        
        # Calculate similarity
        similarity = calculate_similarity(emb1, emb2)
        
        # Threshold for match (typical: 0.4-0.6)
        threshold = 0.5
        is_match = similarity > threshold
        
        return FaceCompareResponse(
            similarity=round(similarity, 4),
            is_match=is_match,
            message=f"Faces {'match' if is_match else 'do not match'}"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/verify")
async def verify_face(
    file: UploadFile = File(...),
    stored_embedding: str = Form(None)
):
    """
    Verify a face against a stored embedding
    Combined endpoint for extract + compare
    """
    try:
        print(f"====== VERIFY ENDPOINT CALLED ======")
        print(f"stored_embedding is None: {stored_embedding is None}")
        print(f"stored_embedding type: {type(stored_embedding)}")
        if stored_embedding:
            print(f"stored_embedding length: {len(stored_embedding)}")
            print(f"First 100 chars: {stored_embedding[:100]}")
        
        # Extract embedding from uploaded image
        image_data = await file.read()
        img = decode_image(image_data)
        
        faces = face_app.get(img)
        
        if len(faces) == 0:
            return {
                "success": False,
                "message": "No face detected",
                "verified": False
            }
        
        if len(faces) > 1:
            return {
                "success": False,
                "message": "Multiple faces detected",
                "verified": False
            }
        
        # Get embedding
        current_embedding = faces[0].embedding
        
        # If stored embedding provided, compare
        if stored_embedding:
            import json
            stored_emb = np.array(json.loads(stored_embedding))
            similarity = calculate_similarity(current_embedding, stored_emb)
            is_match = similarity > 0.5
            
            return {
                "success": True,
                "verified": is_match,
                "similarity": round(similarity, 4),
                "message": f"Face {'verified' if is_match else 'not verified'}"
            }
        
        # Just return embedding if no comparison needed
        return {
            "success": True,
            "embedding": current_embedding.tolist(),
            "message": "Face embedding extracted"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/liveness", response_model=LivenessCheckResponse)
async def check_liveness_detection(file: UploadFile = File(...)):
    """
    Perform basic liveness detection
    Checks if the image is from a live person or a photo/screen
    """
    try:
        # Read and decode image
        image_data = await file.read()
        img = decode_image(image_data)
        
        # Detect faces
        faces = face_app.get(img)
        
        if len(faces) == 0:
            return LivenessCheckResponse(
                is_live=False,
                confidence=0.0,
                message="No face detected"
            )
        
        if len(faces) > 1:
            return LivenessCheckResponse(
                is_live=False,
                confidence=0.0,
                message="Multiple faces detected"
            )
        
        # Perform liveness check
        face = faces[0]
        bbox = face.bbox
        liveness_result = check_liveness(img, bbox)
        
        return LivenessCheckResponse(
            is_live=liveness_result["is_live"],
            confidence=liveness_result["confidence"],
            message=f"Liveness check {'passed' if liveness_result['is_live'] else 'failed'}"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/register")
async def register_face(
    file: UploadFile = File(...),
    skip_liveness: bool = Form(False)
):
    """
    Complete face registration with optional liveness check
    Returns embedding if all checks pass
    skip_liveness: Set to True to skip liveness verification (for admin registration)
    """
    try:
        # Read and decode image
        image_data = await file.read()
        img = decode_image(image_data)
        
        # Detect faces
        faces = face_app.get(img)
        
        if len(faces) == 0:
            return {
                "success": False,
                "message": "No face detected. Please ensure your face is clearly visible."
            }
        
        if len(faces) > 1:
            return {
                "success": False,
                "message": "Multiple faces detected. Please ensure only you are in the frame."
            }
        
        face = faces[0]
        
        # Check face quality (detection confidence)
        if face.det_score < 0.8:
            return {
                "success": False,
                "message": "Face detection confidence too low. Please improve lighting and face position."
            }
        
        # Perform liveness check (skip if requested)
        liveness_passed = True
        liveness_confidence = 1.0
        
        if not skip_liveness:
            bbox = face.bbox
            liveness_result = check_liveness(img, bbox)
            liveness_passed = liveness_result["is_live"]
            liveness_confidence = liveness_result["confidence"]
            
            if not liveness_passed:
                return {
                    "success": False,
                    "message": "Liveness check failed. Please ensure you are using a live camera feed.",
                    "liveness_confidence": liveness_confidence
                }
        
        # Extract embedding
        embedding = face.embedding.tolist()
        
        return {
            "success": True,
            "embedding": embedding,
            "message": "Face registered successfully",
            "liveness_confidence": liveness_confidence,
            "detection_confidence": float(face.det_score),
            "liveness_skipped": skip_liveness
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
