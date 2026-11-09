/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** full game-server URL for split deploys, e.g. https://play-api.example.com */
  readonly VITE_SERVER_URL?: string;
  /** game-server host (Render `fromService` host); `.onrender.com` is appended to dot-less hosts */
  readonly VITE_SERVER_HOST?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
