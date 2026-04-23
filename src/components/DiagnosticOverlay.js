import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BRAND, SAFE_AREA } from '../constants/brand';

export const DiagnosticOverlay = ({ logs, onRetry, onClear }) => {
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#1a0000', '#000000']} style={styles.gradient}>
        <View style={styles.header}>
          <Text style={styles.title}>⚠️ Error en el Sistema</Text>
          <Text style={styles.subtitle}>Falló el arranque de MeBot. Revisa los detalles abajo:</Text>
        </View>

        <ScrollView style={styles.logContainer}>
          {logs.length === 0 ? (
            <Text style={styles.emptyText}>No hay registros de error disponibles.</Text>
          ) : (
            logs.map((log, i) => (
              <View key={i} style={styles.logEntry}>
                <Text style={styles.logTime}>{new Date(log.timestamp).toLocaleTimeString()}</Text>
                <Text style={[styles.logMsg, log.type === 'error' && styles.logError]}>
                  {log.context ? `[${log.context}] ` : ''}{log.message}
                </Text>
                {log.stack && (
                  <Text style={styles.logStack}>{log.stack.substring(0, 300)}...</Text>
                )}
              </View>
            ))
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
            <Text style={styles.btnText}>Intentar de Nuevo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.clearBtn} onPress={onClear}>
            <Text style={styles.btnTextSecondary}>Limpiar Logs</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#000',
    paddingTop: (SAFE_AREA?.top || 24),
  },
  gradient: { flex: 1, padding: 20 },
  header: { marginBottom: 20 },
  title: { color: BRAND.danger, fontSize: 24, fontWeight: 'bold' },
  subtitle: { color: '#ccc', fontSize: 14, marginTop: 8 },
  logContainer: { flex: 1, backgroundColor: '#0a0a0a', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#333' },
  emptyText: { color: '#666', fontStyle: 'italic', textAlign: 'center', marginTop: 20 },
  logEntry: { marginBottom: 15, borderBottomWidth: 0.5, borderBottomColor: '#222', paddingBottom: 10 },
  logTime: { color: '#555', fontSize: 10, marginBottom: 2 },
  logMsg: { color: '#fff', fontSize: 13, fontWeight: '600' },
  logError: { color: BRAND.danger },
  logStack: { color: '#777', fontSize: 10, marginTop: 5, fontFamily: 'monospace' },
  footer: { marginTop: 20, gap: 10 },
  retryBtn: { backgroundColor: BRAND.primary, padding: 15, borderRadius: 8, alignItems: 'center' },
  clearBtn: { padding: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  btnTextSecondary: { color: '#888', fontSize: 14 }
});
