# Face Recognition Feature - HRIS Attendance System

## Overview
Fitur pengenalan wajah menggunakan **FastAPI** dan **InsightFace** untuk meningkatkan keamanan sistem absensi. Karyawan dapat mendaftarkan wajah mereka dan melakukan verifikasi wajah saat clock-in/clock-out.

## Architecture

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────────┐
│   Next.js App   │─────▶│  Face API        │─────▶│   PostgreSQL DB     │
│  (Frontend +    │      │  (FastAPI)       │      │   (Face Embeddings) │
│   API Routes)   │◀─────│  (InsightFace)   │      └─────────────────────┘
└─────────────────┘      └──────────────────┘
```

### Components:

1. **Face Recognition Service** (FastAPI + InsightFace)
   - Face detection
   - Face embedding extraction (512 dimensions)
   - Face comparison
   - Liveness detection

2. **Next.js Backend**
   - Face registration API
   - Face verification integration
   - Database storage

3. **Next.js Frontend**
   - Face capture component (camera access)
   - Registration UI
   - Verification UI

## Database Schema

### Users Table Updates
```sql
ALTER TABLE users 
ADD COLUMN face_embedding TEXT,
ADD COLUMN face_registered_at TIMESTAMP;
```

**Fields:**
- `face_embedding`: JSON string containing 512-dimensional face vector
- `face_registered_at`: Timestamp when face was registered

### Attendance Table Updates
```sql
ALTER TABLE attendance
ADD COLUMN check_in_face_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN check_in_face_similarity DECIMAL(5, 4),
ADD COLUMN check_out_face_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN check_out_face_similarity DECIMAL(5, 4);
```

**Fields:**
- `check_in_face_verified`: Whether face was verified during check-in
- `check_in_face_similarity`: Similarity score (0-1) for check-in
- `check_out_face_verified`: Whether face was verified during check-out
- `check_out_face_similarity`: Similarity score (0-1) for check-out

## Setup & Installation

### 1. Run Database Migration

```powershell
# Apply migration
Get-Content migration_face_recognition.sql | docker exec -i hris_postgres psql -U hrisadmin -d hris_db

# Or using npm
npm run db:push
```

### 2. Build & Run Face Recognition Service

```powershell
# Using Docker Compose (recommended)
docker-compose up -d face-recognition

# Or build manually
cd face-recognition-service
docker build -t face-recognition-service .
docker run -p 8000:8000 face-recognition-service

# Or run locally (Python required)
pip install -r requirements.txt
python main.py
```

### 3. Configure Environment Variables

Add to `.env.local`:
```env
NEXT_PUBLIC_FACE_API_URL=http://localhost:8000
```

### 4. Start Next.js Application

```powershell
npm run dev
```

## API Endpoints

### Face Recognition Service (FastAPI)

#### 1. **POST** `/register`
Register a face with liveness check

**Request:**
- `file`: Image file (multipart/form-data)

**Response:**
```json
{
  "success": true,
  "embedding": [0.123, -0.456, ...], // 512 dimensions
  "message": "Face registered successfully",
  "liveness_confidence": 0.85,
  "detection_confidence": 0.95
}
```

#### 2. **POST** `/verify`
Verify face against stored embedding

**Request:**
- `file`: Image file
- `stored_embedding`: JSON string (optional)

**Response:**
```json
{
  "success": true,
  "verified": true,
  "similarity": 0.87,
  "message": "Face verified"
}
```

#### 3. **POST** `/detect`
Detect faces in image

**Response:**
```json
{
  "face_detected": true,
  "num_faces": 1,
  "confidence": 0.95,
  "bbox": [100, 150, 300, 400],
  "message": "Face detected successfully"
}
```

#### 4. **POST** `/liveness`
Check if image is from live person

**Response:**
```json
{
  "is_live": true,
  "confidence": 0.82,
  "message": "Liveness check passed"
}
```

### Next.js API Routes

#### 1. **POST** `/api/face/register`
Register user's face

**Request:**
- `image`: Image file (multipart/form-data)

**Response:**
```json
{
  "success": true,
  "message": "Face registered successfully",
  "user": {
    "id": 1,
    "fullName": "John Doe",
    "faceRegisteredAt": "2025-12-09T15:30:00.000Z"
  },
  "livenessConfidence": 0.85,
  "detectionConfidence": 0.95
}
```

#### 2. **GET** `/api/face/register`
Check registration status

**Response:**
```json
{
  "isRegistered": true,
  "registeredAt": "2025-12-09T15:30:00.000Z",
  "fullName": "John Doe"
}
```

#### 3. **DELETE** `/api/face/register`
Remove face registration

**Response:**
```json
{
  "success": true,
  "message": "Face registration removed successfully"
}
```

## User Flow

### Face Registration Flow

1. Employee navigates to `/dashboard/face-registration`
2. Click "Daftar Wajah Sekarang"
3. Browser requests camera permission
4. Camera preview opens with face guide overlay
5. Click "Ambil Foto" (3-second countdown)
6. Image captured and sent to face API
7. Face API performs:
   - Face detection (must detect exactly 1 face)
   - Quality check (detection confidence > 0.8)
   - Liveness detection (confidence > 0.6)
   - Embedding extraction (512 dimensions)
8. Embedding stored in database
9. Success message displayed

### Face Verification Flow (Clock-in/Clock-out)

1. Employee clicks clock-in/clock-out
2. GPS location validated first
3. If user has registered face:
   - Camera opens automatically
   - Face captured
   - Sent to face API for verification
   - Compared with stored embedding
   - Similarity calculated (threshold: 0.5)
4. Attendance recorded with:
   - GPS coordinates
   - Face verification status
   - Similarity score
5. Result displayed to user

## Frontend Components

### 1. `FaceCapture.js`
Reusable camera component for face capture

**Props:**
- `onCapture(file)`: Callback when image captured
- `onCancel()`: Callback when cancelled
- `mode`: 'register' or 'verify'

**Features:**
- Camera access with video preview
- Face guide overlay
- 3-second countdown
- Mirror effect (scaleX(-1))
- Instructions display

**Usage:**
```jsx
<FaceCapture
  mode="register"
  onCapture={handleCapture}
  onCancel={() => setShowCamera(false)}
