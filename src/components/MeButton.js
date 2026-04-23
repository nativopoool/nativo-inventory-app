import React, { useRef } from 'react';
import { 
  TouchableOpacity, Text, StyleSheet, 
  ActivityIndicator, View, Animated 
} from 'react-native';
import { BRAND, RADIUS, SHADOWS } from '../constants/brand';

/**
 * MeButton — Premium button component
 * 
 * Props:
 *  - title: string (required)
 *  - onPress: function
 *  - type: 'primary' | 'outline' | 'ghost' | 'danger' | 'success'
 *  - size: 'sm' | 'md' | 'lg'
 *  - leftIcon: string (emoji or char)
 *  - rightIcon: string (emoji or char)
 *  - loading: boolean
 *  - disabled: boolean
 *  - style: ViewStyle override
 *  - textStyle: TextStyle override
 */
export const MeButton = ({ 
  title, 
  onPress, 
  type = 'primary', 
  size = 'md',
  leftIcon, 
  rightIcon,
  loading = false, 
  disabled = false,
  style, 
  textStyle 
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 6,
    }).start();
  };

  const variantStyle = {
    primary:  styles.btnPrimary,
    outline:  styles.btnOutline,
    ghost:    styles.btnGhost,
    danger:   styles.btnDanger,
    success:  styles.btnSuccess,
  }[type] || styles.btnPrimary;

  const textVariantStyle = {
    primary:  styles.textPrimary,
    outline:  styles.textOutline,
    ghost:    styles.textGhost,
    danger:   styles.textDanger,
    success:  styles.textSuccess,
  }[type] || styles.textPrimary;

  const sizeStyle = {
    sm: styles.sizeSm,
    md: styles.sizeMd,
    lg: styles.sizeLg,
  }[size] || styles.sizeMd;

  const textSizeStyle = {
    sm: styles.textSm,
    md: styles.textMd,
    lg: styles.textLg,
  }[size] || styles.textMd;

  const shadowStyle = type === 'primary' 
    ? SHADOWS.primary 
    : (type === 'success' ? {} : {});

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={loading || disabled}
        activeOpacity={1}
        style={[
          styles.btn,
          variantStyle,
          sizeStyle,
          shadowStyle,
          (loading || disabled) && styles.disabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator 
            color={type === 'primary' || type === 'danger' || type === 'success' ? '#fff' : BRAND.primary} 
            size="small" 
          />
        ) : (
          <View style={styles.inner}>
            {leftIcon && <Text style={[styles.icon, { marginRight: 8 }]}>{leftIcon}</Text>}
            <Text style={[styles.btnText, textVariantStyle, textSizeStyle, textStyle]}>
              {title}
            </Text>
            {rightIcon && <Text style={[styles.icon, { marginLeft: 8 }]}>{rightIcon}</Text>}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  btn: {
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Variants
  btnPrimary: {
    backgroundColor: BRAND.primary,
  },
  btnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: BRAND.primary,
  },
  btnGhost: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  btnDanger: {
    backgroundColor: BRAND.danger,
  },
  btnSuccess: {
    backgroundColor: BRAND.success,
  },

  // Sizes
  sizeSm: { paddingVertical: 8, paddingHorizontal: 16 },
  sizeMd: { paddingVertical: 14, paddingHorizontal: 24 },
  sizeLg: { paddingVertical: 18, paddingHorizontal: 32 },

  // Text
  btnText: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  textSm: { fontSize: 13 },
  textMd: { fontSize: 15 },
  textLg: { fontSize: 17 },

  // Text Variants
  textPrimary: { color: '#fff' },
  textOutline:  { color: BRAND.primary },
  textGhost:    { color: BRAND.textSub },
  textDanger:   { color: '#fff' },
  textSuccess:  { color: '#fff' },

  disabled: {
    opacity: 0.45,
  },
  icon: {
    fontSize: 16,
  },
});
