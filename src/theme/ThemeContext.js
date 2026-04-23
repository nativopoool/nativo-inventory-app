import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { BRAND as DEFAULT_BRAND, LOGO as DEFAULT_LOGO } from '../constants/brand';

/**
 * Theme Manager — handles dynamic brand colors and logos per client.
 * Provides real-time UI updates when switching between ERP identities.
 */

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [brand, setBrand] = useState(DEFAULT_BRAND);
  const [logo, setLogo] = useState(DEFAULT_LOGO);

  /**
   * updateTheme — merges new brand colors or logos into the current theme.
   * Useful when MeBot Bridge returns specific client identity.
   */
  const updateTheme = useCallback((newBrandData, newLogoUrl) => {
    if (newBrandData) {
      setBrand(prev => ({
        ...prev,
        ...newBrandData,
        // Auto-generate variants if primary is provided but others are not
        primaryDark: newBrandData.primaryDark || newBrandData.primary || prev.primaryDark,
        primaryLight: newBrandData.primaryLight || newBrandData.primary || prev.primaryLight,
        primaryGlow: newBrandData.primaryGlow || (newBrandData.primary ? `${newBrandData.primary}40` : prev.primaryGlow),
      }));
    }
    if (newLogoUrl) {
      setLogo({ uri: newLogoUrl });
    }
  }, []);

  const resetTheme = useCallback(() => {
    setBrand(DEFAULT_BRAND);
    setLogo(DEFAULT_LOGO);
  }, []);

  return (
    <ThemeContext.Provider value={{ brand, logo, updateTheme, resetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
