// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, StatusBar, ScrollView, Modal, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useVocabulary } from '../context/VocabularyContext';
import { useTheme } from '../context/ThemeContext';

const parseDate = (dateStr) => {
  if (!dateStr || dateStr === '-') return new Date(0);
  if (dateStr.includes('.')) {
    const parts = dateStr.split('.');
    if (parts.length === 3) {
      return new Date(parts[2], parts[1] - 1, parts[0]);
    }
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return new Date(0);
  return d;
};

export default function DictionaryScreen() {
  const router = useRouter();
  const { vocabulary, isLoading, language } = useVocabulary();
  const { theme } = useTheme();

  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('alphabet'); 
  const [sortDesc, setSortDesc] = useState(false);
  const [selectedStory, setSelectedStory] = useState(null);
  const [viewMode, setViewMode] = useState('cards');

  const ITEMS_PER_PAGE = 20;

  const sortedData = useMemo(() => {
    if (!vocabulary) return [];
    let sorted = [...vocabulary];

    sorted.sort((a, b) => {
      let comparison = 0;

      if (sortBy === 'alphabet') {
        comparison = (a.foreign || '').localeCompare(b.foreign || '');
      } else if (sortBy === 'date_learned') {
        comparison = parseDate(a.date_learned) - parseDate(b.date_learned);
      } else if (sortBy === 'last_reviewed') {
        const dateA = a.stats?.last_reviewed_date ? new Date(a.stats.last_reviewed_date) : parseDate(a.last_reviewed);
        const dateB = b.stats?.last_reviewed_date ? new Date(b.stats.last_reviewed_date) : parseDate(b.last_reviewed);
        comparison = dateA - dateB;
      } else if (sortBy === 'repetition') {
        const repsA = (a.stats?.success_count || 0) + (a.stats?.failure_count || 0);
        const repsB = (b.stats?.success_count || 0) + (b.stats?.failure_count || 0);
        comparison = repsA - repsB;
      }

      return sortDesc ? -comparison : comparison;
    });

    return sorted;
  }, [sortBy, sortDesc, vocabulary]);

  const totalPages = Math.ceil(sortedData.length / ITEMS_PER_PAGE);
  const paginatedData = sortedData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const toggleSort = (type) => {
    if (sortBy === type) {
      setSortDesc(!sortDesc);
    } else {
      setSortBy(type);
      setSortDesc(false);
    }
    setCurrentPage(1);
  };

  const renderSortIcon = (type) => {
    if (sortBy !== type) return '↕️';
    return sortDesc ? '⬇️' : '⬆️';
  };

  const dynamicStyles = useMemo(() => {
    return StyleSheet.create({
      container: { flex: 1, backgroundColor: theme.background },
      header: { paddingHorizontal: 20, paddingTop: 40, paddingBottom: 15 },
      headerTitle: { fontSize: 26, fontWeight: '800', color: theme.textPrimary },
      subtitle: { fontSize: 16, color: theme.textSecondary, fontWeight: '500' },
      viewToggleBtn: { backgroundColor: theme.secondary, width: 44, height: 44, borderRadius: theme.buttonBorderRadius, alignItems: 'center', justifyContent: 'center', borderWidth: theme.borderWidth, borderColor: theme.border },
      viewToggleIcon: { fontSize: 20 },
      sortContainer: { marginBottom: 10 },
      sortScroll: { paddingHorizontal: 20, gap: 10, paddingBottom: 5 },
      sortBtn: { backgroundColor: theme.secondary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: theme.buttonBorderRadius, borderWidth: theme.borderWidth, borderColor: theme.border },
      sortBtnActive: { backgroundColor: theme.primary, borderColor: theme.name === 'marioDark' ? '#000' : theme.primary },
      sortBtnText: { color: theme.textPrimary, fontWeight: '600', fontSize: 14 },
      sortBtnTextActive: { color: '#fff' },
      listContainer: { paddingHorizontal: 20, paddingBottom: 20, gap: theme.borderWidth > 0 ? 20 : 15 },
      wordCard: { backgroundColor: theme.cardBackground, borderRadius: theme.cardBorderRadius, padding: 20, shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: theme.shadowOpacity, shadowRadius: theme.name === 'marioDark' ? 0 : 8, elevation: 2, borderWidth: theme.borderWidth, borderColor: theme.border },
      wordHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 },
      foreignText: { fontSize: 22, fontWeight: '800', color: theme.textPrimary },
      czechText: { fontSize: 18, fontWeight: '600', color: theme.name === 'marioDark' ? theme.accent : theme.primary },
      pronunciationText: { fontSize: 15, color: theme.textSecondary, marginBottom: 12 },
      divider: { height: 1, backgroundColor: theme.name === 'marioDark' ? theme.border : '#f0f0f0', marginVertical: 12 },
      statsContainer: { gap: 6 },
      statRow: { flexDirection: 'row', justifyContent: 'space-between' },
      statLabel: { color: theme.textSecondary, fontSize: 14 },
      statValue: { color: theme.textPrimary, fontSize: 14, fontWeight: '500' },
      storyLink: { marginTop: 15, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.name === 'marioDark' ? theme.border : '#f0f0f0', alignItems: 'center' },
      storyLinkText: { color: theme.name === 'marioDark' ? theme.accent : theme.primary, fontWeight: '600', fontSize: 15 },
      tableWrapper: { marginHorizontal: 15, backgroundColor: theme.cardBackground, borderRadius: theme.cardBorderRadius, padding: 10, marginBottom: 20, borderWidth: theme.borderWidth, borderColor: theme.border },
      tableHeaderRow: { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: theme.name === 'marioDark' ? theme.border : '#e0e0e0', paddingBottom: 10, marginBottom: 5 },
      tableCellHeader: { fontWeight: '700', color: theme.textPrimary, fontSize: 14, paddingHorizontal: 8 },
      tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: theme.name === 'marioDark' ? theme.border : '#f0f0f0', paddingVertical: 12, alignItems: 'center' },
      tableRowAlt: { backgroundColor: theme.name === 'marioDark' ? '#111' : '#fafafa' },
      tableCell: { fontSize: 14, color: theme.textPrimary, paddingHorizontal: 8 },
      tableStoryBtn: { backgroundColor: theme.secondary, padding: 6, borderRadius: theme.buttonBorderRadius, borderWidth: theme.borderWidth > 0 ? 1 : 0, borderColor: theme.border },
      paginationContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: theme.name === 'marioDark' ? theme.background : '#ffffff', borderTopWidth: 1, borderTopColor: theme.name === 'marioDark' ? theme.border : '#e0e0e0' },
      pageBtn: { backgroundColor: theme.secondary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: theme.buttonBorderRadius, borderWidth: theme.borderWidth, borderColor: theme.border },
      pageBtnDisabled: { opacity: 0.4 },
      pageBtnText: { color: theme.textPrimary, fontWeight: '700' },
      pageText: { fontWeight: '600', color: theme.textSecondary },
      modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
      modalContent: { backgroundColor: theme.cardBackground, borderRadius: theme.cardBorderRadius, padding: 24, width: '100%', borderWidth: theme.borderWidth, borderColor: theme.border },
      modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 15, color: theme.textPrimary, textAlign: 'center' },
      modalStoryText: { fontSize: 16, lineHeight: 24, color: theme.textPrimary, fontStyle: 'italic', textAlign: 'center', marginBottom: 25 },
      modalCloseBtn: { backgroundColor: theme.primary, paddingVertical: 14, borderRadius: theme.buttonBorderRadius, alignItems: 'center', borderWidth: theme.borderWidth, borderColor: '#000' },
      modalCloseText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    });
  }, [theme]);

  if (isLoading) {
    return (
      <SafeAreaView style={[dynamicStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </SafeAreaView>
    );
  }

  const renderTable = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={true} style={dynamicStyles.tableWrapper}>
      <View>
        <View style={dynamicStyles.tableHeaderRow}>
          <Text style={[dynamicStyles.tableCellHeader, { width: 120 }]}>{language === 'de' ? 'Německy' : 'Anglicky'}</Text>
          <Text style={[dynamicStyles.tableCellHeader, { width: 110 }]}>Výslovnost</Text>
          <Text style={[dynamicStyles.tableCellHeader, { width: 120 }]}>Česky</Text>
          <Text style={[dynamicStyles.tableCellHeader, { width: 150 }]}>Lekce</Text>
          <Text style={[dynamicStyles.tableCellHeader, { width: 80, textAlign: 'center' }]}>Opak.</Text>
          <Text style={[dynamicStyles.tableCellHeader, { width: 100 }]}>Naučeno</Text>
          <Text style={[dynamicStyles.tableCellHeader, { width: 100 }]}>Procvičeno</Text>
          <Text style={[dynamicStyles.tableCellHeader, { width: 80, textAlign: 'center' }]}>Příběh</Text>
        </View>

        {paginatedData.map((word, index) => (
          <View key={index} style={[dynamicStyles.tableRow, index % 2 === 1 && dynamicStyles.tableRowAlt]}>
            <Text style={[dynamicStyles.tableCell, { width: 120, fontWeight: '700' }]}>{word.foreign}</Text>
            <Text style={[dynamicStyles.tableCell, { width: 110, color: theme.textSecondary }]}>[{word.pronunciation}]</Text>
            <Text style={[dynamicStyles.tableCell, { width: 120, color: theme.name === 'marioDark' ? theme.accent : theme.primary }]}>{word.czech}</Text>
            <Text style={[dynamicStyles.tableCell, { width: 150 }]} numberOfLines={1}>{word.lesson || '-'}</Text>
            <Text style={[dynamicStyles.tableCell, { width: 80, textAlign: 'center' }]}>
              {word.stats ? `${word.stats.success_count + word.stats.failure_count}x` : (word.repetition || '0x')}
            </Text>
            <Text style={[dynamicStyles.tableCell, { width: 100 }]}>{word.date_learned || '-'}</Text>
            <Text style={[dynamicStyles.tableCell, { width: 100 }]}>
              {word.stats?.last_reviewed_date
                ? new Date(word.stats.last_reviewed_date).toLocaleDateString('cs-CZ')
                : (word.last_reviewed || '-')}
            </Text>
            <View style={{ width: 80, alignItems: 'center', justifyContent: 'center' }}>
              {word.story && word.story !== '-' ? (
                <TouchableOpacity onPress={() => setSelectedStory(word.story)} style={dynamicStyles.tableStoryBtn}>
                  <Text>📖</Text>
                </TouchableOpacity>
              ) : (
                <Text style={{ color: theme.textSecondary }}>-</Text>
              )}
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderCards = () => (
    <View style={dynamicStyles.listContainer}>
      {paginatedData.map((word, index) => (
        <View key={index} style={dynamicStyles.wordCard}>
          <View style={dynamicStyles.wordHeader}>
            <Text style={dynamicStyles.foreignText}>{word.foreign}</Text>
            <Text style={dynamicStyles.czechText}>{word.czech}</Text>
          </View>
          <Text style={dynamicStyles.pronunciationText}>[{word.pronunciation}]</Text>

          <View style={dynamicStyles.divider} />

          <View style={dynamicStyles.statsContainer}>
            <View style={dynamicStyles.statRow}>
              <Text style={dynamicStyles.statLabel}>Lekce:</Text>
              <Text style={dynamicStyles.statValue}>{word.lesson || '-'}</Text>
            </View>
            <View style={dynamicStyles.statRow}>
              <Text style={dynamicStyles.statLabel}>Zopakováno:</Text>
              <Text style={dynamicStyles.statValue}>
                {word.stats ? `${word.stats.success_count + word.stats.failure_count}x` : (word.repetition || '0x')}
              </Text>
            </View>
            <View style={dynamicStyles.statRow}>
              <Text style={dynamicStyles.statLabel}>Naučeno:</Text>
              <Text style={dynamicStyles.statValue}>{word.date_learned || '-'}</Text>
            </View>
            <View style={dynamicStyles.statRow}>
              <Text style={dynamicStyles.statLabel}>Procvičeno:</Text>
              <Text style={dynamicStyles.statValue}>
                {word.stats?.last_reviewed_date
                  ? new Date(word.stats.last_reviewed_date).toLocaleDateString('cs-CZ')
                  : (word.last_reviewed || '-')}
              </Text>
            </View>
          </View>

          {word.story && word.story !== '-' && (
            <TouchableOpacity
              style={dynamicStyles.storyLink}
              onPress={() => setSelectedStory(word.story)}
            >
              <Text style={dynamicStyles.storyLinkText}>📖 Zobrazit příběh</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <StatusBar barStyle={theme.statusBarStyle} backgroundColor={theme.background} />

      <View style={[dynamicStyles.header, { flexDirection: 'row', alignItems: 'center' }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 15, padding: 5 }}>
          <Text style={{ fontSize: 24 }}>🔙</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={dynamicStyles.headerTitle}>Slovník</Text>
          <Text style={dynamicStyles.subtitle}>Přehled všech slovíček ({vocabulary?.length || 0})</Text>
        </View>
        <TouchableOpacity
          style={dynamicStyles.viewToggleBtn}
          onPress={() => setViewMode(viewMode === 'cards' ? 'table' : 'cards')}
        >
          <Text style={dynamicStyles.viewToggleIcon}>{viewMode === 'cards' ? '📋' : '🗂️'}</Text>
        </TouchableOpacity>
      </View>

      <View style={dynamicStyles.sortContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={dynamicStyles.sortScroll}>
          <TouchableOpacity style={[dynamicStyles.sortBtn, sortBy === 'alphabet' && dynamicStyles.sortBtnActive]} onPress={() => toggleSort('alphabet')}>
            <Text style={[dynamicStyles.sortBtnText, sortBy === 'alphabet' && dynamicStyles.sortBtnTextActive]}>Abeceda {renderSortIcon('alphabet')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[dynamicStyles.sortBtn, sortBy === 'date_learned' && dynamicStyles.sortBtnActive]} onPress={() => toggleSort('date_learned')}>
            <Text style={[dynamicStyles.sortBtnText, sortBy === 'date_learned' && dynamicStyles.sortBtnTextActive]}>Naučeno {renderSortIcon('date_learned')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[dynamicStyles.sortBtn, sortBy === 'last_reviewed' && dynamicStyles.sortBtnActive]} onPress={() => toggleSort('last_reviewed')}>
            <Text style={[dynamicStyles.sortBtnText, sortBy === 'last_reviewed' && dynamicStyles.sortBtnTextActive]}>Procvičeno {renderSortIcon('last_reviewed')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[dynamicStyles.sortBtn, sortBy === 'repetition' && dynamicStyles.sortBtnActive]} onPress={() => toggleSort('repetition')}>
            <Text style={[dynamicStyles.sortBtnText, sortBy === 'repetition' && dynamicStyles.sortBtnTextActive]}>Zopakováno {renderSortIcon('repetition')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView style={{ flex: 1 }}>
        {viewMode === 'cards' ? renderCards() : renderTable()}
      </ScrollView>

      <View style={dynamicStyles.paginationContainer}>
        <TouchableOpacity
          style={[dynamicStyles.pageBtn, currentPage === 1 && dynamicStyles.pageBtnDisabled]}
          onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
          disabled={currentPage === 1}
        >
          <Text style={dynamicStyles.pageBtnText}>Předchozí</Text>
        </TouchableOpacity>

        <Text style={dynamicStyles.pageText}>{currentPage} / {totalPages}</Text>

        <TouchableOpacity
          style={[dynamicStyles.pageBtn, currentPage === totalPages && dynamicStyles.pageBtnDisabled]}
          onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
        >
          <Text style={dynamicStyles.pageBtnText}>Další</Text>
        </TouchableOpacity>
      </View>

      <Modal
        animationType="fade"
        transparent={true}
        visible={!!selectedStory}
        onRequestClose={() => setSelectedStory(null)}
      >
        <Pressable style={dynamicStyles.modalOverlay} onPress={() => setSelectedStory(null)}>
          <View style={dynamicStyles.modalContent}>
            <Text style={dynamicStyles.modalTitle}>Příběh k zapamatování</Text>
            <Text style={dynamicStyles.modalStoryText}>{selectedStory}</Text>
            <TouchableOpacity
              style={dynamicStyles.modalCloseBtn}
              onPress={() => setSelectedStory(null)}
            >
              <Text style={dynamicStyles.modalCloseText}>Zavřít</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

    </SafeAreaView>
  );
}
