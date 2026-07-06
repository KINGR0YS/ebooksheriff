/**
 * Seed script — migrasi data dari handbook.json ke Neon database.
 * 
 * Cara pakai:
 * 1. Set DATABASE_URL di .env
 * 2. node scripts/seed.mjs
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is required');
  console.error('Set it inline or via .env file');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

// Baca handbook.json
const handbookPath = join(__dirname, '..', 'lib', 'handbook.json');
const handbookData = JSON.parse(readFileSync(handbookPath, 'utf-8'));

// Mapping kategori
const categoryMap = {
  'pendahuluan': 'informasi-dasar',
  'divisi': 'informasi-dasar',
  'kepangkatan': 'informasi-dasar',
  'kendaraan': 'informasi-dasar',
  'penampilan': 'informasi-dasar',
  'radio': 'operasional',
  'senjata': 'operasional',
  'penanganan': 'operasional',
  'penyanderaan': 'operasional',
  'pengumuman': 'operasional',
  'taktik': 'operasional',
  'undang-undang': 'hukum',
  'hukum': 'hukum',
  'barang-ilegal': 'referensi',
  'fitur-f1': 'referensi',
};

async function seed() {
  console.log(`Seeding ${handbookData.length} sections...`);

  for (let i = 0; i < handbookData.length; i++) {
    const section = handbookData[i];
    const slug = section.id;
    const category = categoryMap[slug] || 'lainnya';

    console.log(`  [${i + 1}/${handbookData.length}] ${slug} (${category})`);

    await sql`
      INSERT INTO sections (slug, title, content, category, sort_order, updated_at)
      VALUES (
        ${slug},
        ${section.title},
        ${section.content},
        ${category},
        ${i + 1},
        NOW()
      )
      ON CONFLICT (slug) DO UPDATE SET
        title = EXCLUDED.title,
        content = EXCLUDED.content,
        category = EXCLUDED.category,
        sort_order = EXCLUDED.sort_order,
        updated_at = NOW()
    `;
  }

  console.log('✅ Seed complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
