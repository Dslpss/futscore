import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Crown, Lock } from 'lucide-react-native';
import { useSubscription } from '../hooks/useSubscription';

interface PremiumGateProps {
  children: React.ReactNode;
  navigation: any;
  featureName: string;
}

export const PremiumGate: React.FC<PremiumGateProps> = ({ children, navigation, featureName }) => {
  const { isPremium, loading } = useSubscription();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fbbf24" />
      </View>
    );
  }

  if (!isPremium) {
    return (
      <LinearGradient colors={['#09090b', '#18181b']} style={styles.container}>
        <View style={styles.content}>
          <LinearGradient
            colors={['#fbbf2420', '#f59e0b10']}
            style={styles.iconContainer}
          >
            <Crown size={64} color="#fbbf24" strokeWidth={2} />
          </LinearGradient>

          <Text style={styles.title}>Conteúdo Premium</Text>
          
          <Text style={styles.subtitle}>
            {featureName} é exclusivo para
assinantes premium
          </Text>

          <View style={styles.benefitsContainer}>
            <View style={styles.benefitItem}>
              <Lock size={16} color="#fbbf24" />
              <Text style={styles.benefitText}>Acesso ilimitado aos canais de TV</Text>
            </View>
            <View style={styles.benefitItem}>
              <Lock size={16} color="#fbbf24" />
              <Text style={styles.benefitText}>Gerenciar times favoritos</Text>
            </View>
            <View style={styles.benefitItem}>
              <Lock size={16} color="#fbbf24" />
              <Text style={styles.benefitText}>Notificações personalizadas</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => navigation.navigate('Subscription')}
          >
            <LinearGradient
              colors={['#fbbf24', '#f59e0b']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.upgradeButtonGradient}
            >
              <Crown size={20} color="#000" strokeWidth={2.5} />
              <Text style={styles.upgradeButtonText}>Assinar Premium</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#09090b',
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#a1a1aa',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  benefitsContainer: {
    width: '100%',
    marginBottom: 32,
    gap: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    gap: 12,
  },
  benefitText: {
    flex: 1,
    fontSize: 14,
    color: '#e4e4e7',
  },
  upgradeButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  upgradeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    gap: 8,
  },
  upgradeButtonText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000',
  },
  backButton: {
    paddingVertical: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#71717a',
    fontWeight: '600',
  },
});
