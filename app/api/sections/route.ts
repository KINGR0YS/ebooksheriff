import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// GET /api/sections — ambil semua sections (public)
export async function GET(request: NextRequest) {
  try {
    let sql;
    try {
      sql = getDb();
    } catch {
      return NextResponse.json([], { status: 200 });
    }
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (slug) {
      const result = await sql`
        SELECT slug, title, content, category, sort_order, updated_at
        FROM sections WHERE slug = ${slug} LIMIT 1
      `;
      if (!result || (Array.isArray(result) && result.length === 0)) {
        return NextResponse.json({ error: 'Section not found' }, { status: 404 });
      }
      const item = Array.isArray(result) ? result[0] : result;
      return NextResponse.json(item);
    }

    const result = await sql`
      SELECT slug, title, content, category, sort_order, updated_at
      FROM sections ORDER BY sort_order ASC, slug ASC
    `;
    const data = Array.isArray(result) ? result : [];
    return NextResponse.json(data);
  } catch (error) {
    console.error('GET /api/sections error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/sections — update section (admin only)
export async function PUT(request: NextRequest) {
  try {
    // Auth check
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    const { valid } = verifyToken(token);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    let sql;
    try {
      sql = getDb();
    } catch {
      return NextResponse.json({ success: true, note: 'DB not configured, saved locally only' });
    }

    const body = await request.json();
    const { slug, title, content, category, sort_order } = body;

    if (!slug) {
      return NextResponse.json({ error: 'slug is required' }, { status: 400 });
    }

    // Check if section exists
    const existing = await sql`SELECT slug FROM sections WHERE slug = ${slug} LIMIT 1`;
    const hasExisting = Array.isArray(existing) ? existing.length > 0 : !!existing;

    if (!hasExisting) {
      // Create new
      await sql`
        INSERT INTO sections (slug, title, content, category, sort_order, updated_at)
        VALUES (${slug}, ${title || ''}, ${content || ''}, ${category || 'lainnya'}, ${sort_order || 0}, NOW())
      `;
    } else {
      // Update existing
      await sql`
        UPDATE sections SET
          title = COALESCE(${title}, title),
          content = COALESCE(${content}, content),
          category = COALESCE(${category}, category),
          sort_order = COALESCE(${sort_order}, sort_order),
          updated_at = NOW()
        WHERE slug = ${slug}
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT /api/sections error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
