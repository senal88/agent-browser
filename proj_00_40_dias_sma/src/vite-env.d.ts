/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID: string;
  readonly VITE_GOOGLE_API_KEY: string;
  readonly VITE_GOOGLE_DRIVE_SCOPES: string;
  readonly VITE_DEFAULT_FOLDER_NAME: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
