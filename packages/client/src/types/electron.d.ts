/*
 * Type definitions for the Electron preload bridge.
 *
 * The preload script in electron/preload.ts exposes window.electronAPI
 * with these methods. Guard every usage — the same build also runs in
 * the browser / PWA where window.electronAPI is undefined.
 */

export interface ElectronAPI {
  isDesktop: true;
  quit: () => Promise<void>;
  setFullscreen: (on: boolean) => Promise<boolean>;
  isFullscreen: () => Promise<boolean>;
  openExternal: (url: string) => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
