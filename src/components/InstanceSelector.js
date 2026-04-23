import React from 'react';
import { 
  StyleSheet, View, Text, TouchableOpacity, 
  ScrollView, Animated, Dimensions 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BRAND, RADIUS, SHADOWS } from '../constants/brand';
import { MeButton } from './MeButton';

const { width } = Dimensions.get('window');

export const InstanceSelector = ({ instances, onSelect, onCancel, t }) => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.card}>
        <Text style={styles.title}>📍 {t('select_instance') || 'Selecciona tu Instancia'}</Text>
        <Text style={styles.subtitle}>
          {t('multiple_instances_found') || 'Hemos encontrado varias configuraciones asociadas a tu cuenta.'}
        </Text>

        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {instances.map((item, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.item}
              onPress={() => onSelect(item)}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
                style={styles.itemInner}
              >
                <View style={styles.itemHeader}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>ERP</Text>
                  </View>
                </View>
                <Text style={styles.itemUrl} numberOfLines={1}>
                  {item.apiUrl.replace('https://', '').replace('/admin-api', '')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <MeButton 
          title={t('cancel') || 'Cancelar'} 
          onPress={onCancel}
          type="ghost"
          style={styles.cancelBtn}
        />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(2, 6, 23, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 100,
  },
  card: {
    backgroundColor: BRAND.surface,
    borderRadius: RADIUS.lg,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    ...SHADOWS.md,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: BRAND.textSub,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  list: {
    marginBottom: 20,
  },
  item: {
    marginBottom: 12,
  },
  itemInner: {
    padding: 16,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: BRAND.primaryLight,
  },
  badge: {
    backgroundColor: BRAND.primaryGlow,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: BRAND.primary,
  },
  itemUrl: {
    fontSize: 12,
    color: BRAND.muted,
  },
  cancelBtn: {
    marginTop: 10,
  }
});
