import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { BRAND, RADIUS, SHADOWS } from '../constants/brand';

const TABS = [
  { id: 'scanner',  label: 'Escanear', icon: '📷' },
  { id: 'products', label: 'Productos', icon: '📦' },
  { id: 'history',  label: 'Historial', icon: '📋' },
  { id: 'about',    label: 'Acerca de', icon: 'ℹ️' },
  { id: 'settings', label: 'Config',    icon: '⚙️' },
];

/**
 * TabBar — Custom bottom navigation bar (no react-navigation dependency)
 *
 * Props:
 *  - activeTab: string (tab id)
 *  - onTabPress: function (tabId: string) => void
 */
export const TabBar = ({ activeTab, onTabPress }) => {
  return (
    <View style={styles.container}>
      <View style={styles.bar}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tabBtn}
              onPress={() => onTabPress(tab.id)}
              activeOpacity={0.7}
            >
              {/* Active indicator pill */}
              {isActive && <View style={styles.activePill} />}
              
              <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
                <Text style={[styles.icon, isActive && styles.iconActive]}>
                  {tab.icon}
                </Text>
              </View>
              <Text style={[styles.label, isActive && styles.labelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    paddingTop: 8,
    backgroundColor: BRAND.surface,
    borderTopWidth: 1,
    borderTopColor: BRAND.cardBorder,
    ...SHADOWS.sm,
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: BRAND.surfaceHigh,
    borderRadius: RADIUS.xl,
    padding: 6,
    borderWidth: 1,
    borderColor: BRAND.cardBorder,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 4,
    position: 'relative',
  },
  activePill: {
    position: 'absolute',
    top: 0,
    left: 8,
    right: 8,
    bottom: 0,
    backgroundColor: BRAND.primaryGlow,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: BRAND.primary + '33',
  },
  iconWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.sm,
  },
  iconWrapActive: {
    // No extra style needed, pill handles bg
  },
  icon: {
    fontSize: 20,
    opacity: 0.5,
  },
  iconActive: {
    opacity: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: BRAND.muted,
    letterSpacing: 0.3,
  },
  labelActive: {
    color: BRAND.primaryLight,
    fontWeight: '800',
  },
});
