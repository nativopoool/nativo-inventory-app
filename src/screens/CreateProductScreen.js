import React from 'react';
import { 
  Modal, View, Text, StyleSheet, 
  ScrollView 
} from 'react-native';
import { BRAND } from '../constants/brand';
import { MeInput } from '../components/MeInput';
import { MeButton } from '../components/MeButton';

export const CreateProductScreen = ({ 
  visible, 
  onClose, 
  name, 
  setName, 
  sku, 
  setSku, 
  price, 
  setPrice, 
  stock, 
  setStock,
  onSave, 
  loading,
  onVoicePress,
  isListening
}) => {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>🆕 Crear Producto</Text>
            
            <MeInput 
              label="Nombre del Producto"
              value={name}
              onChangeText={setName}
              placeholder="Ej: Martillo Galpón"
              showVoice
              onVoicePress={onVoicePress}
              isListening={isListening}
            />

            <MeInput 
              label="SKU / Código"
              value={sku}
              onChangeText={setSku}
              placeholder="Ej: SKU-123"
            />

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <MeInput 
                  label="Precio (IVA Inc.)"
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="number-pad"
                  placeholder="0"
                />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <MeInput 
                  label="Stock Inicial"
                  value={stock}
                  onChangeText={setStock}
                  keyboardType="number-pad"
                  placeholder="1"
                />
              </View>
            </View>

            <View style={styles.actions}>
              <MeButton 
                title="Subir al ERP" 
                onPress={onSave} 
                loading={loading}
                type="success"
                leftIcon="🚀"
                size="lg"
                style={{ width: '100%' }}
              />
              <MeButton 
                title="Cancelar" 
                onPress={onClose} 
                type="ghost"
                style={{ width: '100%' }}
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
    backgroundColor: 'rgba(2, 6, 23, 0.9)',
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
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    color: BRAND.text,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 24,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
});
