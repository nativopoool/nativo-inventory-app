import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { getDb } from '../utils/sqlite';

export const useHistory = () => {
  const [history, setHistory] = useState([]);

  const loadHistory = useCallback(() => {
    try {
      const allRows = getDb().getAllSync('SELECT * FROM scans ORDER BY id DESC LIMIT 500');
      const formatted = allRows.map(r => ({
        id: r.id, 
        date: r.timestamp, 
        mode: r.mode, 
        icon: r.icon,
        sku: r.sku, 
        name: r.name, 
        stockBefore: r.stockBefore, 
        stockAfter: r.stockAfter,
        qty: r.qty, 
        action: r.action,
        price: r.price
      }));
      setHistory(formatted);
    } catch (e) {
      console.error('SQLite load error:', e);
    }
  }, []);

  // Initialize DB and load history on first mount
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const addHistory = useCallback((entry) => {
    try {
      getDb().runSync(
        `INSERT INTO scans (timestamp, mode, icon, sku, name, stockBefore, stockAfter, qty, action, price)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [entry.date, entry.mode, entry.icon, entry.sku, entry.name, entry.stockBefore, entry.stockAfter, entry.qty, entry.action, entry.price]
      );
      loadHistory();
    } catch (e) {
      console.error('SQLite insert error:', e);
    }
  }, [loadHistory]);

  const clearHistory = useCallback(() => {
    Alert.alert('Borrar Historial', '¿Eliminar TODOS los registros localmente?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Borrar', style: 'destructive', onPress: () => {
        try {
          getDb().execSync('DELETE FROM scans;');
          setHistory([]);
        } catch(e) {
          console.error('SQLite delete error', e);
        }
      }},
    ]);
  }, []);

  return { history, loadHistory, addHistory, clearHistory };
};
