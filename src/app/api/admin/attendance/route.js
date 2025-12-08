import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { users, attendance, shift } from '@/lib/schema';
import { eq, gte, lte, and } from 'drizzle-orm';

export async function GET(request) {
  try {
    const session = await verifySession();
    if (!session.isAuth || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

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
      .leftJoin(shift, eq(users.shiftId, shift.id));

    // Add date filters if provided
    if (startDate && endDate) {
      query = query.where(
        and(gte(attendance.date, startDate), lte(attendance.date, endDate))
      );
    }

    const attendances = await query;

    return NextResponse.json({ attendances });
  } catch (error) {
    console.error('Get all attendance error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 });
  }
}
