# Multi-Location Office Feature

## Overview
Fitur ini memungkinkan sistem HRIS mendukung multiple lokasi kantor untuk validasi GPS absensi. Karyawan dapat melakukan clock-in/clock-out dari lokasi kantor mana saja yang aktif.

## Database Schema

### Table: `office_locations`
```sql
CREATE TABLE "office_locations" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(100) NOT NULL,
  "address" text,
  "latitude" numeric(10, 8) NOT NULL,
  "longitude" numeric(11, 8) NOT NULL,
  "radius" integer DEFAULT 100 NOT NULL,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
```

**Fields:**
- `id`: Primary key (auto-increment)
- `name`: Nama lokasi kantor (max 100 karakter)
- `address`: Alamat lengkap kantor (optional)
- `latitude`: Koordinat lintang (8 desimal precision)
- `longitude`: Koordinat bujur (8 desimal precision)
- `radius`: Radius validasi dalam meter (default 100m)
- `is_active`: Status aktif/nonaktif lokasi
- `created_at`: Waktu pembuatan record
- `updated_at`: Waktu update terakhir

## API Endpoints

### 1. Admin Location Management

#### GET `/api/admin/locations`
**Purpose:** Mendapatkan semua lokasi kantor (admin only)

**Response:**
```json
{
  "locations": [
    {
      "id": 1,
      "name": "Kantor Pusat",
      "address": "Jl. Sudirman No. 123, Jakarta",
      "latitude": "-6.20876300",
      "longitude": "106.84559900",
      "radius": 100,
      "isActive": true,
      "createdAt": "2025-12-09T14:47:29.694Z",
      "updatedAt": "2025-12-09T14:47:29.694Z"
    }
  ]
}
```

#### POST `/api/admin/locations`
**Purpose:** Membuat lokasi kantor baru (admin only)

**Request Body:**
```json
{
  "name": "Kantor Cabang Surabaya",
  "address": "Jl. Tunjungan No. 45, Surabaya",
  "latitude": -7.250445,
  "longitude": 112.768845,
  "radius": 150,
  "isActive": true
}
```

**Response:**
```json
{
  "message": "Lokasi berhasil ditambahkan",
  "location": { ... }
}
```

#### PUT `/api/admin/locations`
**Purpose:** Update lokasi kantor (admin only)

**Request Body:**
```json
{
  "id": 1,
  "name": "Kantor Pusat (Updated)",
  "address": "Jl. Sudirman No. 456, Jakarta",
  "latitude": -6.208763,
  "longitude": 106.845599,
  "radius": 200,
  "isActive": true
}
```

#### DELETE `/api/admin/locations`
**Purpose:** Hapus lokasi kantor (admin only)

**Request Body:**
```json
{
  "id": 1
}
```

### 2. Public Location API

#### GET `/api/locations`
**Purpose:** Mendapatkan semua lokasi aktif (untuk employee)

**Response:**
```json
{
  "locations": [
    {
      "id": 1,
      "name": "Kantor Pusat",
      "latitude": "-6.20876300",
      "longitude": "106.84559900",
      "radius": 100
    }
  ]
}
```

### 3. Attendance APIs (Updated)

#### POST `/api/attendance/clock-in`
**Changes:**
- Sekarang memvalidasi koordinat user terhadap **semua lokasi aktif**
- User dapat clock-in jika berada dalam radius salah satu lokasi
- Error message menampilkan jarak ke lokasi terdekat

**Error Response Example:**
```json
{
  "error": "Anda berada di luar jangkauan kantor. Jarak Anda dari Kantor Pusat: 250 meter."
}
```

#### POST `/api/attendance/clock-out`
**Changes:**
- Sama seperti clock-in, validasi terhadap semua lokasi aktif
- Konsisten dengan logic clock-in

## Geolocation Library

### File: `/src/lib/geolocation.js`

#### Function: `isWithinAnyOfficeLocation(userLat, userLng, officeLocations)`

**Purpose:** Memvalidasi apakah koordinat user berada dalam radius salah satu lokasi kantor

**Parameters:**
- `userLat` (number): Latitude user
- `userLng` (number): Longitude user
- `officeLocations` (array): Array of office location objects dari database

**Returns:**
```javascript
{
  isValid: boolean,           // true jika dalam radius salah satu lokasi
  nearestLocation: string,    // Nama lokasi terdekat
  distance: number            // Jarak ke lokasi terdekat (meter)
}
```

**Example:**
```javascript
import { isWithinAnyOfficeLocation } from '@/lib/geolocation';

const result = isWithinAnyOfficeLocation(
  -6.208763,
  106.845599,
  [
    { name: 'Kantor Pusat', latitude: '-6.20876300', longitude: '106.84559900', radius: 100 },
    { name: 'Kantor Cabang', latitude: '-6.300000', longitude: '106.900000', radius: 150 }
  ]
);

// result: { isValid: true, nearestLocation: 'Kantor Pusat', distance: 0 }
```

## Admin UI

### Page: `/dashboard/admin/locations`

**Features:**
1. **Table List:**
   - Menampilkan semua lokasi dengan info lengkap
   - Status badge (Aktif/Nonaktif)
   - Icon buttons untuk Edit/Delete

2. **Add/Edit Form Modal:**
   - Nama lokasi (required)
   - Alamat lengkap (required)
   - Latitude & Longitude (required)
   - Radius dalam meter (default 100m)
   - Checkbox status aktif
   - Button "Gunakan Lokasi Saat Ini" untuk auto-fill koordinat

