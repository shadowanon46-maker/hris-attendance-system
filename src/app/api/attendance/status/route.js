import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { attendance } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { formatDate } from '@/lib/geolocation';

export async function GET() {
  try {
    const session = await verifySession();
    if (!session.isAuth) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const today = formatDate(new Date());

    // Get today's attendance
    const [todayAttendance] = await db
      .select()
      .from(attendance)
      .where(and(eq(attendance.userId, session.userId), eq(attendance.date, today)))
      .limit(1);

    return NextResponse.json({
      attendance: todayAttendance || null,
      hasCheckedIn: !!todayAttendance,
      hasCheckedOut: !!todayAttendance?.checkOutTime,
    });
  } catch (error) {
    console.error('Get attendance status error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 });
  }
}
