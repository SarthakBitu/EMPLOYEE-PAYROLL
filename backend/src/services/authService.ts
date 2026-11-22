import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { getConnection, query } from '../config/db.ts';
import { env } from '../config/env.ts';
import { AppError } from '../utils/appError.ts';

interface AdminUserRow extends RowDataPacket {
  admin_id: number;
  full_name: string;
  email: string;
  password_hash: string;
  role: string;
}

function signToken(payload: { sub: number; email: string; fullName: string; role: string }): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: '12h' });
}

function safeEqualStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function getAuthStatus(): Promise<{ initialized: boolean; envConfigured: boolean }> {
  const envConfigured = Boolean(env.adminEmail && env.adminPassword);
  if (envConfigured) {
    return { initialized: true, envConfigured: true };
  }
  const rows = await query<RowDataPacket[]>('SELECT COUNT(*) AS cnt FROM ADMIN_USER');
  const count = Number(rows[0]?.cnt || 0);
  return { initialized: count > 0, envConfigured: false };
}

export async function setupInitialAdmin(input: {
  fullName: string;
  email: string;
  password: string;
}) {
  if (env.adminEmail && env.adminPassword) {
    throw new AppError('Admin credentials are managed via server environment variables.', 409);
  }
  if (input.password.length < 8) {
    throw new AppError('Password must be at least 8 characters long.', 400);
  }

  const conn = await getConnection();
  try {
    await conn.beginTransaction();

    const [countRows] = await conn.execute<RowDataPacket[]>(
      'SELECT COUNT(*) AS cnt FROM ADMIN_USER FOR UPDATE'
    );
    if (Number(countRows[0]?.cnt || 0) > 0) {
      await conn.rollback();
      throw new AppError('System administrator account has already been initialized.', 409);
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const [result] = await conn.execute<ResultSetHeader>(
      'INSERT INTO ADMIN_USER (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [input.fullName, input.email.toLowerCase(), passwordHash, 'ADMIN']
    );

    await conn.commit();

    const user = {
      adminId: result.insertId,
      fullName: input.fullName,
      email: input.email.toLowerCase(),
      role: 'ADMIN',
    };

    const token = signToken({
      sub: user.adminId,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    });

    return { token, user };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function loginAdmin(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();

  // Check env-configured admin override first when both ADMIN_EMAIL and ADMIN_PASSWORD are set
  if (env.adminEmail && env.adminPassword) {
    if (
      normalizedEmail === env.adminEmail.toLowerCase() &&
      safeEqualStrings(password, env.adminPassword)
    ) {
      const user = {
        adminId: 0,
        fullName: 'System Administrator',
        email: env.adminEmail.toLowerCase(),
        role: 'ADMIN',
      };
      const token = signToken({
        sub: user.adminId,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      });
      return { token, user };
    }
  }

  const rows = await query<AdminUserRow[]>(
    'SELECT admin_id, full_name, email, password_hash, role FROM ADMIN_USER WHERE email = ? LIMIT 1',
    [normalizedEmail]
  );

  if (rows.length === 0) {
    throw new AppError('Invalid email or password.', 401);
  }

  const admin = rows[0];
  const valid = await bcrypt.compare(password, admin.password_hash);
  if (!valid) {
    throw new AppError('Invalid email or password.', 401);
  }

  const user = {
    adminId: admin.admin_id,
    fullName: admin.full_name,
    email: admin.email,
    role: admin.role,
  };

  const token = signToken({
    sub: user.adminId,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
  });

  return { token, user };
}
