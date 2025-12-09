import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { officeLocations } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { verifySession } from '@/lib/session';

// GET - Fetch all locations
export async function GET() {
  try {
    const session = await verifySession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const locations = await db.select().from(officeLocations).orderBy(officeLocations.createdAt);

    return NextResponse.json({ locations });
  } catch (error) {
    console.error('Error fetching locations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new location
export async function POST(request) {
  try {
    const session = await verifySession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, address, latitude, longitude, radius, isActive } = body;

    if (!name || !latitude || !longitude || !radius) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    const [newLocation] = await db.insert(officeLocations).values({
      name,
      address: address || null,
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      radius: parseInt(radius),
      isActive: isActive !== undefined ? isActive : true,
    }).returning();

    return NextResponse.json({ 
      message: 'Lokasi berhasil ditambahkan',
      location: newLocation 
    });
  } catch (error) {
    console.error('Error creating location:', error);
    return NextResponse.json({ error: 'Gagal menambahkan lokasi' }, { status: 500 });
  }
}

// PUT - Update location
export async function PUT(request) {
  try {
    const session = await verifySession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, address, latitude, longitude, radius, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID lokasi diperlukan' }, { status: 400 });
    }

    const [updatedLocation] = await db.update(officeLocations)
      .set({
        name,
        address,
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        radius: parseInt(radius),
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(officeLocations.id, id))
      .returning();

    if (!updatedLocation) {
      return NextResponse.json({ error: 'Lokasi tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Lokasi berhasil diupdate',
      location: updatedLocation 
    });
  } catch (error) {
    console.error('Error updating location:', error);
    return NextResponse.json({ error: 'Gagal mengupdate lokasi' }, { status: 500 });
  }
}

// DELETE - Delete location
export async function DELETE(request) {
  try {
    const session = await verifySession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID lokasi diperlukan' }, { status: 400 });
    }

    await db.delete(officeLocations).where(eq(officeLocations.id, parseInt(id)));

    return NextResponse.json({ message: 'Lokasi berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting location:', error);
    return NextResponse.json({ error: 'Gagal menghapus lokasi' }, { status: 500 });
  }
}
