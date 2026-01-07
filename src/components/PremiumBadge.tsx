import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Crown } from 'lucide-react-native';

interface PremiumBadgeProps {
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
}

export const PremiumBadge: React.FC<PremiumBadgeProps> = ({ size = 'small', showIcon = true }) => {
  const sizeStyles = {
    small: { fontSize: 10, padding: 4, iconSize: 12 },
    medium: { fontSize: 12, padding: 6, iconSize: 14 },
    large: { fontSize: 14, padding: 8, iconSize: 16 },
  };

  const currentSize = sizeStyles[size];

  return (
    <LinearGradient
      colors={['#fbbf24', '#f59e0b']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.badge, { padding: currentSize.padding }]}
    >
      {showIcon && <Crown size={currentSize.iconSize} color="#fff" strokeWidth={2.5} />}
      <Text style={[styles.badgeText, { fontSize: currentSize.fontSize }]}>PREMIUM</Text>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 6,
    paddingHorizontal: 8,
  },
  badgeText: {
    color: '#fff',
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
