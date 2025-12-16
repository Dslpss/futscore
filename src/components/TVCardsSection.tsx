import React from 'react';
import { View, StyleSheet } from 'react-native';
import { EspnLiveCard } from './EspnLiveCard';
import { OndeAssistirCard } from './OndeAssistirCard';
import { NewsSliderCard } from './NewsSliderCard';

/**
 * Isolated component for TV Cards and News Slider
 * This component manages its own children and prevents re-renders from HomeScreen
 */
const TVCardsSectionContent: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* ESPN Live Games */}
      <EspnLiveCard />
      
      {/* Onde Assistir */}
      <OndeAssistirCard />
      
      {/* News Slider */}
      <NewsSliderCard />
    </View>
  );
};

// Export memoized component to prevent any re-renders from parent
export const TVCardsSection = React.memo(TVCardsSectionContent);

const styles = StyleSheet.create({
  container: {
    minHeight: 420,
    overflow: 'hidden',
  },
});
