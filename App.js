import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  StyleSheet, View, StatusBar, Platform,
  ActivityIndicator, Text, Image, BackHandler
} from 'react-native';
import { useCameraPermissions } from 'expo-camera';
import * as NavigationBar from 'expo-navigation-bar';
import * as SystemUI from 'expo-system-ui';
import { LinearGradient } from 'expo-linear-gradient';

// Constants & Config
import { BRAND, SCREEN, IS_SMALL_DEVICE, SAFE_AREA } from './src/constants/brand';
import { MODES } from './src/constants/modes';

// Utils & Diagnostics
import { diagnostics } from './src/utils/diagnostics';
import { initDb } from './src/utils/sqlite';

// Hooks
import { useAuth } from './src/hooks/useAuth';
import { useHistory } from './src/hooks/useHistory';
import { useVoice } from './src/hooks/useVoice';
import { useScanner } from './src/hooks/useScanner';
import { useSync } from './src/hooks/useSync';
import { useCache } from './src/hooks/useCache';
import { useLanguage } from './src/hooks/useLanguage';
import { useToast } from './src/hooks/useToast';

// Components
import { Header } from './src/components/Header';
import { MeButton } from './src/components/MeButton';
import { TabBar } from './src/components/TabBar';
import { Toast } from './src/components/Toast';
import { SettingsModal } from './src/components/SettingsModal';
import { DiagnosticOverlay } from './src/components/DiagnosticOverlay';

// Theme
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';

// Screens
import { ScannerScreen } from './src/screens/ScannerScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { AboutScreen } from './src/screens/AboutScreen';
import { CreateProductScreen } from './src/screens/CreateProductScreen';

// Global Error Handler for Native side
if (!__DEV__) {
  global.ErrorUtils?.setGlobalHandler((error, isFatal) => {
    diagnostics.error(error, `GlobalNative: ${isFatal ? 'Fatal' : 'Non-Fatal'}`);
  });
}

export default function App() {
  const [fatalError, setFatalError] = useState(null);
  const [logs, setLogs] = useState([]);

  // Root Error Boundary Hook
  const handleError = useCallback(async (error) => {
    try {
      console.error('[FATAL_JS_ERROR]', error);
      setFatalError(error);
      await diagnostics.error(error, 'RootAppBoundary');
      const latestLogs = await diagnostics.getLogs();
      setLogs(latestLogs);
    } catch (e) {
      // Si incluso el diagnóstico falla, mostramos el error crudo
      setFatalError(error);
    }
  }, []);

  // Si hay un error fatal antes de que SafeBoot termine, mostramos el Overlay de emergencia
  if (fatalError) {
    return (
      <View style={styles.emergencyContainer}>
        <Text style={styles.emergencyTitle}>⚠️ Error Crítico de Inicio</Text>
        <Text style={styles.emergencyText}>{fatalError?.message || 'Error desconocido'}</Text>
        <Text style={styles.emergencyLogs}>Revisa los logs nativos o intenta reiniciar.</Text>
        <View style={{ marginTop: 20 }}>
          <MeButton 
            title="Intentar Reiniciar" 
            onPress={() => { setFatalError(null); }} 
          />
        </View>
      </View>
    );
  }

  return (
    <ThemeProvider>
      <SafeBoot onFatalError={handleError}>
        <AppContent onFatalError={handleError} />
      </SafeBoot>
    </ThemeProvider>
  );
}

function SafeBoot({ children, onFatalError }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      try {
        await diagnostics.log('--- STARTING MEBOT BOOT SEQUENCE ---');
        
        // 1. Initialize DB - Protegido
        try {
          await diagnostics.log('Initializing SQLite...');
          initDb();
          await diagnostics.log('SQLite Initialized.');
        } catch (dbError) {
          await diagnostics.error(dbError, 'SQLiteInitPhase');
          // No bloqueamos el arranque por la DB necesariamente, 
          // permitimos que continúe para que el usuario pueda usar diagnósticos.
          console.warn('DB Failed but continuing boot...');
        }
        
        // 2. System UI - Protegido
        try {
          if (Platform.OS === 'android') {
            await SystemUI.setBackgroundColorAsync(BRAND.bg || '#080f1e');
            await NavigationBar.setButtonStyleAsync('light');
          }
        } catch (uiError) {
          console.warn('SystemUI Error', uiError);
        }

        if (mounted) {
          await diagnostics.log('Boot sequence complete.');
          setIsReady(true);
        }
      } catch (e) {
        if (mounted) onFatalError(e);
      }
    };

    boot();
    return () => { mounted = false; };
  }, [onFatalError]);

  if (!isReady) return <Splash />;
  return children;
}

