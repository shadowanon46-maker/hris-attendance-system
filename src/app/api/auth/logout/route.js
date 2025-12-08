import { NextResponse } from 'next/server';
import { deleteSession, verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { activityLog } from '@/lib/schema';

export async function POST(request) {
  try {
    const session = await verifySession();

    if (session.isAuth) {
      // Log activity before logout
      await db.insert(activityLog).values({
        userId: session.userId,
        action: 'logout',
        description: 'User logged out',
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      });
    }

    // Delete session
    await deleteSession();

    return NextResponse.json({ message: 'Logout berhasil' });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat logout' },
      { status: 500 }
    );
  }
}
