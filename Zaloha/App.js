import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions, SafeAreaView, StatusBar, Animated } from 'react-native';

// Import data
import slovickaData from './slovicka_app.json';

const { width } = Dimensions.get('window');

const Flashcard = ({ word, flipped, setFlipped }) => {
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(spinValue, {
      toValue: flipped ? 1 : 0,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [flipped]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const backSpin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['-180deg', '0deg'],
  });

  const frontOpacity = spinValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0, 0],
  });

  const backOpacity = spinValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  if (!word) return null;

  return (
    <TouchableOpacity 
      activeOpacity={0.9} 
      onPress={() => setFlipped(!flipped)}
      style={styles.cardContainer}
    >
      {/* Front of the card */}
      <Animated.View style={[styles.card, styles.cardFront, { 
        transform: [{ perspective: 1000 }, { rotateY: spin }],
        opacity: frontOpacity
      }]}>
        <View style={styles.cardContent}>
          <Text style={styles.englishText}>{word.english}</Text>
          <Text style={styles.pronunciationText}>[{word.pronunciation}]</Text>
        </View>
        <Text style={styles.hintText}>Dotykem otoč</Text>
      </Animated.View>

      {/* Back of the card */}
      <Animated.View style={[styles.card, styles.cardBack, { 
        transform: [{ perspective: 1000 }, { rotateY: backSpin }],
        opacity: backOpacity,
        position: 'absolute'
      }]}>
        <View style={styles.cardContent}>
          <Text style={styles.czechText}>{word.czech}</Text>
          <Text style={styles.storyText}>{word.story}</Text>
        </View>
        <Text style={styles.hintText}>Dotykem otoč</Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function App() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const handleNextWord = () => {
    setFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % slovickaData.length);
    }, 150);
  };

  const currentWord = slovickaData[currentIndex];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f0f2f5" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Slovíčka</Text>
        <Text style={styles.counterText}>{currentIndex + 1} / {slovickaData.length}</Text>
      </View>

      <View style={styles.mainContent}>
        <Flashcard 
          word={currentWord} 
          flipped={flipped} 
          setFlipped={setFlipped} 
        />
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.buttonBad]} 
          onPress={handleNextWord}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Neumím ❌</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.buttonGood]} 
          onPress={handleNextWord}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Umím ✔️</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  counterText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContainer: {
    width: width * 0.85,
    height: width * 1.1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
    backfaceVisibility: 'hidden',
    justifyContent: 'space-between',
  },
  cardFront: {
  },
  cardBack: {
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  englishText: {
    fontSize: 42,
    fontWeight: '800',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 15,
  },
  pronunciationText: {
    fontSize: 22,
    fontWeight: '500',
    color: '#666',
    textAlign: 'center',
  },
  czechText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#2b5cff',
    textAlign: 'center',
    marginBottom: 20,
  },
  storyText: {
    fontSize: 18,
    lineHeight: 28,
    color: '#444',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  hintText: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 50,
    gap: 15,
  },
  button: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonBad: {
    backgroundColor: '#ff4b4b',
  },
  buttonGood: {
    backgroundColor: '#00d26a',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
});
