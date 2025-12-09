import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { users, attendance, shift, shiftSchedule } from '@/lib/schema';
import { eq, gte, lte, and } from 'drizzle-orm';

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

export async function GET(request) {
  try {
    const session = await verifySession();
    if (!session.isAuth || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // If no date filter provided, default to today (WIB timezone)
    const today = getWIBDateString();
    const effectiveStartDate = startDate || today;
    const effectiveEndDate = endDate || today;

    console.log('Admin attendance query - date range (WIB):', effectiveStartDate, 'to', effectiveEndDate);

    let query = db
      .select({
        id: attendance.id,
        date: attendance.date,
        checkInTime: attendance.checkInTime,
        checkOutTime: attendance.checkOutTime,
        status: attendance.status,
        notes: attendance.notes,
        userId: attendance.userId,
        userName: users.fullName,
        userNip: users.nip,
        shiftName: shift.name,
      })
      .from(attendance)
      .leftJoin(users, eq(attendance.userId, users.id))
      .leftJoin(shiftSchedule, and(
        eq(shiftSchedule.userId, attendance.userId),
        eq(shiftSchedule.scheduleDate, attendance.date)
      ))
      .leftJoin(shift, eq(shiftSchedule.shiftId, shift.id));

    // Add date filters (always use date range, default to today)
    query = query.where(
      and(gte(attendance.date, effectiveStartDate), lte(attendance.date, effectiveEndDate))
    );

    const attendances = await query;

    return NextResponse.json({ attendances });
  } catch (error) {
    console.error('Get all attendance error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 });
  }
}
