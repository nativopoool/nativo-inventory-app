// Default config values
// Use environment variables or fallback to these defaults.
// In Phase 1, we avoid hardcoding the real password here for security.

export const DEFAULTS = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://bot2market.mebot.online/admin-api',
  username: process.env.EXPO_PUBLIC_USERNAME || 'superadmin',
  password: process.env.EXPO_PUBLIC_PASSWORD || '', // Leave empty to force env or setup
  langCode: process.env.EXPO_PUBLIC_LANG_CODE || 'es',
  hfToken: process.env.EXPO_PUBLIC_HF_TOKEN || '', 
};
