-- Migration: Add face recognition fields to users and attendance tables
-- Date: 2025-12-09

-- Add face recognition fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS face_embedding TEXT,
ADD COLUMN IF NOT EXISTS face_registered_at TIMESTAMP;

-- Add face verification fields to attendance table
ALTER TABLE attendance
ADD COLUMN IF NOT EXISTS check_in_face_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS check_in_face_similarity DECIMAL(5, 4),
ADD COLUMN IF NOT EXISTS check_out_face_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS check_out_face_similarity DECIMAL(5, 4);

-- Add comments for documentation
COMMENT ON COLUMN users.face_embedding IS 'Face embedding vector stored as JSON string (512 dimensions)';
COMMENT ON COLUMN users.face_registered_at IS 'Timestamp when face was registered';
COMMENT ON COLUMN attendance.check_in_face_verified IS 'Whether face verification was successful during check-in';
COMMENT ON COLUMN attendance.check_in_face_similarity IS 'Similarity score for check-in face verification (0-1)';
COMMENT ON COLUMN attendance.check_out_face_verified IS 'Whether face verification was successful during check-out';
COMMENT ON COLUMN attendance.check_out_face_similarity IS 'Similarity score for check-out face verification (0-1)';
