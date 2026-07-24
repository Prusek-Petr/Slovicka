// @ts-nocheck
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import slovickaData from '../slovicka_app.json';
import slovickaDe from '../slovicka_de.json';

const VocabularyContext = createContext();

export const VocabularyProvider = ({ children }: { children: any }) => {
  const [language, setLanguageState] = useState('en'); // 'en' | 'de'
  const [vocabulary, setVocabulary] = useState([]);
  const [streakData, setStreakData] = useState({ currentStreak: 0, lastActiveDate: null });
  const [isLoading, setIsLoading] = useState(true);

  // Initialize language first
  useEffect(() => {
    const initLang = async () => {
      const storedLang = await AsyncStorage.getItem('@active_language');
      if (storedLang === 'en' || storedLang === 'de') {
        setLanguageState(storedLang);
      }
    };
    initLang();
  }, []);

  const setLanguage = async (lang: string) => {
    setIsLoading(true);
    setLanguageState(lang);
    await AsyncStorage.setItem('@active_language', lang);
  };

  const getStorageKey = useCallback(() => {
    return language === 'de' ? '@slovicka_stats_de' : '@slovicka_stats';
  }, [language]);

  // Load vocabulary whenever language changes
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load Streak (streak is global, not per language)
        const storedStreakString = await AsyncStorage.getItem('@streak_data');
        if (storedStreakString) {
          const parsedStreak = JSON.parse(storedStreakString);
          if (parsedStreak.lastActiveDate) {
            const lastDate = new Date(parsedStreak.lastActiveDate);
            const today = new Date();
            lastDate.setHours(0,0,0,0);
            today.setHours(0,0,0,0);
            
            const diffTime = today.getTime() - lastDate.getTime();
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)); 
            
            if (diffDays > 1) {
              parsedStreak.currentStreak = 0; // broken streak
            }
          }
          setStreakData(parsedStreak);
        }

        // Load Vocab for current language
        const storageKey = getStorageKey();
        const storedStatsString = await AsyncStorage.getItem(storageKey);
        const storedStats = storedStatsString ? JSON.parse(storedStatsString) : {};

        const sourceData = language === 'de' ? slovickaDe : slovickaData;

        const mergedData = (sourceData as any[]).map(word => {
          const foreignWord = language === 'de' ? word.german : word.english;
          const stats = storedStats[foreignWord] || {
            success_count: 0,
            failure_count: 0,
            last_reviewed_date: null,
            history: [],
            is_learned: false,
            is_problematic: false
          };

          return {
            ...word,
            foreign: foreignWord, // NORMALIZED FIELD
            stats: {
              ...stats,
              is_learned: stats.is_learned || false,
              is_problematic: stats.is_problematic || false
            }
          };
        });

        setVocabulary(mergedData);
      } catch (e) {
        console.error('Failed to load data', e);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [language, getStorageKey]);

  const saveToStorage = useCallback(async (vocabArray: any[]) => {
    try {
      const statsToSave = {};
      vocabArray.forEach(w => {
        if (w.stats.success_count > 0 || w.stats.failure_count > 0 || w.stats.is_learned || w.stats.is_problematic) {
          statsToSave[w.foreign] = w.stats;
        }
      });
      await AsyncStorage.setItem(getStorageKey(), JSON.stringify(statsToSave));
    } catch (e) {
      console.error('Failed to save stats', e);
    }
  }, [getStorageKey]);

  const updateStreak = () => {
    setStreakData(prev => {
      const today = new Date();
      today.setHours(0,0,0,0);
      const todayStr = today.toISOString();
      
      let newStreak = { ...prev };
      
      if (!prev.lastActiveDate) {
        newStreak = { currentStreak: 1, lastActiveDate: todayStr };
      } else {
        const lastDate = new Date(prev.lastActiveDate);
        if (lastDate.getTime() < today.getTime()) {
           newStreak = { currentStreak: prev.currentStreak + 1, lastActiveDate: todayStr };
        }
      }
      
      if (newStreak.lastActiveDate !== prev.lastActiveDate) {
        AsyncStorage.setItem('@streak_data', JSON.stringify(newStreak)).catch(e => console.log(e));
      }
      
      return newStreak;
    });
  };

  // Record an attempt
  const recordAttempt = useCallback(async (foreignWord: string, isSuccess: boolean) => {
    updateStreak();

    setVocabulary(prev => {
      const newVocab = prev.map(word => {
        if (word.foreign === foreignWord) {
          const now = new Date().toISOString();
          const newHistory = [{ date: now, success: isSuccess }, ...word.stats.history].slice(0, 10);
          
          return {
            ...word,
            stats: {
              ...word.stats,
              success_count: word.stats.success_count + (isSuccess ? 1 : 0),
              failure_count: word.stats.failure_count + (isSuccess ? 0 : 1),
              last_reviewed_date: now,
              history: newHistory
            }
          };
        }
        return word;
      });

      saveToStorage(newVocab);
      return newVocab;
    });
  }, [saveToStorage]);

  // Toggle a boolean flag
  const toggleFlag = useCallback((foreignWord: string, flagName: string) => {
    setVocabulary(prev => {
      const newVocab = prev.map(word => {
        if (word.foreign === foreignWord) {
          return {
            ...word,
            stats: {
              ...word.stats,
              [flagName]: !word.stats[flagName]
            }
          };
        }
        return word;
      });

      saveToStorage(newVocab);
      return newVocab;
    });
  }, [saveToStorage]);

  // Clear all progress for current language
  const clearProgress = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(getStorageKey());
      
      const sourceData = language === 'de' ? slovickaDe : slovickaData;
      setVocabulary((sourceData as any[]).map(word => {
        const foreignWord = language === 'de' ? word.german : word.english;
        return { 
          ...word, 
          foreign: foreignWord,
          stats: { success_count: 0, failure_count: 0, last_reviewed_date: null, history: [], is_learned: false, is_problematic: false } 
        };
      }));
    } catch (e) {
      console.error('Failed to clear progress', e);
    }
  }, [language, getStorageKey]);

  // Mark all as learned
  const markAllAsLearned = useCallback(async () => {
    setVocabulary(prev => {
      const newVocab = prev.map(word => ({
        ...word,
        stats: {
          ...word.stats,
          is_learned: true
        }
      }));
      saveToStorage(newVocab);
      return newVocab;
    });
  }, [saveToStorage]);

  return (
    <VocabularyContext.Provider value={{ 
      vocabulary, 
      isLoading, 
      recordAttempt, 
      toggleFlag, 
      clearProgress, 
      markAllAsLearned, 
      streakData,
      language,
      setLanguage 
    }}>
      {children}
    </VocabularyContext.Provider>
  );
};

export const useVocabulary = () => useContext(VocabularyContext);
