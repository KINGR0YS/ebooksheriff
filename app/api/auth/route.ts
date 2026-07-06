import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, signToken, verifyToken } from '@/lib/auth';

// GET /api/auth — verify token validity
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }
  const token = authHeader.split(' ')[1];
  const { valid } = verifyToken(token);
  if (!valid) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }
  return NextResponse.json({ valid: true });
}

// POST /api/auth — login admin
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    if (verifyPassword(password)) {
      const token = signToken();
      return NextResponse.json({ success: true, token });
    } else {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }
  } catch (error) {
    console.error('POST /api/auth error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
