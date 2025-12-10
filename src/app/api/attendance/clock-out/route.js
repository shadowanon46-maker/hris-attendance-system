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
  validateCheckOut as validateShiftCheckOut
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
    }

    if (!latitude || !longitude) {
      return NextResponse.json({ error: 'Lokasi tidak ditemukan' }, { status: 400 });
    }

    // Face verification (optional)
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

            if (faceData.success && faceData.verified) {
              faceVerified = true;
              faceSimilarity = faceData.similarity;
              console.log(`Face verified for user ${payload.userId}, similarity: ${faceSimilarity}`);
            } else {
              console.warn('Face verification failed: not a match');
              // REJECT clock-out if face doesn't match
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

    // Get today's date in WIB timezone
    const nowWIB = getWIBDate();
    const todayDate = getWIBDateString(nowWIB);

    console.log('Current time (WIB):', nowWIB.toISOString());
    console.log('Today date (WIB):', todayDate);

    // Check if clocked in today
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

    if (existingAttendance.length === 0) {
      return NextResponse.json(
        { error: 'Anda belum melakukan clock in hari ini' },
        { status: 400 }
      );
    }

    if (existingAttendance[0].checkOutTime) {
      return NextResponse.json(
        { error: 'Anda sudah melakukan clock out hari ini' },
        { status: 400 }
      );
    }

    // Get all active office locations
    const activeLocations = await db
      .select()
      .from(officeLocations)
      .where(eq(officeLocations.isActive, true));

    if (activeLocations.length === 0) {
      return NextResponse.json(
        { error: 'Tidak ada lokasi kantor yang aktif' },
        { status: 400 }
      );
    }

    // Validate location against all active office locations
    const locationCheck = isWithinAnyOfficeLocation(
      latitude,
      longitude,
      activeLocations
    );

    if (!locationCheck.isValid) {
      return NextResponse.json(
        {
          error: `Anda berada di luar jangkauan kantor. Jarak Anda dari ${locationCheck.nearestLocation}: ${locationCheck.distance.toFixed(0)} meter.`,
        },
        { status: 400 }
      );
    }

    // Get user's shift schedule for today
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

    // Validate check-out time using shift validation utility
    const checkOutValidation = validateShiftCheckOut(userShift[0], nowWIB);

    if (!checkOutValidation.valid) {
      return NextResponse.json(
        { error: checkOutValidation.error },
        { status: 400 }
      );
    }

    // Update attendance with clock out (WIB timestamp)
    const updateData = {
      checkOutTime: nowWIB,
    };

    // Add location if provided
    if (latitude && longitude) {
      updateData.checkOutLat = latitude.toString();
      updateData.checkOutLng = longitude.toString();
    }

    // Add face verification results
    if (faceVerified) {
      updateData.checkOutFaceVerified = faceVerified;
      updateData.checkOutFaceSimilarity = faceSimilarity ? faceSimilarity.toString() : null;
    }

    const [updatedAttendance] = await db
      .update(attendance)
      .set(updateData)
      .where(eq(attendance.id, existingAttendance[0].id))
      .returning();

    return NextResponse.json({
      message: 'Clock out berhasil!',
      attendance: updatedAttendance,
      faceVerified,
      faceSimilarity,
    });
  } catch (error) {
    console.error('Clock out error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
