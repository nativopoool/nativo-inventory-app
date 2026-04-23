import React, { useEffect, useRef, useCallback } from 'react';
import { Animated, Text, StyleSheet, View } from 'react-native';
import { BRAND, RADIUS, SHADOWS } from '../constants/brand';

const VARIANTS = {
  success: { icon: '✅', bg: BRAND.success,      text: '#fff' },
  error:   { icon: '❌', bg: BRAND.danger,       text: '#fff' },
  warning: { icon: '⚠️', bg: BRAND.warning,      text: '#fff' },
  info:    { icon: 'ℹ️',  bg: BRAND.info,         text: '#fff' },
  scan:    { icon: '📦', bg: BRAND.surfaceTop,   text: BRAND.text },
};

/**
 * Toast — Animated notification component
 * 
 * Usage (inside a component with useToast hook):
 *   const { toast, showToast } = useToast();
 *   ...
 *   <Toast ref={toast} />
 * 
 *   showToast({ type: 'success', message: 'Stock updated!' });
 */
export const Toast = React.forwardRef((_, ref) => {
  const translateY = useRef(new Animated.Value(100)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const messageRef = useRef({ type: 'info', message: '' });
  const [, forceRender] = React.useReducer(x => x + 1, 0);
  const timerRef = useRef(null);

  const show = useCallback(({ type = 'info', message, duration = 2500 }) => {
    // Clear any existing timer
    if (timerRef.current) clearTimeout(timerRef.current);

    messageRef.current = { type, message };
    forceRender();

    // Slide in
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        speed: 14,
        bounciness: 8,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto dismiss
    timerRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 120,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }, duration);
  }, [translateY, opacity]);

  // Expose show() to parent via ref
  React.useImperativeHandle(ref, () => ({ show }), [show]);

  const { type, message } = messageRef.current;
  const variant = VARIANTS[type] || VARIANTS.info;

  return (
    <Animated.View 
      style={[
        styles.container,
        { 
          transform: [{ translateY }], 
          opacity,
          backgroundColor: variant.bg,
        }
      ]}
      pointerEvents="none"
    >
      <Text style={styles.icon}>{variant.icon}</Text>
      <Text style={[styles.message, { color: variant.text }]} numberOfLines={2}>
        {message}
      </Text>
    </Animated.View>
  );
});

Toast.displayName = 'Toast';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.xl,
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 12,
    zIndex: 9999,
    ...SHADOWS.lg,
  },
  icon: {
    fontSize: 20,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
});
