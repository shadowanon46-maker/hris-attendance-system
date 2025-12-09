import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { attendance, shift, shiftSchedule, officeLocations } from '@/lib/schema';
import { eq, and, sql } from 'drizzle-orm';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { isWithinAnyOfficeLocation } from '@/lib/geolocation';

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

    // Get location from request
    const body = await request.json();
    const { latitude, longitude } = body;

    if (!latitude || !longitude) {
      return NextResponse.json({ error: 'Lokasi tidak ditemukan' }, { status: 400 });
    }

    // Get today's date (local timezone)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayDate = `${year}-${month}-${day}`;

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

    // Validate clock out time
    const shiftStart = userShift[0].startTime;
    const shiftEnd = userShift[0].endTime;

    // Helper function to convert time string to minutes since midnight
    const timeToMinutes = (timeStr) => {
      const [h, m, s] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };

    const currentTime = now.toTimeString().split(' ')[0]; // HH:MM:SS
    const currentMin = timeToMinutes(currentTime);
    const startMin = timeToMinutes(shiftStart);
    const endMin = timeToMinutes(shiftEnd);

    // Calculate max clock out (2 hours after shift end, handling midnight)
    let maxClockOutMin = endMin + 120; // 2 hours = 120 minutes
    if (maxClockOutMin >= 1440) maxClockOutMin -= 1440; // Wrap around midnight

    // For midnight shifts (e.g., 20:00 - 05:00)
    const isMidnightShift = startMin > endMin;
    
    if (isMidnightShift) {
      // Check if current time is in valid clock out window
      // Valid window: from shift start to (shift end + 2 hours)
      const isAfterMidnight = currentMin < startMin;
      
      if (isAfterMidnight) {
        // We're in the "next day" portion (e.g., 02:00 for 20:00-05:00 shift)
        if (currentMin > maxClockOutMin) {
          const maxClockOutHour = Math.floor(maxClockOutMin / 60);
          const maxClockOutMinute = maxClockOutMin % 60;
          return NextResponse.json(
            { error: `Clock out melewati batas waktu. Batas clock out adalah ${String(maxClockOutHour).padStart(2, '0')}:${String(maxClockOutMinute).padStart(2, '0')} (2 jam setelah shift berakhir). Hubungi admin.` },
            { status: 400 }
          );
        }
      }
      // If before midnight (e.g., 21:00), it's always valid for midnight shift
    } else {
      // Normal shift (e.g., 08:00 - 16:00)
      if (currentMin < startMin) {
        return NextResponse.json(
          { error: `Clock out hanya dapat dilakukan setelah shift dimulai (${shiftStart.substring(0, 5)})` },
          { status: 400 }
        );
      }

      if (currentMin > maxClockOutMin) {
        const maxClockOutHour = Math.floor(maxClockOutMin / 60);
        const maxClockOutMinute = maxClockOutMin % 60;
        return NextResponse.json(
          { error: `Clock out melewati batas waktu. Batas clock out adalah ${String(maxClockOutHour).padStart(2, '0')}:${String(maxClockOutMinute).padStart(2, '0')} (2 jam setelah shift berakhir). Hubungi admin.` },
          { status: 400 }
        );
      }
    }

    // Update attendance with clock out
    const updateData = {
      checkOutTime: sql`NOW()`,
    };
    
    // Add location if provided
    if (latitude && longitude) {
      updateData.checkOutLat = latitude.toString();
      updateData.checkOutLng = longitude.toString();
    }
    
    const [updatedAttendance] = await db
      .update(attendance)
      .set(updateData)
      .where(eq(attendance.id, existingAttendance[0].id))
      .returning();

    return NextResponse.json({
      message: 'Clock out berhasil!',
      attendance: updatedAttendance,
    });
  } catch (error) {
    console.error('Clock out error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
