import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { officeLocations } from '@/lib/schema';
import { eq } from 'drizzle-orm';

// GET - Fetch active locations (public for employees)
export async function GET() {
  try {
    const locations = await db.select()
      .from(officeLocations)
      .where(eq(officeLocations.isActive, true))
      .orderBy(officeLocations.name);

    return NextResponse.json({ locations });
  } catch (error) {
    console.error('Error fetching locations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
