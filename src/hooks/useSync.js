import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../utils/sqlite';
import { 
  updateStockMutation, 
  createProductMutation, 
  createVariantMutation 
} from '../api/vendureClient';

/**
 * useSync — Manages the offline mutation queue
 * 
 * @param authToken - Current Vendure token
 * @param config    - App config (apiUrl, langCode)
 * @param showToast - Toast callback for sync results
 */
export const useSync = (authToken, config, showToast) => {
  const [queueCount, setQueueCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load current queue size
  const refreshQueueCount = useCallback(() => {
    try {
      const result = getDb().getFirstSync('SELECT COUNT(*) as count FROM sync_queue');
      setQueueCount(result?.count || 0);
    } catch (e) {
      console.error('Error refreshing sync queue count:', e);
    }
  }, []);

  // Add to queue
  const addToQueue = useCallback((operation, payload) => {
    try {
      getDb().runSync(
        'INSERT INTO sync_queue (operation, payload, timestamp) VALUES (?, ?, ?)',
        [operation, JSON.stringify(payload), new Date().toISOString()]
      );
      refreshQueueCount();
      if (showToast) showToast({ type: 'warning', message: 'Guardado en cola offline' });
    } catch (e) {
      console.error('Error adding to sync queue:', e);
    }
  }, [refreshQueueCount, showToast]);

  // Process the queue
  const processQueue = useCallback(async () => {
    if (isSyncing || !authToken) return;
    
    // Get pending items
    let items = [];
    try {
      items = getDb().getAllSync('SELECT * FROM sync_queue ORDER BY timestamp ASC LIMIT 5');
    } catch (e) {
      console.error('Error fetching sync queue:', e);
      return;
    }

    if (items.length === 0) return;

    setIsSyncing(true);
    let successCount = 0;

    for (const item of items) {
      const payload = JSON.parse(item.payload);
      let success = false;

      try {
        if (item.operation === 'UPDATE_STOCK') {
          const { variantId, newStock } = payload;
          const { json } = await updateStockMutation(config.apiUrl, authToken, variantId, newStock);
          if (json.data) success = true;
        } 
        else if (item.operation === 'CREATE_PRODUCT') {
          const { name, sku, price, stock, langCode } = payload;
          
          // Step 1: Create Product
          const { json: pj } = await createProductMutation(config.apiUrl, authToken, name, langCode);
          if (pj.data?.createProduct?.id) {
            const productId = pj.data.createProduct.id;
            
            // Step 2: Create Variant
            const variantInput = {
              productId,
              sku,
              price: parseInt(price, 10) * 100,
              stockOnHand: parseInt(stock, 10),
              translations: [{ languageCode: langCode, name }],
            };
            
            const { json: vj } = await createVariantMutation(config.apiUrl, authToken, variantInput);
            if (vj.data?.createProductVariants) success = true;
          }
        }

        if (success) {
          getDb().runSync('DELETE FROM sync_queue WHERE id = ?', [item.id]);
          successCount++;
        }
      } catch (e) {
        console.error(`Sync error for item ${item.id}:`, e);
        getDb().runSync(
          'UPDATE sync_queue SET retries = retries + 1, lastError = ? WHERE id = ?',
          [e.message, item.id]
        );
      }
    }

    setIsSyncing(false);
    refreshQueueCount();

    if (successCount > 0 && showToast) {
      showToast({ type: 'success', message: `Sincronizados ${successCount} cambios.` });
    }
  }, [authToken, config, isSyncing, refreshQueueCount, showToast]);

  // Auto-sync every 60 seconds if there are items
  useEffect(() => {
    refreshQueueCount();
    const interval = setInterval(() => {
      if (queueCount > 0) processQueue();
    }, 60000);
    return () => clearInterval(interval);
  }, [queueCount, processQueue, refreshQueueCount]);

  return {
    queueCount,
    isSyncing,
    addToQueue,
    processQueue,
    refreshQueueCount
  };
};
