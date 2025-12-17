// RadioCard - Card component for displaying radio in list
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Radio as RadioIcon, MapPin, Play } from 'lucide-react-native';
import { Radio } from '../types/radio';

interface RadioCardProps {
  radio: Radio;
  onPress: () => void;
  compact?: boolean;
}

export const RadioCard: React.FC<RadioCardProps> = ({
  radio,
  onPress,
  compact = false,
}) => {
  if (compact) {
    return (
      <TouchableOpacity style={styles.compactCard} onPress={onPress}>
        <View style={styles.compactLogoContainer}>
          {radio.logoUrl ? (
            <Image source={{ uri: radio.logoUrl }} style={styles.compactLogo} />
          ) : (
            <View style={styles.compactLogoPlaceholder}>
              <RadioIcon color="#6366f1" size={20} />
            </View>
          )}
        </View>
        <View style={styles.compactInfo}>
          <Text style={styles.compactName} numberOfLines={1}>
            {radio.name}
          </Text>
          {radio.state && (
            <Text style={styles.compactState}>{radio.state}</Text>
          )}
        </View>
        <View style={styles.compactPlayButton}>
          <Play color="#6366f1" size={16} fill="#6366f1" />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <LinearGradient
        colors={['#1e1e32', '#252545']}
        style={styles.card}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          {radio.logoUrl ? (
            <Image source={{ uri: radio.logoUrl }} style={styles.logo} />
          ) : (
            <View style={styles.logoPlaceholder}>
              <RadioIcon color="#6366f1" size={28} />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.name} numberOfLines={1}>
            {radio.name}
          </Text>
          
          {(radio.city || radio.frequency) && (
            <View style={styles.detailsRow}>
              {radio.city && (
                <View style={styles.locationContainer}>
                  <MapPin color="#9ca3af" size={12} />
                  <Text style={styles.location}>
                    {radio.city}{radio.state ? `, ${radio.state}` : ''}
                  </Text>
                </View>
              )}
              {radio.frequency && (
                <Text style={styles.frequency}>{radio.frequency}</Text>
              )}
            </View>
          )}

          {/* Tags */}
          {radio.isSportsRadio && (
            <View style={styles.tagContainer}>
              <View style={styles.sportsBadge}>
                <Text style={styles.sportsBadgeText}>Esportiva</Text>
              </View>
            </View>
          )}
        </View>

        {/* Play button */}
        <View style={styles.playButton}>
          <LinearGradient
            colors={['#6366f1', '#8b5cf6']}
            style={styles.playButtonGradient}
          >
            <Play color="#fff" size={18} fill="#fff" />
          </LinearGradient>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Full card styles
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  logoContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#2a2a4a',
  },
  logo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  logoPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2a2a4a',
  },
  infoContainer: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  location: {
    fontSize: 12,
    color: '#9ca3af',
  },
  frequency: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '500',
  },
  tagContainer: {
    flexDirection: 'row',
    marginTop: 6,
  },
  sportsBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sportsBadgeText: {
    fontSize: 10,
    color: '#6366f1',
    fontWeight: '600',
  },
  playButton: {
    marginLeft: 12,
  },
  playButtonGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Compact card styles
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 30, 50, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginRight: 12,
    width: 180,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.15)',
  },
  compactLogoContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#2a2a4a',
  },
  compactLogo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  compactLogoPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactInfo: {
    flex: 1,
    marginLeft: 10,
  },
  compactName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  compactState: {
    fontSize: 11,
    color: '#9ca3af',
  },
  compactPlayButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
