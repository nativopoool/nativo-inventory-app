import React, { useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, Animated, Easing, TouchableOpacity 
} from 'react-native';
import { CameraView } from 'expo-camera';
import { BRAND, RADIUS } from '../constants/brand';
import { MODES } from '../constants/modes';
import { MeButton } from '../components/MeButton';

// Increment/Decrement step button
const StepBtn = ({ icon, onPress }) => (
  <TouchableOpacity onPress={onPress} style={styles.stepBtn} activeOpacity={0.7}>
    <Text style={styles.stepIcon}>{icon}</Text>
  </TouchableOpacity>
);

export const ScannerScreen = ({ 
  scanned, 
  onBarCodeScanned, 
  loading, 
  currentMode, 
  onModeChange, 
  stockToUpdate, 
  onStockChange 
}) => {
  // Beam animation
  const beamY = useRef(new Animated.Value(-1)).current;
  const beamOpacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (scanned || loading) return;

    const beamLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(beamY, {
          toValue: 1,
          duration: 1800,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(beamY, {
          toValue: -1,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(beamOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(beamOpacity, { toValue: 0.4, duration: 600, useNativeDriver: true }),
      ])
    );

    beamLoop.start();
    pulseLoop.start();

    return () => {
      beamLoop.stop();
      pulseLoop.stop();
    };
  }, [scanned, loading, beamY, beamOpacity]);

  const beamTranslate = beamY.interpolate({
    inputRange: [-1, 1],
    outputRange: [-72, 72],
  });

  return (
    <View style={styles.container}>
      {/* Mode Selector */}
      <View style={styles.modeRow}>
        {MODES.map((m) => {
          const isActive = currentMode.id === m.id;
          return (
            <TouchableOpacity
              key={m.id}
              style={[
                styles.modeBtn,
                isActive && { backgroundColor: m.color + '22', borderColor: m.color + '55' }
              ]}
              onPress={() => onModeChange(m)}
              activeOpacity={0.7}
            >
              <Text style={styles.modeIcon}>{m.icon}</Text>
              <Text style={[styles.modeLabel, isActive && { color: m.color, fontWeight: '800' }]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Camera */}
      <View style={[styles.cameraWrapper, { borderColor: currentMode.color + '55' }]}>
        <CameraView
          style={styles.camera}
          onBarcodeScanned={scanned ? undefined : onBarCodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ['qr', 'ean13', 'code128', 'code39'] }}
        >
          <View style={styles.overlay}>
            {/* Scan Window */}
            <View style={[styles.scanWindow, { borderColor: currentMode.color }]}>
              {/* Animated scan beam */}
              {!scanned && !loading && (
                <Animated.View 
                  style={[
                    styles.beam,
                    { 
                      backgroundColor: currentMode.color,
                      opacity: beamOpacity,
                      transform: [{ translateY: beamTranslate }],
                    }
                  ]} 
                />
              )}

              {loading && (
                <View style={styles.loadingOverlay}>
                  <Text style={{ fontSize: 36 }}>⚙️</Text>
                  <Text style={styles.loadingText}>Procesando...</Text>
                </View>
              )}
            </View>

            {/* Hint text */}
            <View style={styles.hintContainer}>
              <Text style={styles.hintText}>
                {loading ? 'Actualizando stock...' : `Modo: ${currentMode.label} ${currentMode.icon}`}
              </Text>
            </View>
          </View>
        </CameraView>
      </View>

      {/* Stock Stepper (hidden for query mode) */}
      {currentMode.action !== 'query' && (
        <View style={styles.stockRow}>
          <Text style={styles.stockLabel}>Cantidad</Text>
          <View style={styles.stepper}>
            <StepBtn 
              icon="−" 
              onPress={() => onStockChange(String(Math.max(1, parseInt(stockToUpdate || 1) - 1)))} 
            />
            <Text style={styles.stockValue}>{stockToUpdate}</Text>
            <StepBtn 
              icon="+" 
              onPress={() => onStockChange(String(parseInt(stockToUpdate || 0) + 1))} 
            />
          </View>
        </View>
      )}

      {/* Quick actions */}
      {scanned && !loading && (
        <View style={styles.quickActions}>
          <MeButton 
            title="Formulario" 
            type="primary" 
            size="md"
            onPress={() => onOpenForm && onOpenForm('form-venta')}
            leftIcon="📝" 
          />
          <View style={{ height: 12 }} />
          <MeButton 
            title="Escanear otro" 
            type="ghost" 
            size="sm"
            onPress={onScanReset}
            leftIcon="🔄" 
          />
        </View>
      )}

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND.bg,
  },

  // Mode Selector
  modeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 14,
    paddingBottom: 10,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    backgroundColor: BRAND.surfaceHigh,
    borderWidth: 1,
    borderColor: BRAND.cardBorder,
    gap: 6,
  },
  modeIcon: {
    fontSize: 16,
  },
  modeLabel: {
    color: BRAND.muted,
    fontSize: 12,
    fontWeight: '600',
  },

  // Camera
  cameraWrapper: {
    flex: 1,
    marginHorizontal: 16,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: BRAND.cardBorder,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  scanWindow: {
    width: 260,
    height: 160,
    borderWidth: 2,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  beam: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 1,
  },
  loadingOverlay: {
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },

  // Hint
  hintContainer: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: RADIUS.full,
  },
  hintText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Stock Stepper
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: BRAND.cardBorder,
  },
  stockLabel: {
    color: BRAND.muted,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.surfaceHigh,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: BRAND.cardBorder,
    overflow: 'hidden',
  },
  stepBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND.surfaceTop,
  },
  stepIcon: {
    color: BRAND.text,
    fontSize: 22,
    fontWeight: '300',
  },
  stockValue: {
    color: BRAND.text,
    fontSize: 22,
    fontWeight: '900',
    minWidth: 52,
    textAlign: 'center',
  },

  // Quick actions
  quickActions: {
    padding: 16,
    paddingTop: 8,
  },
});
