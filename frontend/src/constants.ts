/** constants — the only module reading import.meta.env. */
export const CONSTANTS = {
  API_BASE: (import.meta.env.VITE_API_BASE as string | undefined) ?? '/api',
  WS_PATH: '/ws',
  APP_NAME: 'Looper CRM',
} as const