/>
```

### 2. Face Registration Page
Path: `/dashboard/face-registration`

**Features:**
- Registration status check
- Step-by-step instructions
- Face capture integration
- Re-registration option
- Delete registration

## Helper Functions

### `faceApi.js`

```javascript
import { registerFace, verifyFace, detectFace, checkLiveness } from '@/lib/faceApi';

// Register face
const result = await registerFace(imageFile);

// Verify face
const result = await verifyFace(imageFile, storedEmbedding);

// Detect face
const result = await detectFace(imageFile);

// Check liveness
const result = await checkLiveness(imageFile);
```

## Security Considerations

### 1. Liveness Detection
Current implementation uses **basic liveness checks**:
- Face size ratio (prevents photo of photo)
- Texture variation (real faces have more variation)
- Image sharpness (photos are usually blurry)

**Limitations:**
- Can be fooled by high-quality photos/videos
- Does not detect 3D masks

**Production Recommendations:**
- Active liveness (blink detection, head movement)
- Challenge-response (random instructions)
- Infrared/depth sensors
- Multi-factor authentication (face + PIN/OTP)

### 2. Face Matching Threshold

**Default: 0.5** (50% similarity)

Adjust based on security requirements:
- **High Security (0.6-0.7)**: Fewer false positives, may reject valid users
- **Balanced (0.5)**: Good tradeoff
- **Lenient (0.3-0.4)**: Fewer false negatives, more risk

### 3. Data Privacy

**Face embeddings are NOT reversible to original image**
- Embeddings are mathematical vectors
- Cannot reconstruct face image from embedding
- Safe to store in database

**Best Practices:**
- Encrypt `face_embedding` column
- Implement data retention policies
- Allow users to delete their data
- GDPR/privacy law compliance

### 4. API Security

**Face Recognition Service:**
- Add API key authentication
- Rate limiting (prevent brute force)
- Input validation (file size, type)
- CORS configuration

**Next.js API Routes:**
- Session verification (already implemented)
- Role-based access control
- SQL injection prevention (using Drizzle ORM)

## Performance Optimization

### 1. Face API Performance

**Current (CPU mode):**
- Face detection: ~100-300ms
- Embedding extraction: ~50-100ms
- Total registration: ~400-600ms

**GPU Acceleration:**
```python
# Change in main.py
face_app = FaceAnalysis(
    name='buffalo_l',
    providers=['CUDAExecutionProvider']  # Requires NVIDIA GPU + CUDA
)
```

**Performance improvement:** 5-10x faster

### 2. Database Optimization

```sql
-- Index for faster face lookup
CREATE INDEX idx_users_face_registered ON users(face_registered_at) WHERE face_embedding IS NOT NULL;

-- Index for attendance face verification queries
CREATE INDEX idx_attendance_face_verified ON attendance(check_in_face_verified, check_out_face_verified);
```

### 3. Caching

Cache face embeddings in memory (Redis/Node cache):
```javascript
// Pseudo-code
const faceCache = new Map();

async function getUserFaceEmbedding(userId) {
  if (faceCache.has(userId)) {
    return faceCache.get(userId);
  }
  
  const embedding = await db.query(...);
  faceCache.set(userId, embedding);
  return embedding;
}
```

## Testing

### 1. Test Face API Endpoints

```powershell
# Health check
curl http://localhost:8000/health

# Test detection
curl -X POST -F "file=@test-face.jpg" http://localhost:8000/detect

