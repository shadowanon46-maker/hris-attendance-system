# HRIS Attendance System | GPS-Based Employee Tracking with Face Recognition

> Modern HRIS Dashboard for attendance management with GPS geofencing, AI-powered face recognition, shift scheduling, and real-time monitoring

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql)](https://www.postgresql.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![InsightFace](https://img.shields.io/badge/InsightFace-0.7.3-orange)](https://github.com/deepinsight/insightface)
[![Docker](https://img.shields.io/badge/Docker-Multi--Container-2496ED?logo=docker)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**Keywords**: HRIS, Attendance System, GPS Tracking, Face Recognition, AI, Employee Management, Next.js, PostgreSQL, FastAPI, InsightFace

---

# HRIS Dashboard - Sistem Absensi GPS & Pengenalan Wajah

Aplikasi HRIS (Human Resource Information System) untuk manajemen absensi karyawan menggunakan GPS geolocation dan AI face recognition dengan validasi radius kantor dan verifikasi identitas berbasis wajah.

## 🚀 Fitur Utama

### Untuk Admin:
- ✅ Dashboard monitoring real-time
- 👥 Manajemen karyawan (CRUD)
- 📸 **Registrasi wajah karyawan (saat create/edit)**
- 🕐 Manajemen shift (CRUD)
- 📅 Penjadwalan shift karyawan (per minggu)
- 📊 Data absensi lengkap dengan filter tanggal
- 📈 Statistik absensi (total, hadir, terlambat, alpha)
- 📥 Export laporan ke CSV dengan shift schedule yang benar
- 📍 Pengaturan multi-lokasi kantor
- ⚙️ Pengaturan sistem
- 🔒 Role-based access control

### Untuk Karyawan:
- ✅ **Check-in dengan validasi GPS + Face Recognition**
- ✅ **Check-out dengan validasi GPS + Face Recognition**
- 🤖 **Deteksi wajah otomatis dengan countdown**
- 🎯 **Verifikasi identitas real-time (similarity > 85%)**
- 📍 Validasi radius multi-lokasi kantor (100m)
- 📊 Lihat status absensi hari ini
- 📅 Lihat jadwal shift bulanan
- 📈 Statistik absensi bulanan pribadi
- ⏰ Deteksi keterlambatan otomatis
- 🌍 Timezone WIB (Asia/Jakarta)

## 🛠️ Teknologi Stack

### Frontend & Backend
- **Next.js 16** (App Router, JavaScript, Turbopack)
- **React 19** dengan Server Components
- **TailwindCSS 4** untuk styling modern

### Database & ORM
- **PostgreSQL 16** (Dockerized)
- **Drizzle ORM** dengan camelCase schema

### AI & Face Recognition
- **FastAPI 0.115** (Python web framework)
- **InsightFace 0.7.3** (buffalo_l model, 512-dim embeddings)
- **ONNX Runtime 1.19** untuk inference
- **OpenCV 4.10** untuk image processing

### Authentication & Security
- **JWT** session-based cookies (HTTP-Only)
- **bcrypt** untuk password hashing
- **Face verification** dengan cosine similarity (threshold 0.5)

### DevOps
- **Docker Compose** multi-container setup
- **PostgreSQL** container dengan persistent volume
- **Face Recognition API** container terpisah

## 📋 Prerequisites

- **Node.js** 18+ dan npm
- **Docker** dan Docker Compose
- **Python** 3.9+ (untuk face recognition service)
- Browser dengan **GPS** dan **Camera** support
- **4GB RAM** minimum (untuk ML model)

## 🔧 Instalasi & Setup

### 1. Clone Repository

```powershell
git clone https://github.com/shadowanon46-maker/hris-attendance-system.git
cd hris-attendance-system
```

### 2. Install Dependencies

```powershell
npm install
```

### 3. Setup Environment Variables

Buat file `.env.local` dengan konfigurasi berikut:

```env
# PostgreSQL Configuration (for Docker Compose)
POSTGRES_USER=hrisadmin
POSTGRES_PASSWORD=hrispass123
POSTGRES_DB=hris_db
POSTGRES_PORT=5432

# Database Configuration
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${POSTGRES_PORT}/${POSTGRES_DB}

# Session Secret (generate random string in production)
SESSION_SECRET=hris_secret_key_change_in_production_2024

# Face Recognition API URL
NEXT_PUBLIC_FACE_API_URL=http://localhost:8000

# Application Settings
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Start All Services dengan Docker Compose

```powershell
docker-compose up -d
```

Ini akan menjalankan:
- **PostgreSQL** di port 5432
- **Face Recognition API** (FastAPI + InsightFace) di port 8000

**Note**: Pertama kali menjalankan, face recognition akan download model buffalo_l (~300MB). Tunggu hingga selesai (cek logs: `docker logs -f hris_face_recognition`)

### 5. Push Database Schema

```powershell
npm run db:push
```

### 6. Seed Data Awal

```powershell
npm run db:seed
```

### 7. Run Next.js Development Server

```powershell
npm run dev
```

Aplikasi akan berjalan di: `http://localhost:3000`

## 🧪 Testing Face Recognition

### Cek Face API Status

```powershell
curl http://localhost:8000/health
# Response: {"status":"healthy","model":"buffalo_l"}
```

### Test Face Detection

```powershell
# Upload gambar untuk deteksi
curl -X POST "http://localhost:8000/detect" -F "file=@path/to/photo.jpg"
```

## 👤 Default Credentials

### Admin
- **Email**: admin@hris.com
- **Password**: admin123

### Employee Sample
- **Email**: employee1@hris.com
- **Password**: employee123

## 🗄️ Database Schema

### Tabel: users
- id, nip, email, password (hashed)
- full_name, role (admin/employee)
- shift_id, is_active
- **face_embedding** (JSON, 512-dim vector)
- **face_registered_at** (timestamp)
- created_at, updated_at

### Tabel: shift
- id, name, start_time, end_time
- tolerance_late, description
- created_at, updated_at

### Tabel: attendance
- id, user_id, date
- check_in_time, check_out_time
- check_in_lat, check_in_lng
- check_out_lat, check_out_lng
- **check_in_face_verified** (boolean)
- **check_in_face_similarity** (decimal)
- **check_out_face_verified** (boolean)
- **check_out_face_similarity** (decimal)
- status, notes, created_at

### Tabel: office_locations
- id, name, latitude, longitude
- radius, is_active
- created_at, updated_at

### Tabel: shift_schedule
- id, user_id, shift_id
- schedule_date, notes
- created_by, created_at, updated_at

### Tabel: activity_log
- id, user_id, action
- description, ip_address
- user_agent, created_at

### Tabel: company_settings
- id, key, value
- description, updated_at

## 🤖 Face Recognition System

### Architecture
```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   Next.js App   │─────▶│  FastAPI Server  │─────▶│  InsightFace    │
│  (Frontend/API) │◀─────│   (Port 8000)    │◀─────│   (buffalo_l)   │
└─────────────────┘      └──────────────────┘      └─────────────────┘
        │                        │
        │                        │
        ▼                        ▼
┌─────────────────┐      ┌──────────────────┐
│   PostgreSQL    │      │  Face Embeddings │
│   (Port 5432)   │      │   (512-d vector) │
└─────────────────┘      └──────────────────┘
```

### Face Registration Flow
1. Admin membuka form create/edit karyawan
2. Klik "Daftar Wajah" untuk membuka camera
3. Sistem deteksi wajah secara real-time (brightness-based)
4. Countdown 3 detik setelah wajah terdeteksi
5. Auto-capture dan kirim ke FastAPI
6. InsightFace ekstrak embedding 512-dimensi
7. Simpan embedding ke database (JSON format)

### Face Verification Flow (Clock In/Out)
1. Karyawan klik tombol Clock In/Out
2. Camera terbuka, sistem deteksi kehadiran wajah
3. Countdown 3 detik, auto-capture
4. Kirim foto + stored embedding ke FastAPI
5. FastAPI:
   - Ekstrak embedding dari foto baru
   - Hitung cosine similarity dengan embedding tersimpan
   - Return verified=true jika similarity > 0.5 (50%)
6. Jika verified=true: Lanjut proses absensi
7. Jika verified=false: Tampilkan error 403 (Forbidden)

### Model Details
- **Model**: buffalo_l (InsightFace)
- **Embedding Size**: 512 dimensions
- **Similarity Threshold**: 0.5 (cosine similarity)
- **Typical Accuracy**: 85-95% untuk wajah terdaftar
- **Detection Method**: Brightness-based presence (60% center area)

## 🔐 Security Features

1. **Password Hashing**: bcrypt dengan salt rounds 10
2. **Session Management**: JWT-based secure cookies (HTTP-Only)
3. **Role-based Access**: Middleware untuk authorization
4. **Face Recognition Security**:
   - Embedding disimpan sebagai JSON (tidak reversible ke gambar)
   - Verifikasi mandatory untuk user dengan wajah terdaftar
   - Threshold similarity 50% (adjustable)
   - Reject attendance jika wajah tidak cocok (403 Forbidden)
5. **GPS Geofencing**: Multi-location support dengan radius validation
6. **Activity Logging**: Semua aksi penting dicatat
7. **Timezone Consistency**: Semua timestamp menggunakan WIB (UTC+7)

## 🌍 GPS Geofencing

- Menggunakan **Geolocation API** browser
- Validasi jarak menggunakan **Haversine formula**
- **Multi-location support**: Bisa tambah lebih dari 1 lokasi kantor
- Default radius: **100 meter** dari koordinat (adjustable per lokasi)
- Koordinat disimpan di `office_locations` table

## ⏰ Timezone Management

Semua operasi menggunakan **WIB (Asia/Jakarta, UTC+7)**:
- Clock In/Out timestamp
- Query attendance by date
- Export laporan
- Dashboard statistics

**Implementasi**:
```javascript
function getWIBDate() {
  const now = new Date();
  const wibOffset = 7 * 60; // WIB is UTC+7
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utcTime + (wibOffset * 60000));
}
```

## 📊 Fitur Laporan

### Export CSV
- Filter berdasarkan range tanggal
- Format **UTF-8 dengan BOM** (Excel compatible)
- Kolom: Tanggal, NIP, Nama, **Shift (dari schedule)**, Check In, Check Out, Status
- **Perbaikan**: Shift diambil dari `shift_schedule`, bukan user default shift
- Auto-calculate status (present/late/absent)

## 🛠️ NPM Scripts

```powershell
npm run dev          # Start Next.js development server
npm run build        # Build for production
npm run start        # Start production server
npm run db:push      # Push Drizzle schema to database
npm run db:seed      # Seed initial data (admin + employees)
```

## 🐳 Docker Commands

### Start Services
```powershell
docker-compose up -d              # Start semua services
docker-compose up -d postgres     # Start PostgreSQL saja
docker-compose up -d face-recognition  # Start Face API saja
```

### Stop Services
```powershell
docker-compose down               # Stop semua services
docker-compose stop postgres      # Stop PostgreSQL saja
```

### View Logs
```powershell
docker-compose logs -f            # All services
docker logs -f hris_postgres      # PostgreSQL logs
docker logs -f hris_face_recognition  # Face API logs
```

### Rebuild Services
```powershell
docker-compose build face-recognition  # Rebuild face API (jika ubah code)
docker-compose up -d face-recognition  # Restart dengan image baru
```

### Database Management
```powershell
# Masuk ke PostgreSQL console
docker exec -it hris_postgres psql -U hrisadmin -d hris_db

# Backup database
docker exec hris_postgres pg_dump -U hrisadmin hris_db > backup.sql

# Restore database
docker exec -i hris_postgres psql -U hrisadmin hris_db < backup.sql
```

## 📁 Struktur Project

```
project/hris/
├── src/
│   ├── app/
│   │   ├── api/                    # API Routes
│   │   │   ├── admin/              # Admin endpoints
│   │   │   │   ├── attendance/     # Attendance management
│   │   │   │   ├── dashboard/      # Dashboard stats
│   │   │   │   ├── employees/      # Employee CRUD
│   │   │   │   ├── export/         # CSV export
│   │   │   │   ├── settings/       # System settings
│   │   │   │   ├── shift-schedules/ # Schedule management
│   │   │   │   └── shifts/         # Shift CRUD
│   │   │   ├── auth/               # Authentication
│   │   │   │   ├── login/          # Login endpoint
│   │   │   │   ├── logout/         # Logout endpoint
│   │   │   │   ├── me/             # Get current user
│   │   │   │   └── register/       # Register endpoint
│   │   │   ├── attendance/         # Employee attendance
│   │   │   │   ├── clock-in/       # Clock in with GPS+Face
│   │   │   │   ├── clock-out/      # Clock out with GPS+Face
│   │   │   │   ├── status/         # Attendance status
│   │   │   │   └── today/          # Today attendance
│   │   │   └── employee/           # Employee endpoints
│   │   │       ├── monthly-stats/  # Monthly statistics
│   │   │       └── my-schedule/    # Employee schedule
│   │   ├── dashboard/              # Dashboard pages
│   │   │   ├── admin/              # Admin dashboard
│   │   │   │   ├── attendance/     # Attendance view
│   │   │   │   ├── employees/      # Employee management
│   │   │   │   ├── reports/        # Reports & export
│   │   │   │   ├── settings/       # Settings page
│   │   │   │   ├── shift-schedule/ # Schedule management
│   │   │   │   └── shifts/         # Shift management
│   │   │   └── page.js             # Employee dashboard
│   │   ├── login/                  # Login page
│   │   ├── register/               # Register page
│   │   ├── layout.js               # Root layout
│   │   └── globals.css             # Global styles
│   ├── components/                 # React components
│   │   ├── AdminNavbar.js          # Admin navigation
│   │   └── FaceCapture.js          # Face capture component
│   └── lib/                        # Libraries & utilities
│       ├── db.js                   # Drizzle database connection
│       ├── schema.js               # Drizzle schema (camelCase)
│       ├── session.js              # Session management
│       ├── geolocation.js          # GPS utilities (Haversine)
│       ├── seed.js                 # Database seeder
│       └── faceApi.js              # Face API utilities
├── face-recognition-service/       # FastAPI Face Recognition
│   ├── main.py                     # FastAPI application
│   ├── requirements.txt            # Python dependencies
│   └── Dockerfile                  # Docker build config
├── docker-compose.yml              # Multi-container setup
├── drizzle.config.js               # Drizzle ORM configuration
├── next.config.mjs                 # Next.js configuration
├── tailwind.config.js              # TailwindCSS configuration
├── package.json                    # Node dependencies
└── README.md                       # This file
```

## 🚨 Troubleshooting

### Face Recognition Issues

#### Model tidak ter-download
```powershell
# Cek logs face recognition container
docker logs -f hris_face_recognition

# Tunggu hingga muncul: "✅ Face Recognition models loaded successfully"
# Download model ~300MB, butuh waktu 1-5 menit tergantung koneksi
```

#### Face API tidak merespon
```powershell
# Cek apakah container berjalan
docker ps | grep face

# Restart container
docker-compose restart face-recognition

# Rebuild jika ada perubahan code
docker-compose build face-recognition
docker-compose up -d face-recognition
```

#### Error "stored_embedding not received"
- Pastikan FormData terkirim dengan benar
- Cek parameter FastAPI menggunakan `Form()` bukan default parameter
- Lihat debug logs: `docker logs hris_face_recognition | grep "stored_embedding"`

#### Similarity terlalu rendah (< 50%)
- Pastikan pencahayaan cukup saat registrasi dan verifikasi
- Hindari backlight atau cahaya terlalu gelap/terang
- Minta user registrasi ulang wajah di kondisi pencahayaan normal

### GPS Issues

#### GPS tidak berfungsi
- Pastikan menggunakan **HTTPS** atau **localhost**
- Izinkan akses lokasi di browser
- Cek apakah device mendukung Geolocation API
- Test di mobile untuk GPS lebih akurat

#### Selalu di luar radius padahal di lokasi
- Cek koordinat `office_locations` table
- GPS mobile bisa error ±20-50 meter
- Pertimbangkan naikkan radius jadi 150-200 meter
- Gunakan Google Maps untuk cek koordinat akurat

### Database Issues

#### Connection error
```powershell
# Cek container berjalan
docker ps

# Restart PostgreSQL
docker-compose restart postgres

# Cek DATABASE_URL di .env.local
echo $env:DATABASE_URL
```

#### Schema tidak sinkron
```powershell
# Push schema ulang
npm run db:push

# Atau drop database dan recreate
docker-compose down -v
docker-compose up -d
npm run db:push
npm run db:seed
```

### Session/Login Issues

#### Token expired atau invalid
- Clear browser cookies
- Cek SESSION_SECRET di `.env.local`
- Logout dan login ulang

#### Timezone salah (tanggal tidak match)
- Semua API sudah menggunakan WIB helper
- Jika masih error, cek fungsi `getWIBDate()` di setiap API route
- Refresh browser untuk fetch data dengan tanggal WIB

### Performance Issues

#### Face API lambat
- Model inference butuh ~500ms-1s per request
- Pastikan container dapat alokasi memory cukup (min 2GB)
- Jangan restart container saat model loading

#### Database query lambat
```sql
-- Tambah index untuk performa
CREATE INDEX idx_attendance_user_date ON attendance(user_id, date);
CREATE INDEX idx_shift_schedule_user_date ON shift_schedule(user_id, schedule_date);
```

---

## 📝 Changelog

### Version 2.0 (Current)
- ✅ **Face Recognition**: AI-powered identity verification
- ✅ **Multi-location GPS**: Support multiple office locations
- ✅ **Timezone WIB**: Consistent timezone across all operations
- ✅ **Shift Schedule Fix**: Export CSV shows correct shift from schedule
- ✅ **Auto-capture**: Face detection dengan countdown otomatis
- ✅ **Security**: Mandatory face verification untuk user terdaftar

### Version 1.0
- ✅ GPS-based attendance
- ✅ Shift management
- ✅ Employee CRUD
- ✅ Dashboard & reports

---

**Built with ❤️ by Fitrah Andre**

**Tech Stack**: Next.js 16 • PostgreSQL 16 • FastAPI • InsightFace • Docker

---

## 📄 License

MIT License - feel free to use for personal or commercial projects.

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## 📧 Contact

- **GitHub**: [@shadowanon46-maker](https://github.com/shadowanon46-maker)
- **Project**: [hris-attendance-system](https://github.com/shadowanon46-maker/hris-attendance-system)

---

**⭐ Star this repo if you find it useful!**
