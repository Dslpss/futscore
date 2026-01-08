import React, { useRef, useEffect, useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Animated, Dimensions, ActivityIndicator, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Gift, Clock, Sparkles, ChevronRight, X, Star, Crown, CheckCircle2 } from 'lucide-react-native';
import { useSubscription } from '../hooks/useSubscription';

interface PremiumTrialModalProps {
  visible: boolean;
  onClose: () => void;
  onTrialActivated?: () => void;
  featureName?: string;
}

const { width, height } = Dimensions.get('window');

export const PremiumTrialModal = ({ 
  visible, 
  onClose, 
  onTrialActivated,
  featureName = 'este recurso'
}: PremiumTrialModalProps) => {
  const { 
    hasTrialAvailable, 
    isTrialActive,
    trialDaysRemaining,
    activateTrial, 
    activatingTrial,
    fetchCheckoutUrl 
  } = useSubscription();
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setShowSuccess(false);
      setErrorMessage(null);
      
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
    }
  }, [visible]);

  const handleActivateTrial = async () => {
    setErrorMessage(null);
    const result = await activateTrial();
    
    if (result.success) {
      setShowSuccess(true);
      setTimeout(() => {
        onTrialActivated?.();
        onClose();
      }, 2000);
    } else {
      setErrorMessage(result.message);
    }
  };

  const handleSubscribe = async () => {
    const url = await fetchCheckoutUrl();
    if (url) {
      Linking.openURL(url);
      onClose();
    }
  };

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.6],
  });

  // Success state
  if (showSuccess) {
    return (
      <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
        <View style={styles.overlay}>
          <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
            <LinearGradient colors={['#1a1a1f', '#0f0f12']} style={styles.successContent}>
              <View style={styles.successIconWrap}>
                <LinearGradient colors={['#22c55e', '#16a34a']} style={styles.successIconGradient}>
                  <CheckCircle2 size={48} color="#fff" />
                </LinearGradient>
              </View>
              <Text style={styles.successTitle}>Trial Ativado! 🎉</Text>
              <Text style={styles.successSubtitle}>Aproveite 7 dias de acesso Premium</Text>
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>
    );
  }

  // Trial already active
  if (isTrialActive) {
    return (
      <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
        <View style={styles.overlay}>
          <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
            <LinearGradient colors={['#1a1a1f', '#0f0f12', '#0a0a0d']} style={styles.gradientBg}>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <X size={20} color="#71717a" />
              </TouchableOpacity>

              <View style={styles.activeTrialBadge}>
                <Clock size={14} color="#22c55e" />
                <Text style={styles.activeTrialText}>Trial Ativo</Text>
              </View>

              <Text style={styles.title}>Você está no Trial! ⏳</Text>
              <Text style={styles.subtitle}>
                Restam <Text style={styles.highlight}>{trialDaysRemaining} dias</Text> de acesso Premium
              </Text>

              <View style={styles.featuresList}>
                <Text style={styles.accessText}>✓ Todos os recursos liberados</Text>
                <Text style={styles.accessText}>✓ Sem anúncios</Text>
                <Text style={styles.accessText}>✓ TV ao Vivo</Text>
              </View>

              <TouchableOpacity style={styles.primaryButton} onPress={onClose} activeOpacity={0.9}>
                <LinearGradient colors={['#22c55e', '#16a34a']} style={styles.ctaGradient}>
                  <Text style={styles.ctaText}>Continuar</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryButton} onPress={handleSubscribe}>
                <Text style={styles.secondaryText}>Assinar Premium (R$ 6/mês)</Text>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>
    );
  }

  // Trial available - main UI
  if (hasTrialAvailable) {
    return (
      <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
        <View style={styles.overlay}>
          <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
            <LinearGradient colors={['#1a1a1f', '#0f0f12', '#0a0a0d']} style={styles.gradientBg}>
              {/* Close Button */}
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <X size={20} color="#71717a" />
              </TouchableOpacity>

              {/* Glow Effect */}
              <Animated.View style={[styles.glowOrb, { opacity: glowOpacity }]} />

              {/* Premium Badge */}
              <View style={styles.badgeContainer}>
                <LinearGradient colors={['#fbbf24', '#f59e0b']} style={styles.badge}>
                  <Crown size={12} color="#fff" />
                  <Text style={styles.badgeText}>PREMIUM</Text>
                </LinearGradient>
              </View>

              {/* Gift Icon */}
              <View style={styles.iconSection}>
                <LinearGradient colors={['rgba(34, 197, 94, 0.2)', 'rgba(34, 197, 94, 0.05)']} style={styles.iconGlow}>
                  <Gift size={48} color="#22c55e" />
                </LinearGradient>
              </View>

              {/* Title */}
              <Text style={styles.title}>Experimente Grátis!</Text>
              <Text style={styles.subtitle}>
                Acesse <Text style={styles.highlight}>{featureName}</Text> e todos os recursos Premium por 7 dias
              </Text>

              {/* Features */}
              <View style={styles.featuresList}>
                <View style={styles.featureItem}>
                  <Sparkles size={16} color="#22c55e" />
                  <Text style={styles.featureText}>7 dias grátis</Text>
                </View>
                <View style={styles.featureItem}>
                  <Star size={16} color="#22c55e" />
                  <Text style={styles.featureText}>Sem compromisso</Text>
                </View>
                <View style={styles.featureItem}>
                  <Clock size={16} color="#22c55e" />
                  <Text style={styles.featureText}>Cancele quando quiser</Text>
                </View>
              </View>

              {/* Error Message */}
              {errorMessage && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}

              {/* CTA Button */}
              <TouchableOpacity 
                style={styles.primaryButton} 
                onPress={handleActivateTrial} 
                activeOpacity={0.9}
                disabled={activatingTrial}
              >
                <LinearGradient colors={['#22c55e', '#16a34a', '#15803d']} style={styles.ctaGradient}>
                  {activatingTrial ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Text style={styles.ctaText}>Ativar 7 Dias Grátis</Text>
                      <ChevronRight size={20} color="#fff" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Secondary Option */}
              <TouchableOpacity style={styles.secondaryButton} onPress={handleSubscribe}>
                <Text style={styles.secondaryText}>Ou assine agora por R$ 6/mês</Text>
              </TouchableOpacity>

              <Text style={styles.disclaimer}>
                Após o trial, você precisará assinar para continuar
              </Text>
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>
    );
  }

  // Trial already used - must subscribe
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <LinearGradient colors={['#1a1a1f', '#0f0f12', '#0a0a0d']} style={styles.gradientBg}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={20} color="#71717a" />
            </TouchableOpacity>

            <View style={styles.badgeContainer}>
              <LinearGradient colors={['#ef4444', '#dc2626']} style={styles.badge}>
                <Clock size={12} color="#fff" />
                <Text style={styles.badgeText}>TRIAL EXPIRADO</Text>
              </LinearGradient>
            </View>

            <View style={styles.iconSection}>
              <LinearGradient colors={['rgba(239, 68, 68, 0.2)', 'rgba(239, 68, 68, 0.05)']} style={styles.iconGlow}>
                <Crown size={48} color="#fbbf24" />
              </LinearGradient>
            </View>

            <Text style={styles.title}>Torne-se Premium</Text>
            <Text style={styles.subtitle}>
              Seu trial expirou. Assine para continuar acessando {featureName} e todos os recursos exclusivos.
            </Text>

            <View style={styles.priceSection}>
              <Text style={styles.priceCurrency}>R$</Text>
              <Text style={styles.priceValue}>6</Text>
              <Text style={styles.pricePeriod}>/mês</Text>
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={handleSubscribe} activeOpacity={0.9}>
              <LinearGradient colors={['#fbbf24', '#f59e0b']} style={styles.ctaGradient}>
                <Text style={[styles.ctaText, { color: '#000' }]}>Assinar Premium</Text>
                <ChevronRight size={20} color="#000" />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
              <Text style={styles.secondaryText}>Talvez depois</Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(39, 39, 42, 0.8)',
  },
  gradientBg: {
    padding: 24,
    paddingTop: 40,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  glowOrb: {
    position: 'absolute',
    top: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#22c55e',
  },
  badgeContainer: {
    marginBottom: 20,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  iconSection: {
    marginBottom: 20,
  },
  iconGlow: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#a1a1aa',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  highlight: {
    color: '#22c55e',
    fontWeight: '700',
  },
  featuresList: {
    width: '100%',
    marginBottom: 20,
    gap: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.15)',
  },
  featureText: {
    color: '#e4e4e7',
    fontSize: 14,
    fontWeight: '500',
  },
  accessText: {
    color: '#a1a1aa',
    fontSize: 13,
    marginBottom: 6,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    width: '100%',
  },
  errorText: {
    color: '#f87171',
    fontSize: 13,
    textAlign: 'center',
  },
  primaryButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 12,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  ctaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    padding: 12,
  },
  secondaryText: {
    color: '#71717a',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  disclaimer: {
    color: '#52525b',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 24,
  },
  priceCurrency: {
    color: '#71717a',
    fontSize: 18,
    fontWeight: '600',
  },
  priceValue: {
    color: '#fff',
    fontSize: 48,
    fontWeight: '800',
    marginHorizontal: 4,
  },
  pricePeriod: {
    color: '#71717a',
    fontSize: 16,
  },
  activeTrialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    marginBottom: 20,
  },
  activeTrialText: {
    color: '#22c55e',
    fontSize: 12,
    fontWeight: '600',
  },
  successContent: {
    padding: 40,
    alignItems: 'center',
    borderRadius: 28,
  },
  successIconWrap: {
    marginBottom: 20,
  },
  successIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    color: '#a1a1aa',
    textAlign: 'center',
  },
});
