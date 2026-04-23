import { useCallback } from 'react';
import { getDb } from '../utils/sqlite';
import { logger } from '../utils/logger';

/**
 * useCache Hook
 * Manages local persistence of product metadata for offline lookups.
 */
export const useCache = () => {
  
  /**
   * Upsert a product into the cache
   * @param {Object} product - { id, sku, name, price, stock }
   */
  const upsertProduct = useCallback((product) => {
    const { id, sku, name, price, stock } = product;
    const lastUpdated = new Date().toISOString();
    
    try {
      getDb().runSync(
        `INSERT OR REPLACE INTO products_cache (id, sku, name, price, stock, lastUpdated)
         VALUES (?, ?, ?, ?, ?, ?);`,
        [id, sku, name, price, stock, lastUpdated]
      );
    } catch (e) {
      logger.error('SQL Cache Error (upsert):', e);
    }
  }, []);

  /**
   * Retrieve a product from the cache by SKU
   * @param {string} sku 
   * @returns {Object|null}
   */
  const getProductBySku = useCallback((sku) => {
    try {
      const row = getDb().getFirstSync(
        'SELECT * FROM products_cache WHERE sku = ? LIMIT 1;',
        [sku]
      );
      return row || null;
    } catch (e) {
      logger.error('SQL Cache Error (get):', e);
      return null;
    }
  }, []);

  /**
   * Clear the entire cache
   */
  const clearCache = useCallback(() => {
    try {
      getDb().runSync('DELETE FROM products_cache;');
    } catch (e) {
      logger.error('SQL Cache Error (clear):', e);
    }
  }, []);

  return { upsertProduct, getProductBySku, clearCache };
};
