# Entity Relationship Diagram (ERD)
# HRIS GPS Attendance System

## Database: hris_db

---

## Tabel: users
**Deskripsi**: Menyimpan data karyawan dan admin

| Kolom | Tipe | Constraint | Keterangan |
|-------|------|------------|------------|
| id | SERIAL | PRIMARY KEY | ID unik user |
| nip | VARCHAR(50) | UNIQUE, NOT NULL | Nomor Induk Pegawai |
| email | VARCHAR(100) | UNIQUE, NOT NULL | Email user |
| password | VARCHAR(255) | NOT NULL | Password (bcrypt hashed) |
| full_name | VARCHAR(100) | NOT NULL | Nama lengkap |
| role | VARCHAR(20) | NOT NULL, DEFAULT 'employee' | 'admin' atau 'employee' |
| shift_id | INTEGER | FOREIGN KEY → shift(id) | ID shift karyawan |
| is_active | BOOLEAN | DEFAULT true | Status aktif/nonaktif |
| created_at | TIMESTAMP | DEFAULT NOW() | Waktu registrasi |
| updated_at | TIMESTAMP | DEFAULT NOW() | Waktu update terakhir |

**Index**: nip, email, role

---

## Tabel: shift
**Deskripsi**: Menyimpan jadwal shift kerja

| Kolom | Tipe | Constraint | Keterangan |
|-------|------|------------|------------|
| id | SERIAL | PRIMARY KEY | ID shift |
| name | VARCHAR(50) | NOT NULL, UNIQUE | Nama shift (Pagi, Siang, Malam) |
| start_time | TIME | NOT NULL | Jam masuk shift |
| end_time | TIME | NOT NULL | Jam keluar shift |
| tolerance_late | INTEGER | DEFAULT 15 | Toleransi terlambat (menit) |
| created_at | TIMESTAMP | DEFAULT NOW() | Waktu dibuat |

**Index**: name

**Data Default**:
```
- Shift Pagi: 08:00 - 16:00 (toleransi 15 menit)
- Shift Siang: 13:00 - 21:00 (toleransi 15 menit)
- Shift Malam: 21:00 - 05:00 (toleransi 15 menit)
```

---

## Tabel: attendance
**Deskripsi**: Menyimpan data absensi harian

| Kolom | Tipe | Constraint | Keterangan |
|-------|------|------------|------------|
| id | SERIAL | PRIMARY KEY | ID absensi |
| user_id | INTEGER | FOREIGN KEY → users(id), NOT NULL | ID karyawan |
| date | DATE | NOT NULL | Tanggal absensi |
| check_in_time | TIMESTAMP | NULL | Waktu check in |
| check_out_time | TIMESTAMP | NULL | Waktu check out |
| check_in_lat | DECIMAL(10,8) | NULL | Latitude check in |
| check_in_lng | DECIMAL(11,8) | NULL | Longitude check in |
| check_out_lat | DECIMAL(10,8) | NULL | Latitude check out |
| check_out_lng | DECIMAL(11,8) | NULL | Longitude check out |
| status | VARCHAR(20) | NOT NULL | 'hadir', 'terlambat', 'izin', 'sakit', 'alpha' |
| notes | TEXT | NULL | Catatan/keterangan |
| created_at | TIMESTAMP | DEFAULT NOW() | Waktu record dibuat |

**Constraint**: UNIQUE(user_id, date)  
**Index**: user_id, date, status

**Business Rules**:
- Satu user hanya bisa 1 record per tanggal
- Check-in wajib sebelum check-out
- GPS coordinates harus dalam radius kantor
- Status ditentukan otomatis berdasarkan waktu check-in

---

## Tabel: activity_log
**Deskripsi**: Menyimpan log aktivitas penting sistem

| Kolom | Tipe | Constraint | Keterangan |
|-------|------|------------|------------|
| id | SERIAL | PRIMARY KEY | ID log |
| user_id | INTEGER | FOREIGN KEY → users(id) | ID user yang melakukan aksi |
| action | VARCHAR(50) | NOT NULL | Tipe aksi (login, logout, check_in, dll) |
| description | TEXT | NULL | Deskripsi detail |
| ip_address | VARCHAR(50) | NULL | IP address user |
| user_agent | TEXT | NULL | Browser/device info |
| created_at | TIMESTAMP | DEFAULT NOW() | Waktu aksi |

