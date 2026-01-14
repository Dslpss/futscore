import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Gift, X, Check, Sparkles } from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface GiftPremiumModalProps {
  visible: boolean;
  onClose: () => void;
  onClaim: () => void;
  days: number;
  message: string;
  loading?: boolean;
}

export const GiftPremiumModal: React.FC<GiftPremiumModalProps> = ({
  visible,
  onClose,
  onClaim,
  days,
  message,
  loading = false,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}>
      <BlurView intensity={30} tint="dark" style={styles.overlay}>
        <View style={styles.container}>
          <LinearGradient
            colors={['#1a2e1a', '#16213e', '#0f0f1a']}
            style={styles.content}>
            
            {/* Decorative elements */}
            <View style={styles.sparkleContainer}>
              <Sparkles size={24} color="#fbbf24" style={styles.sparkle1} />
              <Sparkles size={16} color="#22c55e" style={styles.sparkle2} />
              <Sparkles size={20} color="#fbbf24" style={styles.sparkle3} />
            </View>

            {/* Close Button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={20} color="#71717a" />
            </TouchableOpacity>

            {/* Gift Icon */}
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={['#22c55e', '#16a34a']}
                style={styles.iconGradient}>
                <Gift size={40} color="#fff" />
              </LinearGradient>
            </View>

            {/* Title */}
            <Text style={styles.title}>🎁 Presente Exclusivo!</Text>

            {/* Days Badge */}
            <View style={styles.daysBadge}>
              <Text style={styles.daysNumber}>{days}</Text>
              <Text style={styles.daysLabel}>dias de Premium</Text>
            </View>

            {/* Message */}
            <Text style={styles.message}>{message}</Text>

            {/* Benefits */}
            <View style={styles.benefits}>
              <View style={styles.benefitItem}>
                <Check size={14} color="#22c55e" />
                <Text style={styles.benefitText}>Acesso a todos os times favoritos</Text>
              </View>
              <View style={styles.benefitItem}>
                <Check size={14} color="#22c55e" />
                <Text style={styles.benefitText}>TV ao vivo ilimitada</Text>
              </View>
              <View style={styles.benefitItem}>
                <Check size={14} color="#22c55e" />
                <Text style={styles.benefitText}>Notificações exclusivas</Text>
              </View>
            </View>

            {/* Claim Button */}
            <TouchableOpacity
              style={styles.claimButton}
              onPress={onClaim}
              disabled={loading}
              activeOpacity={0.8}>
              <LinearGradient
                colors={['#22c55e', '#16a34a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.claimGradient}>
                {loading ? (
                  <Text style={styles.claimButtonText}>Ativando...</Text>
                ) : (
                  <>
                    <Gift size={18} color="#fff" />
                    <Text style={styles.claimButtonText}>Ativar Presente</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Dismiss hint */}
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.dismissHint}>Ativar depois</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  container: {
    width: width * 0.9,
    maxWidth: 380,
  },
  content: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    overflow: 'hidden',
  },
  sparkleContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  sparkle1: {
    position: 'absolute',
    top: 20,
    left: 30,
    opacity: 0.8,
  },
  sparkle2: {
    position: 'absolute',
    top: 35,
    right: 40,
    opacity: 0.6,
  },
  sparkle3: {
    position: 'absolute',
    top: 15,
    right: 80,
    opacity: 0.7,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
    zIndex: 10,
  },
  iconContainer: {
    marginBottom: 16,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  daysBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    alignItems: 'center',
  },
  daysNumber: {
    fontSize: 36,
    fontWeight: '900',
    color: '#22c55e',
  },
  daysLabel: {
    fontSize: 14,
    color: '#86efac',
    fontWeight: '600',
  },
  message: {
    fontSize: 15,
    color: '#a1a1aa',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  benefits: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    gap: 8,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  benefitText: {
    fontSize: 13,
    color: '#d4d4d8',
    fontWeight: '500',
  },
  claimButton: {
    width: '100%',
    marginBottom: 12,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  claimGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  claimButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  dismissHint: {
    fontSize: 13,
    color: '#71717a',
    fontWeight: '500',
  },
});