3. **Geolocation Helper:**
   - Menggunakan browser Geolocation API
   - Auto-fill latitude/longitude dengan koordinat saat ini
   - Memudahkan admin saat berada di lokasi fisik kantor

## Usage Examples

### Scenario 1: Perusahaan dengan 3 Kantor

```sql
-- Insert 3 office locations
INSERT INTO office_locations (name, address, latitude, longitude, radius, is_active)
VALUES 
  ('Kantor Pusat Jakarta', 'Jl. Sudirman No. 123', -6.208763, 106.845599, 100, true),
  ('Cabang Surabaya', 'Jl. Tunjungan No. 45', -7.250445, 112.768845, 150, true),
  ('Cabang Bandung', 'Jl. Asia Afrika No. 78', -6.914744, 107.609810, 120, true);
```

**Result:**
- Karyawan di Jakarta dapat clock-in dari Kantor Pusat (radius 100m)
- Karyawan di Surabaya dapat clock-in dari Cabang Surabaya (radius 150m)
- Karyawan di Bandung dapat clock-in dari Cabang Bandung (radius 120m)

### Scenario 2: Menonaktifkan Lokasi Sementara

```javascript
// Via Admin UI atau API
PUT /api/admin/locations
{
  "id": 2,
  "isActive": false,
  ...
}
```

**Result:**
- Lokasi "Cabang Surabaya" tidak lagi bisa digunakan untuk absensi
- User akan mendapat error "Tidak ada lokasi kantor yang aktif" jika mencoba clock-in dari Surabaya

### Scenario 3: Mengubah Radius Lokasi

```javascript
// Via Admin UI
PUT /api/admin/locations
{
  "id": 1,
  "radius": 200,  // Dari 100m menjadi 200m
  ...
}
```

**Result:**
- Validasi GPS untuk Kantor Pusat sekarang lebih longgar (200m)
- Berguna jika lokasi kantor berada di gedung besar atau area parkir luas

## Testing

### 1. Test Database Migration
```bash
npm run db:push
```

### 2. Test Seed Data
```bash
Get-Content seed_location.sql | docker exec -i hris_postgres psql -U hrisadmin -d hris_db
```

### 3. Test Admin UI
1. Login sebagai admin
2. Navigate ke `/dashboard/admin/locations`
3. Test CRUD operations:
   - Add new location
   - Edit existing location
   - Toggle active status
   - Delete location

### 4. Test Clock-in Validation
```javascript
// Test dengan koordinat valid (dalam radius)
POST /api/attendance/clock-in
{
  "latitude": -6.208763,
  "longitude": 106.845599
}
// Expected: Success

// Test dengan koordinat invalid (di luar radius)
POST /api/attendance/clock-in
{
  "latitude": -6.300000,
  "longitude": 106.900000
}
// Expected: Error dengan jarak ke lokasi terdekat
```

## Migration Notes

### Changes from Single Location to Multi-Location:

**Before (Single Location):**
```javascript
// Hardcoded in settings
const OFFICE_LAT = -6.208763;
const OFFICE_LNG = 106.845599;
const OFFICE_RADIUS = 100;
```

**After (Multi-Location):**
```javascript
// Dynamic query from database
const activeLocations = await db
  .select()
  .from(officeLocations)
  .where(eq(officeLocations.isActive, true));

const locationCheck = isWithinAnyOfficeLocation(
  userLat,
  userLng,
  activeLocations
);
```

### Breaking Changes:
- ❌ None! Backward compatible
- ✅ Existing attendance records tetap valid
- ✅ API response format tetap sama
- ✅ Hanya perlu tambah data lokasi via admin UI

## Best Practices

1. **Radius Setting:**
   - Indoor office: 50-100 meter
   - Office dengan parkir luas: 100-200 meter
   - Campus/complex: 200-500 meter

2. **Koordinat Accuracy:**
   - Gunakan 6-8 desimal untuk presisi tinggi
   - Test koordinat langsung dari lokasi kantor
   - Gunakan Google Maps untuk verifikasi

3. **Status Management:**
   - Set `isActive=false` untuk lokasi temporary closed
   - Jangan delete lokasi yang sudah punya attendance history
   - Archive dengan soft delete (isActive flag)

4. **Security:**
   - Semua CRUD operations hanya untuk admin
   - Employee hanya bisa read active locations
   - Validasi koordinat di server-side (tidak trust client)

## Troubleshooting

### Issue: "Tidak ada lokasi kantor yang aktif"
**Solution:**
- Check bahwa minimal ada 1 lokasi dengan `isActive=true`
- Verify query di database: `SELECT * FROM office_locations WHERE is_active = true;`

### Issue: "Selalu ditolak meskipun di kantor"
**Solution:**
- Verify koordinat lokasi di database benar
- Test dengan increase radius temporarily
- Check GPS accuracy di device (biasanya ±10-50 meter)

### Issue: GPS tidak akurat
**Solution:**
- Pastikan device location permission granted
- Test di outdoor (GPS lebih akurat)
- Tambahkan margin pada radius (contoh: 100m → 150m)

## Future Enhancements

Possible improvements:
1. **Map Integration:** Show office locations on interactive map (Google Maps/Leaflet)
2. **Geofencing:** Push notification saat user mendekati kantor
3. **Location Analytics:** Track most used locations, peak hours per location
4. **QR Code Alternative:** QR code scan sebagai backup jika GPS tidak akurat
5. **Location-based Shift:** Auto-assign shift based on check-in location

## Support

Jika ada pertanyaan atau issue:
1. Check dokumentasi ini terlebih dahulu
2. Review console logs untuk error details
3. Test di environment development dulu sebelum production
4. Backup database sebelum migration atau bulk changes
