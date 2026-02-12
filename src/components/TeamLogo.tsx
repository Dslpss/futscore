import React, { useState } from 'react';
import { View, Image, StyleSheet, StyleProp, ImageStyle, ViewStyle } from 'react-native';
import { Shield } from 'lucide-react-native';

interface TeamLogoProps {
  uri?: string;
  size?: number;
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  colors?: {
    primary?: string;
    secondary?: string;
  };
}

export const TeamLogo: React.FC<TeamLogoProps> = ({ 
  uri, 
  size = 48, 
  style, 
  containerStyle,
  colors 
}) => {
  const [error, setError] = useState(false);

  // Determine fallback color based on team colors or default
  const iconColor = colors?.primary ? `#${colors.primary}` : '#71717a';
  const iconSize = size * 0.5;

  if (!uri || error) {
    return (
      <View 
        style={[
          styles.placeholder, 
          { 
            width: size, 
            height: size, 
            borderRadius: size / 2,
            borderColor: colors?.primary ? `#${colors.primary}40` : 'rgba(255,255,255,0.1)'
          }, 
          containerStyle
        ]}
      >
        <Shield 
          size={iconSize} 
          color={iconColor} 
          fill={colors?.primary ? `#${colors.primary}20` : 'rgba(255,255,255,0.05)'}
        />
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
      onError={() => setError(true)}
    />
  );
};

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
});
