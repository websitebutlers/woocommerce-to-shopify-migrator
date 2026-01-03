import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';
import { ConnectionConfig, MigrationJob } from '../types';

// Determine database path based on environment
function getDatabasePath(): string {
  // 1. Check for explicit DB_PATH environment variable (set by Electron in production)
  if (process.env.DB_PATH) {
    return process.env.DB_PATH;
  }

  // 2. Check for DATABASE_PATH (legacy support)
  if (process.env.DATABASE_PATH) {
    return process.env.DATABASE_PATH;
  }

  // 3. In development or web, use a local data directory
  // For Electron development, this will still work since we're running Next.js separately
  return './data/migrator.db';
}

const dbPath = getDatabasePath();
let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    // Ensure the directory exists
    const dir = path.dirname(dbPath);
    const fs = require('fs');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    db = new Database(dbPath);
    initializeDatabase(db);
  }
  return db;
}

// Export the path for debugging purposes
export function getCurrentDbPath(): string {
  return dbPath;
}

function initializeDatabase(db: Database.Database) {
  // Create connections table
  db.exec(`
    CREATE TABLE IF NOT EXISTS connections (
      id TEXT PRIMARY KEY,
      platform TEXT NOT NULL,
      is_connected INTEGER NOT NULL DEFAULT 0,
      config TEXT NOT NULL,
      last_tested TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create migration_jobs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS migration_jobs (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      source TEXT NOT NULL,
      destination TEXT NOT NULL,
      items TEXT NOT NULL,
      status TEXT NOT NULL,
      progress INTEGER NOT NULL DEFAULT 0,
      total INTEGER NOT NULL,
      results TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT,
      error TEXT
    )
  `);

  // Create migration_logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS migration_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT NOT NULL,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      data TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (job_id) REFERENCES migration_jobs(id)
    )
  `);
}

// Connection operations
export function saveConnection(connection: ConnectionConfig): void {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO connections (id, platform, is_connected, config, last_tested, updated_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);
  
  stmt.run(
    connection.id,
    connection.platform,
    connection.isConnected ? 1 : 0,
    JSON.stringify(connection.config),
    connection.lastTested?.toISOString() || null
  );
}

export function getConnection(platform: string): ConnectionConfig | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM connections WHERE platform = ?');
  const row = stmt.get(platform) as any;
  
  if (!row) return null;
  
  return {
    id: row.id,
    platform: row.platform,
    isConnected: row.is_connected === 1,
    config: JSON.parse(row.config),
    lastTested: row.last_tested ? new Date(row.last_tested) : undefined,
  };
}

export function getAllConnections(): ConnectionConfig[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM connections');
  const rows = stmt.all() as any[];
  
  return rows.map(row => ({
    id: row.id,
    platform: row.platform,
    isConnected: row.is_connected === 1,
    config: JSON.parse(row.config),
    lastTested: row.last_tested ? new Date(row.last_tested) : undefined,
  }));
}

// Migration job operations
export function saveMigrationJob(job: MigrationJob): void {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO migration_jobs 
    (id, type, source, destination, items, status, progress, total, results, created_at, completed_at, error)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    job.id,
    job.type,
    job.source,
    job.destination,
    JSON.stringify(job.items),
    job.status,
    job.progress,
    job.total,
    JSON.stringify(job.results),
    job.createdAt.toISOString(),
    job.completedAt?.toISOString() || null,
    job.error || null
  );
}

export function getMigrationJob(id: string): MigrationJob | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM migration_jobs WHERE id = ?');
  const row = stmt.get(id) as any;
  
  if (!row) return null;
  
  return {
    id: row.id,
    type: row.type,
    source: row.source,
    destination: row.destination,
    items: JSON.parse(row.items),
    status: row.status,
    progress: row.progress,
    total: row.total,
    results: JSON.parse(row.results || '[]'),
    createdAt: new Date(row.created_at),
    completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    error: row.error || undefined,
  };
}

export function getAllMigrationJobs(): MigrationJob[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM migration_jobs ORDER BY created_at DESC');
  const rows = stmt.all() as any[];
  
  return rows.map(row => ({
    id: row.id,
    type: row.type,
    source: row.source,
    destination: row.destination,
    items: JSON.parse(row.items),
    status: row.status,
    progress: row.progress,
    total: row.total,
    results: JSON.parse(row.results || '[]'),
    createdAt: new Date(row.created_at),
    completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    error: row.error || undefined,
  }));
}

export function logMigration(jobId: string, level: string, message: string, data?: any): void {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO migration_logs (job_id, level, message, data)
    VALUES (?, ?, ?, ?)
  `);
  
  stmt.run(jobId, level, message, data ? JSON.stringify(data) : null);
}

