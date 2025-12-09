import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { verifySession } from '@/lib/session';
import { registerFace } from '@/lib/faceApi';

export async function POST(request) {
  try {
    // Verify session
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get form data
    const formData = await request.formData();
    const imageFile = formData.get('image');

    if (!imageFile) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    // Call face recognition service
    const faceResult = await registerFace(imageFile);

    if (!faceResult.success) {
      return NextResponse.json(
        { error: faceResult.message },
        { status: 400 }
      );
    }

    // Store embedding in database
    const embeddingJson = JSON.stringify(faceResult.embedding);
    
    const [updatedUser] = await db
      .update(users)
      .set({
        faceEmbedding: embeddingJson,
        faceRegisteredAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, session.userId))
      .returning();

    return NextResponse.json({
      success: true,
      message: 'Face registered successfully',
      user: {
        id: updatedUser.id,
        fullName: updatedUser.fullName,
        faceRegisteredAt: updatedUser.faceRegisteredAt,
      },
      livenessConfidence: faceResult.liveness_confidence,
      detectionConfidence: faceResult.detection_confidence,
    });
  } catch (error) {
    console.error('Face registration error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    // Verify session
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's face registration status
    const [user] = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        faceRegisteredAt: users.faceRegisteredAt,
      })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      isRegistered: !!user.faceRegisteredAt,
      registeredAt: user.faceRegisteredAt,
      fullName: user.fullName,
    });
  } catch (error) {
    console.error('Get face status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    // Verify session
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Remove face embedding
    await db
      .update(users)
      .set({
        faceEmbedding: null,
        faceRegisteredAt: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, session.userId));

    return NextResponse.json({
      success: true,
      message: 'Face registration removed successfully',
    });
  } catch (error) {
    console.error('Remove face error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
