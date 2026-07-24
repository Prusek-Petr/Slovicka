// @ts-nocheck
import React, { useState, useMemo, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, StatusBar, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useVocabulary } from '../context/VocabularyContext';
import grammarDataDe from '../grammar_de.json';
import grammarDataEn from '../grammar_en.json';

export default function GrammarLearnScreen() {
  const { lessonId } = useLocalSearchParams();
  const router = useRouter();
  const { theme } = useTheme();
  const { language } = useVocabulary();

  const grammarData = language === 'de' ? grammarDataDe : grammarDataEn;
  const lesson = useMemo(() => grammarData.find(l => l.id === lessonId), [lessonId, grammarData]);
  
  const [phase, setPhase] = useState('theory'); // 'theory' -> 'test' -> 'result'
  const [exerciseIndex, setExerciseIndex] = useState(0);
  
  // Sentence Builder State
  const [selectedWords, setSelectedWords] = useState([]);
  const [availableWords, setAvailableWords] = useState([]);
  
  // Conjugation State
  const [selectedOption, setSelectedOption] = useState(null);
  
  const [testFeedback, setTestFeedback] = useState(null); // 'correct' | 'incorrect' | null
  const [testResults, setTestResults] = useState([]);

  const currentExercise = lesson?.exercises[exerciseIndex];

  // Initialize available words for sentence builder
  useEffect(() => {
    if (currentExercise?.type === 'sentence_builder') {
      setAvailableWords([...currentExercise.words].sort(() => Math.random() - 0.5));
      setSelectedWords([]);
      setSelectedOption(null);
      setTestFeedback(null);
    } else if (currentExercise?.type === 'conjugation') {
      setSelectedOption(null);
      setTestFeedback(null);
    }
  }, [currentExercise]);

  const dynamicStyles = useMemo(() => {
    return StyleSheet.create({
      container: { flex: 1, backgroundColor: theme.background },
      header: { paddingHorizontal: 20, paddingTop: 40, paddingBottom: 20, flexDirection: 'row', alignItems: 'center' },
      headerTitle: { fontSize: 22, fontWeight: '700', color: theme.textPrimary },
      counterText: { fontSize: 16, color: theme.textSecondary, fontWeight: '600' },
      mainContent: { flex: 1, padding: 20, justifyContent: 'center' },
      card: {
        backgroundColor: theme.cardBackground,
        borderRadius: theme.cardBorderRadius,
        padding: 30,
        shadowColor: '#000',
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: theme.shadowOpacity,
        shadowRadius: theme.name === 'marioDark' ? 0 : 15,
        elevation: 5,
        borderWidth: theme.borderWidth,
        borderColor: theme.border,
      },
      theoryTitle: { fontSize: 24, fontWeight: '800', color: theme.textPrimary, marginBottom: 20, textAlign: 'center' },
      theoryText: { fontSize: 18, color: theme.textPrimary, marginBottom: 15, lineHeight: 26 },
      buttonContainer: { padding: 20, paddingBottom: 40 },
      primaryBtn: {
        backgroundColor: theme.primary,
        paddingVertical: 18,
        borderRadius: theme.buttonBorderRadius,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: theme.borderWidth,
        borderColor: theme.border,
      },
      btnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
      
      // Exercise Styles
      exerciseTitle: { fontSize: 20, fontWeight: '700', color: theme.textSecondary, marginBottom: 20, textAlign: 'center' },
      czechText: { fontSize: 24, fontWeight: '800', color: theme.textPrimary, textAlign: 'center', marginBottom: 30 },
      
      // Sentence Builder
      sentenceArea: { minHeight: 60, flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 30, padding: 10, backgroundColor: theme.name === 'marioDark' ? '#000' : '#f5f7fa', borderRadius: 10, borderWidth: theme.borderWidth > 0 ? 2 : 0, borderColor: theme.border },
      wordsArea: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
      wordBlock: { backgroundColor: theme.secondary, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, borderWidth: theme.borderWidth > 0 ? 2 : 0, borderColor: theme.border },
      wordText: { fontSize: 18, fontWeight: '600', color: theme.textPrimary },
      
      // Conjugation
      conjugationBox: { alignItems: 'center', marginBottom: 30 },
      pronounText: { fontSize: 32, fontWeight: '800', color: theme.primary, marginBottom: 10 },
      verbText: { fontSize: 20, color: theme.textSecondary, marginBottom: 20 },
      optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 15, justifyContent: 'center' },
      optionBtn: { width: '45%', backgroundColor: theme.secondary, paddingVertical: 15, borderRadius: 12, alignItems: 'center', borderWidth: theme.borderWidth > 0 ? 2 : 0, borderColor: theme.border },
      optionBtnSelected: { backgroundColor: theme.primary, borderColor: theme.name === 'marioDark' ? '#000' : theme.primary },
      optionText: { fontSize: 18, fontWeight: '700', color: theme.textPrimary },
      optionTextSelected: { color: '#fff' },
      
      // Feedback
      feedbackBoxCorrect: { marginTop: 20, alignItems: 'center', padding: 15, backgroundColor: theme.name === 'marioDark' ? '#113311' : '#e6faf0', borderRadius: theme.cardBorderRadius > 0 ? 12 : 0, borderWidth: theme.borderWidth > 0 ? 2 : 0, borderColor: '#43B047' },
      feedbackTextCorrect: { fontSize: 20, fontWeight: '700', color: theme.name === 'marioDark' ? '#43B047' : '#00d26a' },
      feedbackBoxIncorrect: { marginTop: 20, alignItems: 'center', padding: 15, backgroundColor: theme.name === 'marioDark' ? '#330000' : '#ffebeb', borderRadius: theme.cardBorderRadius > 0 ? 12 : 0, borderWidth: theme.borderWidth > 0 ? 2 : 0, borderColor: '#D82800' },
      feedbackTextIncorrect: { fontSize: 20, fontWeight: '700', color: theme.name === 'marioDark' ? '#D82800' : '#ff4b4b', marginBottom: 10 },
      feedbackCorrectAnswer: { fontSize: 18, fontWeight: '700', color: theme.textPrimary, marginTop: 5 },
      
      // Results
      resultEmoji: { fontSize: 80, textAlign: 'center', marginBottom: 20 },
      resultTitle: { fontSize: 32, fontWeight: '800', textAlign: 'center', color: theme.textPrimary, marginBottom: 10 },
      resultScore: { fontSize: 48, fontWeight: '800', textAlign: 'center', color: theme.primary, marginBottom: 10 },
      secondaryBtn: { backgroundColor: theme.secondary, paddingVertical: 18, borderRadius: theme.buttonBorderRadius, alignItems: 'center', justifyContent: 'center', borderWidth: theme.borderWidth, borderColor: theme.border, marginTop: 15 },
      secondaryBtnText: { color: theme.textPrimary, fontSize: 18, fontWeight: '700' },
    });
  }, [theme]);

  if (!lesson) return null;

  const handleWordTap = (word, index) => {
    if (testFeedback) return;
    const newAvailable = [...availableWords];
    newAvailable.splice(index, 1);
    setAvailableWords(newAvailable);
    setSelectedWords([...selectedWords, word]);
  };

  const handleSelectedWordTap = (word, index) => {
    if (testFeedback) return;
    const newSelected = [...selectedWords];
    newSelected.splice(index, 1);
    setSelectedWords(newSelected);
    setAvailableWords([...availableWords, word]);
  };

  const handleCheck = () => {
    let isCorrect = false;

    if (currentExercise.type === 'sentence_builder') {
      if (selectedWords.length !== currentExercise.correct_order.length) return;
      isCorrect = selectedWords.join(' ') === currentExercise.correct_order.join(' ');
    } else if (currentExercise.type === 'conjugation') {
      if (!selectedOption) return;
      isCorrect = selectedOption === currentExercise.correct;
    }

    setTestFeedback(isCorrect ? 'correct' : 'incorrect');
    setTestResults(prev => [...prev, { exercise: currentExercise, correct: isCorrect }]);
  };

  const handleNext = () => {
    if (exerciseIndex < lesson.exercises.length - 1) {
      setExerciseIndex(prev => prev + 1);
    } else {
      setPhase('result');
    }
  };

  if (phase === 'theory') {
    return (
      <SafeAreaView style={dynamicStyles.container}>
        <StatusBar barStyle={theme.statusBarStyle} backgroundColor={theme.background} />
        <View style={dynamicStyles.header}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 15 }}>
            <Text style={{ fontSize: 24 }}>🔙</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={dynamicStyles.headerTitle} numberOfLines={1}>{lesson.title}</Text>
          </View>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
          <View style={dynamicStyles.card}>
            <Text style={dynamicStyles.theoryTitle}>Gramatický tahák 📝</Text>
            {lesson.theory.map((line, idx) => (
              <Text key={idx} style={dynamicStyles.theoryText}>
                {line.includes('[') ? (
                  <Text>
                    {line.split('[')[0]}
                    <Text style={{ color: theme.primary, fontWeight: '800' }}>{line.split('[')[1].split(']')[0]}</Text>
                    {line.split(']')[1]}
                  </Text>
                ) : line}
              </Text>
            ))}
          </View>
        </ScrollView>

        <View style={dynamicStyles.buttonContainer}>
          <TouchableOpacity style={dynamicStyles.primaryBtn} onPress={() => setPhase('test')} activeOpacity={0.8}>
            <Text style={dynamicStyles.btnText}>Jdu testovat! ▶</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (phase === 'test') {
    return (
      <SafeAreaView style={dynamicStyles.container}>
        <StatusBar barStyle={theme.statusBarStyle} backgroundColor={theme.background} />
        <View style={dynamicStyles.header}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 15 }}>
            <Text style={{ fontSize: 24 }}>🔙</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={dynamicStyles.headerTitle} numberOfLines={1}>Test gramatiky</Text>
          </View>
          <Text style={dynamicStyles.counterText}>{exerciseIndex + 1} / {lesson.exercises.length}</Text>
        </View>

        <View style={dynamicStyles.mainContent}>
          <View style={dynamicStyles.card}>
            
            {currentExercise.type === 'sentence_builder' && (
              <View>
                <Text style={dynamicStyles.exerciseTitle}>Poskládejte větu:</Text>
                <Text style={dynamicStyles.czechText}>{currentExercise.czech}</Text>
                
                <View style={dynamicStyles.sentenceArea}>
                  {selectedWords.map((word, idx) => (
                    <TouchableOpacity key={idx} style={dynamicStyles.wordBlock} onPress={() => handleSelectedWordTap(word, idx)}>
                      <Text style={dynamicStyles.wordText}>{word}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={dynamicStyles.wordsArea}>
                  {availableWords.map((word, idx) => (
                    <TouchableOpacity key={idx} style={dynamicStyles.wordBlock} onPress={() => handleWordTap(word, idx)}>
                      <Text style={dynamicStyles.wordText}>{word}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {currentExercise.type === 'conjugation' && (
              <View>
                <Text style={dynamicStyles.exerciseTitle}>Doplňte správný tvar slovesa:</Text>
                <View style={dynamicStyles.conjugationBox}>
                  <Text style={dynamicStyles.pronounText}>{currentExercise.pronoun}</Text>
                  <Text style={dynamicStyles.verbText}>({currentExercise.verb})</Text>
                </View>
                
                <View style={dynamicStyles.optionsGrid}>
                  {currentExercise.options.map((opt, idx) => (
                    <TouchableOpacity 
                      key={idx} 
                      style={[dynamicStyles.optionBtn, selectedOption === opt && dynamicStyles.optionBtnSelected]} 
                      onPress={() => !testFeedback && setSelectedOption(opt)}
                    >
                      <Text style={[dynamicStyles.optionText, selectedOption === opt && dynamicStyles.optionTextSelected]}>{opt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {testFeedback === 'correct' && (
              <View style={dynamicStyles.feedbackBoxCorrect}>
                <Text style={dynamicStyles.feedbackTextCorrect}>Správně! ✅</Text>
              </View>
            )}

            {testFeedback === 'incorrect' && (
              <View style={dynamicStyles.feedbackBoxIncorrect}>
                <Text style={dynamicStyles.feedbackTextIncorrect}>Chyba! ❌</Text>
                <Text style={{color: theme.textSecondary}}>Správná odpověď:</Text>
                <Text style={dynamicStyles.feedbackCorrectAnswer}>
                  {currentExercise.type === 'sentence_builder' ? currentExercise.correct_order.join(' ') : currentExercise.correct}
                </Text>
              </View>
            )}

          </View>
        </View>

        <View style={dynamicStyles.buttonContainer}>
          {testFeedback === null ? (
            <TouchableOpacity 
              style={[
                dynamicStyles.primaryBtn, 
                ((currentExercise.type === 'sentence_builder' && selectedWords.length !== currentExercise.correct_order.length) ||
                 (currentExercise.type === 'conjugation' && !selectedOption)) && { opacity: 0.5 }
              ]} 
              onPress={handleCheck} 
              activeOpacity={0.8}
            >
              <Text style={dynamicStyles.btnText}>Zkontrolovat</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[dynamicStyles.primaryBtn, { backgroundColor: theme.name === 'marioDark' ? '#111' : '#1a1a1a' }]} onPress={handleNext} activeOpacity={0.8}>
              <Text style={dynamicStyles.btnText}>Dále ▶</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  if (phase === 'result') {
    const correctCount = testResults.filter(r => r.correct).length;
    const totalCount = lesson.exercises.length;
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

        <View style={dynamicStyles.buttonContainer}>
          <TouchableOpacity style={dynamicStyles.primaryBtn} onPress={() => {
            setPhase('theory');
            setExerciseIndex(0);
            setTestResults([]);
            setTestFeedback(null);
          }} activeOpacity={0.8}>
            <Text style={dynamicStyles.btnText}>Zopakovat lekci 🔄</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={dynamicStyles.secondaryBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <Text style={dynamicStyles.secondaryBtnText}>Zpět na menu 🚪</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return null;
}
