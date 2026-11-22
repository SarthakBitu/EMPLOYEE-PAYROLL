import fs from 'fs';
import path from 'path';
import mysql, { type Pool, type PoolConnection, type RowDataPacket } from 'mysql2/promise';
import { env } from './env.ts';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: env.db.host,
      port: env.db.port,
      user: env.db.user,
      password: env.db.password,
      database: env.db.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      decimalNumbers: true,
      dateStrings: true,
    });
  }
  return pool;
}

export async function query<T extends RowDataPacket[] = RowDataPacket[]>(
  sql: string,
  params: unknown[] = []
): Promise<T> {
  const [rows] = await getPool().execute<T>(sql, params as never);
  return rows;
}

export async function getConnection(): Promise<PoolConnection> {
  return getPool().getConnection();
}

/**
 * Parses SQL files that may contain DELIMITER $$ directives (views, triggers, procedures)
 * into executable individual SQL statements for mysql2.
 */
function parseSqlScript(rawSql: string): string[] {
  const lines = rawSql.split(/\r?\n/);
  const statements: string[] = [];
  let delimiter = ';';
  let buffer = '';

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (trimmed.startsWith('--') || trimmed.length === 0) {
      continue;
    }

    const delimMatch = trimmed.match(/^DELIMITER\s+(.+)$/i);
    if (delimMatch) {
      delimiter = delimMatch[1].trim();
      continue;
    }

    buffer += (buffer ? '\n' : '') + rawLine;

    while (buffer.trimEnd().endsWith(delimiter)) {
      const idx = buffer.lastIndexOf(delimiter);
      const stmt = buffer.slice(0, idx).trim();
      if (stmt.length > 0 && !/^USE\s+/i.test(stmt)) {
        statements.push(stmt);
      }
      buffer = buffer.slice(idx + delimiter.length).trim();
    }
  }

  if (buffer.trim().length > 0 && !/^USE\s+/i.test(buffer.trim())) {
    statements.push(buffer.trim());
  }

  return statements;
}

async function runSqlFile(conn: mysql.Connection, filePath: string): Promise<void> {
  if (!fs.existsSync(filePath)) {
    return;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const statements = parseSqlScript(content);
  for (const stmt of statements) {
    try {
      await conn.query(stmt);
    } catch (err: unknown) {
      const mysqlErr = err as { errno?: number; code?: string };
      if (mysqlErr.errno === 1061 || mysqlErr.code === 'ER_DUP_KEYNAME') {
        continue;
      }
      throw err;
    }
  }
}

export async function initializeDatabase(): Promise<void> {
  const bootstrapConn = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
  });

  try {
    await bootstrapConn.query(
      `CREATE DATABASE IF NOT EXISTS \`${env.db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await bootstrapConn.query(`USE \`${env.db.database}\``);

    const dbDir = path.resolve(process.cwd(), 'database');
    await runSqlFile(bootstrapConn, path.join(dbDir, 'schema.sql'));
    await runSqlFile(bootstrapConn, path.join(dbDir, 'views.sql'));
    await runSqlFile(bootstrapConn, path.join(dbDir, 'triggers.sql'));
    await runSqlFile(bootstrapConn, path.join(dbDir, 'procedures.sql'));

    const [deptRows] = await bootstrapConn.query<RowDataPacket[]>(
      'SELECT COUNT(*) AS cnt FROM DEPARTMENT'
    );
    const deptCount = Number(deptRows[0]?.cnt || 0);
    if (deptCount === 0) {
      await runSqlFile(bootstrapConn, path.join(dbDir, 'sample_data.sql'));
    }
  } finally {
    await bootstrapConn.end();
  }
}
