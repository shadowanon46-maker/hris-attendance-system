import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { verifySession } from '@/lib/session';

export async function POST(request) {
  try {
    const session = await verifySession();

    if (!session.isAuth || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { nip, fullName, email, password, role, isActive } = body;

    // Validate required fields
    if (!nip || !fullName || !email || !password) {
      return NextResponse.json(
        { error: 'NIP, Nama Lengkap, Email, dan Password harus diisi' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        nip,
        fullName,
        email,
        password: hashedPassword,
        role: role || 'employee',
        isActive: isActive !== undefined ? isActive : true,
      })
      .returning();

    return NextResponse.json({
      message: 'Karyawan berhasil ditambahkan',
      user: {
        id: newUser.id,
        nip: newUser.nip,
        fullName: newUser.fullName,
        email: newUser.email,
        role: newUser.role,
        isActive: newUser.isActive,
      },
    });
  } catch (error) {
    console.error('Create employee error:', error);
    
    // Check for unique constraint violation
    if (error.code === '23505') {
      if (error.constraint?.includes('nip')) {
        return NextResponse.json(
          { error: 'NIP sudah terdaftar' },
          { status: 400 }
        );
      }
      if (error.constraint?.includes('email')) {
        return NextResponse.json(
          { error: 'Email sudah terdaftar' },
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
