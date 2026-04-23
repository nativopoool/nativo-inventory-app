import React from 'react';
import { 
  View, Text, ScrollView, StyleSheet, 
  TouchableOpacity, Linking 
} from 'react-native';
import { BRAND, RADIUS, SPACING, SHADOWS } from '../constants/brand';
import Constants from 'expo-constants';

const APP_VERSION = Constants.expoConfig?.version || '1.0.0';

/**
 * StatCard — Shows a single KPI metric
 */
const StatCard = ({ icon, value, label, color = BRAND.primary }) => (
  <View style={[styles.statCard, { borderColor: color + '22' }]}>
    <View style={[styles.statIconWrap, { backgroundColor: color + '18' }]}>
      <Text style={styles.statIcon}>{icon}</Text>
    </View>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

/**
 * AboutScreen — App information, stats, and links
 * 
 * Props:
 *  - history: array (scan history items)
 *  - config: object (app config with apiUrl)
 *  - queueCount: number (pending offline items)
 *  - onSyncPress: function (trigger manual sync)
 *  - isSyncing: boolean (sync progress state)
 */
export const AboutScreen = ({ 
  history = [], 
  config = {}, 
  queueCount = 0, 
  onSyncPress, 
  isSyncing 
}) => {
  const totalScans = history.length;
  const uniqueSkus = new Set(history.map(h => h.sku)).size;
  const totalAdded = history.filter(h => h.action === 'add').reduce((acc, h) => acc + (h.qty || 0), 0);
  const totalRemoved = history.filter(h => h.action === 'subtract').reduce((acc, h) => acc + (h.qty || 0), 0);

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoEmoji}>🤖</Text>
        </View>
        <Text style={styles.appName}>MeBot Inventory</Text>
        <Text style={styles.version}>v{APP_VERSION}</Text>
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>⚡ Expo SDK 54</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>🛒 Vendure API</Text>
          </View>
        </View>
      </View>

      {/* Session Stats */}
      <Text style={styles.sectionTitle}>Estadísticas de Sesión</Text>
      <View style={styles.statsGrid}>
        <StatCard icon="📊" value={totalScans} label="Escaneos" color={BRAND.primary} />
        <StatCard icon="🏷️" value={uniqueSkus} label="SKUs únicos" color={BRAND.info} />
        <StatCard 
          icon="⏳" 
          value={queueCount} 
          label="Pendientes Sinc." 
          color={queueCount > 0 ? BRAND.warning : BRAND.muted} 
        />
        <StatCard icon="📥" value={totalAdded} label="Unidades OK" color={BRAND.success} />
      </View>

      {/* Connection Info */}
      <Text style={styles.sectionTitle}>Conexión Activa</Text>
      <View style={styles.infoCard}>
        <InfoRow icon="🌐" label="API" value={config.apiUrl || 'No configurada'} />
        <InfoRow icon="👤" label="Usuario" value={config.username || '—'} />
        <InfoRow icon="🗣️" label="Idioma" value={config.langCode || 'es'} />
        <InfoRow icon="🤖" label="IA Voz" value="Whisper Large v3 Turbo" />
        
        {queueCount > 0 && (
          <TouchableOpacity 
            style={styles.syncRow} 
            onPress={onSyncPress} 
            disabled={isSyncing}
          >
            <Text style={styles.syncBtnText}>
              {isSyncing ? '🔄 Sincronizando...' : `⬆️ Sincronizar ${queueCount} pendientes`}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Links */}
      <Text style={styles.sectionTitle}>Recursos</Text>
      <View style={styles.linksCard}>
        <LinkRow 
          icon="🌍" 
          label="Sitio Web" 
          value="mebot.online"
          onPress={() => Linking.openURL('https://mebot.online')}
        />
        <LinkRow 
          icon="📖" 
          label="Documentación"
          value="docs/ARCHITECTURE.md"
        />
        <LinkRow 
          icon="🤝" 
          label="Vendure Commerce"
          value="vendure.io"
          onPress={() => Linking.openURL('https://www.vendure.io')}
        />
      </View>

      {/* Footer */}
      <Text style={styles.footer}>
        Desarrollado con ❤️ por{'\n'}
        <Text style={{ color: BRAND.primary, fontWeight: '700' }}>Mebot.online</Text>
      </Text>
    </ScrollView>
  );
};

const InfoRow = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoIcon}>{icon}</Text>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
  </View>
);

const LinkRow = ({ icon, label, value, onPress }) => (
  <TouchableOpacity style={styles.infoRow} onPress={onPress} activeOpacity={0.7}>
    <Text style={styles.infoIcon}>{icon}</Text>
    <View style={{ flex: 1 }}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, onPress && styles.link]}>{value}</Text>
    </View>
    {onPress && <Text style={styles.chevron}>›</Text>}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND.bg,
  },
  content: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },

  // Hero
  hero: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    marginBottom: SPACING.sm,
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: RADIUS.full,
    backgroundColor: BRAND.primaryGlow,
    borderWidth: 2,
    borderColor: BRAND.primary + '55',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    ...SHADOWS.primary,
  },
  logoEmoji: {
    fontSize: 44,
  },
  appName: {
    color: BRAND.text,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  version: {
    color: BRAND.muted,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    backgroundColor: BRAND.surfaceHigh,
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: BRAND.cardBorder,
  },
  badgeText: {
    color: BRAND.textSub,
    fontSize: 11,
    fontWeight: '600',
  },

  // Section
  sectionTitle: {
    color: BRAND.muted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 10,
    marginTop: 20,
    paddingHorizontal: 4,
  },

  // Stats
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: BRAND.surfaceHigh,
    borderRadius: RADIUS.lg,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BRAND.cardBorder,
    ...SHADOWS.sm,
  },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statIcon: { fontSize: 20 },
  statValue: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -1,
  },
  statLabel: {
    color: BRAND.muted,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },

  // Info & Links
  infoCard: {
    backgroundColor: BRAND.surfaceHigh,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BRAND.cardBorder,
    ...SHADOWS.sm,
  },
  linksCard: {
    backgroundColor: BRAND.surfaceHigh,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BRAND.cardBorder,
    ...SHADOWS.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.cardBorder,
  },
  syncRow: {
    backgroundColor: BRAND.primary + '11',
    padding: 16,
    alignItems: 'center',
  },
  syncBtnText: {
    color: BRAND.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  infoIcon: { fontSize: 18, marginRight: 12 },
  infoLabel: {
    color: BRAND.muted,
    fontSize: 12,
    fontWeight: '600',
    width: 80,
  },
  infoValue: {
    flex: 1,
    color: BRAND.textSub,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'right',
  },
  link: {
    color: BRAND.primary,
  },
  chevron: {
    color: BRAND.muted,
    fontSize: 20,
    marginLeft: 8,
  },

  // Footer
  footer: {
    textAlign: 'center',
    color: BRAND.muted,
    fontSize: 13,
    marginTop: 32,
    lineHeight: 20,
  },
});
