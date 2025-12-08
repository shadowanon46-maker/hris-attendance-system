-- Init script untuk PostgreSQL
-- Script ini akan dijalankan otomatis saat container pertama kali dibuat

-- Create database jika belum ada (sudah otomatis dari POSTGRES_DB)
-- CREATE DATABASE hris_db;

-- Connect ke database
\c hris_db;

-- Enable extensions jika diperlukan
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Log initialization
DO $$
BEGIN
  RAISE NOTICE 'HRIS Database initialized successfully';
END $$;
