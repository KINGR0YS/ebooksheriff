import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;

let sql: ReturnType<typeof neon> | null = null;

export function getDb() {
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  if (!sql) {
    sql = neon(DATABASE_URL);
  }
  return sql;
}

export default function getSql() {
  return getDb();
}
