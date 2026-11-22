import { execSync, spawn } from 'child_process';
import fs from 'fs';
import net from 'net';
import path from 'path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { registerApiRoutes } from './backend/src/app.ts';
import { initializeDatabase } from './backend/src/config/db.ts';
import { env } from './backend/src/config/env.ts';

function isPortOpen(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

function findMySqlBinary(): string | null {
  if (fs.existsSync('/usr/sbin/mariadbd')) return '/usr/sbin/mariadbd';
  if (fs.existsSync('/usr/sbin/mysqld')) return '/usr/sbin/mysqld';
  return null;
}

async function ensureMySqlRunning(): Promise<void> {
  if (await isPortOpen(env.db.host, env.db.port)) {
    return;
  }

  // Only attempt local MariaDB/MySQL daemon startup if targeting loopback
  if (!['127.0.0.1', 'localhost'].includes(env.db.host)) {
    return;
  }

  let binary = findMySqlBinary();
  if (!binary) {
    console.log('[DB Bootstrap] Installing MariaDB server package...');
    execSync(
      'apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" mariadb-server',
      { stdio: 'inherit' }
    );
    binary = findMySqlBinary();
  }

  if (!binary) {
    throw new Error('MySQL/MariaDB server binary not found and port 3306 is unreachable.');
  }

  const dataDir = path.resolve(process.cwd(), '.mysql-data');
  fs.mkdirSync('/var/run/mysqld', { recursive: true });
  fs.mkdirSync(dataDir, { recursive: true });

  if (!fs.existsSync(path.join(dataDir, 'mysql'))) {
    console.log('[DB Bootstrap] Initializing MariaDB data directory...');
    const installBin = fs.existsSync('/usr/bin/mariadb-install-db')
      ? '/usr/bin/mariadb-install-db'
      : '/usr/bin/mysql_install_db';
    execSync(`${installBin} --user=root --datadir="${dataDir}"`, { stdio: 'inherit' });
  }

  const child = spawn(
    binary,
    [
      '--user=root',
      `--datadir=${dataDir}`,
      '--bind-address=127.0.0.1',
      `--port=${env.db.port}`,
      '--socket=/var/run/mysqld/mysqld.sock',
    ],
    {
      detached: true,
      stdio: 'ignore',
    }
  );
  child.unref();

  let ready = false;
  for (let i = 0; i < 40; i++) {
    if (await isPortOpen(env.db.host, env.db.port)) {
      ready = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  if (!ready) {
    throw new Error('Timed out waiting for MySQL/MariaDB daemon on port 3306.');
  }

  // Ensure configured DB user exists with privileges for loopback TCP access
  const sqlGrant = [
    `CREATE USER IF NOT EXISTS '${env.db.user}'@'127.0.0.1' IDENTIFIED BY '${env.db.password.replace(/'/g, "\\'")}';`,
    `CREATE USER IF NOT EXISTS '${env.db.user}'@'localhost' IDENTIFIED BY '${env.db.password.replace(/'/g, "\\'")}';`,
    `GRANT ALL PRIVILEGES ON *.* TO '${env.db.user}'@'127.0.0.1' WITH GRANT OPTION;`,
    `GRANT ALL PRIVILEGES ON *.* TO '${env.db.user}'@'localhost' WITH GRANT OPTION;`,
    'FLUSH PRIVILEGES;',
  ].join(' ');

  try {
    execSync(`mysql --socket=/var/run/mysqld/mysqld.sock -e "${sqlGrant}"`, { stdio: 'ignore' });
  } catch {
    // Ignore if already configured or non-socket environment
  }
}

async function startServer(): Promise<void> {
  let dbReady = false;
  let dbError: Error | null = null;

  const dbBootstrapPromise = ensureMySqlRunning()
    .then(() => initializeDatabase())
    .then(() => {
      dbReady = true;
      console.log('[DB Bootstrap] MySQL database ready.');
    })
    .catch((err) => {
      dbError = err instanceof Error ? err : new Error(String(err));
      console.error('[DB Bootstrap Error]', dbError.message);
    });

  const app = express();

  // Wait for database readiness before serving /api/* requests (except /api/health)
  app.use('/api', async (req, res, next) => {
    if (req.path === '/health') {
      res.json({
        success: true,
        status: dbReady ? 'ok' : 'initializing',
        database: 'mysql',
      });
      return;
    }
    if (!dbReady) {
      await dbBootstrapPromise;
    }
    if (dbError) {
      res.status(503).json({
        success: false,
        message: 'Database service is unavailable. Please retry shortly.',
      });
      return;
    }
    next();
  });

  registerApiRoutes(app);

  if (env.nodeEnv !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Employee Payroll Management System running on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
