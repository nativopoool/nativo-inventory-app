import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { MeInput } from './MeInput';
import { MePicker } from './MePicker';
import { MeButton } from './MeButton';
import { BRAND } from '../constants/brand';

/**
 * MeFormEngine — Interprets JSON schemas to render dynamic forms with conditional logic.
 * 
 * Schema structure:
 * {
 *   fields: [
 *     { 
 *       name: 'category', 
 *       type: 'select', 
 *       label: 'Categoría', 
 *       options: [{ label: 'Hardware', value: 'hardware' }, ...] 
 *     },
 *     { 
 *       name: 'serialNumber', 
 *       type: 'text', 
 *       label: 'SN',
 *       visibility: { field: 'category', equals: 'hardware' } 
 *     }
 *   ]
 * }
 */
export const MeFormEngine = ({ schema, initialValues = {}, onSubmit, loading = false, buttonTitle = 'Guardar' }) => {
  const [formData, setFormData] = useState(initialValues);

  useEffect(() => {
    setFormData(initialValues);
  }, [initialValues]);

  const handleChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Logic evaluation engine
  const isVisible = (field) => {
    if (!field.visibility) return true;
    const { field: targetField, equals } = field.visibility;
    return formData[targetField] === equals;
  };

  const visibleFields = useMemo(() => {
    return schema.fields.filter(f => isVisible(f));
  }, [schema, formData]);

  const renderField = (field) => {
    switch (field.type) {
      case 'text':
      case 'number':
        return (
          <MeInput
            key={field.name}
            label={field.label}
            value={String(formData[field.name] || '')}
            onChangeText={(v) => handleChange(field.name, field.type === 'number' ? Number(v) : v)}
            keyboardType={field.type === 'number' ? 'numeric' : 'default'}
            placeholder={field.placeholder}
          />
        );
      case 'select':
        return (
          <MePicker
            key={field.name}
            label={field.label}
            value={formData[field.name]}
            options={field.options || []}
            onSelect={(v) => handleChange(field.name, v)}
            placeholder={field.placeholder}
          />
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {visibleFields.map(field => renderField(field))}
      
      <View style={styles.footer}>
        <MeButton 
          title={buttonTitle} 
          onPress={() => onSubmit(formData)} 
          loading={loading}
          type="primary"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%', paddingVertical: 10 },
  footer: { marginTop: 10 },
});
