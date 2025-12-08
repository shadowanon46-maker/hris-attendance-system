import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { shift } from '@/lib/schema';
import { verifySession } from '@/lib/session';
import { eq } from 'drizzle-orm';

// GET - Ambil semua shift
export async function GET(request) {
  try {
    const session = await verifySession(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const shifts = await db.select().from(shift).orderBy(shift.name);

    return NextResponse.json({ shifts });
  } catch (error) {
    console.error('Error fetching shifts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Tambah shift baru
export async function POST(request) {
  try {
    const session = await verifySession(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, startTime, endTime, toleranceLate } = body;

    // Validasi
    if (!name || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Nama shift, jam mulai, dan jam selesai wajib diisi' },
        { status: 400 }
      );
    }

    // Cek duplikasi nama shift
    const existingShift = await db
      .select()
      .from(shift)
      .where(eq(shift.name, name))
      .limit(1);

    if (existingShift.length > 0) {
      return NextResponse.json(
        { error: 'Nama shift sudah digunakan' },
        { status: 400 }
      );
    }

    // Insert shift baru
    const [newShift] = await db
      .insert(shift)
      .values({
        name,
        startTime,
        endTime,
        toleranceLate: toleranceLate || 15,
      })
      .returning();

    return NextResponse.json(
      { message: 'Shift berhasil ditambahkan', shift: newShift },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating shift:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update shift
export async function PUT(request) {
  try {
    const session = await verifySession(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, startTime, endTime, toleranceLate } = body;

    // Validasi
    if (!id || !name || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'ID, nama shift, jam mulai, dan jam selesai wajib diisi' },
        { status: 400 }
      );
    }

    // Cek duplikasi nama shift (kecuali dirinya sendiri)
    const existingShift = await db
      .select()
      .from(shift)
      .where(eq(shift.name, name))
      .limit(1);

    if (existingShift.length > 0 && existingShift[0].id !== id) {
      return NextResponse.json(
        { error: 'Nama shift sudah digunakan' },
        { status: 400 }
      );
    }

    // Update shift
    const [updatedShift] = await db
      .update(shift)
      .set({
        name,
        startTime,
        endTime,
        toleranceLate: toleranceLate || 15,
      })
      .where(eq(shift.id, id))
      .returning();

    if (!updatedShift) {
      return NextResponse.json({ error: 'Shift tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Shift berhasil diupdate',
      shift: updatedShift,
    });
  } catch (error) {
    console.error('Error updating shift:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Hapus shift
export async function DELETE(request) {
  try {
    const session = await verifySession(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID shift wajib diisi' }, { status: 400 });
    }

    // Hapus shift
    const [deletedShift] = await db
      .delete(shift)
      .where(eq(shift.id, parseInt(id)))
      .returning();

    if (!deletedShift) {
      return NextResponse.json({ error: 'Shift tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Shift berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting shift:', error);
    
    // Cek jika shift masih digunakan
    if (error.message?.includes('foreign key constraint')) {
      return NextResponse.json(
        { error: 'Shift tidak dapat dihapus karena masih digunakan oleh karyawan' },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
