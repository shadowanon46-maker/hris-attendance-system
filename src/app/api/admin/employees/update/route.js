import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { verifySession } from '@/lib/session';

export async function PUT(request) {
  try {
    const session = await verifySession();

    if (!session.isAuth || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, fullName, email, password, role, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID karyawan harus diisi' },
        { status: 400 }
      );
    }

    // Build update data
    const updateData = {
      fullName,
      email,
      role,
      isActive,
    };

    // Only update password if provided
    if (password && password.trim() !== '') {
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Update user
    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'Karyawan tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Data karyawan berhasil diupdate',
      user: {
        id: updatedUser.id,
        nip: updatedUser.nip,
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
      },
    });
  } catch (error) {
    console.error('Update employee error:', error);
    
    // Check for unique constraint violation
    if (error.code === '23505') {
      if (error.constraint?.includes('email')) {
        return NextResponse.json(
          { error: 'Email sudah digunakan oleh karyawan lain' },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
