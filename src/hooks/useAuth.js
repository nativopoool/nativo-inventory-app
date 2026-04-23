import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { 
  loginMutation, 
  authenticateGoogleMutation, 
  getErpCredentialsQuery 
} from '../api/vendureClient';
import { DEFAULTS } from '../config/defaults';

WebBrowser.maybeCompleteAuthSession();

export const useAuth = () => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authToken, setAuthToken] = useState(null);
  const [loginStatus, setLoginStatus] = useState('pending');
  const [config, setConfig] = useState(DEFAULTS);
  const [editConfig, setEditConfig] = useState(DEFAULTS);
  const [availableInstances, setAvailableInstances] = useState([]);
  const loginLock = useRef(false);

  const login = useCallback(async (cfg) => {
    if (loginLock.current) return;
    loginLock.current = true;
    // Note: We use the cfg passed in to avoid depending on the 'config' state
    const targetCfg = cfg || config;
    
    console.log('Attempting login to:', targetCfg.apiUrl);
    setIsLoggingIn(true);
    setLoginStatus('logging_in');

    try {
      const { json, headers } = await loginMutation(targetCfg.apiUrl, targetCfg.username, targetCfg.password);
      const token = headers.get('vendure-auth-token');
      
      if (token) {
        setAuthToken(token);
        setLoginStatus('success');
      } else {
        if (json.errors) console.error('GraphQL:', json.errors);
        setLoginStatus('error');
      }
    } catch (e) {
      console.error('Login error:', e);
      setLoginStatus('error');
    } finally {
      setIsLoggingIn(false);
      loginLock.current = false;
    }
  }, [config.apiUrl, config.username, config.password]); // Specific dependencies

  const saveConfig = useCallback(async (newEditConfig) => {
    try {
      await AsyncStorage.setItem('mebot_config', JSON.stringify(newEditConfig));
      setConfig(newEditConfig);
      setAuthToken(null);
      setLoginStatus('pending');
      // No need to call login here if we depend on config properly, 
      // but if we want immediate feedback:
      login(newEditConfig);
      return true;
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar la configuración');
      return false;
    }
  }, [login]);

  // --- Google Auth ---
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  const loginWithGoogle = useCallback(async () => {
    try {
      setLoginStatus('logging_in');
      const result = await promptAsync();
      
      if (result?.type === 'success') {
        const { id_token } = result.params;
        console.log('Google Auth Success, authenticating with Vendure...');
        
        const { json, headers } = await authenticateGoogleMutation(config.apiUrl, id_token);
        const token = headers.get('vendure-auth-token');

        if (token) {
          setAuthToken(token);
          
          // Sincronizar instancias del ERP
          console.log('Fetching ERP instances...');
          const { json: instJson } = await getErpInstancesQuery(config.apiUrl, token);
          const instances = instJson.data?.getMyErpInstances || [];
          
          if (instances.length === 1) {
            const { apiUrl, username, password } = instances[0];
            const newConfig = { ...config, apiUrl: apiUrl || config.apiUrl, username, password };
            
            await AsyncStorage.setItem('mebot_config', JSON.stringify(newConfig));
            setConfig(newConfig);
            setEditConfig(newConfig);
            console.log('ERP Credentials synchronized automatically');
            setLoginStatus('success');
          } else if (instances.length > 1) {
            setAvailableInstances(instances);
            setLoginStatus('selecting_instance');
          } else {
            console.warn('No instances found for this user');
            setLoginStatus('success'); // Still allow login to Vendure Master? 
            // Better to show error if the goal is ERP sync
          }
          
          return true;
        }
      }
      setLoginStatus('error');
      return false;
    } catch (e) {
      console.error('Google Login error:', e);
      setLoginStatus('error');
      return false;
    }
  }, [config, promptAsync]);

  const selectInstance = useCallback(async (instance) => {
    try {
      const { apiUrl, username, password } = instance;
      const newConfig = { ...config, apiUrl: apiUrl || config.apiUrl, username, password };
      
      await AsyncStorage.setItem('mebot_config', JSON.stringify(newConfig));
      setConfig(newConfig);
      setEditConfig(newConfig);
      setAvailableInstances([]);
      setLoginStatus('success');
      console.log('Instance selected and configured:', instance.name);
    } catch (e) {
      console.error('Error selecting instance:', e);
    }
  }, [config]);

  const logout = useCallback(async () => {
    try {
      setAuthToken(null);
      setLoginStatus('pending');
      const resetConfig = { ...config, username: '', password: '' };
      await AsyncStorage.setItem('mebot_config', JSON.stringify(resetConfig));
      setConfig(resetConfig);
      setEditConfig(resetConfig);
    } catch (e) {
      console.error('Logout error:', e);
    }
  }, [config]);

  // Load on mount — only once!
  useEffect(() => {
    const init = async () => {
      try {
        const saved = await AsyncStorage.getItem('mebot_config');
        if (saved) {
          const parsed = JSON.parse(saved);
          setConfig(parsed);
          setEditConfig(parsed);
          login(parsed);
        } else {
          login(DEFAULTS);
        }
      } catch (e) {
        console.log('Config load error:', e);
      }
    };
    init();
  }, []); // Empty dependency array to run only once on mount

  return { 
    authToken, 
    loginStatus, 
    config, 
    editConfig, 
    setEditConfig, 
    login, 
    loginWithGoogle,
    availableInstances,
    selectInstance,
    logout,
    saveConfig,
    setAuthToken
  };
};
