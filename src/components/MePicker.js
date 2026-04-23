import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  Modal, FlatList 
} from 'react-native';
import { BRAND, RADIUS } from '../constants/brand';

export const MePicker = ({ label, value, options, onSelect, placeholder = 'Seleccionar...' }) => {
  const [visible, setVisible] = useState(false);

  const selectedOption = options.find(o => o.value === value);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <TouchableOpacity 
        style={styles.picker} 
        onPress={() => setVisible(true)}
      >
        <Text style={[styles.value, !selectedOption && { color: BRAND.muted }]}>
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <Text style={styles.arrow}>▼</Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade">
        <TouchableOpacity 
          style={styles.overlay} 
          onPress={() => setVisible(false)} 
          activeOpacity={1}
        >
          <View style={styles.card}>
            <Text style={styles.modalTitle}>{label || 'Seleccionar'}</Text>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[
                    styles.option,
                    item.value === value && styles.optionSelected
                  ]}
                  onPress={() => {
                    onSelect(item.value);
                    setVisible(false);
                  }}
                >
                  <Text style={[
                     styles.optionText,
                     item.value === value && styles.optionTextSelected
                  ]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 20 },
  label: {
    color: BRAND.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    marginLeft: 4,
  },
  picker: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: RADIUS.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  value: { color: BRAND.text, fontSize: 15 },
  arrow: { color: BRAND.muted, fontSize: 12 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: BRAND.darkCard,
    borderRadius: RADIUS.lg,
    padding: 16,
    maxHeight: '60%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    color: BRAND.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 16,
    textAlign: 'center',
  },
  option: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: RADIUS.sm,
  },
  optionSelected: {
    backgroundColor: BRAND.primary + '22',
  },
  optionText: {
    color: BRAND.text,
    fontSize: 15,
  },
  optionTextSelected: {
    color: BRAND.primary,
    fontWeight: '700',
  },
});
