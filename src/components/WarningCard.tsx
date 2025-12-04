import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Info, AlertTriangle, AlertCircle, X } from 'lucide-react-native';

interface WarningCardProps {
  title: string;
  message: string;
  type: 'info' | 'warning' | 'danger';
  onDismiss?: () => void;
}

export const WarningCard = ({ title, message, type, onDismiss }: WarningCardProps) => {
  const getConfig = () => {
    switch (type) {
      case 'warning':
        return {
          icon: <AlertTriangle size={18} color="#f59e0b" />,
          gradientColors: ['#18181b', '#1c1a17'] as const,
          accentColor: '#f59e0b',
          bgAccent: 'rgba(245, 158, 11, 0.08)',
          borderColor: 'rgba(245, 158, 11, 0.2)',
        };
      case 'danger':
        return {
          icon: <AlertCircle size={18} color="#ef4444" />,
          gradientColors: ['#18181b', '#1c1717'] as const,
          accentColor: '#ef4444',
          bgAccent: 'rgba(239, 68, 68, 0.08)',
          borderColor: 'rgba(239, 68, 68, 0.2)',
        };
      default:
        return {
          icon: <Info size={18} color="#3b82f6" />,
          gradientColors: ['#18181b', '#171a1c'] as const,
          accentColor: '#3b82f6',
          bgAccent: 'rgba(59, 130, 246, 0.08)',
          borderColor: 'rgba(59, 130, 246, 0.2)',
        };
    }
  };

  const config = getConfig();

  return (
    <View style={[styles.container, { borderColor: config.borderColor }]}>
      <LinearGradient
        colors={config.gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Accent Line */}
        <View style={[styles.accentLine, { backgroundColor: config.accentColor }]} />
        
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: config.bgAccent }]}>
              {config.icon}
            </View>
            <Text style={[styles.title, { color: config.accentColor }]}>{title}</Text>
            {onDismiss && (
              <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
                <X size={16} color="#71717a" />
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.message}>{message}</Text>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  gradient: {
    flexDirection: 'row',
  },
  accentLine: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  dismissButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    color: '#a1a1aa',
    fontSize: 13,
    lineHeight: 19,
    marginLeft: 42,
  },
});
