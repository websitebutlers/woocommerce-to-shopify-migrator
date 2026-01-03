import { app } from 'electron';
import path from 'path';
import fs from 'fs';

// Get the app data path for storing the database
export function getAppDataPath(): string {
  // In Electron, use app.getPath('userData') for persistent data
  // This resolves to:
  // - macOS: ~/Library/Application Support/WooCommerce to Shopify Migrator
  // - Windows: %APPDATA%/WooCommerce to Shopify Migrator
  // - Linux: ~/.config/WooCommerce to Shopify Migrator
  return app.getPath('userData');
}

// Get the database file path
export function getDbPath(): string {
  return path.join(getAppDataPath(), 'migrations.db');
}

// Ensure the app data directory exists
export function ensureAppDataDir(): void {
  const appDataPath = getAppDataPath();
  if (!fs.existsSync(appDataPath)) {
    fs.mkdirSync(appDataPath, { recursive: true });
  }
}

// Check if we're running in Electron (main process)
export function isElectron(): boolean {
  // Main process check - look for electron in process.versions
  if (typeof process !== 'undefined' && typeof process.versions === 'object' && !!process.versions.electron) {
    return true;
  }

  return false;
}
