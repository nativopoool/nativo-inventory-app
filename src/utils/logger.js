/**
 * Logger utility — filters logs based on environment
 */
const isDev = __DEV__;

export const logger = {
  log: (...args) => {
    if (isDev) console.log('[LOG]:', ...args);
  },
  warn: (...args) => {
    if (isDev) console.warn('[WARN]:', ...args);
  },
  error: (...args) => {
    // We might want to report errors even in production (e.g. to Sentry)
    // For now, we keep console.error but with a tag
    console.error('[ERROR]:', ...args);
  },
  info: (...args) => {
    if (isDev) console.info('[INFO]:', ...args);
  }
};
