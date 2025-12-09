import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { attendance } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

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

    // Get date from query params
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    
    // Use WIB timezone if no date param provided
    const queryDate = dateParam || getWIBDateString();
    
    console.log('Fetching attendance for userId:', payload.userId, 'date:', queryDate);

    // Get attendance for the date
    const result = await db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.userId, payload.userId),
          eq(attendance.date, queryDate)
        )
      )
      .limit(1);

    console.log('Attendance result:', result[0]);

    return NextResponse.json({
      attendance: result[0] || null,
    });
  } catch (error) {
    console.error('Get today attendance error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
