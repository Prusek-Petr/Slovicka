// @ts-nocheck
import React, { useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, StatusBar, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useVocabulary } from '../context/VocabularyContext';
import grammarDataDe from '../grammar_de.json';
import grammarDataEn from '../grammar_en.json';

export default function GrammarTopicsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { language } = useVocabulary();

  const grammarData = language === 'de' ? grammarDataDe : grammarDataEn;

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
        padding: 20,
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
        width: 52,
        height: 52,
        borderRadius: theme.cardBorderRadius > 0 ? 12 : 0,
        backgroundColor: theme.name === 'marioDark' ? '#000' : '#f0f5ff',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
        borderWidth: theme.name === 'marioDark' ? 2 : 0,
        borderColor: theme.border,
      },
      topicIcon: { fontSize: 26 },
      topicTextContainer: { flex: 1 },
      topicTitle: { fontSize: 18, fontWeight: '700', color: theme.textPrimary, marginBottom: 4 },
      topicDescription: { fontSize: 14, color: theme.textSecondary, lineHeight: 20 },
      playIcon: { fontSize: 18, color: theme.name === 'marioDark' ? theme.accent : theme.primary, fontWeight: '800', marginLeft: 10 },
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
          <Text style={dynamicStyles.headerTitle}>Gramatika</Text>
          <Text style={dynamicStyles.subtitle}>Pochopte pravidla němčiny</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={dynamicStyles.listContainer}>
        {grammarData.map((lesson) => (
          <TouchableOpacity 
            key={lesson.id}
            style={dynamicStyles.topicCard}
            activeOpacity={0.8}
            onPress={() => router.push({ pathname: '/grammar-learn', params: { lessonId: lesson.id } })}
          >
            <View style={dynamicStyles.topicIconContainer}>
              <Text style={dynamicStyles.topicIcon}>
                {lesson.exercises[0].type === 'sentence_builder' ? getIcon('🧩', '🧱') : getIcon('⚙️', '🔧')}
              </Text>
            </View>
            <View style={dynamicStyles.topicTextContainer}>
              <Text style={dynamicStyles.topicTitle}>{lesson.title}</Text>
              <Text style={dynamicStyles.topicDescription}>{lesson.description}</Text>
            </View>
            <Text style={dynamicStyles.playIcon}>▶</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
