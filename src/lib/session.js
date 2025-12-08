import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SESSION_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'default-secret-change-in-production'
);

const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Create session token and set cookie
 */
export async function createSession(userId, role) {
  const token = await new SignJWT({ userId, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SESSION_SECRET);

  const cookieStore = await cookies();
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION / 1000,
    path: '/',
  });

  return token;
}

/**
 * Get session from cookie
 */
export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, SESSION_SECRET);
    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Delete session cookie
 */
export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}

/**
 * Verify session and return user data
 */
export async function verifySession() {
  const session = await getSession();
  
  if (!session) {
    return { isAuth: false, userId: null, role: null };
  }

  return {
    isAuth: true,
    userId: session.userId,
    role: session.role,
  };
}
