import React from 'react';
import { 
  StyleSheet, View, Text, Image, 
  SafeAreaView, Dimensions, Animated,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BRAND, RADIUS, SHADOWS, LOGO } from '../constants/brand';
import { MeButton } from '../components/MeButton';

const { width, height } = Dimensions.get('window');

export const LoginScreen = ({ onGoogleLogin, loading, t }) => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(30)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  return (
    <LinearGradient 
      colors={[BRAND.bg, BRAND.surface, BRAND.primaryDark]} 
      style={styles.container}
    >
      <SafeAreaView style={styles.safe}>
        <Animated.View style={[
          styles.content, 
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
        ]}>
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image source={LOGO} style={styles.logo} resizeMode="contain" />
              <View style={styles.logoGlow} />
            </View>
            <Text style={styles.title}>{t('welcome_back') || 'Bienvenido a MeBot'}</Text>
            <Text style={styles.subtitle}>
              {t('login_subtitle') || 'Gestiona tu inventario con inteligencia artificial'}
            </Text>
          </View>

          <View style={styles.form}>
            <MeButton 
              title={t('login_with_google') || 'Continuar con Google'}
              onPress={onGoogleLogin}
              loading={loading}
              style={styles.googleBtn}
              textStyle={styles.googleBtnText}
              leftIcon="🌐" // Emoji representing a globe/network for now
            />
            
            <View style={styles.divider}>
              <View style={styles.line} />
              <Text style={styles.dividerText}>{t('or_continue_with') || 'o también'}</Text>
              <View style={styles.line} />
            </View>

            <Text style={styles.footerText}>
              {t('login_footer') || 'Al continuar, aceptas nuestros términos y condiciones.'}
            </Text>
          </View>
        </Animated.View>
      </SafeAreaView>
      
      <View style={styles.decoration1} />
      <View style={styles.decoration2} />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logoContainer: {
    width: 120,
    height: 120,
    marginBottom: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 100,
    height: 100,
    zIndex: 2,
  },
  logoGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: BRAND.primary,
    opacity: 0.3,
    blurRadius: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: BRAND.textSub,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 250,
  },
  form: {
    width: '100%',
    maxWidth: 320,
  },
  googleBtn: {
    backgroundColor: '#fff',
    height: 56,
  },
  googleBtnText: {
    color: '#1f1f1f',
    fontSize: 16,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 30,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  dividerText: {
    marginHorizontal: 15,
    color: BRAND.muted,
    fontSize: 14,
  },
  footerText: {
    fontSize: 12,
    color: BRAND.muted,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 18,
  },
  decoration1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: BRAND.primary,
    opacity: 0.05,
  },
  decoration2: {
    position: 'absolute',
    bottom: -80,
    left: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: BRAND.primaryDark,
    opacity: 0.08,
  }
});
