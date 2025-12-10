import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq, sql, isNotNull, ne, and } from 'drizzle-orm';
import { checkFaceUniqueness } from '@/lib/faceApi';

const FACE_API_URL = process.env.NEXT_PUBLIC_FACE_API_URL || 'http://localhost:8000';

/**
 * POST /api/admin/employees/register-face
 * Register face for an employee (admin only)
 * 
 * Body (multipart/form-data):
 * - userId: string (required) - User ID to register face for
 * - image: File (required) - Face image file
 */
export async function POST(request) {
  try {
    const session = await getSession();

    // Check authentication
    if (!session?.userId) {
      return NextResponse.json(
        { error: 'Tidak terautentikasi' },
        { status: 401 }
      );
    }

    // Check admin role
    if (session.role !== 'admin') {
      return NextResponse.json(
        { error: 'Hanya admin yang dapat mendaftarkan wajah karyawan' },
        { status: 403 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const userId = formData.get('userId');
    const image = formData.get('image');

    // Validate input
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID diperlukan' },
        { status: 400 }
      );
    }

    if (!image || !(image instanceof File)) {
      return NextResponse.json(
        { error: 'File gambar diperlukan' },
        { status: 400 }
      );
    }

    // Check if target user exists
    const [targetUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, parseInt(userId)))
      .limit(1);

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Karyawan tidak ditemukan' },
        { status: 404 }
      );
    }

    // Check if face already registered
    if (targetUser.faceEmbedding) {
      return NextResponse.json(
        { error: 'Wajah karyawan sudah terdaftar' },
        { status: 400 }
      );
    }

    // Call FastAPI to register face
    const faceFormData = new FormData();
    faceFormData.append('file', image);
    faceFormData.append('skip_liveness', 'true'); // Skip liveness for admin registration

    console.log(`Registering face for user ${userId}, image size: ${image.size} bytes, skip_liveness: true`);

    const faceResponse = await fetch(`${FACE_API_URL}/register`, {
      method: 'POST',
      body: faceFormData,
    });

    if (!faceResponse.ok) {
      const errorData = await faceResponse.json();
      console.error('Face API error:', errorData);
      return NextResponse.json(
        { error: errorData.message || 'Gagal mendaftarkan wajah' },
        { status: 400 }
      );
    }

    const faceData = await faceResponse.json();
    console.log(`Face registration response:`, {
      success: faceData.success,
      liveness_confidence: faceData.liveness_confidence,
      detection_confidence: faceData.detection_confidence,
      embedding_length: faceData.embedding?.length,
      message: faceData.message
    });

    // Check if face registration was successful
    if (!faceData.success || !faceData.embedding) {
      return NextResponse.json(
        { error: faceData.message || 'Gagal mendaftarkan wajah' },
        { status: 400 }
      );
    }

    // Check if this face is already registered to another user
    const usersWithFace = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        nip: users.nip,
        faceEmbedding: users.faceEmbedding,
      })
      .from(users)
      .where(isNotNull(users.faceEmbedding));

    const uniquenessCheck = checkFaceUniqueness(
      faceData.embedding,
      usersWithFace,
      parseInt(userId), // Exclude current user
      0.6 // 60% similarity threshold
    );

    if (!uniquenessCheck.isUnique) {
      console.warn(`Face already registered to user: ${uniquenessCheck.matchedUser?.fullName} (NIP: ${uniquenessCheck.matchedUser?.nip}), similarity: ${(uniquenessCheck.similarity * 100).toFixed(1)}%`);
      return NextResponse.json(
        {
          error: `Wajah ini sudah terdaftar untuk karyawan lain (${uniquenessCheck.matchedUser?.fullName} - ${uniquenessCheck.matchedUser?.nip}). Satu wajah hanya boleh terdaftar untuk satu akun.`,
          matchedUser: {
            fullName: uniquenessCheck.matchedUser?.fullName,
            nip: uniquenessCheck.matchedUser?.nip,
          },
          similarity: (uniquenessCheck.similarity * 100).toFixed(1) + '%'
        },
        { status: 400 }
      );
    }

    // Save embedding to database
    const embeddingString = JSON.stringify(faceData.embedding);

    console.log(`Saving face embedding to DB for user ${userId}`);
    console.log(`Embedding string length: ${embeddingString.length}`);

    const updateData = {
      faceEmbedding: embeddingString,
      faceRegisteredAt: sql`NOW()`,
    };

    console.log(`Update data prepared`);

    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, parseInt(userId)))
      .returning();

    console.log(`Face embedding saved successfully for user ${updatedUser.id}`);

    return NextResponse.json({
      message: 'Wajah karyawan berhasil didaftarkan',
      user_id: updatedUser.id,
      face_registered_at: updatedUser.faceRegisteredAt,
      liveness_confidence: faceData.liveness_confidence,
      detection_confidence: faceData.detection_confidence
    }, { status: 200 });

  } catch (error) {
    console.error('Error in POST /api/admin/employees/register-face:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/employees/register-face
 * Remove face registration for an employee (admin only)
 * 
 * Query params:
 * - userId: string (required) - User ID to remove face for
 */
export async function DELETE(request) {
  try {
    const session = await getSession();

    // Check authentication
    if (!session?.userId) {
      return NextResponse.json(
        { error: 'Tidak terautentikasi' },
        { status: 401 }
      );
    }

    // Check admin role
    if (session.role !== 'admin') {
      return NextResponse.json(
        { error: 'Hanya admin yang dapat menghapus registrasi wajah karyawan' },
        { status: 403 }
      );
    }

    // Get userId from query params
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID diperlukan' },
        { status: 400 }
      );
    }

    // Check if target user exists
    const [targetUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, parseInt(userId)))
      .limit(1);

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Karyawan tidak ditemukan' },
        { status: 404 }
      );
    }

    // Check if face is registered
    if (!targetUser.faceEmbedding) {
      return NextResponse.json(
        { error: 'Wajah karyawan belum terdaftar' },
        { status: 400 }
      );
    }

    // Remove face registration
    await db
      .update(users)
      .set({
        faceEmbedding: null,
        faceRegisteredAt: null
      })
      .where(eq(users.id, parseInt(userId)));

    return NextResponse.json({
      message: 'Registrasi wajah karyawan berhasil dihapus',
      user_id: parseInt(userId)
    }, { status: 200 });

  } catch (error) {
    console.error('Error in DELETE /api/admin/employees/register-face:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
