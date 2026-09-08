export const env = {
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/+$/, ''),
  appEnv: import.meta.env.VITE_APP_ENV ?? 'local',
}
