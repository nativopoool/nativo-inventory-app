import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { Audio } from 'expo-av';
import { transcribeAudio } from '../api/vendureClient';

export const useVoice = () => {
  const [isListening, setIsListening] = useState(false);
  const [recording, setRecording] = useState(null);

  const stopVoice = useCallback(async (rec, targetSetter, hfToken) => {
    const activeRec = rec || recording;
    if (!activeRec) return;

    try {
      setIsListening(false);
      setRecording(null);
      
      await activeRec.stopAndUnloadAsync();
      const uri = activeRec.getURI();
      if (!uri) return;

      const result = await transcribeAudio(uri, hfToken);

      if (result.text) {
        targetSetter(result.text.trim());
      } else if (result.error) {
        console.log('Whisper loading, retrying in 5s...');
        Alert.alert('IA cargando', 'El modelo de voz se está iniciando. Intenta de nuevo en unos segundos.');
      }
    } catch (e) {
      Alert.alert('Error de Voz', `No se pudo transcribir: ${e.message}`);
    }
  }, [recording]);

  const startVoice = useCallback(async (targetSetter) => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert('Permiso', 'Necesitas permitir el acceso al micrófono');
        return;
      }

      await Audio.setAudioModeAsync({ 
        allowsRecordingIOS: true, 
        playsInSilentModeIOS: true 
      });

      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(rec);
      setIsListening(true);

      // Auto-stop after 8 seconds
      const timeout = setTimeout(() => stopVoice(rec, targetSetter, hfToken), 8000);
      
      return () => clearTimeout(timeout);
    } catch (e) {
      console.error('Voice start error:', e);
      Alert.alert('Error', 'No se pudo iniciar la grabación');
    }
  }, [stopVoice]);

  const toggleVoice = useCallback((targetSetter, hfToken) => {
    if (isListening) {
      stopVoice(null, targetSetter, hfToken);
    } else {
      startVoice(targetSetter, hfToken);
    }
  }, [isListening, startVoice, stopVoice]);

  return { isListening, toggleVoice, startVoice, stopVoice };
};
