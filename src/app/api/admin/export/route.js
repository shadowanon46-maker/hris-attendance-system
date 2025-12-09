import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { users, attendance, shift, shiftSchedule } from '@/lib/schema';
import { eq, gte, lte, and } from 'drizzle-orm';

export async function GET(request) {
  try {
    const session = await verifySession();
    if (!session.isAuth || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const format = searchParams.get('format') || 'csv'; // csv or json

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    // Fetch attendance data with shift from schedule (not user default)
    const attendances = await db
      .select({
        tanggal: attendance.date,
        nip: users.nip,
        namaKaryawan: users.fullName,
        shift: shift.name,
        checkIn: attendance.checkInTime,
        checkOut: attendance.checkOutTime,
        status: attendance.status,
        catatan: attendance.notes,
      })
      .from(attendance)
      .leftJoin(users, eq(attendance.userId, users.id))
      .leftJoin(shiftSchedule, and(
        eq(shiftSchedule.userId, attendance.userId),
        eq(shiftSchedule.scheduleDate, attendance.date)
      ))
      .leftJoin(shift, eq(shiftSchedule.shiftId, shift.id))
      .where(and(gte(attendance.date, startDate), lte(attendance.date, endDate)))
      .orderBy(attendance.date, users.fullName);

    if (format === 'csv') {
      // Generate CSV
      const headers = [
        'Tanggal',
        'NIP',
        'Nama Karyawan',
        'Shift',
        'Check In',
        'Check Out',
        'Status',
        'Catatan',
      ];

      const rows = attendances.map((record) => [
        new Date(record.tanggal).toLocaleDateString('id-ID'),
        record.nip || '',
        record.namaKaryawan || '',
        record.shift || '',
        record.checkIn ? new Date(record.checkIn).toLocaleString('id-ID') : '',
        record.checkOut ? new Date(record.checkOut).toLocaleString('id-ID') : '',
        record.status || '',
        record.catatan || '',
      ]);

      const csv = [
        headers.join(','),
        ...rows.map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ),
      ].join('\n');

      // Add BOM for Excel UTF-8 support
      const bom = '\uFEFF';
      const csvWithBom = bom + csv;

      return new NextResponse(csvWithBom, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="laporan-absensi-${startDate}-${endDate}.csv"`,
        },
      });
    } else {
      // Return JSON
      return NextResponse.json({
        startDate,
        endDate,
        total: attendances.length,
        data: attendances,
      });
    }
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 });
  }
}
