import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret-key-change-in-production';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '7725';

export function verifyPassword(password: string): boolean {
  return password === ADMIN_PASSWORD;
}

export function signToken(): string {
  return jwt.sign(
    { role: 'admin', timestamp: Date.now() },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

export function verifyToken(token: string): { valid: boolean; payload?: any } {
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return { valid: true, payload };
  } catch {
    return { valid: false };
  }
}
