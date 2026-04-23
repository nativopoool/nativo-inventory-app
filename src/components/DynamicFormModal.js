import React, { useState, useEffect } from 'react';
import { 
  View, Text, Modal, StyleSheet, 
  TouchableOpacity, ScrollView, ActivityIndicator,
  TouchableWithoutFeedback, Keyboard, KeyboardAvoidingView, Platform
} from 'react-native';
import { BRAND, RADIUS, SHADOWS, SCREEN } from '../constants/brand';
import { MeFormEngine } from './MeFormEngine';
import { getDynamicFormSchemaQuery, submitDynamicFormMutation } from '../api/vendureClient';

export const DynamicFormModal = ({ 
  visible, 
  onClose, 
  formCode, 
  targetId, 
  authToken, 
  config, 
  t,
  onSuccess 
}) => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [schema, setSchema] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (visible && formCode) {
      fetchSchema();
    } else {
      setSchema(null);
      setError(null);
    }
  }, [visible, formCode]);

  const fetchSchema = async () => {
    setLoading(true);
    setError(null);
    try {
      const { json } = await getDynamicFormSchemaQuery(config.apiUrl, authToken, formCode);
      if (json?.data?.dynamicFormSchema) {
        setSchema(json.data.dynamicFormSchema);
      } else {
        setError(`Schema "${formCode}" not found`);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data) => {
    setSubmitting(true);
    try {
      const { json } = await submitDynamicFormMutation(
        config.apiUrl, 
        authToken, 
        formCode, 
        targetId, 
        data
      );
      if (json.errors) throw new Error(json.errors[0].message);
      
      if (onSuccess) onSuccess(json.data.submitDynamicForm);
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
          >
            <View style={styles.header}>
              <Text style={styles.title}>{schema?.code ? schema.code.toUpperCase() : 'Formulario'}</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
              {loading ? (
                <View style={styles.center}>
                  <ActivityIndicator size="large" color={BRAND.primary} />
                  <Text style={styles.mutedText}>Cargando esquema...</Text>
                </View>
              ) : error ? (
                <View style={styles.center}>
                  <Text style={styles.errorText}>⚠️ {error}</Text>
                  <TouchableOpacity onPress={fetchSchema} style={styles.retryBtn}>
                    <Text style={styles.retryText}>Reintentar</Text>
                  </TouchableOpacity>
                </View>
              ) : schema ? (
                <MeFormEngine 
                  schema={schema.schema}
                  onSubmit={handleSubmit}
                  loading={submitting}
                  buttonTitle={t('save')}
                />
              ) : null}
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: BRAND.bg,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: SCREEN.height * 0.85,
    minHeight: 300,
    ...SHADOWS.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.cardBorder,
  },
  title: {
    color: BRAND.text,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BRAND.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    color: BRAND.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  center: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mutedText: {
    color: BRAND.muted,
    marginTop: 12,
    fontSize: 14,
  },
  errorText: {
    color: BRAND.danger,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: BRAND.primary,
    borderRadius: RADIUS.md,
  },
  retryText: {
    color: '#fff',
    fontWeight: '700',
  },
});
