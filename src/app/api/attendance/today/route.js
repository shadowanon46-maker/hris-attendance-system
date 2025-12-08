import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { attendance } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

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
    
    const queryDate = dateParam || new Date().toISOString().split('T')[0];

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
