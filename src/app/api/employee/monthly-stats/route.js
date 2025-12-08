import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { attendance } from '@/lib/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

export async function GET(request) {
  try {
    const session = await verifySession();

    if (!session.isAuth) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get current month start and end
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const startDate = startOfMonth.toISOString().split('T')[0];
    const endDate = endOfMonth.toISOString().split('T')[0];

    // Get all attendance records for current month
    const records = await db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.userId, session.userId),
          gte(attendance.date, startDate),
          lte(attendance.date, endDate)
        )
      );

    // Calculate stats
    const stats = {
      present: 0,
      late: 0,
      absent: 0,
    };

    records.forEach((record) => {
      if (record.status === 'present') {
        stats.present++;
      } else if (record.status === 'late') {
        stats.late++;
      }
    });

    // Calculate absent: days with shift schedule but no attendance record
    // Get all shift schedules for current month up to yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDate = yesterday.toISOString().split('T')[0];

    // Get all scheduled days for this user in current month up to yesterday
    const { shiftSchedule } = await import('@/lib/schema');
    const scheduledDays = await db
      .select()
      .from(shiftSchedule)
      .where(
        and(
          eq(shiftSchedule.userId, session.userId),
          gte(shiftSchedule.scheduleDate, startDate),
          lte(shiftSchedule.scheduleDate, yesterdayDate)
        )
      );

    // Create a set of dates where employee has attendance
    const attendedDates = new Set(records.map(r => r.date));

    // Count absent: scheduled days without attendance
    scheduledDays.forEach((schedule) => {
      if (!attendedDates.has(schedule.scheduleDate)) {
        stats.absent++;
      }
    });

    return NextResponse.json({
      stats,
      totalScheduled: scheduledDays.length,
      totalRecords: records.length,
    });
  } catch (error) {
    console.error('Get monthly stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
