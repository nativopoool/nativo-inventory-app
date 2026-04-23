import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { BRAND, RADIUS, SHADOWS } from '../constants/brand';

/**
 * Header — App-wide top navigation bar
 * 
 * Props:
 *  - title: string (required)
 *  - showActions: boolean (show history and settings buttons)
 *  - onHistoryPress: function
 *  - onSettingsPress: function
 *  - subtitle: string (optional, overrides 'mebot.online')
 */
export const Header = ({ 
  title, 
  showActions = true, 
  onHistoryPress,
  onSettingsPress,
  subtitle,
}) => {
  return (
    <View style={styles.header}>
      {/* Left: Brand */}
      <View style={styles.left}>
        <View style={styles.logoWrap}>
          <Text style={styles.logo}>🤖</Text>
        </View>
        <View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.sub}>{subtitle || 'mebot.online'}</Text>
        </View>
      </View>

      {/* Right: Actions */}
      {showActions && (
        <View style={styles.right}>
          <ActionBtn icon="📋" onPress={onHistoryPress} />
          <ActionBtn icon="⚙️" onPress={onSettingsPress} />
        </View>
      )}
    </View>
  );
};

const ActionBtn = ({ icon, onPress }) => (
  <TouchableOpacity style={styles.actionBtn} onPress={onPress} activeOpacity={0.7}>
    <Text style={styles.actionIcon}>{icon}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: 'rgba(8, 15, 30, 0.92)',
    borderBottomWidth: 1,
    borderBottomColor: BRAND.cardBorder,
    // Glassmorphism on supported platforms
    ...Platform.select({
      ios: { backdropFilter: 'blur(20px)' },
    }),
    ...SHADOWS.sm,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoWrap: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: BRAND.primaryGlow,
    borderWidth: 1,
    borderColor: BRAND.primary + '44',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontSize: 22,
  },
  title: {
    color: BRAND.text,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sub: {
    color: BRAND.primary,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    opacity: 0.8,
  },
  right: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
    backgroundColor: BRAND.surfaceHigh,
    borderWidth: 1,
    borderColor: BRAND.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: {
    fontSize: 18,
  },
});
