// @ts-nocheck
import { Slot } from 'expo-router';
import { VocabularyProvider } from '../context/VocabularyContext';
import { ThemeProvider } from '../context/ThemeContext';

export default function Layout() {
  return (
    <ThemeProvider>
      <VocabularyProvider>
        <Slot />
      </VocabularyProvider>
    </ThemeProvider>
  );
}
