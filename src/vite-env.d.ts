/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_API_TIMEOUT_MS?: string;
  readonly VITE_ALLOWED_HOSTS?: string;
  readonly VITE_LIVE_TRACKING?: string;
  readonly VITE_MAP_PROVIDER?: 'preview' | 'google' | 'mapbox';
  readonly VITE_MAP_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
