import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Crown, Check, X, Calendar, CreditCard, Sparkles } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import { useSubscription } from '../hooks/useSubscription';
import { PremiumBadge } from '../components/PremiumBadge';

export const SubscriptionScreen = ({ navigation }: any) => {
  const { isPremium, subscription, loading, fetchCheckoutUrl, refreshSubscription } = useSubscription();
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [loadingCheckout, setLoadingCheckout] = useState(false);

  const premiumFeatures = [
    { icon: '📺', text: 'Acesso ilimitado aos canais de TV ao vivo' },
    { icon: '⚽', text: 'Todas as partidas e competições' },
    { icon: '🔔', text: 'Notificações personalizadas de gols e eventos' },
    { icon: '📊', text: 'Estatísticas detalhadas e análises' },
    { icon: '🎯', text: 'Sem anúncios ou interrupções' },
    { icon: '⭐', text: 'Recursos exclusivos para assinantes' },
  ];

  const handleSubscribe = async () => {
    setLoadingCheckout(true);
    try {
      const url = await fetchCheckoutUrl();
      if (url) {
        setCheckoutUrl(url);
        setShowCheckout(true);
      } else {
        Alert.alert('Erro', 'Não foi possível carregar o checkout. Tente novamente.');
      }
    } catch (error) {
      Alert.alert('Erro', 'Falha ao carregar checkout');
    } finally {
      setLoadingCheckout(false);
    }
  };

  const handleWebViewClose = async () => {
    setShowCheckout(false);
    // Aguardar 2 segundos para dar tempo do webhook processar
    setTimeout(async () => {
      await refreshSubscription();
      Alert.alert(
        'Pagamento em Processamento',
        'Seu pagamento será confirmado em instantes. Você receberá acesso premium assim que for aprovado.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }, 2000);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  // Se está mostrando o checkout
  if (showCheckout && checkoutUrl) {
    return (
      <View style={styles.webViewContainer}>
        <View style={styles.webViewHeader}>
          <TouchableOpacity onPress={handleWebViewClose} style={styles.closeButton}>
            <X size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.webViewTitle}>Finalizar Assinatura</Text>
          <View style={{ width: 24 }} />
        </View>
        <WebView
          source={{ uri: checkoutUrl }}
          style={styles.webView}
          onError={() => Alert.alert('Erro', 'Falha ao carregar página de pagamento')}
        />
      </View>
    );
  }

  // Se já é premium, mostrar status
  if (isPremium && subscription) {
    const endDate = new Date(subscription.endDate);
    const daysRemaining = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    return (
      <LinearGradient colors={['#09090b', '#18181b']} style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.premiumHeader}>
            <Crown size={64} color="#fbbf24" strokeWidth={2} />
            <Text style={styles.premiumTitle}>Você é Premium!</Text>
            <Text style={styles.premiumSubtitle}>
              Aproveite todos os benefícios exclusivos
            </Text>
          </View>

          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Status</Text>
              <View style={styles.statusBadge}>
                <View style={styles.activeDot} />
                <Text style={styles.statusText}>Ativo</Text>
              </View>
            </View>

            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Válido até</Text>
              <View style={styles.dateContainer}>
                <Calendar size={16} color="#a1a1aa" />
                <Text style={styles.dateText}>
                  {endDate.toLocaleDateString('pt-BR')}
                </Text>
              </View>
            </View>

            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Dias restantes</Text>
              <Text style={styles.daysText}>{daysRemaining} dias</Text>
            </View>

            {subscription.paymentMethod && (
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Método de pagamento</Text>
                <View style={styles.paymentMethod}>
                  <CreditCard size={16} color="#a1a1aa" />
                  <Text style={styles.paymentText}>
                    {subscription.paymentMethod.toUpperCase()}
                  </Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.featuresContainer}>
            <Text style={styles.featuresTitle}>Seus Benefícios Premium</Text>
            {premiumFeatures.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Text style={styles.featureIcon}>{feature.icon}</Text>
                <Text style={styles.featureText}>{feature.text}</Text>
                <Check size={20} color="#22c55e" strokeWidth={3} />
              </View>
            ))}
          </View>

          {/* Botão de Cancelar Assinatura */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              Alert.alert(
                'Cancelar Assinatura',
                'Para cancelar sua assinatura, entre em contato com nosso suporte. Sua assinatura continuará ativa até a data de expiração.',
                [
                  { text: 'Voltar', style: 'cancel' },
                  {
                    text: 'Enviar Email',
                    onPress: () => {
                      const subject = encodeURIComponent('Cancelar Assinatura Premium - FutScore');
                      const body = encodeURIComponent(`Olá,\n\nGostaria de solicitar o cancelamento da minha assinatura Premium.\n\nAtenciosamente.`);
                      Linking.openURL(`mailto:suporte@futscore.com?subject=${subject}&body=${body}`);
                    },
                  },
                ]
              );
            }}
          >
            <Text style={styles.cancelButtonText}>Cancelar Assinatura</Text>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    );
  }

  // Tela de assinatura para não-premium
  return (
    <LinearGradient colors={['#09090b', '#18181b']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Sparkles size={48} color="#fbbf24" strokeWidth={2} />
          <Text style={styles.title}>Upgrade para Premium</Text>
          <Text style={styles.subtitle}>
            Acesso completo a todos os recursos por apenas
          </Text>
          <View style={styles.priceContainer}>
            <Text style={styles.currency}>R$</Text>
            <Text style={styles.price}>6</Text>
            <Text style={styles.period}>/mês</Text>
          </View>
        </View>

        <View style={styles.featuresContainer}>
          <Text style={styles.featuresTitle}>O que você ganha:</Text>
          {premiumFeatures.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Text style={styles.featureIcon}>{feature.icon}</Text>
              <Text style={styles.featureText}>{feature.text}</Text>
            </View>
          ))}
        </View>

        <View style={styles.guarantee}>
          <View style={styles.guaranteeIcon}>
            <Check size={20} color="#22c55e" strokeWidth={3} />
          </View>
          <View style={styles.guaranteeTextContainer}>
            <Text style={styles.guaranteeTitle}>Garantia de 7 dias</Text>
            <Text style={styles.guaranteeText}>
              Cancele quando quiser, sem compromisso
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.subscribeButton}
          onPress={handleSubscribe}
          disabled={loadingCheckout}
        >
          <LinearGradient
            colors={['#fbbf24', '#f59e0b']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.buttonGradient}
          >
            {loadingCheckout ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <Crown size={24} color="#000" strokeWidth={2.5} />
                <Text style={styles.buttonText}>Assinar Agora</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Ao assinar, você concorda com nossos termos de serviço
        </Text>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#09090b',
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#a1a1aa',
    textAlign: 'center',
    marginBottom: 16,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 8,
  },
  currency: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fbbf24',
  },
  price: {
    fontSize: 64,
    fontWeight: '900',
    color: '#fbbf24',
    marginHorizontal: 4,
  },
  period: {
    fontSize: 20,
    color: '#a1a1aa',
  },
  featuresContainer: {
    marginBottom: 32,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#18181b',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    color: '#e4e4e7',
  },
  guarantee: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#22c55e33',
  },
  guaranteeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#22c55e22',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  guaranteeTextContainer: {
    flex: 1,
  },
  guaranteeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#22c55e',
    marginBottom: 2,
  },
  guaranteeText: {
    fontSize: 12,
    color: '#a1a1aa',
  },
  subscribeButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    gap: 8,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000',
  },
  disclaimer: {
    fontSize: 12,
    color: '#71717a',
    textAlign: 'center',
  },
  // Premium status styles
  premiumHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  premiumTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    marginTop: 16,
  },
  premiumSubtitle: {
    fontSize: 16,
    color: '#a1a1aa',
    marginTop: 8,
  },
  statusCard: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  statusLabel: {
    fontSize: 14,
    color: '#a1a1aa',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22c55e22',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#22c55e',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 14,
    color: '#e4e4e7',
    fontWeight: '600',
  },
  daysText: {
    fontSize: 14,
    color: '#fbbf24',
    fontWeight: '700',
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paymentText: {
    fontSize: 12,
    color: '#e4e4e7',
    fontWeight: '600',
  },
  // WebView styles
  webViewContainer: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  webViewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#18181b',
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  closeButton: {
    padding: 8,
  },
  webViewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  webView: {
    flex: 1,
  },
  cancelButton: {
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ef4444',
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
});
