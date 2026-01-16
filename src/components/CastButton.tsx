import React from 'react';
import { TouchableOpacity, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Cast } from 'lucide-react-native';

interface CastButtonProps {
  onPress: () => void;
  isActive?: boolean;
  size?: 'small' | 'medium' | 'large';
  style?: any;
}

export const CastButton: React.FC<CastButtonProps> = ({
  onPress,
  isActive = false,
  size = 'medium',
  style,
}) => {
  const iconSize = size === 'small' ? 18 : size === 'large' ? 28 : 22;
  const buttonSize = size === 'small' ? 36 : size === 'large' ? 52 : 44;

  return (
    <TouchableOpacity
      style={[styles.button, { width: buttonSize, height: buttonSize }, style]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {isActive ? (
        <LinearGradient
          colors={['#22c55e', '#16a34a']}
          style={[styles.gradient, { borderRadius: buttonSize / 2 }]}
        >
          <Cast size={iconSize} color="#fff" />
        </LinearGradient>
      ) : (
        <View style={[styles.inactive, { borderRadius: buttonSize / 2 }]}>
          <Cast size={iconSize} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inactive: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
});

export default CastButton;
