import React, { useRef, useEffect, useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Trophy, BarChart2, Tv, Zap, ChevronRight, Sparkles, Star, Check, Square } from 'lucide-react-native';

interface PremiumFeaturesModalProps {
  visible: boolean;
  onClose: () => void;
  showDontShowAgain?: boolean;
  onDontShowAgain?: () => void;
}

const { width, height } = Dimensions.get('window');

export const PremiumFeaturesModal = ({ visible, onClose, showDontShowAgain = false, onDontShowAgain }: PremiumFeaturesModalProps) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const [dontShowChecked, setDontShowChecked] = useState(false);

  useEffect(() => {
    if (visible) {
      // Entry animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

      // Continuous glow animation
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

      // Subtle logo pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(logoRotate, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(logoRotate, {
            toValue: 0,
            duration: 3000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
      glowAnim.setValue(0);
      logoRotate.setValue(0);
    }
  }, [visible]);

  const logoScale = logoRotate.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.05, 1],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  const handleClose = () => {
    if (dontShowChecked && onDontShowAgain) {
      onDontShowAgain();
    }
    onClose();
  };

  const features = [
    {
      icon: <Zap size={24} color="#22c55e" />,
      title: 'Tempo Real',
      description: 'Placares ao vivo com atualizações instantâneas',
      gradient: ['rgba(34, 197, 94, 0.15)', 'rgba(34, 197, 94, 0.05)'],
    },
    {
      icon: <BarChart2 size={24} color="#3b82f6" />,
      title: 'Estatísticas',
      description: 'Dados detalhados de times e jogadores',
      gradient: ['rgba(59, 130, 246, 0.15)', 'rgba(59, 130, 246, 0.05)'],
    },
    {
      icon: <Tv size={24} color="#a855f7" />,
      title: 'Onde Assistir',
      description: 'Saiba onde transmitem cada partida',
      gradient: ['rgba(168, 85, 247, 0.15)', 'rgba(168, 85, 247, 0.05)'],
    },
    {
      icon: <Trophy size={24} color="#eab308" />,
      title: 'Campeonatos',
      description: 'Brasileirão, Libertadores e muito mais',
      gradient: ['rgba(234, 179, 8, 0.15)', 'rgba(234, 179, 8, 0.05)'],
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View 
          style={[
            styles.container, 
            { 
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <LinearGradient
            colors={['#1a1a1f', '#0f0f12', '#0a0a0d']}
            style={styles.gradientBg}
          >
            {/* Decorative Elements */}
            <View style={styles.decorTop}>
              <Animated.View style={[styles.glowOrb, styles.orbLeft, { opacity: glowOpacity }]} />
              <Animated.View style={[styles.glowOrb, styles.orbRight, { opacity: glowOpacity }]} />
            </View>

            {/* Premium Badge */}
            <View style={styles.badgeContainer}>
              <LinearGradient
                colors={['#22c55e', '#16a34a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.badge}
              >
                <Sparkles size={12} color="#fff" />
                <Text style={styles.badgeText}>EXPERIÊNCIA PREMIUM</Text>
              </LinearGradient>
            </View>

            {/* Logo Section */}
            <Animated.View style={[styles.logoSection, { transform: [{ scale: logoScale }] }]}>
              <View style={styles.logoTextContainer}>
                <Text style={styles.logoTextLight}>Fut</Text>
                <Text style={styles.logoTextBold}>Score</Text>
                <View style={styles.logoDot} />
              </View>
            </Animated.View>

            {/* Welcome Text */}
            <Text style={styles.welcomeTitle}>Bem-vindo ao Futuro</Text>
            <Text style={styles.welcomeSubtitle}>
              Tudo sobre futebol em um só lugar
            </Text>

            {/* Features List */}
            <ScrollView 
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {features.map((feature, index) => (
                <View key={index} style={styles.featureCard}>
                  <LinearGradient
                    colors={feature.gradient as [string, string]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.featureGradient}
                  >
                    <View style={styles.featureIconWrap}>
                      {feature.icon}
                    </View>
                    <View style={styles.featureContent}>
                      <Text style={styles.featureTitle}>{feature.title}</Text>
                      <Text style={styles.featureDesc}>{feature.description}</Text>
                    </View>
                    <ChevronRight size={18} color="#52525b" />
                  </LinearGradient>
                </View>
              ))}
            </ScrollView>

            {/* CTA Button */}
            <TouchableOpacity style={styles.ctaButton} onPress={handleClose} activeOpacity={0.9}>
              <LinearGradient
                colors={['#22c55e', '#16a34a', '#15803d']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ctaGradient}
              >
                <Text style={styles.ctaText}>Começar Agora</Text>
                <View style={styles.ctaIcon}>
                  <ChevronRight size={20} color="#fff" />
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* Don't Show Again Checkbox */}
            {showDontShowAgain && (
              <TouchableOpacity 
                style={styles.checkboxRow} 
                onPress={() => setDontShowChecked(!dontShowChecked)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, dontShowChecked && styles.checkboxChecked]}>
                  {dontShowChecked && <Check size={14} color="#fff" />}
                </View>
                <Text style={styles.checkboxText}>Não exibir novamente</Text>
              </TouchableOpacity>
            )}

            {/* Footer */}
            <View style={styles.footer}>
              <Star size={12} color="#52525b" />
              <Text style={styles.footerText}>Gratuito • Sem anúncios • Atualizado</Text>
              <Star size={12} color="#52525b" />
            </View>

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
    padding: 16,
  },
  container: {
    width: '100%',
    maxHeight: height * 0.88,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(39, 39, 42, 0.8)',
  },
  gradientBg: {
    padding: 24,
    paddingTop: 20,
  },
  decorTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    overflow: 'hidden',
  },
  glowOrb: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#22c55e',
    filter: 'blur(60px)',
  },
  orbLeft: {
    top: -80,
    left: -50,
    opacity: 0.15,
  },
  orbRight: {
    top: -60,
    right: -40,
    backgroundColor: '#3b82f6',
    opacity: 0.1,
  },
  badgeContainer: {
    alignItems: 'center',
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
  logoSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logoContainer: {
    marginBottom: 12,
  },
  logoGlow: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  logoEmoji: {
    fontSize: 40,
  },
  logoTextContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  logoTextLight: {
    fontSize: 32,
    fontWeight: '300',
    color: '#fff',
    letterSpacing: -1,
  },
  logoTextBold: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -1,
  },
  logoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
    marginLeft: 3,
    marginBottom: 6,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 6,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#71717a',
    textAlign: 'center',
    marginBottom: 24,
  },
  scrollView: {
    maxHeight: 280,
  },
  scrollContent: {
    gap: 10,
    paddingBottom: 8,
  },
  featureCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(39, 39, 42, 0.5)',
  },
  featureGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  featureIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 12,
    color: '#a1a1aa',
  },
  ctaButton: {
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    gap: 8,
  },
  ctaText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  ctaIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(39, 39, 42, 0.5)',
  },
  footerText: {
    color: '#52525b',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 16,
    paddingVertical: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#3f3f46',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  checkboxText: {
    color: '#71717a',
    fontSize: 14,
  },
});