function Splash() {
  return (
    <LinearGradient 
      colors={[BRAND.bg, BRAND.surface, BRAND.primaryDark]} 
      style={styles.safe}
    >
      <View style={styles.center}>
        <ActivityIndicator size="large" color={BRAND.primary} />
        <Text style={[styles.loadingText, { marginTop: 20, color: BRAND.text }]}>Iniciando MeBot...</Text>
      </View>
    </LinearGradient>
  );
}

function AppContent({ onFatalError }) {
  const { brand, logo } = useTheme();

  const [permission, requestPermission] = useCameraPermissions();
  const [stockToUpdate, setStockToUpdate] = useState('1');
  const [currentMode, setCurrentMode] = useState(MODES[0]);
  const [activeTab, setActiveTab] = useState('scanner');
  const [selectedEntry, setSelectedEntry] = useState(null);

  const { authToken, loginStatus, config, editConfig, setEditConfig, login, saveConfig, loginWithGoogle } = useAuth();
  const { history, addHistory, clearHistory } = useHistory();
  const { isListening, lastIntent, setLastIntent, toggleVoice } = useVoice();
  const { toastRef, showToast } = useToast();
  const { queueCount, isSyncing, addToQueue, processQueue } = useSync(authToken, config, showToast);
  const { upsertProduct, getProductBySku } = useCache();
  const { lang, changeLanguage, t } = useLanguage();

  const scanner = useScanner(
    authToken, config, currentMode, stockToUpdate, 
    addHistory, showToast, addToQueue, login, 
    upsertProduct, getProductBySku
  );

  useEffect(() => {
    if (!lastIntent) return;
    
    const executeIntent = async () => {
      const { action, params } = lastIntent;
      try {
        switch (action) {
          case 'navigate':
            if (params.screen) setActiveTab(params.screen);
            break;
          case 'search':
            if (params.query) { setActiveTab('scanner'); scanner.handleTextSearch(params.query); }
            break;
          case 'update_stock':
            if (params.sku && params.quantity !== undefined) {
               await scanner.handleTextSearch(params.sku, params.quantity); 
            }
            break;
        }
      } catch (e) {
        onFatalError(e);
      } finally {
        setLastIntent(null);
      }
    };
    executeIntent();
  }, [lastIntent, scanner]);

  const isInitializing = !permission || !t || loginStatus === 'pending' || loginStatus === 'logging_in';

  return (
    <LinearGradient 
      colors={[brand.bg, brand.surface, brand.primaryDark]} 
      style={[styles.safe, { backgroundColor: brand.bg }]}
    >
      <StatusBar barStyle="light-content" translucent />

      <View style={{ flex: 1 }}>
        {isInitializing ? (
          <View style={styles.center} key="initializing">
            <Image source={logo} style={{ width: 100, height: 100, marginBottom: 24 }} resizeMode="contain" />
            <ActivityIndicator size="large" color={brand.primary} />
            <Text style={[styles.loadingText, { color: brand.text, marginTop: 12 }]}>
               {loginStatus === 'logging_in' ? t('logging_in') : t('loading_app')}
            </Text>
          </View>
        ) : loginStatus === 'error' && activeTab !== 'settings' ? (
          <View style={{ flex: 1 }} key="error">
            <Header title="Configuración" showActions={false} onSettingsPress={() => setActiveTab('settings')} />
            <View style={styles.center}>
              <Text style={{ fontSize: 64 }}>⚠️</Text>
              <Text style={styles.errorText}>Error de Conexión</Text>
              <Text style={{ color: brand.muted, marginBottom: 20, textAlign: 'center' }}>No pudimos contactar con el ERP. Revisa tu URL o conexión.</Text>
              <MeButton title="Reintentar" onPress={() => login()} style={styles.ctaBtn} />
              <MeButton title="Ajustes" onPress={() => setActiveTab('settings')} type="ghost" style={{ marginTop: 12 }} />
            </View>
          </View>
        ) : !permission.granted ? (
          <View style={styles.center} key="permission">
            <Text style={styles.errorText}>Permiso de Cámara Requerido</Text>
            <MeButton title="Permitir Cámara" onPress={requestPermission} style={styles.ctaBtn} />
          </View>
        ) : (
          <View style={{ flex: 1 }} key="app-main">
            <Header 
              title={t(activeTab + '_tab') || t('scanner_title')}
              showActions={activeTab !== 'settings'}
              onVoicePress={() => toggleVoice(null, config.hfToken)}
              isVoiceLoading={isListening}
              onHistoryPress={() => setActiveTab('history')}
              onSettingsPress={() => setActiveTab('settings')}
            />

            <View style={styles.content}>
              {activeTab === 'scanner' && (
                <ScannerScreen 
                  scanned={scanner.scanned}
                  onBarCodeScanned={scanner.handleBarCodeScanned}
                  loading={scanner.loading}
                  currentMode={currentMode}
                  onModeChange={setCurrentMode}
                  stockToUpdate={stockToUpdate}
                  onStockChange={setStockToUpdate}
                  onScanReset={() => scanner.setScanned(false)}
                  t={t}
                />
              )}

              {activeTab === 'history' && (
                <HistoryScreen 
                  visible={true}
                  onClose={() => setActiveTab('scanner')}
                  history={history}
                  onClear={clearHistory}
                  selectedEntry={selectedEntry}
                  setSelectedEntry={setSelectedEntry}
                  embedded
                  t={t}
                />
              )}

              {activeTab === 'about' && (
                <AboutScreen 
                  history={history} 
                  config={config} 
                  queueCount={queueCount}
                  isSyncing={isSyncing}
                  onSyncPress={processQueue}
                  t={t}
                />
              )}
            </View>

            <TabBar activeTab={activeTab} onTabPress={setActiveTab} t={t} />
          </View>
        )}

        {/* Global Components — Always outside to work during errors */}
        <SettingsModal 
          visible={activeTab === 'settings'}
          config={editConfig}
          onCancel={() => { 
            if (loginStatus === 'error') {
               // Stay on settings or go to error but keep activeTab
               setActiveTab('settings_closed'); // A trick to close but we need to rethink
            }
            setActiveTab('scanner'); 
          }}
          onSave={() => { saveConfig(editConfig); setActiveTab('scanner'); }}
          onChangeField={(f, v) => setEditConfig(p => ({ ...p, [f]: v }))}
          lang={lang}
          onChangeLang={changeLanguage}
          t={t}
        />

        <CreateProductScreen 
          visible={scanner.isCreatingProduct}
          onClose={() => { scanner.setIsCreatingProduct(false); scanner.setScanned(false); }}
          name={scanner.newProductName}
          setName={scanner.setNewProductName}
          sku={scanner.newProductSku}
          setSku={scanner.setNewProductSku}
          price={scanner.newProductPrice}
          setPrice={scanner.setNewProductPrice}
          stock={stockToUpdate}
          setStock={setStockToUpdate}
          onSave={scanner.createProduct}
          loading={scanner.loading}
          t={t}
        />
        
        <Toast ref={toastRef} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingTop: (SAFE_AREA?.top || 24) },
  content: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  loadingText: { fontSize: 16, fontWeight: '700' },
  errorText: { color: BRAND.danger, fontSize: 20, fontWeight: '800', marginBottom: 20 },
  ctaBtn: { width: '100%', maxWidth: 260 },
  emergencyContainer: { 
    flex: 1, 
    backgroundColor: '#080f1e', 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 30 
  },
  emergencyTitle: { 
    color: '#ff4444', 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginBottom: 10 
  },
  emergencyText: { 
    color: '#fff', 
    fontSize: 16, 
    textAlign: 'center', 
    marginBottom: 20 
  },
  emergencyLogs: { 
    color: '#888', 
    fontSize: 12, 
    textAlign: 'center' 
  },
});
