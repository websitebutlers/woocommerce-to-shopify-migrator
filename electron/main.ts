import { app, BrowserWindow, shell, Menu, ipcMain, dialog } from 'electron';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { createMenu } from './menu';
import { getAppDataPath, ensureAppDataDir, getDbPath } from './database';

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let nextServer: ChildProcess | null = null;

// Determine if we're in development mode
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Port for the Next.js server
const PORT = 3000;

function startNextServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isDev) {
      // In development, assume the dev server is already running
      resolve();
      return;
    }

    // In production, start the Next.js production server
    const serverPath = path.join(process.resourcesPath, 'app');

    nextServer = spawn('npx', ['next', 'start', '-p', PORT.toString()], {
      cwd: serverPath,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        DB_PATH: getDbPath(),
      },
      shell: true,
    });

    nextServer.stdout?.on('data', (data) => {
      console.log(`Next.js: ${data}`);
      if (data.toString().includes('Ready')) {
        resolve();
      }
    });

    nextServer.stderr?.on('data', (data) => {
      console.error(`Next.js Error: ${data}`);
    });

    nextServer.on('error', (err) => {
      console.error('Failed to start Next.js server:', err);
      reject(err);
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      resolve(); // Resolve anyway and try to load
    }, 30000);
  });
}

function createWindow() {
  // Ensure app data directory exists for database
  ensureAppDataDir();

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false,
  });

  // Create application menu
  const menu = createMenu(mainWindow);
  Menu.setApplicationMenu(menu);

  // Load the app
  mainWindow.loadURL(`http://localhost:${PORT}`);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC handlers
function setupIpcHandlers() {
  ipcMain.handle('get-app-version', () => app.getVersion());
  ipcMain.handle('get-db-path', () => getDbPath());

  ipcMain.handle('show-open-dialog', async (_, options) => {
    return dialog.showOpenDialog(options);
  });

  ipcMain.handle('show-save-dialog', async (_, options) => {
    return dialog.showSaveDialog(options);
  });

  ipcMain.handle('minimize-window', () => {
    mainWindow?.minimize();
  });

  ipcMain.handle('maximize-window', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.handle('close-window', () => {
    mainWindow?.close();
  });
}

// App lifecycle
app.whenReady().then(async () => {
  setupIpcHandlers();

  try {
    await startNextServer();
    createWindow();
  } catch (error) {
    console.error('Failed to start application:', error);
    app.quit();
  }

  app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // On macOS, keep app running until explicitly quit
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // Kill the Next.js server when quitting
  if (nextServer) {
    nextServer.kill();
    nextServer = null;
  }
});

// Export app data path for use elsewhere
export { getAppDataPath };
