import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface TeamCardProps {
  team: {
    id: number;
    name: string;
    logo: string;
    country: string;
  };
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onPress: () => void;
}

export const TeamCard: React.FC<TeamCardProps> = ({ team, isFavorite, onToggleFavorite, onPress }) => {
  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={isFavorite ? ['#FF6B6B', '#FF8E53'] : ['#2C3E50', '#34495E']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <Image 
            source={{ uri: team.logo }} 
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.teamName} numberOfLines={2}>
            {team.name}
          </Text>
          <Text style={styles.country} numberOfLines={1}>
            {team.country}
          </Text>
        </View>
        
        <TouchableOpacity style={styles.favoriteIcon} onPress={onToggleFavorite}>
          <Ionicons 
            name={isFavorite ? "heart" : "heart-outline"} 
            size={24} 
            color={isFavorite ? "#FFD700" : "#FFFFFF"} 
          />
        </TouchableOpacity>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '48%',
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  gradient: {
    padding: 16,
    minHeight: 180,
    position: 'relative',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  logo: {
    width: 60,
    height: 60,
    marginBottom: 12,
  },
  teamName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  country: {
    fontSize: 12,
    color: '#E0E0E0',
    textAlign: 'center',
  },
  favoriteIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
    padding: 6,
  },
});
