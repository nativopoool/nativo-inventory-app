import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, 
  ActivityIndicator, TouchableOpacity 
} from 'react-native';
import { MeInput } from '../components/MeInput';
import { MePicker } from '../components/MePicker';
import { BRAND, RADIUS, SHADOWS } from '../constants/brand';
import { searchProductsQuery, getStockLocationsQuery } from '../api/vendureClient';

export const ProductsScreen = ({ authToken, config, t }) => {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null);

  // Fetch locations on mount
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const { json } = await getStockLocationsQuery(config.apiUrl, authToken);
        if (json?.data?.stockLocations?.items) {
          const locs = json.data.stockLocations.items.map(l => ({
            label: l.name,
            value: l.id
          }));
          setLocations([{ label: t('all_warehouses'), value: null }, ...locs]);
        }
      } catch (e) {
        console.error('Error fetching locations', e);
      }
    };
    if (authToken) fetchLocations();
  }, [authToken, config.apiUrl]);

  const fetchProducts = useCallback(async (term = '', locId = null) => {
    setLoading(true);
    try {
      const { json } = await searchProductsQuery(config.apiUrl, authToken, term, locId);
      if (json?.data?.search?.items) {
        setProducts(json.data.search.items);
      }
    } catch (e) {
      console.error('Error searching products', e);
    } finally {
      setLoading(false);
    }
  }, [authToken, config.apiUrl]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts(searchQuery, selectedLocation);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedLocation, fetchProducts]);

  const renderProduct = ({ item }) => {
    const priceValue = item.priceWithTax?.value || item.priceWithTax?.min || 0;
    const priceDisplay = (priceValue / 100).toLocaleString('es-CO', { 
      style: 'currency', 
      currency: item.currencyCode || 'COP',
      maximumFractionDigits: 0
    });

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.productName} numberOfLines={1}>{item.productName}</Text>
          <Text style={styles.price}>{priceDisplay}</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.sku}>SKU: {item.sku}</Text>
          <View style={[
            styles.stockBadge, 
            item.stockLevel === 'IN_STOCK' ? styles.stockOk : styles.stockLow
          ]}>
            <Text style={styles.stockText}>
              {item.stockLevel === 'IN_STOCK' ? 'En Stock' : 'Bajo Stock'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        <MeInput 
          placeholder={t('search_products')}
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon="🔍"
        />
        <MePicker 
          label={t('warehouse_filter')}
          value={selectedLocation}
          options={locations}
          onSelect={setSelectedLocation}
        />
      </View>

      {loading && products.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={BRAND.primary} />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.productVariantId}
          renderItem={renderProduct}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No se encontraron productos</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BRAND.bg },
  filterContainer: { padding: 16, backgroundColor: BRAND.surface, borderBottomWidth: 1, borderBottomColor: BRAND.cardBorder },
  list: { padding: 16, paddingBottom: 100 },
  card: {
    backgroundColor: BRAND.surfaceHigh,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BRAND.cardBorder,
    ...SHADOWS.sm,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  productName: { color: BRAND.text, fontSize: 16, fontWeight: '700', flex: 1, marginRight: 8 },
  price: { color: BRAND.primaryLight, fontSize: 16, fontWeight: '800' },
  cardBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sku: { color: BRAND.muted, fontSize: 13, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  stockBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.sm },
  stockOk: { backgroundColor: 'rgba(0, 200, 83, 0.15)' },
  stockLow: { backgroundColor: 'rgba(255, 61, 0, 0.15)' },
  stockText: { fontSize: 11, fontWeight: '700', color: BRAND.text },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: BRAND.muted, fontSize: 16 },
});
