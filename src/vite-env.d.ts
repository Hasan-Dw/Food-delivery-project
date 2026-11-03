/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_API_TIMEOUT_MS?: string;
  readonly VITE_DATA_SOURCE?: 'mock' | 'http';
  readonly VITE_MAP_PROVIDER?: 'demo' | 'google' | 'mapbox';
  readonly VITE_MAP_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
