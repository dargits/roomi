export const STORAGE_KEYS = {
  TOKEN: 'staygo_token',
  REMEMBER_ME: 'staygo_remember_me',
  SIDEBAR_COLLAPSED: 'staygo_sidebar_collapsed',
  APP_CONFIG: 'staygo_app_config',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];
