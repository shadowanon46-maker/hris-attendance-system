import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, attendance, shiftSchedule } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { verifySession } from '@/lib/session';

export async function DELETE(request) {
  try {
    const session = await verifySession();

    if (!session.isAuth || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID karyawan harus diisi' },
        { status: 400 }
      );
    }

    // Check if user exists
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { error: 'Karyawan tidak ditemukan' },
        { status: 404 }
      );
    }

    // Delete related records first
    await db.delete(attendance).where(eq(attendance.userId, id));
    await db.delete(shiftSchedule).where(eq(shiftSchedule.userId, id));

    // Delete user
    await db.delete(users).where(eq(users.id, id));

    return NextResponse.json({
      message: `Karyawan ${user.fullName} berhasil dihapus`,
    });
  } catch (error) {
    console.error('Delete employee error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