**Index**: user_id, action, created_at

**Action Types**:
- login: User berhasil login
- logout: User logout
- register: User registrasi
- check_in: Absensi masuk
- check_out: Absensi keluar

---

## Tabel: company_settings
**Deskripsi**: Menyimpan konfigurasi sistem (GPS kantor, radius)

| Kolom | Tipe | Constraint | Keterangan |
|-------|------|------------|------------|
| id | SERIAL | PRIMARY KEY | ID setting |
| key | VARCHAR(50) | UNIQUE, NOT NULL | Key setting |
| value | TEXT | NOT NULL | Value setting |
| description | TEXT | NULL | Deskripsi setting |
| updated_at | TIMESTAMP | DEFAULT NOW() | Waktu update |

**Data Default**:
```
- office_lat: -6.200000 (latitude kantor)
- office_lng: 106.816666 (longitude kantor)
- office_radius: 100 (radius dalam meter)
- office_name: PT. HRIS Indonesia
- office_address: Jakarta, Indonesia
```

---

## Relasi Antar Tabel

```
┌─────────────┐
│   shift     │
│   (1)       │
└──────┬──────┘
       │
       │ has many
       │
┌──────▼──────┐       ┌─────────────────┐
│   users     │◄──────┤   attendance    │
│   (1)       │  (N)  │      (N)        │
└──────┬──────┘       └─────────────────┘
       │                    1 user can have
       │                    many attendance
       │                    records
       │
       │ has many
       │
┌──────▼──────┐
│ activity_log│
│    (N)      │
└─────────────┘
     1 user can have
     many activity logs
```

### Penjelasan Relasi:

1. **shift → users** (One-to-Many)
   - 1 shift dapat dimiliki oleh banyak user
   - Field: users.shift_id → shift.id

2. **users → attendance** (One-to-Many)
   - 1 user dapat memiliki banyak record absensi
   - Field: attendance.user_id → users.id
   - Constraint: Unique per tanggal (1 user = 1 absensi per hari)

3. **users → activity_log** (One-to-Many)
   - 1 user dapat memiliki banyak activity log
   - Field: activity_log.user_id → users.id

---

## Query Examples

### Get attendance with user and shift info:
```sql
SELECT 
  a.date,
  a.check_in_time,
  a.check_out_time,
  a.status,
  u.nip,
  u.full_name,
  s.name as shift_name
FROM attendance a
LEFT JOIN users u ON a.user_id = u.id
LEFT JOIN shift s ON u.shift_id = s.id
WHERE a.date >= '2024-12-01'
ORDER BY a.date DESC, u.full_name;
```

### Get today's attendance count:
```sql
SELECT COUNT(*) as total_hadir
FROM attendance
WHERE date = CURRENT_DATE;
```

### Get late employees today:
```sql
SELECT u.full_name, a.check_in_time
FROM attendance a
JOIN users u ON a.user_id = u.id
WHERE a.date = CURRENT_DATE
  AND a.status = 'terlambat'
ORDER BY a.check_in_time;
```

---

## Indexes Strategy

1. **Primary Keys**: Auto-indexed (id columns)
2. **Foreign Keys**: Indexed for join performance
3. **Search Fields**: nip, email (unique + indexed)
4. **Filter Fields**: date, status (indexed)
5. **Composite Index**: (user_id, date) untuk attendance lookup

---

## Security Considerations

1. **Password Storage**: 
   - NEVER store plain text
   - Use bcrypt hash (salt rounds: 10)

2. **Sensitive Data**:
   - GPS coordinates disimpan untuk audit trail
   - Activity log untuk tracking

3. **Data Integrity**:
   - Foreign key constraints
   - Unique constraints
   - NOT NULL constraints

---

**Database Version**: PostgreSQL 16  
**Character Set**: UTF-8  
**Collation**: en_US.utf8
