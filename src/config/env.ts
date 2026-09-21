export function resolveAppEnv(hostname: string, buildEnv: string) {
  if (hostname.includes('-tst-')) return 'test'
  if (hostname.includes('-dev-')) return 'development'
  return buildEnv
}

export const env = {
  apiBaseUrl: '/api',
  appEnv: resolveAppEnv(typeof window === 'undefined' ? '' : window.location.hostname, import.meta.env.VITE_APP_ENV ?? 'local'),
}
