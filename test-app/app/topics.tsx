// @ts-nocheck
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, StatusBar, FlatList, Dimensions, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';

import { useVocabulary } from '../context/VocabularyContext';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');
const TILE_MARGIN = 6;
const TILE_SIZE = (width - 40 - (TILE_MARGIN * 2 * 4)) / 4;

export default function TopicsScreen() {
  const router = useRouter();
  const { vocabulary, isLoading } = useVocabulary();
  const { theme } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState(null);

  const getIcon = (defaultIcon, marioIcon) => theme.name === 'marioDark' ? marioIcon : defaultIcon;

  const groupedLessons = useMemo(() => {
    if (!vocabulary) return [];
    
    const groups = {};
    
    vocabulary.forEach(word => {
      const fullLessonName = word.lesson || 'Ostatní';
      let categoryName = fullLessonName;
      let subLessonName = 'Vše';
      
      if (fullLessonName.includes('-')) {
        const parts = fullLessonName.split('-');
        categoryName = parts[0].trim();
        subLessonName = parts.slice(1).join('-').trim();
      }

      if (!groups[categoryName]) {
        groups[categoryName] = { count: 0, learnedCount: 0, lessons: {} };
      }
      groups[categoryName].count++;
      if (word.stats && word.stats.is_learned && !word.stats.is_problematic) {
        groups[categoryName].learnedCount++;
      }
      
      if (!groups[categoryName].lessons[fullLessonName]) {
        groups[categoryName].lessons[fullLessonName] = { 
          name: subLessonName, 
          count: 0, 
          learnedCount: 0,
          fullName: fullLessonName 
        };
      }
      groups[categoryName].lessons[fullLessonName].count++;
      if (word.stats && word.stats.is_learned && !word.stats.is_problematic) {
        groups[categoryName].lessons[fullLessonName].learnedCount++;
      }
    });

    return Object.keys(groups)
      .map(categoryName => {
        const subLessons = Object.values(groups[categoryName].lessons)
          .sort((a, b) => a.name.localeCompare(b.name));
          
        return {
          name: categoryName,
          count: groups[categoryName].count,
          learnedCount: groups[categoryName].learnedCount,
          subLessons
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [vocabulary]);

  const handleBackPress = () => {
    if (selectedCategory) {
      setSelectedCategory(null);
    } else {
      router.back();
    }
  };

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
      },
      headerTitle: {
        fontSize: 26,
        fontWeight: '800',
        color: theme.textPrimary,
        textShadowColor: theme.name === 'marioDark' ? theme.border : 'transparent',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 0,
      },
      subtitle: {
        fontSize: 16,
        color: theme.textSecondary,
        fontWeight: '500',
      },
      listContainer: {
        paddingHorizontal: 20,
        paddingBottom: 40,
      },
      columnWrapper: {
        justifyContent: 'flex-start',
        marginBottom: TILE_MARGIN * 2,
      },
      tileCard: {
        backgroundColor: theme.cardBackground,
        borderRadius: theme.cardBorderRadius > 0 ? 12 : 0,
        padding: 8,
        alignItems: 'center',
        width: TILE_SIZE,
        marginHorizontal: TILE_MARGIN,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: theme.shadowOpacity,
        shadowRadius: theme.name === 'marioDark' ? 0 : 5,
        elevation: 2,
        borderWidth: theme.borderWidth > 0 ? 2 : 0,
        borderColor: theme.border,
      },
      tileCardCompleted: {
        backgroundColor: theme.name === 'marioDark' ? '#F8D870' : '#fffcf0', 
        borderColor: theme.name === 'marioDark' ? '#D82800' : '#ffeaa7',
        borderWidth: theme.borderWidth > 0 ? 4 : 1,
      },
      tileIconContainer: {
        width: 36,
        height: 36,
        borderRadius: theme.cardBorderRadius > 0 ? 10 : 0,
        backgroundColor: theme.name === 'marioDark' ? '#000' : '#f5f0ff',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
        borderWidth: theme.name === 'marioDark' ? 2 : 0,
        borderColor: theme.textSecondary,
      },
      tileIconContainerCompleted: {
        backgroundColor: theme.name === 'marioDark' ? '#000' : '#fff4cc',
      },
      tileIcon: {
        fontSize: 18,
      },
      tileTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: theme.name === 'marioDark' && theme.cardBackground === '#1e1e1e' ? theme.textPrimary : '#333',
        textAlign: 'center',
        marginBottom: 2,
        lineHeight: 14,
        height: 28, 
      },
      tileTitleCompleted: {
        color: theme.name === 'marioDark' ? '#000' : '#333',
      },
      tileSubtitle: {
        fontSize: 10,
        color: theme.name === 'marioDark' ? theme.textSecondary : '#888',
        textAlign: 'center',
      },
      tileSubtitleCompleted: {
        color: theme.name === 'marioDark' ? '#D82800' : '#888',
      }
    });
  }, [theme]);

  const renderItem = ({ item }) => {
    const isCompleted = item.count > 0 && item.learnedCount === item.count;

    if (!selectedCategory) {
      return (
        <TouchableOpacity 
          style={[dynamicStyles.tileCard, isCompleted && dynamicStyles.tileCardCompleted]}
          activeOpacity={0.8}
          onPress={() => setSelectedCategory(item)}
        >
          <View style={[dynamicStyles.tileIconContainer, isCompleted && dynamicStyles.tileIconContainerCompleted]}>
            <Text style={dynamicStyles.tileIcon}>{isCompleted ? getIcon('🏆', '⭐') : getIcon('🗂️', '📦')}</Text>
          </View>
          <Text style={[dynamicStyles.tileTitle, isCompleted && dynamicStyles.tileTitleCompleted]} numberOfLines={2}>{item.name}</Text>
          <Text style={[dynamicStyles.tileSubtitle, isCompleted && dynamicStyles.tileSubtitleCompleted]}>{item.subLessons.length} lekcí</Text>
        </TouchableOpacity>
      );
    } else {
      return (
        <TouchableOpacity 
          style={[dynamicStyles.tileCard, isCompleted && dynamicStyles.tileCardCompleted]}
          activeOpacity={0.8}
          onPress={() => router.push({ pathname: '/learn', params: { lesson: item.fullName } })}
        >
          <View style={[dynamicStyles.tileIconContainer, !isCompleted && theme.name !== 'marioDark' && { backgroundColor: '#eef8ff' }, isCompleted && dynamicStyles.tileIconContainerCompleted]}>
            <Text style={dynamicStyles.tileIcon}>{isCompleted ? getIcon('🏆', '⭐') : getIcon('📑', '📜')}</Text>
          </View>
          <Text style={[dynamicStyles.tileTitle, isCompleted && dynamicStyles.tileTitleCompleted]} numberOfLines={2}>{item.name}</Text>
          <Text style={[dynamicStyles.tileSubtitle, isCompleted && dynamicStyles.tileSubtitleCompleted]}>{item.count} slov</Text>
        </TouchableOpacity>
      );
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[dynamicStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <StatusBar barStyle={theme.statusBarStyle} backgroundColor={theme.background} />
      
      <View style={[dynamicStyles.header, { flexDirection: 'row', alignItems: 'center' }]}>
        <TouchableOpacity onPress={handleBackPress} style={{ marginRight: 15, padding: 5 }}>
          <Text style={{ fontSize: 24 }}>🔙</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={dynamicStyles.headerTitle} numberOfLines={1}>
            {selectedCategory ? selectedCategory.name : 'Témata'}
          </Text>
          <Text style={dynamicStyles.subtitle}>
            {selectedCategory ? 'Vyberte konkrétní lekci' : 'Vyberte tematický okruh'}
          </Text>
        </View>
      </View>

      <FlatList
        key={selectedCategory ? 'lessons' : 'categories'}
        data={selectedCategory ? selectedCategory.subLessons : groupedLessons}
        renderItem={renderItem}
        keyExtractor={(item, index) => index.toString()}
        numColumns={4}
        contentContainerStyle={dynamicStyles.listContainer}
        columnWrapperStyle={dynamicStyles.columnWrapper}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}
