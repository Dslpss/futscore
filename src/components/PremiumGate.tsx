import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Crown, Lock, Gift, Clock } from 'lucide-react-native';
import { useSubscription } from '../hooks/useSubscription';
import { PremiumTrialModal } from './PremiumTrialModal';

interface PremiumGateProps {
  children: React.ReactNode;
  navigation: any;
  featureName: string;
}

export const PremiumGate: React.FC<PremiumGateProps> = ({ children, navigation, featureName }) => {
  const { isPremium, loading, hasTrialAvailable, isTrialActive, trialDaysRemaining, refreshSubscription } = useSubscription();
  const [showTrialModal, setShowTrialModal] = useState(false);

  // Refresh subscription status when component mounts
  useEffect(() => {
    refreshSubscription();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  // If user has premium (via subscription or active trial), show content
  if (isPremium) {
    return <>{children}</>;
  }

  // User doesn't have premium - show gate with trial option
  return (
    <LinearGradient colors={['#09090b', '#18181b']} style={styles.container}>
      <View style={styles.content}>
        <LinearGradient
          colors={['#22c55e20', '#16a34a10']}
          style={styles.iconContainer}
        >
          {hasTrialAvailable ? (
            <Gift size={64} color="#22c55e" strokeWidth={2} />
          ) : (
            <Crown size={64} color="#fbbf24" strokeWidth={2} />
          )}
        </LinearGradient>

        <Text style={styles.title}>
          {hasTrialAvailable ? 'Experimente Grátis!' : 'Conteúdo Premium'}
        </Text>
        
        <Text style={styles.subtitle}>
          {hasTrialAvailable 
            ? `Ative seu trial de 7 dias para acessar ${featureName} e todos os recursos exclusivos`
            : `${featureName} é exclusivo para assinantes premium`}
        </Text>

        {hasTrialAvailable && (
          <View style={styles.trialHighlight}>
            <Clock size={18} color="#22c55e" />
            <Text style={styles.trialHighlightText}>7 dias gratuitos • Sem compromisso</Text>
          </View>
        )}

        <View style={styles.benefitsContainer}>
          <View style={styles.benefitItem}>
            <Lock size={16} color="#22c55e" />
            <Text style={styles.benefitText}>Acesso ilimitado aos canais de TV</Text>
          </View>
          <View style={styles.benefitItem}>
            <Lock size={16} color="#22c55e" />
            <Text style={styles.benefitText}>Gerenciar times favoritos</Text>
          </View>
          <View style={styles.benefitItem}>
            <Lock size={16} color="#22c55e" />
            <Text style={styles.benefitText}>Notificações personalizadas</Text>
          </View>
        </View>

        {hasTrialAvailable ? (
          // Show trial button
          <TouchableOpacity
            style={styles.trialButton}
            onPress={() => setShowTrialModal(true)}
          >
            <LinearGradient
              colors={['#22c55e', '#16a34a']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.upgradeButtonGradient}
            >
              <Gift size={20} color="#fff" strokeWidth={2.5} />
              <Text style={styles.trialButtonText}>Ativar 7 Dias Grátis</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          // Show subscribe button (trial used)
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
        )}

        {hasTrialAvailable && (
          <TouchableOpacity
            style={styles.skipTrialButton}
            onPress={() => navigation.navigate('Subscription')}
          >
            <Text style={styles.skipTrialText}>Ou assine agora por R$ 6/mês</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>

      {/* Trial Modal */}
      <PremiumTrialModal
        visible={showTrialModal}
        onClose={() => setShowTrialModal(false)}
        onTrialActivated={() => {
          setShowTrialModal(false);
          refreshSubscription();
        }}
        featureName={featureName}
      />
    </LinearGradient>
  );
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
    borderWidth: 2,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#a1a1aa',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 16,
    lineHeight: 22,
  },
  trialHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  trialHighlightText: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: '600',
  },
  benefitsContainer: {
    width: '100%',
    marginBottom: 24,
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
  trialButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  trialButtonText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
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
  skipTrialButton: {
    paddingVertical: 8,
    marginBottom: 8,
  },
  skipTrialText: {
    color: '#71717a',
    fontSize: 14,
    textDecorationLine: 'underline',
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

