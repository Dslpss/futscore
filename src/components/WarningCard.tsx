import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Info, AlertTriangle, AlertCircle } from 'lucide-react-native';

interface WarningCardProps {
  title: string;
  message: string;
  type: 'info' | 'warning' | 'danger';
}

export const WarningCard = ({ title, message, type }: WarningCardProps) => {
  const getIcon = () => {
    switch (type) {
      case 'warning': return <AlertTriangle size={24} color="#eab308" />;
      case 'danger': return <AlertCircle size={24} color="#ef4444" />;
      default: return <Info size={24} color="#3b82f6" />;
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'warning': return '#eab308';
      case 'danger': return '#ef4444';
      default: return '#3b82f6';
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'warning': return 'rgba(234, 179, 8, 0.1)';
      case 'danger': return 'rgba(239, 68, 68, 0.1)';
      default: return 'rgba(59, 130, 246, 0.1)';
    }
  };

  return (
    <View style={[
      styles.container, 
      { 
        borderColor: getBorderColor(),
        backgroundColor: getBackgroundColor()
      }
    ]}>
      <View style={styles.header}>
        {getIcon()}
        <Text style={styles.title}>{title}</Text>
      </View>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginTop: 48,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  message: {
    color: '#d4d4d8',
    fontSize: 14,
    lineHeight: 20,
  },
});
