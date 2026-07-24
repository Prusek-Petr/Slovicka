// @ts-nocheck
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const themes = {
  light: {
    name: 'light',
    background: '#f0f2f5',
    cardBackground: '#ffffff',
    textPrimary: '#1a1a1a',
    textSecondary: '#666666',
    primary: '#2b5cff',
    secondary: '#e4e6e9',
    secondaryText: '#444444',
    accent: '#00d26a',
    danger: '#ff4b4b',
    border: '#f0f0f0',
    iconBackground: '#f5f0ff',
    shadowOpacity: 0.05,
    cardBorderRadius: 20,
    buttonBorderRadius: 16,
    borderWidth: 0,
    statusBarStyle: 'dark-content',
  },
  marioDark: {
    name: 'marioDark',
    background: '#000000',
    cardBackground: '#1e1e1e', // Dark retro block
    textPrimary: '#ffffff',
    textSecondary: '#F8D870', // Coin Yellow
    primary: '#43B047', // Pipe Green
    secondary: '#D82800', // Brick Red
    secondaryText: '#ffffff',
    accent: '#F8D870',
    danger: '#D82800',
    border: '#F8D870', // Yellow block borders
    iconBackground: '#000000',
    shadowOpacity: 0,
    cardBorderRadius: 0, // Blocky
    buttonBorderRadius: 0, // Blocky
    borderWidth: 4, // Retro thick borders
    statusBarStyle: 'light-content',
  },
  marvelDark: {
    name: 'marvelDark',
    background: '#071526', // Deep Marvel Dark Blue
    cardBackground: '#0D223B', // Stark Tech interface blue
    textPrimary: '#FFFFFF', // Clean white
    textSecondary: '#AAB6C4', // Vibranium Grey
    primary: '#E23636', // Captain America / Marvel Red
    secondary: '#1B365D', // Cap's Blue for secondary buttons
    secondaryText: '#FFFFFF',
    accent: '#FFFFFF', // Cap's Star White
    danger: '#E23636',
    border: '#1B365D', // Sleek tech borders
    iconBackground: '#1B365D',
    shadowOpacity: 0.3,
    cardBorderRadius: 12, // Modern sleek UI
    buttonBorderRadius: 8,
    borderWidth: 1,
    statusBarStyle: 'light-content',
  }
};

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [themeName, setThemeName] = useState('light');

  useEffect(() => {
    const loadTheme = async () => {
      const stored = await AsyncStorage.getItem('@theme_name');
      if (stored && themes[stored]) {
        setThemeName(stored);
      }
    };
    loadTheme();
  }, []);

  const toggleTheme = async (name) => {
    setThemeName(name);
    await AsyncStorage.setItem('@theme_name', name);
  };

  const theme = themes[themeName] || themes.light;

  return (
    <ThemeContext.Provider value={{ theme, themeName, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
