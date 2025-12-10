import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { attendance, shift, shiftSchedule, officeLocations, users } from '@/lib/schema';
import { eq, and, sql } from 'drizzle-orm';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { isWithinAnyOfficeLocation } from '@/lib/geolocation';
import { verifyFace } from '@/lib/faceApi';
import {
  getWIBDate,
  getWIBDateString,
  validateCheckIn as validateShiftCheckIn,
  determineAttendanceStatus
} from '@/lib/shiftUtils';

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

    // Validate check-in time using shift validation utility
    const checkInValidation = validateShiftCheckIn(userShift[0], nowWIB);

    if (!checkInValidation.valid) {
      return NextResponse.json(
        { error: checkInValidation.error },
        { status: 400 }
      );
    }

    // Determine attendance status (hadir or terlambat)
    const status = determineAttendanceStatus(userShift[0], nowWIB);

    // Create attendance record with WIB timestamp
    const [newAttendance] = await db
      .insert(attendance)
      .values({
        userId: payload.userId,
        date: todayDate,
        checkInTime: nowWIB,
        status: status,
        checkInLat: latitude.toString(),
        checkInLng: longitude.toString(),
        checkInFaceVerified: faceVerified,
        checkInFaceSimilarity: faceSimilarity ? faceSimilarity.toString() : null,
      })
      .returning();

    return NextResponse.json({
      message: status === 'terlambat'
        ? 'Clock in berhasil! Anda terlambat.'
        : 'Clock in berhasil!',
      attendance: newAttendance,
      faceVerified,
      faceSimilarity,
      shiftInfo: checkInValidation.shiftInfo,
    });
  } catch (error) {
    console.error('Clock in error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
