/// <reference types="vite/client" />

declare global {
  interface Window {
    __TAURI__?: {
      window?: {
        getCurrentWindow: () => {
          hide: () => Promise<void>;
          setIgnoreCursorEvents: (ignore: boolean) => Promise<void>;
          isVisible: () => Promise<boolean>;
        };
      };
    };
  }
}

export {};
