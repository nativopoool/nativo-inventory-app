import AsyncStorage from '@react-native-async-storage/async-storage';

const LOG_KEY = 'MEBOT_DIAGNOSTIC_LOGS';
const MAX_LOGS = 50;

export const diagnostics = {
  log: async (message, data = null) => {
    const timestamp = new Date().toISOString();
    const entry = { timestamp, message, data, type: 'info' };
    console.log(`[Diagnostic]: ${message}`, data || '');
    await diagnostics._saveEntry(entry);
  },

  error: async (error, context = '') => {
    const timestamp = new Date().toISOString();
    const entry = { 
      timestamp, 
      message: error?.message || 'Unknown Error', 
      stack: error?.stack,
      context,
      type: 'error' 
    };
    console.error(`[Fatal]: ${context}`, error);
    await diagnostics._saveEntry(entry);
  },

  _saveEntry: async (entry) => {
    try {
      const existing = await AsyncStorage.getItem(LOG_KEY);
      let logs = existing ? JSON.parse(existing) : [];
      logs.unshift(entry);
      if (logs.length > MAX_LOGS) logs = logs.slice(0, MAX_LOGS);
      await AsyncStorage.setItem(LOG_KEY, JSON.stringify(logs));
    } catch (e) {
      console.error('Failed to save diagnostic log', e);
    }
  },

  getLogs: async () => {
    try {
      const logs = await AsyncStorage.getItem(LOG_KEY);
      return logs ? JSON.parse(logs) : [];
    } catch (e) {
      return [];
    }
  },

  clearLogs: async () => {
    await AsyncStorage.removeItem(LOG_KEY);
  }
};
