import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { attendance, shift, shiftSchedule, officeLocations, users } from '@/lib/schema';
import { eq, and, sql } from 'drizzle-orm';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { isWithinAnyOfficeLocation } from '@/lib/geolocation';
import { verifyFace } from '@/lib/faceApi';

// Timezone helper for WIB (Asia/Jakarta)
function getWIBDate() {
  const now = new Date();
  const wibOffset = 7 * 60; // WIB is UTC+7
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const wibTime = new Date(utcTime + (wibOffset * 60000));
  return wibTime;
}

function getWIBDateString(date = null) {
  const wibDate = date ? new Date(date) : getWIBDate();
  const year = wibDate.getFullYear();
  const month = String(wibDate.getMonth() + 1).padStart(2, '0');
  const day = String(wibDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper function to convert time string to minutes since midnight
function timeToMinutes(timeStr) {
  const [h, m, s] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

// Helper function to check if time is in shift range (handles midnight crossing)
function isInShiftRange(current, start, end) {
  const currMin = timeToMinutes(current);
  const stMin = timeToMinutes(start);
  const eMin = timeToMinutes(end);

  if (stMin <= eMin) {
    // Normal shift (e.g., 08:00 - 16:00)
    return currMin >= stMin && currMin <= eMin;
  } else {
    // Midnight shift (e.g., 20:00 - 05:00)
    return currMin >= stMin || currMin <= eMin;
  }
}

export async function POST(request) {
  try {
    // Verify session
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const secret = new TextEncoder().encode(
      process.env.SESSION_SECRET || 'default-secret-change-in-production'
    );
    const { payload } = await jwtVerify(token, secret);

    if (payload.role !== 'employee') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    // Get location and face image from request
    const contentType = request.headers.get('content-type');
    let latitude, longitude, faceImageFile;

    if (contentType && contentType.includes('multipart/form-data')) {
      // Handle FormData
      const formData = await request.formData();
      latitude = parseFloat(formData.get('latitude'));
      longitude = parseFloat(formData.get('longitude'));
      faceImageFile = formData.get('faceImage');
    } else {
      // Handle JSON (backward compatibility)
      const body = await request.json();
      latitude = body.latitude;
      longitude = body.longitude;
      // faceImage in JSON is base64, we'll handle it later
    }

    if (!latitude || !longitude) {
      return NextResponse.json({ error: 'Lokasi tidak ditemukan' }, { status: 400 });
    }

    // Face verification (optional but recommended)
    let faceVerified = false;
    let faceSimilarity = null;
    
    if (faceImageFile) {
      try {
        // Get user's stored face embedding
        const [user] = await db
          .select({
            faceEmbedding: users.faceEmbedding,
          })
          .from(users)
          .where(eq(users.id, payload.userId))
          .limit(1);

        if (user && user.faceEmbedding) {
          // Verify face using FastAPI
          const storedEmbedding = JSON.parse(user.faceEmbedding);
          
          const faceFormData = new FormData();
          faceFormData.append('file', faceImageFile);
          faceFormData.append('stored_embedding', JSON.stringify(storedEmbedding));

          const FACE_API_URL = process.env.NEXT_PUBLIC_FACE_API_URL || 'http://localhost:8000';
          const faceResponse = await fetch(`${FACE_API_URL}/verify`, {
            method: 'POST',
            body: faceFormData,
          });

          if (faceResponse.ok) {
            const faceData = await faceResponse.json();
            console.log('Face API Response:', JSON.stringify(faceData));
            
            if (faceData.success && faceData.verified) {
              faceVerified = true;
              faceSimilarity = faceData.similarity;
              console.log(`Face verified for user ${payload.userId}, similarity: ${faceSimilarity}`);
            } else {
              console.warn('Face verification failed: not a match');
              console.warn('Response data:', faceData);
              // REJECT clock-in if face doesn't match
              return NextResponse.json(
                { error: 'Verifikasi wajah gagal. Wajah tidak cocok dengan data yang terdaftar.' }, 
                { status: 403 }
              );
            }
          } else {
            console.error('Face API error:', await faceResponse.text());
            return NextResponse.json(
              { error: 'Gagal melakukan verifikasi wajah. Silakan coba lagi.' }, 
              { status: 500 }
            );
          }
        }
      } catch (faceError) {
        console.error('Face verification error:', faceError);
        return NextResponse.json(
          { error: 'Terjadi kesalahan saat verifikasi wajah.' }, 
          { status: 500 }
        );
      }
    }

    // Get active office locations
    const locations = await db
      .select()
      .from(officeLocations)
      .where(eq(officeLocations.isActive, true));

    if (locations.length === 0) {
      return NextResponse.json(
        { error: 'Tidak ada lokasi kantor yang aktif' },
        { status: 400 }
      );
    }

    // Validate location
    const locationCheck = isWithinAnyOfficeLocation(latitude, longitude, locations);
    
    if (!locationCheck.isValid) {
      return NextResponse.json(
        { 
          error: `Anda berada di luar area kantor. Jarak terdekat: ${locationCheck.distance}m dari ${locationCheck.nearestLocation?.name || 'kantor'}`,
          distance: locationCheck.distance,
          nearestLocation: locationCheck.nearestLocation?.name
        },
        { status: 400 }
      );
    }

    // Get today's date in WIB timezone
    const nowWIB = getWIBDate();
    const todayDate = getWIBDateString(nowWIB);

    console.log('Current time (WIB):', nowWIB.toISOString());
    console.log('Today date (WIB):', todayDate);

    // Check if already clocked in today
    const existingAttendance = await db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.userId, payload.userId),
          eq(attendance.date, todayDate)
        )
      )
      .limit(1);

    if (existingAttendance.length > 0) {
      return NextResponse.json(
        { error: 'Anda sudah melakukan clock in hari ini' },
        { status: 400 }
      );
    }

    // Get user's shift schedule for today
    console.log('Checking schedule for userId:', payload.userId, 'date:', todayDate);
    
    const schedule = await db
      .select()
      .from(shiftSchedule)
      .where(
        and(
          eq(shiftSchedule.userId, payload.userId),
          eq(shiftSchedule.scheduleDate, todayDate)
        )
      )
      .limit(1);

    console.log('Schedule found:', schedule);

    if (schedule.length === 0) {
      return NextResponse.json(
        { error: 'Anda tidak memiliki jadwal shift hari ini' },
        { status: 400 }
      );
    }

    // Get shift details
    const userShift = await db
      .select()
      .from(shift)
      .where(eq(shift.id, schedule[0].shiftId))
      .limit(1);

    if (!userShift[0]) {
      return NextResponse.json(
        { error: 'Data shift tidak ditemukan' },
        { status: 400 }
      );
    }

    // Validate clock in time is within allowed range (e.g., 1 hour before shift start)
    const shiftStart = userShift[0].startTime;
    const shiftEnd = userShift[0].endTime;

    const currentTime = nowWIB.toTimeString().split(' ')[0]; // HH:MM:SS in WIB
    const currentMin = timeToMinutes(currentTime);
    const startMin = timeToMinutes(shiftStart);
    const endMin = timeToMinutes(shiftEnd);
    
    // Calculate 1 hour before shift start (handle midnight)
    const [startHour, startMinute] = shiftStart.split(':').map(Number);
    let allowedHour = startHour - 1;
    if (allowedHour < 0) allowedHour += 24;
    const allowedStartTime = `${String(allowedHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}:00`;

    // Check if current time is in allowed range (1 hour before start to shift end)
    if (!isInShiftRange(currentTime, allowedStartTime, shiftEnd)) {
      return NextResponse.json(
        { error: `Clock in hanya dapat dilakukan mulai pukul ${allowedStartTime.substring(0, 5)} hingga ${shiftEnd.substring(0, 5)}` },
        { status: 400 }
      );
    }

    // Calculate if late
    let status = 'present';
    const tolerance = userShift[0].toleranceLate || 0; // in minutes
    
    // Calculate tolerance time
    let toleranceMin = startMin + tolerance;
    if (toleranceMin >= 1440) toleranceMin -= 1440; // Handle day overflow
    
    // For midnight shifts, need to check if we're before or after midnight
    const isAfterMidnight = startMin > endMin && currentMin < startMin;
    
    if (isAfterMidnight) {
      // We're in the "next day" portion of the shift (e.g., 02:00 for 20:00-05:00 shift)
      // Late check: currentMin > toleranceMin (if tolerance also wrapped)
      if (toleranceMin < startMin && currentMin > toleranceMin) {
        status = 'late';
      }
    } else {
      // Normal portion (either normal shift or before-midnight portion of midnight shift)
      if (currentMin > toleranceMin) {
        status = 'late';
      }
    }

    // Create attendance record with WIB timestamp
    const [newAttendance] = await db
      .insert(attendance)
      .values({
        userId: payload.userId,
        date: todayDate,
        checkInTime: nowWIB, // Use WIB timestamp instead of NOW()
        status: status,
        checkInLat: latitude.toString(),
        checkInLng: longitude.toString(),
        checkInFaceVerified: faceVerified,
        checkInFaceSimilarity: faceSimilarity ? faceSimilarity.toString() : null,
      })
      .returning();

    return NextResponse.json({
      message: status === 'late' 
        ? 'Clock in berhasil! Anda terlambat.' 
        : 'Clock in berhasil!',
      attendance: newAttendance,
      faceVerified,
      faceSimilarity,
    });
  } catch (error) {
    console.error('Clock in error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
