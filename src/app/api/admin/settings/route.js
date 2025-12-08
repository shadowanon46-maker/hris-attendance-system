import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { companySettings } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const session = await verifySession();
    if (!session.isAuth || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const settings = await db.select().from(companySettings);
    
    // Convert to key-value object
    const settingsObj = {};
    settings.forEach(setting => {
      settingsObj[setting.key] = setting.value;
    });

    return NextResponse.json({ settings: settingsObj });
  } catch (error) {
    console.error('Get settings error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const session = await verifySession();
    if (!session.isAuth || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { office_lat, office_lng, office_radius, office_name, office_address } = await request.json();

    // Validate inputs
    if (!office_lat || !office_lng || !office_radius) {
      return NextResponse.json(
        { error: 'Latitude, longitude, dan radius harus diisi' },
        { status: 400 }
      );
    }

    const lat = parseFloat(office_lat);
    const lng = parseFloat(office_lng);
    const radius = parseInt(office_radius);

    if (isNaN(lat) || isNaN(lng) || isNaN(radius)) {
      return NextResponse.json(
        { error: 'Format koordinat atau radius tidak valid' },
        { status: 400 }
      );
    }

    if (lat < -90 || lat > 90) {
      return NextResponse.json(
        { error: 'Latitude harus antara -90 dan 90' },
        { status: 400 }
      );
    }

    if (lng < -180 || lng > 180) {
      return NextResponse.json(
        { error: 'Longitude harus antara -180 dan 180' },
        { status: 400 }
      );
    }

    if (radius < 10 || radius > 1000) {
      return NextResponse.json(
        { error: 'Radius harus antara 10 dan 1000 meter' },
        { status: 400 }
      );
    }

    // Update settings
    await db.update(companySettings)
      .set({ value: lat.toString(), updatedAt: new Date() })
      .where(eq(companySettings.key, 'office_lat'));

    await db.update(companySettings)
      .set({ value: lng.toString(), updatedAt: new Date() })
      .where(eq(companySettings.key, 'office_lng'));

    await db.update(companySettings)
      .set({ value: radius.toString(), updatedAt: new Date() })
      .where(eq(companySettings.key, 'office_radius'));

    if (office_name) {
      await db.update(companySettings)
        .set({ value: office_name, updatedAt: new Date() })
        .where(eq(companySettings.key, 'office_name'));
    }

    if (office_address) {
      await db.update(companySettings)
        .set({ value: office_address, updatedAt: new Date() })
        .where(eq(companySettings.key, 'office_address'));
    }

    return NextResponse.json({
      message: 'Pengaturan lokasi berhasil diupdate',
      settings: {
        office_lat: lat.toString(),
        office_lng: lng.toString(),
        office_radius: radius.toString(),
        office_name,
        office_address,
      },
    });
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 });
  }
}
