import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { users, shift } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const session = await verifySession();

    if (!session.isAuth) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get user data first
    const [userData] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('User data:', userData);

    // Get shift data if user has shiftId
    let shiftData = null;
    if (userData.shiftId) {
      const [shiftResult] = await db
        .select()
        .from(shift)
        .where(eq(shift.id, userData.shiftId))
        .limit(1);
      
      if (shiftResult) {
        shiftData = {
          name: shiftResult.name,
          startTime: shiftResult.startTime,
          endTime: shiftResult.endTime,
          description: shiftResult.description,
        };
      }
    }

    console.log('Shift data:', shiftData);

    // Construct response
    const user = {
      id: userData.id,
      nip: userData.nip,
      email: userData.email,
      fullName: userData.fullName,
      role: userData.role,
      shiftId: userData.shiftId,
      isActive: userData.isActive,
      shift: shiftData,
    };

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan' },
      { status: 500 }
    );
  }
}
