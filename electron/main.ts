/*
 * Electron main process for the Next.js starter.
 *
 * Dev: loads the Next.js dev server at http://localhost:3000.
 * Production: loads packages/client/out/index.html via file://.
 *   (Requires `output: "export"` in packages/client/next.config.ts.)
 */

import { app, BrowserWindow, ipcMain, Menu, shell } from "electron";
import path from "path";
import fs from "fs";

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
const DEV_URL = process.env.ELECTRON_DEV_URL || "http://localhost:7834";

ipcMain.handle("app:quit", () => {
  for (const w of BrowserWindow.getAllWindows()) {
    try {
      w.destroy();
    } catch {
      /* already destroyed */
    }
  }
  app.quit();
});

type Prefs = { fullscreen?: boolean };
let _prefsPath = "";
function prefsPath(): string {
  if (!_prefsPath) {
    _prefsPath = path.join(app.getPath("userData"), "prefs.json");
  }
  return _prefsPath;
}
function loadPrefs(): Prefs {
  try {
    return JSON.parse(fs.readFileSync(prefsPath(), "utf8")) as Prefs;
  } catch {
    return {};
  }
}
function savePrefs(patch: Prefs): void {
  try {
    const current = loadPrefs();
    const next = { ...current, ...patch };
    fs.writeFileSync(prefsPath(), JSON.stringify(next), "utf8");
  } catch (err) {
    console.warn("[prefs] save failed:", err);
  }
}

ipcMain.handle(
  "window:setFullscreen",
  (evt, wantFullscreen: boolean) => {
    const win = BrowserWindow.fromWebContents(evt.sender);
    if (!win || win.isDestroyed()) return false;
    const isMac = process.platform === "darwin";
    if (isMac) {
      win.setSimpleFullScreen(!!wantFullscreen);
    } else {
      win.setFullScreen(!!wantFullscreen);
    }
    savePrefs({ fullscreen: !!wantFullscreen });
    return !!wantFullscreen;
  },
);

ipcMain.handle("window:isFullscreen", (evt) => {
  const win = BrowserWindow.fromWebContents(evt.sender);
  if (!win || win.isDestroyed()) return false;
  return process.platform === "darwin"
    ? win.isSimpleFullScreen()
    : win.isFullScreen();
});

ipcMain.handle("app:openExternal", async (_evt, url: string) => {
  if (!/^https?:\/\//i.test(url)) return false;
  try {
    await shell.openExternal(url);
    return true;
  } catch {
    return false;
  }
});

function createWindow(): void {
  const isMac = process.platform === "darwin";
  const prefs = loadPrefs();
  const wantFullscreen = prefs.fullscreen === true;

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 500,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    fullscreen: wantFullscreen,
    simpleFullscreen: isMac,
    titleBarStyle: isMac ? "hiddenInset" : "default",
    autoHideMenuBar: !isMac,
    backgroundColor: "#ffffff",
    show: false,
  });

  win.once("ready-to-show", () => {
    if (!win.isDestroyed()) win.show();
  });

  const handleExternal = (url: string) => {
    if (/^https?:\/\//i.test(url)) {
      const current = win.webContents.getURL();
      try {
        const target = new URL(url);
        const here = new URL(current);
        if (target.origin === here.origin) {
          return { action: "allow" as const };
        }
      } catch {
        /* malformed URL */
      }
      shell.openExternal(url).catch(() => {});
      return { action: "deny" as const };
    }
    return { action: "allow" as const };
  };
  win.webContents.setWindowOpenHandler(({ url }) => handleExternal(url));
  win.webContents.on("will-navigate", (event, url) => {
    const current = win.webContents.getURL();
    if (!/^https?:\/\//i.test(url)) return;
    try {
      const target = new URL(url);
      const here = new URL(current);
      if (target.origin !== here.origin) {
        event.preventDefault();
        shell.openExternal(url).catch(() => {});
      }
    } catch {
      /* malformed URL */
    }
  });

  if (isDev) {
    win.loadURL(DEV_URL);
    win.webContents.openDevTools({ mode: "detach" });

    // Recover from transient dev-server outages during HMR restarts.
    const RECOVERABLE_ERRORS = new Set([-7, -21, -101, -102, -104, -105, -106]);
    let retrying = false;
    win.webContents.on(
      "did-fail-load",
      (_evt, errorCode, errorDescription, validatedURL, isMainFrame) => {
        if (!isMainFrame) return;
        if (!validatedURL.startsWith(DEV_URL)) return;
        if (!RECOVERABLE_ERRORS.has(errorCode)) return;
        if (retrying) return;
        retrying = true;
        console.log(
          `[dev-reload] ${errorDescription} (${errorCode}); retrying`,
        );
        const tryReload = () => {
          if (win.isDestroyed()) {
            retrying = false;
            return;
          }
          win.loadURL(DEV_URL).catch(() => {
            setTimeout(tryReload, 500);
          });
        };
        setTimeout(tryReload, 300);
      },
    );
    win.webContents.on("did-finish-load", () => {
      retrying = false;
    });
  } else {
    win.loadFile(
      path.join(__dirname, "..", "packages", "client", "out", "index.html"),
    );
  }
}

function installApplicationMenu(): void {
  if (process.platform !== "darwin") {
    Menu.setApplicationMenu(null);
    return;
  }
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [{ role: "minimize" }, { role: "close" }],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  installApplicationMenu();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
