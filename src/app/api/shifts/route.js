import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { shift } from '@/lib/schema';

export async function GET() {
  try {
    const shifts = await db.select().from(shift);
    return NextResponse.json({ shifts });
  } catch (error) {
    console.error('Get shifts error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan' },
      { status: 500 }
    );
  }
}
