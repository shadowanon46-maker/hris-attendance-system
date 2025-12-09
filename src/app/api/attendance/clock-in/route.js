import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { attendance, shift, shiftSchedule, officeLocations } from '@/lib/schema';
import { eq, and, sql } from 'drizzle-orm';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { isWithinAnyOfficeLocation } from '@/lib/geolocation';

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

    // Get location from request
    const body = await request.json();
    const { latitude, longitude } = body;

    if (!latitude || !longitude) {
      return NextResponse.json({ error: 'Lokasi tidak ditemukan' }, { status: 400 });
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

    // Get today's date (local timezone)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayDate = `${year}-${month}-${day}`;

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

    const currentTime = now.toTimeString().split(' ')[0]; // HH:MM:SS
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

    // Create attendance record
    const [newAttendance] = await db
      .insert(attendance)
      .values({
        userId: payload.userId,
        date: todayDate,
        checkInTime: sql`NOW()`,
        status: status,
        checkInLat: latitude.toString(),
        checkInLng: longitude.toString(),
      })
      .returning();

    return NextResponse.json({
      message: status === 'late' 
        ? 'Clock in berhasil! Anda terlambat.' 
        : 'Clock in berhasil!',
      attendance: newAttendance,
    });
  } catch (error) {
    console.error('Clock in error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
