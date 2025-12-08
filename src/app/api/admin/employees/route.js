import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { users, shift } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const session = await verifySession();
    if (!session.isAuth || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const employeeList = await db
      .select({
        id: users.id,
        nip: users.nip,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        isActive: users.isActive,
        shiftId: users.shiftId,
        shiftName: shift.name,
        createdAt: users.createdAt,
      })
      .from(users)
      .leftJoin(shift, eq(users.shiftId, shift.id));

    return NextResponse.json({ employees: employeeList });
  } catch (error) {
    console.error('Get employees error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 });
  }
}
