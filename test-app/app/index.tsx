// @ts-nocheck
import React, { useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, StatusBar, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useVocabulary } from '../context/VocabularyContext';
import { useTheme } from '../context/ThemeContext';

export default function MenuScreen() {
  const router = useRouter();
  const { streakData, language, setLanguage } = useVocabulary();
  const { theme } = useTheme();

  const dynamicStyles = useMemo(() => {
    return StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: theme.background,
      },
      header: {
        paddingHorizontal: 25,
        paddingTop: 60,
        paddingBottom: 30,
      },
      headerTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
      },
      headerTitle: {
        fontSize: 36,
        fontWeight: '900',
        color: theme.textPrimary,
        textShadowColor: theme.name === 'marioDark' ? theme.border : 'transparent',
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 0,
      },
      streakBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.name === 'marioDark' ? '#000' : '#fff0ec',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: theme.buttonBorderRadius,
        borderWidth: theme.borderWidth > 0 ? theme.borderWidth : 1,
        borderColor: theme.name === 'marioDark' ? theme.accent : '#ffd8cc',
      },
      streakIcon: {
        fontSize: 20,
        marginRight: 4,
      },
      streakNumber: {
        color: theme.name === 'marioDark' ? theme.accent : '#ff8a00',
        fontWeight: '800',
        fontSize: 16,
      },
      langBadge: {
        backgroundColor: theme.secondary,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: theme.buttonBorderRadius,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: theme.borderWidth,
        borderColor: theme.border,
      },
      langText: {
        fontSize: 14,
        fontWeight: '800',
        color: theme.textPrimary,
      },
      subtitle: {
        fontSize: 18,
        color: theme.textSecondary,
        fontWeight: '600',
      },
      menuContainer: {
        paddingHorizontal: 20,
        paddingBottom: 40,
        gap: theme.borderWidth > 0 ? 20 : 15,
      },
      menuCard: {
        backgroundColor: theme.cardBackground,
        borderRadius: theme.cardBorderRadius,
        padding: 24,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 4, height: 4 }, // Harder shadow for retro look
        shadowOpacity: theme.shadowOpacity,
        shadowRadius: theme.name === 'marioDark' ? 0 : 12,
        elevation: 3,
        borderWidth: theme.borderWidth,
        borderColor: theme.border,
      },
      menuIcon: {
        fontSize: 40,
        marginRight: 20,
      },
      menuTextContainer: {
        flex: 1,
      },
      menuTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: theme.textPrimary,
        marginBottom: 4,
      },
      menuDescription: {
        fontSize: 14,
        color: theme.name === 'marioDark' ? theme.textPrimary : '#777',
        lineHeight: 20,
      },
    });
  }, [theme]);

  const getIcon = (defaultIcon, marioIcon, marvelIcon) => {
    if (theme.name === 'marioDark') return marioIcon;
    if (theme.name === 'marvelDark') return marvelIcon;
    return defaultIcon;
  };

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <StatusBar barStyle={theme.statusBarStyle} backgroundColor={theme.background} />
      
      <View style={[StyleSheet.absoluteFillObject, { opacity: 0.05 }]} pointerEvents="none">
        {theme.name === 'marvelDark' && (
          <Image 
            source={require('../assets/images/marvel-shield.png')} 
            style={{ width: '100%', height: '100%', resizeMode: 'cover' }} 
          />
        )}
      </View>

      <View style={dynamicStyles.header}>
        <View style={dynamicStyles.headerTopRow}>
          <Text style={dynamicStyles.headerTitle}>Captain Vocab</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {streakData?.currentStreak > 0 && (
              <View style={dynamicStyles.streakBadge}>
                <Text style={dynamicStyles.streakIcon}>🔥</Text>
                <Text style={dynamicStyles.streakNumber}>{streakData.currentStreak}</Text>
              </View>
            )}
            <TouchableOpacity 
              style={dynamicStyles.langBadge}
              onPress={() => setLanguage(language === 'en' ? 'de' : 'en')}
            >
              <Text style={dynamicStyles.langText}>{language === 'en' ? '🇬🇧 EN' : '🇩🇪 DE'}</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={dynamicStyles.subtitle}>Vyberte, co chcete dělat</Text>
      </View>

      <ScrollView contentContainerStyle={dynamicStyles.menuContainer} showsVerticalScrollIndicator={false}>
        <TouchableOpacity 
          style={dynamicStyles.menuCard} 
          activeOpacity={0.8}
          onPress={() => router.push('/topics')}
        >
          <Text style={dynamicStyles.menuIcon}>{getIcon('📚', '🍄', '🛡️')}</Text>
          <View style={dynamicStyles.menuTextContainer}>
            <Text style={dynamicStyles.menuTitle}>Učení slovíček</Text>
            <Text style={dynamicStyles.menuDescription}>Výběr lekce pro postupné učení a testování</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={dynamicStyles.menuCard} 
          activeOpacity={0.8}
          onPress={() => router.push('/dictionary')}
        >
          <Text style={dynamicStyles.menuIcon}>{getIcon('📖', '📚', '🦸‍♂️')}</Text>
          <View style={dynamicStyles.menuTextContainer}>
            <Text style={dynamicStyles.menuTitle}>Slovník</Text>
            <Text style={dynamicStyles.menuDescription}>Přehled všech slovíček, řazení a hledání</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={dynamicStyles.menuCard} 
          activeOpacity={0.8}
          onPress={() => router.push('/grammar-topics')}
        >
          <Text style={dynamicStyles.menuIcon}>{getIcon('🧩', '🧱', '🦾')}</Text>
          <View style={dynamicStyles.menuTextContainer}>
            <Text style={dynamicStyles.menuTitle}>Gramatika</Text>
            <Text style={dynamicStyles.menuDescription}>Trénink slovosledu a časování</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={dynamicStyles.menuCard} 
          activeOpacity={0.8}
          onPress={() => router.push('/review-menu')}
        >
          <Text style={dynamicStyles.menuIcon}>{getIcon('🧠', '⭐', '⚡')}</Text>
          <View style={dynamicStyles.menuTextContainer}>
            <Text style={dynamicStyles.menuTitle}>Opakování</Text>
            <Text style={dynamicStyles.menuDescription}>Chytré opakování náhodně nebo naposledy cvičených</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={dynamicStyles.menuCard} 
          activeOpacity={0.8}
          onPress={() => router.push('/edit')}
        >
          <Text style={dynamicStyles.menuIcon}>{getIcon('✏️', '🔨', '🛠️')}</Text>
          <View style={dynamicStyles.menuTextContainer}>
            <Text style={dynamicStyles.menuTitle}>Editace slovíček</Text>
            <Text style={dynamicStyles.menuDescription}>Označování problémových nebo už naučených slov</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={dynamicStyles.menuCard} 
          activeOpacity={0.8}
          onPress={() => router.push('/settings')}
        >
          <Text style={dynamicStyles.menuIcon}>{getIcon('⚙️', '🔧', '⚙️')}</Text>
          <View style={dynamicStyles.menuTextContainer}>
            <Text style={dynamicStyles.menuTitle}>Nastavení</Text>
            <Text style={dynamicStyles.menuDescription}>Změna motivu vzhledu a další</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
