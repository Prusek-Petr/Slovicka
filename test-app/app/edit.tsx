// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, StatusBar, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useVocabulary } from '../context/VocabularyContext';
import { useTheme } from '../context/ThemeContext';

const parseDate = (dateStr) => {
  if (!dateStr || dateStr === '-') return new Date(0);
  if (dateStr.includes('.')) {
    const parts = dateStr.split('.');
    if (parts.length === 3) return new Date(parts[2], parts[1] - 1, parts[0]);
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return new Date(0);
  return d;
};

export default function EditScreen() {
  const router = useRouter();
  const { vocabulary, isLoading, toggleFlag, markAllAsLearned, language } = useVocabulary();
  const { theme } = useTheme();

  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('date_learned');
  const [sortDesc, setSortDesc] = useState(true);

  const ITEMS_PER_PAGE = 30;

  const sortedData = useMemo(() => {
    if (!vocabulary) return [];
    let sorted = [...vocabulary];
    
    sorted.sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'date_learned') {
        comparison = parseDate(a.date_learned) - parseDate(b.date_learned);
      } else if (sortBy === 'last_reviewed') {
        const dateA = a.stats?.last_reviewed_date ? new Date(a.stats.last_reviewed_date) : parseDate(a.last_reviewed);
        const dateB = b.stats?.last_reviewed_date ? new Date(b.stats.last_reviewed_date) : parseDate(b.last_reviewed);
        comparison = dateA - dateB;
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
      setSortDesc(true);
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
      markAllBtn: { backgroundColor: theme.secondary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: theme.buttonBorderRadius, borderWidth: theme.borderWidth > 0 ? 1 : 0, borderColor: theme.border },
      markAllBtnText: { fontWeight: '700', color: theme.textPrimary },
      sortContainer: { marginBottom: 10 },
      sortScroll: { paddingHorizontal: 20, gap: 10, paddingBottom: 5 },
      sortBtn: { backgroundColor: theme.secondary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: theme.buttonBorderRadius, borderWidth: theme.borderWidth, borderColor: theme.border },
      sortBtnActive: { backgroundColor: theme.primary, borderColor: theme.name === 'marioDark' ? '#000' : theme.primary },
      sortBtnText: { color: theme.textPrimary, fontWeight: '600', fontSize: 14 },
      sortBtnTextActive: { color: '#fff' },
      tableWrapper: { marginHorizontal: 15, backgroundColor: theme.cardBackground, borderRadius: theme.cardBorderRadius, padding: 10, marginBottom: 20, borderWidth: theme.borderWidth, borderColor: theme.border },
      tableHeaderRow: { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: theme.name === 'marioDark' ? theme.border : '#e0e0e0', paddingBottom: 10, marginBottom: 5 },
      tableCellHeader: { fontWeight: '700', color: theme.textPrimary, fontSize: 14, paddingHorizontal: 8 },
      tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: theme.name === 'marioDark' ? theme.border : '#f0f0f0', paddingVertical: 12, alignItems: 'center' },
      tableRowAlt: { backgroundColor: theme.name === 'marioDark' ? '#111' : '#fafafa' },
      tableCell: { fontSize: 15, color: theme.textPrimary, paddingHorizontal: 8 },
      checkboxBtn: { padding: 5 },
      paginationContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: theme.name === 'marioDark' ? theme.background : '#ffffff', borderTopWidth: 1, borderTopColor: theme.name === 'marioDark' ? theme.border : '#e0e0e0' },
      pageBtn: { backgroundColor: theme.secondary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: theme.buttonBorderRadius, borderWidth: theme.borderWidth, borderColor: theme.border },
      pageBtnDisabled: { opacity: 0.4 },
      pageBtnText: { color: theme.textPrimary, fontWeight: '700' },
      pageText: { fontWeight: '600', color: theme.textSecondary },
    });
  }, [theme]);

  if (isLoading) {
    return (
      <SafeAreaView style={[dynamicStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </SafeAreaView>
    );
  }

  const getIcon = (defaultIcon, marioIcon) => theme.name === 'marioDark' ? marioIcon : defaultIcon;

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <StatusBar barStyle={theme.statusBarStyle} backgroundColor={theme.background} />
      
      <View style={[dynamicStyles.header, { flexDirection: 'row', alignItems: 'center' }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 15, padding: 5 }}>
          <Text style={{ fontSize: 24 }}>🔙</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={dynamicStyles.headerTitle}>Editace databáze</Text>
          <Text style={dynamicStyles.subtitle}>Označování slovíček ({vocabulary?.length || 0})</Text>
        </View>
        <TouchableOpacity 
          style={dynamicStyles.markAllBtn} 
          onPress={markAllAsLearned}
        >
          <Text style={dynamicStyles.markAllBtnText}>Vše naučeno ✅</Text>
        </TouchableOpacity>
      </View>

      <View style={dynamicStyles.sortContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={dynamicStyles.sortScroll}>
          <TouchableOpacity style={[dynamicStyles.sortBtn, sortBy === 'date_learned' && dynamicStyles.sortBtnActive]} onPress={() => toggleSort('date_learned')}>
            <Text style={[dynamicStyles.sortBtnText, sortBy === 'date_learned' && dynamicStyles.sortBtnTextActive]}>Naučeno {renderSortIcon('date_learned')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[dynamicStyles.sortBtn, sortBy === 'last_reviewed' && dynamicStyles.sortBtnActive]} onPress={() => toggleSort('last_reviewed')}>
            <Text style={[dynamicStyles.sortBtnText, sortBy === 'last_reviewed' && dynamicStyles.sortBtnTextActive]}>Procvičeno {renderSortIcon('last_reviewed')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView horizontal style={{ flex: 1 }}>
        <ScrollView style={dynamicStyles.tableWrapper}>
          <View style={dynamicStyles.tableHeaderRow}>
            <Text style={[dynamicStyles.tableCellHeader, { width: 140 }]}>{language === 'de' ? 'Německy' : 'Anglicky'}</Text>
            <Text style={[dynamicStyles.tableCellHeader, { width: 140 }]}>Česky</Text>
            <Text style={[dynamicStyles.tableCellHeader, { width: 90, textAlign: 'center' }]}>Naučeno</Text>
            <Text style={[dynamicStyles.tableCellHeader, { width: 90, textAlign: 'center' }]}>Problémové</Text>
            <Text style={[dynamicStyles.tableCellHeader, { width: 100 }]}>Datum naučení</Text>
            <Text style={[dynamicStyles.tableCellHeader, { width: 100 }]}>Poslední cv.</Text>
          </View>

          {paginatedData.map((word, index) => {
            const isLearned = word.stats?.is_learned || false;
            const isProblematic = word.stats?.is_problematic || false;

            return (
              <View key={index} style={[dynamicStyles.tableRow, index % 2 === 1 && dynamicStyles.tableRowAlt]}>
                <Text style={[dynamicStyles.tableCell, { width: 140, fontWeight: '700' }]} numberOfLines={1}>{word.foreign}</Text>
                <Text style={[dynamicStyles.tableCell, { width: 140, color: theme.name === 'marioDark' ? theme.accent : theme.primary }]} numberOfLines={1}>{word.czech}</Text>
                
                <View style={{ width: 90, alignItems: 'center' }}>
                  <TouchableOpacity onPress={() => toggleFlag(word.foreign, 'is_learned')} style={dynamicStyles.checkboxBtn}>
                    <Text style={{ fontSize: 20 }}>{isLearned ? getIcon('✅', '⭐') : '⬜'}</Text>
                  </TouchableOpacity>
                </View>

                <View style={{ width: 90, alignItems: 'center' }}>
                  <TouchableOpacity onPress={() => toggleFlag(word.foreign, 'is_problematic')} style={dynamicStyles.checkboxBtn}>
                    <Text style={{ fontSize: 20 }}>{isProblematic ? getIcon('⚠️', '🔥') : '⬜'}</Text>
                  </TouchableOpacity>
                </View>

                <Text style={[dynamicStyles.tableCell, { width: 100, fontSize: 13, color: theme.textSecondary }]}>{word.date_learned || '-'}</Text>
                <Text style={[dynamicStyles.tableCell, { width: 100, fontSize: 13, color: theme.textSecondary }]}>
                  {word.stats?.last_reviewed_date 
                    ? new Date(word.stats.last_reviewed_date).toLocaleDateString('cs-CZ') 
                    : (word.last_reviewed || '-')}
                </Text>
              </View>
            );
          })}
        </ScrollView>
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
    </SafeAreaView>
  );
}
