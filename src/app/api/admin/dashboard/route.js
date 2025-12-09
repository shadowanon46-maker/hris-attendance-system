import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { users, attendance } from '@/lib/schema';
import { eq, sql, and, gte } from 'drizzle-orm';

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

export async function GET() {
  try {
    const session = await verifySession();
    if (!session.isAuth || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get total employees
    const [totalEmployeesResult] = await db
      .select({ count: sql`count(*)` })
      .from(users)
      .where(eq(users.role, 'employee'));

    // Get active employees
    const [activeEmployeesResult] = await db
      .select({ count: sql`count(*)` })
      .from(users)
      .where(and(eq(users.role, 'employee'), eq(users.isActive, true)));

    // Get today's attendance count (using WIB timezone)
    const today = getWIBDateString();
    console.log('Admin dashboard - today date (WIB):', today);
    
    const [todayAttendanceResult] = await db
      .select({ count: sql`count(*)` })
      .from(attendance)
      .where(eq(attendance.date, today));

    // Get late count today
    const [lateCountResult] = await db
      .select({ count: sql`count(*)` })
      .from(attendance)
      .where(and(eq(attendance.date, today), eq(attendance.status, 'terlambat')));

    // Get this month's attendance stats
    const wibDate = getWIBDate();
    const thisMonth = `${wibDate.getFullYear()}-${String(wibDate.getMonth() + 1).padStart(2, '0')}`;
    const [monthAttendanceResult] = await db
      .select({ count: sql`count(*)` })
      .from(attendance)
      .where(gte(attendance.date, `${thisMonth}-01`));

    const stats = {
      totalEmployees: parseInt(totalEmployeesResult.count),
      activeEmployees: parseInt(activeEmployeesResult.count),
      todayAttendance: parseInt(todayAttendanceResult.count),
      todayLate: parseInt(lateCountResult.count),
      monthAttendance: parseInt(monthAttendanceResult.count),
    };

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 });
  }
}
