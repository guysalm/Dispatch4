/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_GOOGLE_PLACES_API_KEY: string
  readonly VITE_WHATSAPP_API_TOKEN: string
  readonly VITE_EMAIL_SERVICE_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}