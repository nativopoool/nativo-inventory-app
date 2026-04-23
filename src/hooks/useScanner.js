import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { 
  searchBySkuQuery, 
  updateStockMutation, 
  createProductMutation, 
  createVariantMutation 
} from '../api/vendureClient';

/**
 * useScanner — manages barcode scan lifecycle and product creation
 * 
 * @param authToken   - Vendure auth token
 * @param config      - App config (apiUrl, langCode, etc.)
 * @param currentMode - Active scan mode (add/subtract/query)
 * @param stockToUpdate - Quantity string
 * @param addHistory  - Callback to persist entry to SQLite
 * @param showToast   - (optional) Toast callback for non-blocking feedback
 * @param addToSyncQueue - (optional) Callback to queue mutations offline
 * @param reAuth      - (optional) Callback to trigger re-authentication
 */
export const useScanner = (authToken, config, currentMode, stockToUpdate, addHistory, showToast, addToSyncQueue, reAuth) => {
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Product Creation State
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductSku, setNewProductSku] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('0');
  
  // Dynamic Forms State
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [activeFormCode, setActiveFormCode] = useState(null);
  const [activeTargetId, setActiveTargetId] = useState(null);

  const notify = useCallback((type, message) => {
    if (showToast) {
      showToast({ type, message });
    } else {
      if (type === 'error') Alert.alert('Error', message);
    }
  }, [showToast]);

  const handleBarCodeScanned = useCallback(async ({ data }) => {
    if (scanned) return;
    setScanned(true);
    setLoading(true);

    try {
      if (!authToken) {
        if (reAuth) reAuth();
        throw new Error('No autenticado. Re-intentando...');
      }

      // 1. Search (Requires Connection)
      let variants;
      try {
        const { json } = await searchBySkuQuery(config.apiUrl, authToken, data);
        variants = json?.data?.productVariants?.items;
      } catch (err) {
        if (err.message.includes('401') && reAuth) {
          reAuth();
          notify('warning', 'Sesión expirada. Re-conectando...');
        }
        throw new Error(`Error de red al buscar SKU: ${err.message}`);
      }

      if (!variants || variants.length === 0) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setLoading(false);

        if (currentMode.action !== 'query') {
          Alert.alert('SKU No Encontrado', `El SKU "${data}" no existe.\n¿Deseas crear un nuevo producto?`, [
            { text: 'Cancelar', onPress: () => setScanned(false), style: 'cancel' },
            {
              text: 'Crear Producto',
              onPress: () => {
                setNewProductSku(data);
                setNewProductName(`Producto ${data}`);
                setIsCreatingProduct(true);
              },
            },
          ]);
        } else {
          notify('warning', `SKU "${data}" no existe`);
          setScanned(false);
        }
        return;
      }

      const v = variants[0];

      if (currentMode.action === 'query') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        addHistory({
          date: new Date().toISOString(), mode: currentMode.label, icon: currentMode.icon,
          sku: v.sku, name: v.name, stockBefore: v.stockOnHand, stockAfter: v.stockOnHand, 
          qty: 0, action: 'query', price: v.price / 100,
        });
        notify('scan', `${v.name} — Stock: ${v.stockOnHand}`);
        setScanned(false);
      } else {
        const qty = parseInt(stockToUpdate, 10);
        if (isNaN(qty) || qty < 0) { 
          notify('error', 'Cantidad inválida');
          setLoading(false);
          setScanned(false);
          return; 
        }

        let newStock;
        if (currentMode.action === 'add') {
          newStock = v.stockOnHand + qty;
        } else {
          newStock = v.stockOnHand - qty;
          if (newStock < 0) {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            notify('error', `Stock insuficiente: ${v.stockOnHand} disponibles`);
            setLoading(false);
            setScanned(false);
            return;
          }
        }

        // 2. Update (Fallback to Queue if fails)
        try {
          const { json: uj } = await updateStockMutation(config.apiUrl, authToken, v.id, newStock);
          if (uj.errors) throw new Error(uj.errors[0].message);

          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          notify('success', `${currentMode.icon} ${v.name} → ${newStock} ud.`);
        } catch (apiErr) {
          console.log('Update failed, queueing offline:', apiErr.message);
          
          if (addToSyncQueue) {
            addToSyncQueue('UPDATE_STOCK', { 
              variantId: v.id, 
              newStock, 
              name: v.name, 
              sku: v.sku 
            });
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            notify('warning', `Sin conexión. Cambios guardados para sincronizar.`);
          } else {
            throw apiErr;
          }
        }
        
        // Always add to history (local)
        addHistory({
          date: new Date().toISOString(), mode: currentMode.label, icon: currentMode.icon,
          sku: v.sku, name: v.name, stockBefore: v.stockOnHand, stockAfter: newStock, 
          qty, action: currentMode.action, price: v.price / 100,
        });
        setScanned(false);
      }
    } catch (e) {
      console.error('Scan error:', e);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      notify('error', e.message);
      setScanned(false);
    } finally {
      setLoading(false);
    }
  }, [scanned, authToken, config, currentMode, stockToUpdate, addHistory, notify, addToSyncQueue]);

  const createProduct = useCallback(async () => {
    setLoading(true);
    try {
      const { json: pj } = await createProductMutation(config.apiUrl, authToken, newProductName, config.langCode);
      if (pj.errors) throw new Error(pj.errors[0].message);
      
      const productId = pj.data.createProduct.id;

      const variantInput = {
        productId,
        sku: newProductSku,
        price: parseInt(newProductPrice, 10) * 100,
        stockOnHand: parseInt(stockToUpdate, 10),
        translations: [{ languageCode: config.langCode, name: newProductName }],
      };

      const { json: vj } = await createVariantMutation(config.apiUrl, authToken, variantInput);
      if (vj.errors) throw new Error(vj.errors[0].message);

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      notify('success', `✅ "${newProductName}" creado exitosamente`);
      
      addHistory({
        date: new Date().toISOString(), mode: 'Creación', icon: '🆕',
        sku: newProductSku, name: newProductName, stockBefore: 0, 
        stockAfter: parseInt(stockToUpdate, 10), qty: parseInt(stockToUpdate, 10), 
        action: 'create', price: parseFloat(newProductPrice),
      });
      setIsCreatingProduct(false);
      setScanned(false);
    } catch (e) {
      console.error('Create error:', e);
      
      // Fallback for offline product creation
      if (addToSyncQueue) {
        addToSyncQueue('CREATE_PRODUCT', {
          name: newProductName,
          sku: newProductSku,
          price: newProductPrice,
          stock: stockToUpdate,
          langCode: config.langCode
        });
        
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        notify('warning', `Sin conexión. Producto en cola para creación.`);
        
        addHistory({
          date: new Date().toISOString(), mode: 'Creación (Offline)', icon: '⏳',
          sku: newProductSku, name: newProductName, stockBefore: 0, 
          stockAfter: parseInt(stockToUpdate, 10), qty: parseInt(stockToUpdate, 10), 
          action: 'create', price: parseFloat(newProductPrice),
        });
        setIsCreatingProduct(false);
        setScanned(false);
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        notify('error', e.message);
      }
    } finally {
      setLoading(false);
    }
  }, [config, authToken, newProductName, newProductSku, newProductPrice, stockToUpdate, addHistory, notify, addToSyncQueue]);

  const openForm = (code, targetId) => {
    setActiveFormCode(code);
    setActiveTargetId(targetId);
    setScanned(true); // Stop camera
    setIsFormVisible(true);
  };

  return {
    scanned, setScanned,
    loading, setLoading,
    isCreatingProduct, setIsCreatingProduct,
    newProductName, setNewProductName,
    newProductSku, setNewProductSku,
    newProductPrice, setNewProductPrice,
    isFormVisible, setIsFormVisible,
    activeFormCode, activeTargetId,
    handleBarCodeScanned,
    createProduct,
    openForm
  };
};
