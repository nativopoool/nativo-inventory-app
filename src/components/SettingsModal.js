import React from 'react';
import { Modal, View, Text, ScrollView, TextInput, StyleSheet } from 'react-native';
import { BRAND } from '../constants/brand';
import { MeButton } from './MeButton';

export const SettingsModal = ({ 
  visible, 
  config, 
  onCancel, 
  onSave, 
  onLogout,
  onChangeField 
}) => {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>⚙️ Configuración</Text>

            <Text style={styles.label}>URL Admin API</Text>
            <TextInput 
              style={styles.input}
              value={config.apiUrl}
              onChangeText={(t) => onChangeField('apiUrl', t)}
              placeholder="https://..."
              placeholderTextColor={BRAND.muted}
              autoCapitalize="none"
            />

            <Text style={styles.label}>Usuario</Text>
            <TextInput 
              style={styles.input}
              value={config.username}
              onChangeText={(t) => onChangeField('username', t)}
              placeholderTextColor={BRAND.muted}
              autoCapitalize="none"
            />

            <Text style={styles.label}>Contraseña</Text>
            <TextInput 
              style={styles.input}
              value={config.password}
              onChangeText={(t) => onChangeField('password', t)}
              secureTextEntry
              placeholderTextColor={BRAND.muted}
            />

            <Text style={styles.label}>Idioma (es / en)</Text>
            <TextInput 
              style={styles.input}
              value={config.langCode}
              onChangeText={(t) => onChangeField('langCode', t)}
              placeholderTextColor={BRAND.muted}
              autoCapitalize="none"
            />

            <Text style={styles.label}>HuggingFace Token (Opcional)</Text>
            <TextInput 
              style={styles.input}
              value={config.hfToken}
              onChangeText={(t) => onChangeField('hfToken', t)}
              placeholder="hf_..."
              placeholderTextColor={BRAND.muted}
              secureTextEntry
              autoCapitalize="none"
            />

            <View style={styles.logoutContainer}>
              <MeButton 
                title="Cerrar Sesión" 
                onPress={onLogout} 
                type="danger"
                style={{ width: '100%' }}
                leftIcon="🚀"
              />
            </View>

            <View style={styles.actions}>
              <MeButton 
                title="Cancelar" 
                onPress={onCancel} 
                type="outline"
                style={{ flex: 1 }}
              />
              <MeButton 
                title="Guardar" 
                onPress={onSave} 
                style={{ flex: 1.5, backgroundColor: BRAND.success }}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: BRAND.darkCard,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    color: BRAND.text,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 24,
    textAlign: 'center',
  },
  label: {
    color: BRAND.muted,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 14,
    color: BRAND.text,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  logoutContainer: {
    marginTop: 10,
    marginBottom: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  }
});
