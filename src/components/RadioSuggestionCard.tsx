// RadioSuggestionCard - Compact component to suggest radios for live matches
import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Radio as RadioIcon } from 'lucide-react-native';
import { RadioCard } from './RadioCard';
import { radioApi } from '../services/radioApi';
import { Radio } from '../types/radio';

interface RadioSuggestionCardProps {
  homeTeam: string;
  awayTeam: string;
  onRadioPress: (radio: Radio) => void;
}

export const RadioSuggestionCard: React.FC<RadioSuggestionCardProps> = ({
  homeTeam,
  awayTeam,
  onRadioPress,
}) => {
  const suggestedRadios = useMemo(() => {
    return radioApi.suggestRadiosForMatch(homeTeam, awayTeam);
  }, [homeTeam, awayTeam]);

  if (suggestedRadios.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <RadioIcon color="#6366f1" size={16} />
        <Text style={styles.title}>Ouça ao vivo</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {suggestedRadios.slice(0, 4).map((radio) => (
          <RadioCard
            key={radio.id}
            radio={radio}
            onPress={() => onRadioPress(radio)}
            compact
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
});
