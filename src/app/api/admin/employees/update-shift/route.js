import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { verifySession } from '@/lib/session';
import { eq } from 'drizzle-orm';

// PUT - Update shift karyawan
export async function PUT(request) {
  try {
    const session = await verifySession(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, shiftId } = body;

    // Validasi
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID wajib diisi' },
        { status: 400 }
      );
    }

    // Update shift karyawan (bisa null untuk menghapus shift)
    const [updatedUser] = await db
      .update(users)
      .set({
        shiftId: shiftId || null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser) {
      return NextResponse.json({ error: 'Karyawan tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Shift karyawan berhasil diupdate',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error updating employee shift:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
