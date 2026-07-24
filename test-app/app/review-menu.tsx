// @ts-nocheck
import React, { useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, StatusBar, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';

export default function ReviewMenuScreen() {
  const router = useRouter();
  const { theme } = useTheme();

  const dynamicStyles = useMemo(() => {
    return StyleSheet.create({
      container: { flex: 1, backgroundColor: theme.background },
      header: { paddingHorizontal: 20, paddingTop: 40, paddingBottom: 20 },
      headerTitle: { fontSize: 28, fontWeight: '800', color: theme.textPrimary },
      subtitle: { fontSize: 16, color: theme.textSecondary, fontWeight: '500' },
      listContainer: { paddingHorizontal: 20, paddingBottom: 40, gap: theme.borderWidth > 0 ? 16 : 12 },
      topicCard: {
        backgroundColor: theme.cardBackground,
        borderRadius: theme.cardBorderRadius,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: theme.shadowOpacity,
        shadowRadius: theme.name === 'marioDark' ? 0 : 8,
        elevation: 2,
        borderWidth: theme.borderWidth,
        borderColor: theme.border,
      },
      topicIconContainer: {
        width: 48,
        height: 48,
        borderRadius: theme.cardBorderRadius > 0 ? 12 : 0,
        backgroundColor: theme.name === 'marioDark' ? '#000' : '#f0f5ff',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
        borderWidth: theme.name === 'marioDark' ? 2 : 0,
        borderColor: theme.border,
      },
      topicIcon: { fontSize: 24 },
      topicTextContainer: { flex: 1 },
      topicTitle: { fontSize: 17, fontWeight: '700', color: theme.textPrimary, marginBottom: 4 },
      topicCount: { fontSize: 14, color: theme.textSecondary },
      playIcon: { fontSize: 16, color: theme.name === 'marioDark' ? theme.accent : theme.primary, fontWeight: '800' },
    });
  }, [theme]);

  const getIcon = (defaultIcon, marioIcon) => theme.name === 'marioDark' ? marioIcon : defaultIcon;

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <StatusBar barStyle={theme.statusBarStyle} backgroundColor={theme.background} />
      
      <View style={[dynamicStyles.header, { flexDirection: 'row', alignItems: 'center' }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 15, padding: 5 }}>
          <Text style={{ fontSize: 24 }}>🔙</Text>
        </TouchableOpacity>
        <View>
          <Text style={dynamicStyles.headerTitle}>Opakování</Text>
          <Text style={dynamicStyles.subtitle}>Vyberte režim zkoušení</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={dynamicStyles.listContainer}>
        <TouchableOpacity 
          style={dynamicStyles.topicCard}
          activeOpacity={0.8}
          onPress={() => router.push({ pathname: '/learn', params: { mode: 'random5' } })}
        >
          <View style={dynamicStyles.topicIconContainer}>
            <Text style={dynamicStyles.topicIcon}>{getIcon('🎲', '❓')}</Text>
          </View>
          <View style={dynamicStyles.topicTextContainer}>
            <Text style={dynamicStyles.topicTitle}>5 náhodných slovíček</Text>
            <Text style={dynamicStyles.topicCount}>Rychlé otestování paměti</Text>
          </View>
          <Text style={dynamicStyles.playIcon}>▶</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={dynamicStyles.topicCard}
          activeOpacity={0.8}
          onPress={() => router.push({ pathname: '/learn', params: { mode: 'last5' } })}
        >
          <View style={[dynamicStyles.topicIconContainer, theme.name !== 'marioDark' && { backgroundColor: '#fff0f5' }]}>
            <Text style={dynamicStyles.topicIcon}>{getIcon('⏱️', '⏳')}</Text>
          </View>
          <View style={dynamicStyles.topicTextContainer}>
            <Text style={dynamicStyles.topicTitle}>5 naposledy zopakovaných</Text>
            <Text style={dynamicStyles.topicCount}>Oživení nedávných slovíček</Text>
          </View>
          <Text style={dynamicStyles.playIcon}>▶</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={dynamicStyles.topicCard}
          activeOpacity={0.8}
          onPress={() => router.push({ pathname: '/learn', params: { mode: 'problematic' } })}
        >
          <View style={[dynamicStyles.topicIconContainer, theme.name !== 'marioDark' && { backgroundColor: '#fff0f0' }]}>
            <Text style={dynamicStyles.topicIcon}>{getIcon('⚠️', '🔥')}</Text>
          </View>
          <View style={dynamicStyles.topicTextContainer}>
            <Text style={dynamicStyles.topicTitle}>Problémová slovíčka</Text>
            <Text style={dynamicStyles.topicCount}>Zaměřit se na to, co dělá potíže</Text>
          </View>
          <Text style={dynamicStyles.playIcon}>▶</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
