import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { shiftSchedule, users, shift } from '@/lib/schema';
import { verifySession } from '@/lib/session';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

// GET - Ambil jadwal shift berdasarkan tanggal
export async function GET(request) {
  try {
    const session = await verifySession(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const userId = searchParams.get('userId');

    let query = db
      .select({
        id: shiftSchedule.id,
        userId: shiftSchedule.userId,
        userNip: users.nip,
        userName: users.fullName,
        shiftId: shiftSchedule.shiftId,
        shiftName: shift.name,
        shiftStartTime: shift.startTime,
        shiftEndTime: shift.endTime,
        scheduleDate: shiftSchedule.scheduleDate,
        notes: shiftSchedule.notes,
        createdAt: shiftSchedule.createdAt,
      })
      .from(shiftSchedule)
      .leftJoin(users, eq(shiftSchedule.userId, users.id))
      .leftJoin(shift, eq(shiftSchedule.shiftId, shift.id));

    // Filter berdasarkan tanggal
    if (startDate && endDate) {
      query = query.where(
        and(
          gte(shiftSchedule.scheduleDate, startDate),
          lte(shiftSchedule.scheduleDate, endDate)
        )
      );
    }

    // Filter berdasarkan user
    if (userId) {
      query = query.where(eq(shiftSchedule.userId, parseInt(userId)));
    }

    const schedules = await query.orderBy(shiftSchedule.scheduleDate, users.fullName);

    return NextResponse.json({ schedules });
  } catch (error) {
    console.error('Error fetching shift schedules:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Buat jadwal shift (bisa multiple sekaligus)
export async function POST(request) {
  try {
    const session = await verifySession(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { schedules } = body; // Array of {userId, shiftId, scheduleDate, notes}

    if (!schedules || !Array.isArray(schedules) || schedules.length === 0) {
      return NextResponse.json(
        { error: 'Data jadwal wajib diisi (array)' },
        { status: 400 }
      );
    }

    // Validasi setiap schedule
    for (const schedule of schedules) {
      if (!schedule.userId || !schedule.shiftId || !schedule.scheduleDate) {
        return NextResponse.json(
          { error: 'User ID, Shift ID, dan tanggal wajib diisi untuk setiap jadwal' },
          { status: 400 }
        );
      }
    }

    // Insert schedules (dengan upsert untuk handle duplicate)
    const insertedSchedules = [];
    for (const schedule of schedules) {
      try {
        // Cek apakah sudah ada jadwal untuk user dan tanggal ini
        const existing = await db
          .select()
          .from(shiftSchedule)
          .where(
            and(
              eq(shiftSchedule.userId, schedule.userId),
              eq(shiftSchedule.scheduleDate, schedule.scheduleDate)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          // Update jika sudah ada
          const [updated] = await db
            .update(shiftSchedule)
            .set({
              shiftId: schedule.shiftId,
              notes: schedule.notes || null,
              createdBy: session.userId,
              updatedAt: new Date(),
            })
            .where(eq(shiftSchedule.id, existing[0].id))
            .returning();
          insertedSchedules.push(updated);
        } else {
          // Insert jika belum ada
          const [inserted] = await db
            .insert(shiftSchedule)
            .values({
              userId: schedule.userId,
              shiftId: schedule.shiftId,
              scheduleDate: schedule.scheduleDate,
              notes: schedule.notes || null,
              createdBy: session.userId,
            })
            .returning();
          insertedSchedules.push(inserted);
        }
      } catch (error) {
        console.error('Error inserting schedule:', error);
        // Continue dengan schedule berikutnya
      }
    }

    return NextResponse.json(
      {
        message: `${insertedSchedules.length} jadwal berhasil disimpan`,
        schedules: insertedSchedules,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating shift schedules:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Hapus jadwal shift
export async function DELETE(request) {
  try {
    const session = await verifySession(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID jadwal wajib diisi' }, { status: 400 });
    }

    const [deletedSchedule] = await db
      .delete(shiftSchedule)
      .where(eq(shiftSchedule.id, parseInt(id)))
      .returning();

    if (!deletedSchedule) {
      return NextResponse.json({ error: 'Jadwal tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Jadwal berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting shift schedule:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
