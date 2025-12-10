# Quick Start Guide - Face Recognition Feature

## Prerequisites
- Docker Desktop installed and running
- PostgreSQL container running (`hris_postgres`)
- Node.js 18+ installed
- Python 3.10+ (if running Face API locally)

## Installation Steps

### 1. Database Migration

```powershell
# Apply face recognition schema updates
Get-Content migration_face_recognition.sql | docker exec -i hris_postgres psql -U hrisadmin -d hris_db

# Or using Drizzle
npm run db:push
```

**Expected Output:**
```
ALTER TABLE
ALTER TABLE
COMMENT
COMMENT
...
```

### 2. Start Face Recognition Service

#### Option A: Using Docker Compose (Recommended)

```powershell
# Build and start face recognition service
docker-compose up -d face-recognition

# Check logs
docker logs -f hris_face_recognition

# Wait for "Face Recognition models loaded successfully" message
```

#### Option B: Local Development

```powershell
cd face-recognition-service

# Install dependencies
pip install -r requirements.txt

# Run service
python main.py
# or
uvicorn main:app --reload
```

### 3. Verify Face API is Running

```powershell
# Test health endpoint
curl http://localhost:8000/health

# Expected response:
# {"status":"healthy","models_loaded":true}
```

### 4. Update Environment Variables

Ensure `.env.local` contains:
```env
NEXT_PUBLIC_FACE_API_URL=http://localhost:8000
```

### 5. Start Next.js Application

```powershell
# Install dependencies (if not done)
npm install

# Start dev server
npm run dev
```

### 6. Test Face Registration

1. **Login** as employee
2. **Navigate** to: http://localhost:3000/dashboard/face-registration
3. **Click** "Daftar Wajah Sekarang"
4. **Allow** camera access
5. **Position** face in the guide circle
6. **Click** "Ambil Foto"
7. **Wait** for processing (5-10 seconds)
8. **Success!** Face is now registered

### 7. Test Face Verification

1. **Go to** attendance/clock-in page
2. **Face capture** will appear after GPS validation
3. **Take photo** for verification
4. **Check result** - should show similarity score

## Verification

### Check Database

```sql
-- Check registered faces
SELECT id, full_name, face_registered_at 
FROM users 
WHERE face_embedding IS NOT NULL;

-- Check face-verified attendance
SELECT 
  u.full_name,
  a.date,
  a.check_in_time,
  a.check_in_face_verified,
  a.check_in_face_similarity
FROM attendance a
JOIN users u ON a.user_id = u.id
WHERE a.check_in_face_verified = true
ORDER BY a.created_at DESC;
```

### Check Docker Containers

```powershell
# List all containers
docker ps

# Should see:
# - hris_postgres (running)
# - hris_face_recognition (running)
```

### Check Logs

```powershell
# Face API logs
docker logs hris_face_recognition

# Next.js logs (in terminal where npm run dev is running)
```

## Common Issues & Solutions

### 🔴 Face API container won't start

```powershell
# Check logs
docker logs hris_face_recognition

# If "model download error":
# - Check internet connection
# - Wait for models to download (~500MB, first time only)
# - Restart container: docker restart hris_face_recognition

# If "port already in use":
# - Change port in docker-compose.yml
# - Update NEXT_PUBLIC_FACE_API_URL
```

### 🔴 Camera not working

**Browser:**
- Chrome/Edge: Allow camera permission
- Firefox: Allow camera permission
- Safari: Check System Preferences > Security > Camera

**HTTPS Required:**
- Camera API requires HTTPS or localhost
- Use `localhost`, not `127.0.0.1`

### 🔴 "No face detected"

**Solutions:**
- Improve lighting (face should be well-lit)
- Move closer to camera
- Remove glasses/hats
- Face directly towards camera
- Try different browser

### 🔴 Liveness check fails

**Solutions:**
- Use live camera (not screenshot/photo)
- Improve image quality
- Better lighting
- Higher resolution camera

### 🔴 Face verification always fails

**Check:**
1. Is face registered? (Check DB)
2. Is Face API running? (curl health check)
3. Is similarity too low? (Check logs for score)
4. Try re-registering with better quality photo

## Testing Checklist

- [ ] Database migration successful
- [ ] Face API container running
- [ ] Face API health check returns `models_loaded: true`
- [ ] Next.js app running on port 3000
- [ ] Camera access working in browser
- [ ] Face registration successful
- [ ] Face embedding saved in database
- [ ] Face verification during clock-in works
- [ ] Similarity score displayed
- [ ] Attendance record shows `check_in_face_verified: true`

## Performance Notes

**First Request:**
- May take 10-30 seconds (model loading)
- Subsequent requests are faster (~1-3 seconds)

**Model Size:**
- Downloads ~500MB on first run
- Stored in Docker volume `face_models`
- Only downloads once

**Resource Usage:**
- CPU mode: ~1-2 GB RAM
- GPU mode: ~2-4 GB RAM + NVIDIA GPU

## Next Steps

1. **Integrate with attendance UI**
   - Add face capture to clock-in/clock-out buttons
   - Display verification results to users

2. **Admin dashboard**
   - View face registration statistics
   - Monitor verification success rates
   - Manage face data

3. **Security enhancements**
   - Add API key authentication
   - Implement rate limiting
   - Enable HTTPS in production

4. **Production deployment**
   - Use environment-specific configs
   - Enable GPU acceleration (if available)
   - Set up monitoring & alerts
   - Implement backup for face data

## Documentation

- **Full Documentation:** `FACE_RECOGNITION_FEATURE.md`
- **Face API Docs:** `face-recognition-service/README.md`
- **InsightFace:** https://github.com/deepinsight/insightface
- **FastAPI:** https://fastapi.tiangolo.com/

## Support

If you encounter issues:

1. Check logs (both Face API and Next.js)
2. Verify all services are running
3. Test Face API endpoints directly with curl
4. Check database schema is updated
5. Review environment variables

**Logs Location:**
- Face API: `docker logs hris_face_recognition`
- Next.js: Console where `npm run dev` is running
- PostgreSQL: `docker logs hris_postgres`

---

**Status:** ✅ All components installed and ready to use!

For detailed documentation, see `FACE_RECOGNITION_FEATURE.md`
