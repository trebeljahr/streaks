/*
 * Electron preload — exposes a narrow window.electronAPI to the renderer.
 *
 * Any renderer code that uses this API should guard against it being
 * undefined so the same build also runs in the browser / PWA:
 *   const api = (window as any).electronAPI;
 *   if (api?.isDesktop) { ... }
 */

import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  isDesktop: true,

  quit: (): Promise<void> => ipcRenderer.invoke("app:quit"),

  setFullscreen: (on: boolean): Promise<boolean> =>
    ipcRenderer.invoke("window:setFullscreen", on),
  isFullscreen: (): Promise<boolean> =>
    ipcRenderer.invoke("window:isFullscreen"),

  openExternal: (url: string): Promise<boolean> =>
    ipcRenderer.invoke("app:openExternal", url),
});
