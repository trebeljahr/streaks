/*
 * Electron main process for the Next.js starter.
 *
 * Dev: loads the Next.js dev server at http://localhost:3000.
 * Production: loads packages/client/out/index.html via file://.
 *   (Requires `output: "export"` in packages/client/next.config.ts.)
 */

import { app, BrowserWindow, ipcMain, Menu, shell, type IpcMainInvokeEvent } from "electron";
import path from "path";
import { fileURLToPath } from "node:url";
import fs from "fs";

const isDev = !app.isPackaged;
const DEV_URL = process.env.ELECTRON_DEV_URL || "http://localhost:7834";
const EXPORT_ROOT = path.resolve(__dirname, "..", "packages", "client", "out");

const IPC_ARGUMENTS: Record<string, (args: unknown[]) => boolean> = {
  "app:quit": (args) => args.length === 0,
  "window:isFullscreen": (args) => args.length === 0,
  "window:setFullscreen": (args) => args.length === 1 && typeof args[0] === "boolean",
  "app:openExternal": (args) => args.length === 1 && isWebUrl(args[0]),
};

// Trust is pinned to the launch target, never to the page currently displayed.
let mainWindow: BrowserWindow | null = null;

function isWebUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 4096 ||
      value.trim() !== value || /[\u0000-\u001f\u007f]/.test(value)) return false;
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") &&
      !url.username && !url.password;
  } catch {
    return false;
  }
}

function isApplicationUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (isDev) {
      return isWebUrl(value) && isWebUrl(DEV_URL) &&
        url.origin === new URL(DEV_URL).origin;
    }
    if (url.protocol !== "file:" || url.host || url.username || url.password) return false;
    const target = fileURLToPath(url);
    const relative = path.relative(EXPORT_ROOT, target);
    return relative !== "" && !relative.startsWith(`..${path.sep}`) &&
      relative !== ".." && !path.isAbsolute(relative) && path.extname(target) === ".html";
  } catch {
    return false;
  }
}

// All native handlers use this gate before touching preferences or native APIs.
function handle<Args extends unknown[], Result>(
  channel: string,
  handler: (event: IpcMainInvokeEvent, ...args: Args) => Result,
): void {
  ipcMain.handle(channel, (event, ...args: unknown[]) => {
    const win = mainWindow;
    const frame = event.senderFrame;
    if (!win || win.isDestroyed() || event.sender !== win.webContents ||
        !frame || frame !== win.webContents.mainFrame ||
        !isApplicationUrl(frame.url)) {
      throw new Error("Untrusted native bridge sender");
    }
    const validate = IPC_ARGUMENTS[channel];
    if (!validate || !validate(args)) throw new TypeError("Invalid native bridge arguments");
    return handler(event, ...(args as Args));
  });
}

function secureWindow(win: BrowserWindow): void {
  mainWindow = win;
  win.on("closed", () => {
    if (mainWindow === win) mainWindow = null;
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!isApplicationUrl(url) && isWebUrl(url)) {
      void shell.openExternal(url).catch(() => {});
    }
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (isApplicationUrl(url)) return;
    event.preventDefault();
    if (isWebUrl(url)) void shell.openExternal(url).catch(() => {});
  });
  win.webContents.on("will-redirect", (event, url) => {
    if (!isApplicationUrl(url)) event.preventDefault();
  });
  win.webContents.on("will-attach-webview", (event) => event.preventDefault());
}

handle("app:quit", () => {
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

handle(
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

handle("window:isFullscreen", (evt) => {
  const win = BrowserWindow.fromWebContents(evt.sender);
  if (!win || win.isDestroyed()) return false;
  return process.platform === "darwin"
    ? win.isSimpleFullScreen()
    : win.isFullScreen();
});

handle("app:openExternal", async (_evt, url: string) => {
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
      sandbox: true,
      webviewTag: false,
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

  secureWindow(win);

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
        if (!isApplicationUrl(validatedURL)) return;
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
