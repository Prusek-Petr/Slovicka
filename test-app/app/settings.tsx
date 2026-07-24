// @ts-nocheck
import React, { useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, StatusBar, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';

export default function SettingsScreen() {
  const router = useRouter();
  const { theme, themeName, toggleTheme } = useTheme();

  const dynamicStyles = useMemo(() => {
    return StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: theme.background,
      },
      header: {
        paddingHorizontal: 20,
        paddingTop: 40,
        paddingBottom: 20,
        flexDirection: 'row',
        alignItems: 'center',
      },
      headerTitle: {
        fontSize: 26,
        fontWeight: '800',
        color: theme.textPrimary,
      },
      subtitle: {
        fontSize: 16,
        color: theme.textSecondary,
        fontWeight: '500',
      },
      mainContent: {
        padding: 20,
      },
      card: {
        backgroundColor: theme.cardBackground,
        borderRadius: theme.cardBorderRadius,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: theme.shadowOpacity,
        shadowRadius: 10,
        elevation: 3,
        borderWidth: theme.borderWidth,
        borderColor: theme.border,
      },
      sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.textPrimary,
        marginBottom: 15,
      },
      themeBtn: {
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderRadius: theme.buttonBorderRadius,
        marginBottom: 10,
        borderWidth: theme.borderWidth > 0 ? theme.borderWidth : 2,
        borderColor: theme.secondary,
        backgroundColor: theme.background,
      },
      themeBtnActive: {
        borderColor: theme.primary,
        backgroundColor: theme.iconBackground,
      },
      themeBtnText: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.textPrimary,
        textAlign: 'center',
      }
    });
  }, [theme]);

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <StatusBar barStyle={theme.statusBarStyle} backgroundColor={theme.background} />
      
      <View style={dynamicStyles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 15, padding: 5 }}>
          <Text style={{ fontSize: 24 }}>🔙</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={dynamicStyles.headerTitle}>Nastavení</Text>
          <Text style={dynamicStyles.subtitle}>Vzhled a chování</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={dynamicStyles.mainContent}>
        <View style={dynamicStyles.card}>
          <Text style={dynamicStyles.sectionTitle}>Motiv vzhledu</Text>
          
          <TouchableOpacity 
            style={[dynamicStyles.themeBtn, themeName === 'light' && dynamicStyles.themeBtnActive]}
            onPress={() => toggleTheme('light')}
          >
            <Text style={dynamicStyles.themeBtnText}>Světlý (Výchozí) ☀️</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[dynamicStyles.themeBtn, themeName === 'marioDark' && dynamicStyles.themeBtnActive]}
            onPress={() => toggleTheme('marioDark')}
          >
            <Text style={dynamicStyles.themeBtnText}>Super Mario Dark 🍄</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[dynamicStyles.themeBtn, themeName === 'marvelDark' && dynamicStyles.themeBtnActive]}
            onPress={() => toggleTheme('marvelDark')}
          >
            <Text style={dynamicStyles.themeBtnText}>Avenger Dark 🛡️</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