# Test registration
curl -X POST -F "file=@test-face.jpg" http://localhost:8000/register
```

### 2. Test Next.js Integration

1. Register a face via UI
2. Check database:
```sql
SELECT id, full_name, face_registered_at 
FROM users 
WHERE face_embedding IS NOT NULL;
```

3. Verify face during clock-in
4. Check attendance record:
```sql
SELECT * FROM attendance 
WHERE check_in_face_verified = true 
ORDER BY created_at DESC 
LIMIT 5;
```

### 3. Test Scenarios

**Positive Tests:**
- ✅ Single face, good lighting → Success
- ✅ Registered face verification → Match
- ✅ Different angles of same person → Match

**Negative Tests:**
- ❌ No face detected → Error
- ❌ Multiple faces → Error
- ❌ Different person → No match
- ❌ Photo of photo → Liveness fail
- ❌ Poor lighting → Low confidence

## Troubleshooting

### Issue: Face API container won't start

**Solution:**
```powershell
# Check logs
docker logs hris_face_recognition

# Common issues:
# - Model download failed (check internet)
# - Port 8000 already in use
# - Insufficient memory (need ~2GB RAM)
```

### Issue: "No face detected"

**Solutions:**
- Improve lighting (natural light is best)
- Move closer to camera
- Remove glasses/hat
- Ensure face is centered
- Check camera permissions

### Issue: Face verification always fails

**Solutions:**
- Check similarity threshold (default 0.5)
- Re-register face with better quality
- Verify face API is running
- Check network connectivity
- Review API logs for errors

### Issue: Liveness check fails

**Solutions:**
- Use live camera (not pre-recorded video)
- Improve image quality
- Adjust liveness threshold in `main.py`
- Ensure proper lighting
- Use higher resolution camera

### Issue: Slow performance

**Solutions:**
- Enable GPU acceleration (if available)
- Reduce detection size in `main.py`
- Use lighter model (`buffalo_s` instead of `buffalo_l`)
- Implement caching
- Scale horizontally (multiple containers)

## Monitoring & Logging

### Key Metrics to Track

1. **Registration Success Rate**
```sql
SELECT 
  COUNT(*) as total_users,
  COUNT(face_embedding) as registered_faces,
  ROUND(COUNT(face_embedding)::numeric / COUNT(*) * 100, 2) as registration_rate
FROM users;
```

2. **Verification Success Rate**
```sql
SELECT 
  COUNT(*) as total_attendance,
  COUNT(*) FILTER (WHERE check_in_face_verified = true) as verified_checkins,
  ROUND(
    COUNT(*) FILTER (WHERE check_in_face_verified = true)::numeric / COUNT(*) * 100, 2
  ) as verification_rate
FROM attendance
WHERE check_in_time IS NOT NULL;
```

3. **Average Similarity Scores**
```sql
SELECT 
  AVG(check_in_face_similarity) as avg_checkin_similarity,
  AVG(check_out_face_similarity) as avg_checkout_similarity
FROM attendance
WHERE check_in_face_verified = true OR check_out_face_verified = true;
```

### Logging Best Practices

```javascript
// Log all face verification attempts
console.log({
  timestamp: new Date(),
  userId: user.id,
  action: 'face_verification',
  result: verified ? 'success' : 'failed',
  similarity: similarity,
  threshold: 0.5
});
```

## Future Enhancements

1. **Multi-Factor Authentication**
   - Face + PIN code
   - Face + OTP
   - Face + fingerprint

2. **Advanced Liveness**
   - Blink detection
   - Head pose estimation
   - Passive liveness (texture analysis)
   - Active liveness (follow instructions)

3. **Face Analytics**
   - Age/gender detection (already in InsightFace)
   - Emotion recognition
   - Mask detection
   - Glasses detection

4. **Mobile App Integration**
   - React Native camera component
   - On-device face detection
   - Offline verification (cached embeddings)

5. **Admin Features**
   - View all registered faces (thumbnails)
   - Manual face re-registration
   - Bulk face registration from photos
   - Face match audit log

6. **Security Enhancements**
   - Depth camera support
   - 3D face mapping
   - Anti-spoofing ML models
   - Continuous authentication

## References

- [InsightFace Documentation](https://github.com/deepinsight/insightface)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [ArcFace Paper](https://arxiv.org/abs/1801.07698)
- [Face Recognition Best Practices](https://www.nist.gov/programs-projects/face-recognition-vendor-test-frvt)

## Support

For issues or questions:
1. Check this documentation
2. Review Face API logs: `docker logs hris_face_recognition`
3. Review Next.js logs in browser console
4. Test Face API directly with curl/Postman
5. Verify database schema is up to date

## License & Compliance

**InsightFace License:**
- Academic and research use: Free
- Commercial use: Contact InsightFace team

**GDPR Compliance:**
- Biometric data is considered sensitive
- Obtain explicit user consent
- Implement data deletion on request
- Encrypt data at rest and in transit
- Maintain audit logs

**Privacy Notes:**
- Face embeddings are NOT original images
- Cannot reverse engineer face from embedding
- Embeddings are mathematical representations
- More privacy-friendly than storing photos
