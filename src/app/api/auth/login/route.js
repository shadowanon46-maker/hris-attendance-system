import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { db } from '@/lib/db';
import { users, activityLog } from '@/lib/schema';
import { createSession } from '@/lib/session';
import { eq } from 'drizzle-orm';

export async function POST(request) {
  try {
    const { identifier, password } = await request.json();

    // Validate input
    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'Email/NIP dan password harus diisi' },
        { status: 400 }
      );
    }

    // Find user by email or NIP
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, identifier))
      .limit(1);

    let foundUser = user;

    // If not found by email, try NIP
    if (!foundUser) {
      const [userByNip] = await db
        .select()
        .from(users)
        .where(eq(users.nip, identifier))
        .limit(1);
      foundUser = userByNip;
    }

    // Check if user exists and is active
    if (!foundUser) {
      return NextResponse.json(
        { error: 'Email/NIP atau password salah' },
        { status: 401 }
      );
    }

    if (!foundUser.isActive) {
      return NextResponse.json(
        { error: 'Akun Anda tidak aktif. Hubungi administrator.' },
        { status: 403 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, foundUser.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Email/NIP atau password salah' },
        { status: 401 }
      );
    }

    // Create session
    await createSession(foundUser.id, foundUser.role);

    // Log activity
    await db.insert(activityLog).values({
      userId: foundUser.id,
      action: 'login',
      description: `User ${foundUser.fullName} logged in`,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    // Return user data (without password)
    return NextResponse.json({
      message: 'Login berhasil',
      user: {
        id: foundUser.id,
        nip: foundUser.nip,
        email: foundUser.email,
        fullName: foundUser.fullName,
        role: foundUser.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat login' },
      { status: 500 }
    );
  }
}
