import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { db } from '@/lib/db';
import { users, activityLog } from '@/lib/schema';
import { createSession } from '@/lib/session';
import { eq, or } from 'drizzle-orm';

export async function POST(request) {
  try {
    const { nip, email, password, fullName, shiftId } = await request.json();

    // Validate input
    if (!nip || !email || !password || !fullName) {
      return NextResponse.json(
        { error: 'Semua field harus diisi' },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Format email tidak valid' },
        { status: 400 }
      );
    }

    // Password validation
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password minimal 6 karakter' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(or(eq(users.email, email), eq(users.nip, nip)))
      .limit(1);

    if (existingUser) {
      const field = existingUser.email === email ? 'Email' : 'NIP';
      return NextResponse.json(
        { error: `${field} sudah terdaftar` },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        nip,
        email,
        password: hashedPassword,
        fullName,
        role: 'employee',
        shiftId: shiftId || null,
        isActive: true,
      })
      .returning();

    // Create session
    await createSession(newUser.id, newUser.role);

    // Log activity
    await db.insert(activityLog).values({
      userId: newUser.id,
      action: 'register',
      description: `User ${newUser.fullName} registered`,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    // Return user data (without password)
    return NextResponse.json({
      message: 'Registrasi berhasil',
      user: {
        id: newUser.id,
        nip: newUser.nip,
        email: newUser.email,
        fullName: newUser.fullName,
        role: newUser.role,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat registrasi' },
      { status: 500 }
    );
  }
}
