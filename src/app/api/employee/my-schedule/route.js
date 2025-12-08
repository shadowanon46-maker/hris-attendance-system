import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { shiftSchedule, shift } from '@/lib/schema';
import { eq, and, gte, lte, inArray } from 'drizzle-orm';

export async function GET(request) {
  try {
    const session = await verifySession();

    if (!session.isAuth) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    // Get start and end of week
    const currentDate = new Date(date);
    const dayOfWeek = currentDate.getDay();
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - dayOfWeek);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const startDate = startOfWeek.toISOString().split('T')[0];
    const endDate = endOfWeek.toISOString().split('T')[0];

    // Get schedule for current user for the week
    const schedules = await db
      .select()
      .from(shiftSchedule)
      .where(
        and(
          eq(shiftSchedule.userId, session.userId),
          gte(shiftSchedule.scheduleDate, startDate),
          lte(shiftSchedule.scheduleDate, endDate)
        )
      )
      .orderBy(shiftSchedule.scheduleDate);

    // Get all unique shift IDs
    const shiftIds = [...new Set(schedules.map(s => s.shiftId).filter(Boolean))];
    
    // Fetch shift details for all shift IDs
    const shifts = shiftIds.length > 0 
      ? await db.select().from(shift).where(inArray(shift.id, shiftIds))
      : [];

    // Create a map of shifts for quick lookup
    const shiftMap = shifts.reduce((acc, s) => {
      acc[s.id] = s;
      return acc;
    }, {});

    // Format schedules with shift details
    const formattedSchedules = schedules.map(schedule => ({
      id: schedule.id,
      date: schedule.scheduleDate,
      notes: schedule.notes,
      shift: schedule.shiftId && shiftMap[schedule.shiftId] ? {
        id: shiftMap[schedule.shiftId].id,
        name: shiftMap[schedule.shiftId].name,
        startTime: shiftMap[schedule.shiftId].startTime,
        endTime: shiftMap[schedule.shiftId].endTime,
        description: shiftMap[schedule.shiftId].description,
      } : null,
    }));

    return NextResponse.json({
      schedules: formattedSchedules,
      startDate,
      endDate,
    });
  } catch (error) {
    console.error('Get schedule error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan' },
      { status: 500 }
    );
  }
}
