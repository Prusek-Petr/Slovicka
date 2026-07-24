// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, StatusBar, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { useVocabulary } from '../context/VocabularyContext';
import { useTheme } from '../context/ThemeContext';

export default function LearnScreen() {
  const { lesson, mode } = useLocalSearchParams();
  const router = useRouter();
  const { vocabulary, isLoading, recordAttempt, language } = useVocabulary();
  const { theme } = useTheme();
  
  const initialPhase = (mode && mode !== 'problematic') ? 'test' : 'intro';
  const [phase, setPhase] = useState(initialPhase);
  const [wordIndex, setWordIndex] = useState(0);
  const [introSubStep, setIntroSubStep] = useState(0);
  
  const [inputText, setInputText] = useState('');
  const [testFeedback, setTestFeedback] = useState(null);
  const [testResults, setTestResults] = useState([]);

  const activeData = useMemo(() => {
    if (!vocabulary || vocabulary.length === 0) return [];
    
    let data = [...vocabulary];
    if (lesson) {
      data = data.filter(word => word.lesson === lesson);
    } else if (mode === 'random5') {
      data = data.sort(() => 0.5 - Math.random()).slice(0, 5);
    } else if (mode === 'last5') {
      data = data
        .filter(w => w.stats && w.stats.last_reviewed_date)
        .sort((a, b) => new Date(b.stats.last_reviewed_date) - new Date(a.stats.last_reviewed_date))
        .slice(0, 5);
    } else if (mode === 'problematic') {
      data = data.filter(w => w.stats && w.stats.is_problematic).sort(() => 0.5 - Math.random()).slice(0, 5);
    }
    return data;
  }, [lesson, mode, vocabulary]);

  const currentWord = activeData[wordIndex];

  const speakWord = (text) => {
    Speech.stop();
    Speech.speak(text, { language: language === 'de' ? 'de-DE' : 'en-US', rate: 0.85 });
  };

  let screenTitle = 'Všechna slovíčka';
  if (lesson) screenTitle = lesson;
  else if (mode === 'random5') screenTitle = '5 náhodných';
  else if (mode === 'last5') screenTitle = '5 naposledy zopakovaných';
  else if (mode === 'problematic') screenTitle = 'Problémová slovíčka';

  const handleIntroNext = () => {
    if (introSubStep < 2) {
      setIntroSubStep(prev => prev + 1);
    } else {
      if (wordIndex < activeData.length - 1) {
        setWordIndex(prev => prev + 1);
        setIntroSubStep(0);
      } else {
        setPhase('test');
        setWordIndex(0);
        setIntroSubStep(0);
      }
    }
  };

  const handleTestCheck = () => {
    if (!inputText.trim()) return;

    const isCorrect = inputText.trim().toLowerCase() === currentWord.foreign.toLowerCase();
    setTestFeedback(isCorrect ? 'correct' : 'incorrect');
    recordAttempt(currentWord.foreign, isCorrect);
    
    setTestResults(prev => [...prev, { word: currentWord, correct: isCorrect }]);
  };

  const handleTestNext = () => {
    if (wordIndex < activeData.length - 1) {
      setWordIndex(prev => prev + 1);
      setInputText('');
      setTestFeedback(null);
    } else {
      setPhase('result');
    }
  };

  const handleRestart = () => {
    setPhase((mode && mode !== 'problematic') ? 'test' : 'intro');
    setWordIndex(0);
    setIntroSubStep(0);
    setInputText('');
    setTestFeedback(null);
    setTestResults([]);
  };

  const dynamicStyles = useMemo(() => {
    return StyleSheet.create({
      container: { flex: 1, backgroundColor: theme.background },
      header: { paddingHorizontal: 20, paddingTop: 40, paddingBottom: 20, flexDirection: 'row', alignItems: 'center' },
      headerTitle: { fontSize: 22, fontWeight: '700', color: theme.textPrimary },
      counterText: { fontSize: 16, color: theme.textSecondary, fontWeight: '600' },
      mainContent: { flex: 1, padding: 20, justifyContent: 'center' },
      mainContentScroll: { flexGrow: 1, padding: 20, justifyContent: 'center' },
      card: {
        backgroundColor: theme.cardBackground,
        borderRadius: theme.cardBorderRadius,
        padding: 30,
        shadowColor: '#000',
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: theme.shadowOpacity,
        shadowRadius: theme.name === 'marioDark' ? 0 : 15,
        elevation: 5,
        minHeight: 300,
        justifyContent: 'center',
        borderWidth: theme.borderWidth,
        borderColor: theme.border,
      },
      wordBlock: { alignItems: 'center' },
      englishText: { fontSize: 42, fontWeight: '800', color: theme.textPrimary, textAlign: 'center', marginBottom: 5 },
      pronunciationText: { fontSize: 20, fontWeight: '500', color: theme.textSecondary, textAlign: 'center', marginBottom: 20 },
      czechText: { fontSize: 32, fontWeight: '700', color: theme.primary, textAlign: 'center' },
      storyBlock: { alignItems: 'center' },
      storyTitle: { fontSize: 16, color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, fontWeight: '700' },
      storyText: { fontSize: 20, lineHeight: 30, color: theme.textPrimary, textAlign: 'center', fontStyle: 'italic' },
      buttonContainer: { padding: 20, paddingBottom: 40 },
      buttonContainerCol: { padding: 20, paddingBottom: 40, gap: 15 },
      primaryBtn: {
        backgroundColor: theme.primary,
        paddingVertical: 18,
        borderRadius: theme.buttonBorderRadius,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: theme.borderWidth,
        borderColor: theme.border,
      },
      btnText: { color: theme.name === 'marioDark' && theme.primary === '#43B047' ? '#fff' : '#fff', fontSize: 18, fontWeight: '700' },
      secondaryBtn: {
        backgroundColor: theme.secondary,
        paddingVertical: 18,
        borderRadius: theme.buttonBorderRadius,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: theme.borderWidth,
        borderColor: theme.border,
      },
      secondaryBtnText: { color: theme.textPrimary, fontSize: 18, fontWeight: '700' },
      testSubtitle: { fontSize: 16, color: theme.textSecondary, textAlign: 'center', marginBottom: 10, fontWeight: '600', textTransform: 'uppercase' },
      czechTextBig: { fontSize: 36, fontWeight: '800', color: theme.textPrimary, textAlign: 'center', marginBottom: 30 },
      input: {
        backgroundColor: theme.name === 'marioDark' ? '#000' : '#f5f7fa',
        borderWidth: theme.borderWidth > 0 ? theme.borderWidth : 2,
        borderColor: theme.name === 'marioDark' ? theme.border : '#e4e6e9',
        borderRadius: theme.cardBorderRadius > 0 ? 15 : 0,
        padding: 18,
        fontSize: 22,
        textAlign: 'center',
        color: theme.textPrimary,
        fontWeight: '600',
      },
      inputCorrect: { borderColor: theme.name === 'marioDark' ? '#43B047' : '#00d26a', backgroundColor: theme.name === 'marioDark' ? '#113311' : '#e6faf0' },
      inputIncorrect: { borderColor: theme.name === 'marioDark' ? '#D82800' : '#ff4b4b', backgroundColor: theme.name === 'marioDark' ? '#330000' : '#ffebeb' },
      feedbackBoxCorrect: {
        marginTop: 20, alignItems: 'center', padding: 15,
        backgroundColor: theme.name === 'marioDark' ? '#113311' : '#e6faf0',
        borderRadius: theme.cardBorderRadius > 0 ? 12 : 0,
        borderWidth: theme.borderWidth > 0 ? 2 : 0,
        borderColor: '#43B047'
      },
      feedbackTextCorrect: { fontSize: 20, fontWeight: '700', color: theme.name === 'marioDark' ? '#43B047' : '#00d26a', marginBottom: 5 },
      feedbackBoxIncorrect: {
        marginTop: 20, alignItems: 'center', padding: 15,
        backgroundColor: theme.name === 'marioDark' ? '#330000' : '#ffebeb',
        borderRadius: theme.cardBorderRadius > 0 ? 12 : 0,
        borderWidth: theme.borderWidth > 0 ? 2 : 0,
        borderColor: '#D82800'
      },
      feedbackTextIncorrect: { fontSize: 20, fontWeight: '700', color: theme.name === 'marioDark' ? '#D82800' : '#ff4b4b', marginBottom: 10 },
      feedbackDetailTitle: { fontSize: 14, color: theme.textSecondary },
      feedbackDetailCorrectWord: { fontSize: 28, fontWeight: '800', color: theme.textPrimary, marginVertical: 5 },
      feedbackDetail: { fontSize: 18, color: theme.textSecondary },
      resultEmoji: { fontSize: 80, textAlign: 'center', marginBottom: 20 },
      resultTitle: { fontSize: 32, fontWeight: '800', textAlign: 'center', color: theme.textPrimary, marginBottom: 10 },
      resultScore: { fontSize: 48, fontWeight: '800', textAlign: 'center', color: theme.primary, marginBottom: 10 },
      resultPercentage: { fontSize: 20, fontWeight: '600', textAlign: 'center', color: theme.textSecondary },
    });
  }, [theme]);

  if (isLoading || activeData.length === 0) {
    return (
      <SafeAreaView style={[dynamicStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{color: theme.textPrimary}}>{isLoading ? 'Načítání...' : 'Žádná slovíčka nenalezena.'}</Text>
        {!isLoading && (
          <TouchableOpacity onPress={() => router.back()} style={dynamicStyles.primaryBtn}>
             <Text style={dynamicStyles.btnText}>Zpět</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>
    );
  }

  if (phase === 'intro') {
    return (
      <SafeAreaView style={dynamicStyles.container}>
        <StatusBar barStyle={theme.statusBarStyle} backgroundColor={theme.background} />
        <View style={dynamicStyles.header}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 15 }}>
            <Text style={{ fontSize: 24 }}>🔙</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={dynamicStyles.headerTitle} numberOfLines={1}>Fáze učení</Text>
          </View>
          <Text style={dynamicStyles.counterText}>{wordIndex + 1} / {activeData.length}</Text>
        </View>

        <View style={dynamicStyles.mainContent}>
          <View style={dynamicStyles.card}>
            {(introSubStep === 0 || introSubStep === 2) && (
              <View style={dynamicStyles.wordBlock}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={dynamicStyles.englishText}>{currentWord.foreign}</Text>
                  <TouchableOpacity onPress={() => speakWord(currentWord.foreign)} style={{ marginLeft: 15, padding: 5 }}>
                    <Text style={{ fontSize: 32 }}>🔊</Text>
                  </TouchableOpacity>
                </View>
                <Text style={dynamicStyles.pronunciationText}>[{currentWord.pronunciation}]</Text>
                <Text style={dynamicStyles.czechText}>{currentWord.czech}</Text>
              </View>
            )}

            {introSubStep === 1 && (
              <View style={dynamicStyles.storyBlock}>
                <Text style={dynamicStyles.storyTitle}>Příběh k zapamatování:</Text>
                <Text style={dynamicStyles.storyText}>{currentWord.story && currentWord.story !== '-' ? currentWord.story : 'K tomuto slovíčku zatím není příběh.'}</Text>
              </View>
            )}

            {introSubStep === 2 && (
              <View style={[dynamicStyles.storyBlock, { marginTop: 30, paddingTop: 30, borderTopWidth: 1, borderColor: theme.border }]}>
                <Text style={dynamicStyles.storyTitle}>Příběh:</Text>
                <Text style={dynamicStyles.storyText}>{currentWord.story && currentWord.story !== '-' ? currentWord.story : 'Žádný příběh.'}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={dynamicStyles.buttonContainer}>
          <TouchableOpacity style={dynamicStyles.primaryBtn} onPress={handleIntroNext} activeOpacity={0.8}>
            <Text style={dynamicStyles.btnText}>Dále ▶</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (phase === 'test') {
    return (
      <SafeAreaView style={dynamicStyles.container}>
        <StatusBar barStyle={theme.statusBarStyle} backgroundColor={theme.background} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={dynamicStyles.header}>
            <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 15 }}>
              <Text style={{ fontSize: 24 }}>🔙</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={dynamicStyles.headerTitle} numberOfLines={1}>Zkoušení</Text>
            </View>
            <Text style={dynamicStyles.counterText}>{wordIndex + 1} / {activeData.length}</Text>
          </View>

          <ScrollView contentContainerStyle={dynamicStyles.mainContentScroll} keyboardShouldPersistTaps="handled">
            <View style={dynamicStyles.card}>
              <Text style={dynamicStyles.testSubtitle}>Jak se řekne {language === 'de' ? 'německy' : 'anglicky'}?</Text>
              <Text style={dynamicStyles.czechTextBig}>{currentWord.czech}</Text>
              
              <TextInput
                style={[
                  dynamicStyles.input, 
                  testFeedback === 'correct' && dynamicStyles.inputCorrect,
                  testFeedback === 'incorrect' && dynamicStyles.inputIncorrect
                ]}
                placeholder={`Napiš ${language === 'de' ? 'německý' : 'anglický'} překlad...`}
                placeholderTextColor={theme.textSecondary}
                value={inputText}
                onChangeText={setInputText}
                editable={testFeedback === null}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus={true}
                onSubmitEditing={testFeedback === null ? handleTestCheck : handleTestNext}
              />

              {testFeedback === 'correct' && (
                <View style={dynamicStyles.feedbackBoxCorrect}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={dynamicStyles.feedbackTextCorrect}>Správně! ✅</Text>
                    <TouchableOpacity onPress={() => speakWord(currentWord.foreign)} style={{ marginLeft: 15 }}>
                      <Text style={{ fontSize: 24 }}>🔊</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={dynamicStyles.feedbackDetail}>[{currentWord.pronunciation}]</Text>
                </View>
              )}

              {testFeedback === 'incorrect' && (
                <View style={dynamicStyles.feedbackBoxIncorrect}>
                  <Text style={dynamicStyles.feedbackTextIncorrect}>Chyba! ❌</Text>
                  <Text style={dynamicStyles.feedbackDetailTitle}>Správná odpověď:</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={dynamicStyles.feedbackDetailCorrectWord}>{currentWord.foreign}</Text>
                    <TouchableOpacity onPress={() => speakWord(currentWord.foreign)} style={{ marginLeft: 15 }}>
                      <Text style={{ fontSize: 28 }}>🔊</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={dynamicStyles.feedbackDetail}>[{currentWord.pronunciation}]</Text>
                </View>
              )}
            </View>
          </ScrollView>

          <View style={dynamicStyles.buttonContainer}>
            {testFeedback === null ? (
              <TouchableOpacity style={dynamicStyles.primaryBtn} onPress={handleTestCheck} activeOpacity={0.8}>
                <Text style={dynamicStyles.btnText}>Zkontrolovat</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[dynamicStyles.primaryBtn, { backgroundColor: theme.name === 'marioDark' ? '#111' : '#1a1a1a' }]} onPress={handleTestNext} activeOpacity={0.8}>
                <Text style={dynamicStyles.btnText}>Dále ▶</Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  if (phase === 'result') {
    const correctCount = testResults.filter(r => r.correct).length;
    const totalCount = activeData.length;
    const percentage = Math.round((correctCount / totalCount) * 100);

    return (
      <SafeAreaView style={dynamicStyles.container}>
        <StatusBar barStyle={theme.statusBarStyle} backgroundColor={theme.background} />
        <View style={dynamicStyles.mainContent}>
          <Text style={dynamicStyles.resultEmoji}>
            {percentage === 100 ? (theme.name === 'marioDark' ? '⭐' : '🏆') : percentage >= 75 ? '👍' : percentage >= 50 ? '😐' : '🤦‍♂️'}
          </Text>
          <Text style={dynamicStyles.resultTitle}>Lekce dokončena!</Text>
          <Text style={dynamicStyles.resultScore}>{correctCount} / {totalCount}</Text>
          <Text style={dynamicStyles.resultPercentage}>Úspěšnost: {percentage} %</Text>
        </View>

        <View style={dynamicStyles.buttonContainerCol}>
          <TouchableOpacity style={dynamicStyles.primaryBtn} onPress={handleRestart} activeOpacity={0.8}>
            <Text style={dynamicStyles.btnText}>Zopakovat lekci 🔄</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={dynamicStyles.secondaryBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <Text style={dynamicStyles.secondaryBtnText}>Ukončit lekci 🚪</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return null;
}
