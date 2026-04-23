import React, { useRef, useState } from 'react';
import { 
  View, TextInput, TouchableOpacity, 
  Text, StyleSheet, Animated 
} from 'react-native';
import { BRAND, RADIUS } from '../constants/brand';

/**
 * MeInput — Premium text input component
 * 
 * Props:
 *  - label: string
 *  - value: string (required)
 *  - onChangeText: function (required)
 *  - placeholder: string
 *  - keyboardType: string
 *  - leftIcon: string (emoji)
 *  - showVoice: boolean
 *  - onVoicePress: function
 *  - isListening: boolean
 *  - secureTextEntry: boolean
 *  - multiline: boolean
 *  - editable: boolean
 *  - autoCapitalize: string
 */
export const MeInput = ({ 
  label, 
  value, 
  onChangeText, 
  placeholder, 
  keyboardType, 
  leftIcon,
  showVoice, 
  onVoicePress, 
  isListening,
  secureTextEntry,
  multiline,
  editable = true,
  autoCapitalize,
}) => {
  const [focused, setFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    setFocused(true);
    Animated.timing(borderAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleBlur = () => {
    setFocused(false);
    Animated.timing(borderAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.06)', BRAND.primary + '88'],
  });

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, focused && styles.labelFocused]}>
          {label}
        </Text>
      )}
      <Animated.View 
        style={[
          styles.inputWrapper, 
          { borderColor },
          focused && styles.inputWrapperFocused,
        ]}
      >
        {leftIcon && (
          <View style={styles.leftIconContainer}>
            <Text style={styles.leftIcon}>{leftIcon}</Text>
          </View>
        )}
        <TextInput
          style={[
            styles.input,
            leftIcon && styles.inputWithLeftIcon,
            multiline && styles.inputMultiline,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={BRAND.placeholder}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          multiline={multiline}
          editable={editable}
          autoCapitalize={autoCapitalize}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        {showVoice && (
          <TouchableOpacity 
            style={[
              styles.voiceBtn, 
              isListening && styles.listeningBtn,
            ]} 
            onPress={onVoicePress}
          >
            <Text style={styles.voiceIcon}>{isListening ? '⏹' : '🎤'}</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 18,
    width: '100%',
  },
  label: {
    color: BRAND.muted,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  labelFocused: {
    color: BRAND.primaryLight,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.surfaceHigh,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  inputWrapperFocused: {
    backgroundColor: 'rgba(21, 93, 252, 0.04)',
  },
  leftIconContainer: {
    paddingLeft: 14,
    paddingRight: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftIcon: {
    fontSize: 18,
  },
  input: {
    flex: 1,
    color: BRAND.text,
    padding: 14,
    fontSize: 16,
    fontWeight: '500',
  },
  inputWithLeftIcon: {
    paddingLeft: 6,
  },
  inputMultiline: {
    height: 80,
    textAlignVertical: 'top',
  },
  voiceBtn: {
    width: 48,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.06)',
  },
  listeningBtn: {
    backgroundColor: BRAND.danger + '22',
  },
  voiceIcon: {
    fontSize: 18,
  },
});
