# HRIS Dashboard - Sistem Absensi Berbasis GPS

Aplikasi HRIS (Human Resource Information System) untuk manajemen absensi karyawan menggunakan GPS geolocation dengan validasi radius kantor.

## 🚀 Fitur Utama

### Untuk Admin:
- ✅ Dashboard monitoring real-time
- 👥 Manajemen karyawan (CRUD)
- 🕐 Manajemen shift (CRUD)
- 📅 Penjadwalan shift karyawan (per minggu)
- 📊 Data absensi lengkap dengan filter tanggal
- 📈 Statistik absensi (total, hadir, terlambat, alpha)
- 📥 Export laporan ke CSV
- ⚙️ Pengaturan sistem
- 🔒 Role-based access control

### Untuk Karyawan:
- ✅ Check-in dengan validasi GPS
- ✅ Check-out dengan validasi GPS
- 📍 Validasi radius lokasi kantor (100m)
- 📊 Lihat status absensi hari ini
- 📅 Lihat jadwal shift bulanan
- 📈 Statistik absensi bulanan pribadi
- ⏰ Deteksi keterlambatan otomatis

## 🛠️ Teknologi Stack

- **Frontend & Backend**: Next.js 16 (App Router, JavaScript)
- **Database**: PostgreSQL 16
- **ORM**: Drizzle ORM
- **Authentication**: Session-based (JWT cookies)
- **Password Hashing**: bcrypt
- **Container**: Docker & Docker Compose
- **Styling**: TailwindCSS 4

## 📋 Prerequisites

- Node.js 18+ dan npm
- Docker dan Docker Compose
- Browser dengan GPS support

## 🔧 Instalasi & Setup

### 1. Install Dependencies

```powershell
npm install
```

### 2. Setup Environment Variables

File `.env.local` sudah dibuat dengan konfigurasi:

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

# Company GPS Settings
OFFICE_LATITUDE=-6.200000
OFFICE_LONGITUDE=106.816666
OFFICE_RADIUS=100

# Application Settings
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Start PostgreSQL dengan Docker

```powershell
docker-compose up -d
```

### 4. Push Database Schema

```powershell
npm run db:push
```

### 5. Seed Data Awal

```powershell
npm run db:seed
```

### 6. Run Development Server

```powershell
npm run dev
```

Aplikasi akan berjalan di: `http://localhost:3000`

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
- created_at, updated_at

### Tabel: shift
- id, name, start_time, end_time
- tolerance_late, created_at

### Tabel: attendance
- id, user_id, date
- check_in_time, check_out_time
- check_in_lat, check_in_lng
- check_out_lat, check_out_lng
- status, notes, created_at

### Tabel: activity_log
- id, user_id, action
- description, ip_address
- user_agent, created_at

### Tabel: company_settings
- id, key, value
- description, updated_at

### Tabel: shift_schedule
- id, user_id, shift_id
- schedule_date, notes
- created_by, created_at, updated_at

## 🔐 Security Features

1. **Password Hashing**: bcrypt dengan salt rounds 10
2. **Session Management**: JWT-based secure cookies
3. **HTTP-Only Cookies**: Mencegah XSS attacks
4. **Role-based Access**: Middleware untuk authorization
5. **Activity Logging**: Semua aksi penting dicatat

## 🌍 GPS Geofencing

- Menggunakan Geolocation API browser
- Validasi jarak menggunakan Haversine formula
- Default radius: 100 meter dari koordinat kantor

## 📊 Fitur Laporan

### Export CSV
- Filter berdasarkan range tanggal
- Format UTF-8 dengan BOM (Excel compatible)
- Kolom: Tanggal, NIP, Nama, Shift, Check In, Check Out, Status

## 🛠️ NPM Scripts

```powershell
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run db:push      # Push schema to database
npm run db:seed      # Seed initial data
```

## 🐳 Docker Commands

```powershell
docker-compose up -d      # Start PostgreSQL
docker-compose down       # Stop PostgreSQL
docker-compose logs -f    # View logs
```

## 📁 Struktur Project

```
project/hris/
├── src/
│   ├── app/
│   │   ├── api/              # API Routes
│   │   │   ├── admin/        # Admin endpoints
│   │   │   ├── auth/         # Authentication
│   │   │   ├── attendance/   # Absensi endpoints
│   │   │   └── employee/     # Employee endpoints
│   │   ├── dashboard/        # Dashboard pages
│   │   │   └── admin/        # Admin dashboard
│   │   ├── login/            # Login page
│   │   └── register/         # Register page
│   ├── components/           # React components
│   └── lib/                  # Libraries & utilities
│       ├── db.js             # Database connection
│       ├── schema.js         # Drizzle schema
│       ├── session.js        # Session management
│       └── geolocation.js    # GPS utilities
├── docker-compose.yml        # Docker configuration
└── drizzle.config.js         # Drizzle ORM config
```

## 🚨 Troubleshooting

### GPS tidak berfungsi
- Pastikan menggunakan HTTPS atau localhost
- Izinkan akses lokasi di browser
- Cek apakah device mendukung Geolocation API

### Database connection error
- Pastikan Docker container berjalan: `docker ps`
- Cek DATABASE_URL di `.env.local`
- Restart container: `docker-compose restart`

### Session/Login error
- Clear browser cookies
- Cek SESSION_SECRET di `.env.local`
- Pastikan JWT token belum expired

---

**Created by: Fitrah Andre**

**Built with ❤️ using Next.js & PostgreSQL**
