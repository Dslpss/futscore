import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react-native';
import { sendPasswordReset, getFirebaseErrorMessage } from '../services/firebase';
import axios from 'axios';
import { API_URL } from '../context/AuthContext';

export const ForgotPasswordScreen = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [useFirebase, setUseFirebase] = useState(true); // Tenta Firebase primeiro
  const navigation = useNavigation<any>();

  // Animações
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const successScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Erro', 'Digite seu email');
      return;
    }

    // Validação básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Erro', 'Digite um email válido');
      return;
    }

    setIsLoading(true);
    const normalizedEmail = email.trim().toLowerCase();

    try {
      // Tentar enviar via Firebase primeiro (mais rápido e confiável)
      if (useFirebase) {
        try {
          await sendPasswordReset(normalizedEmail);
          console.log('[ForgotPassword] Email sent via Firebase');
        } catch (firebaseError: any) {
          // Se usuário não existe no Firebase, tenta via API (pode ser usuário antigo)
          if (firebaseError.code === 'auth/user-not-found') {
            console.log('[ForgotPassword] User not in Firebase, trying API...');
            await axios.post(`${API_URL}/forgot-password`, { email: normalizedEmail });
          } else {
            throw firebaseError;
          }
        }
      } else {
        // Fallback para API
        await axios.post(`${API_URL}/forgot-password`, { email: normalizedEmail });
      }
      
      // Animar sucesso
      setEmailSent(true);
      Animated.spring(successScale, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }).start();

    } catch (error: any) {
      console.error('[ForgotPassword] Error:', error);
      
      // Traduzir erros do Firebase
      if (error.code) {
        const message = getFirebaseErrorMessage(error.code);
        Alert.alert('Erro', message);
      } else if (error.message === 'Network Error') {
        Alert.alert('Erro', 'Erro de conexão. Verifique sua internet.');
      } else {
        // Por segurança, mostra sucesso mesmo em alguns erros
        setEmailSent(true);
        Animated.spring(successScale, {
          toValue: 1,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }).start();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToResetPassword = () => {
    navigation.navigate('ResetPassword', { email });
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#09090b', '#18181b']}
        style={styles.background}
      />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header com botão voltar */}
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>

          <Animated.View 
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }
            ]}
          >
            {!emailSent ? (
              <>
                {/* Ícone e Título */}
                <View style={styles.iconContainer}>
                  <LinearGradient
                    colors={['rgba(34, 197, 94, 0.2)', 'rgba(34, 197, 94, 0.05)']}
                    style={styles.iconGradient}
                  >
                    <Mail size={40} color="#22c55e" />
                  </LinearGradient>
                </View>

                <Text style={styles.title}>Esqueceu sua senha?</Text>
                <Text style={styles.subtitle}>
                  Não se preocupe! Digite seu email e enviaremos um código para você redefinir sua senha.
                </Text>

                {/* Formulário */}
                <View style={styles.form}>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Email cadastrado</Text>
                    <View style={styles.inputWrapper}>
                      <Mail size={20} color="#71717a" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="seu@email.com"
                        placeholderTextColor="#71717a"
                        autoCapitalize="none"
                        keyboardType="email-address"
                        value={email}
                        onChangeText={setEmail}
                        editable={!isLoading}
                      />
                    </View>
                  </View>

                  <TouchableOpacity 
                    style={[styles.button, isLoading && styles.buttonDisabled]}
                    onPress={handleForgotPassword}
                    disabled={isLoading}
                  >
                    <LinearGradient
                      colors={isLoading ? ['#3f3f46', '#27272a'] : ['#22c55e', '#16a34a']}
                      style={styles.buttonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.buttonText}>Enviar código</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.linkButton}
                    onPress={() => navigation.goBack()}
                  >
                    <Text style={styles.linkText}>
                      Lembrou a senha? <Text style={styles.linkHighlight}>Voltar ao login</Text>
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              /* Tela de sucesso */
              <Animated.View 
                style={[
                  styles.successContainer,
                  { transform: [{ scale: successScale }] }
                ]}
              >
                <View style={styles.successIconContainer}>
                  <LinearGradient
                    colors={['rgba(34, 197, 94, 0.3)', 'rgba(34, 197, 94, 0.1)']}
                    style={styles.successIconGradient}
                  >
                    <CheckCircle size={60} color="#22c55e" />
                  </LinearGradient>
                </View>

                <Text style={styles.successTitle}>Email enviado!</Text>
                <Text style={styles.successSubtitle}>
                  Se o email <Text style={styles.emailHighlight}>{email}</Text> estiver cadastrado, você receberá um código de recuperação.
                </Text>

                <View style={styles.instructionsContainer}>
                  <Text style={styles.instructionsTitle}>Próximos passos:</Text>
                  <Text style={styles.instructionsText}>1. Verifique sua caixa de entrada</Text>
                  <Text style={styles.instructionsText}>2. Copie o código recebido</Text>
                  <Text style={styles.instructionsText}>3. Clique no botão abaixo para continuar</Text>
                </View>

                <TouchableOpacity 
                  style={styles.button}
                  onPress={handleGoToResetPassword}
                >
                  <LinearGradient
                    colors={['#22c55e', '#16a34a']}
                    style={styles.buttonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.buttonText}>Já tenho o código</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.resendButton}
                  onPress={() => {
                    setEmailSent(false);
                    successScale.setValue(0);
                  }}
                >
                  <Text style={styles.resendText}>Reenviar código</Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  backButton: {
    marginTop: 60,
    marginLeft: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(39, 39, 42, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    color: '#a1a1aa',
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  form: {
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    color: '#e4e4e7',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    color: '#fff',
    fontSize: 16,
  },
  button: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonGradient: {
    padding: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkButton: {
    alignItems: 'center',
    marginTop: 8,
  },
  linkText: {
    color: '#71717a',
    fontSize: 14,
  },
  linkHighlight: {
    color: '#22c55e',
    fontWeight: '600',
  },
  // Success styles
  successContainer: {
    alignItems: 'center',
  },
  successIconContainer: {
    marginBottom: 24,
  },
  successIconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  successSubtitle: {
    color: '#a1a1aa',
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  emailHighlight: {
    color: '#22c55e',
    fontWeight: '600',
  },
  instructionsContainer: {
    backgroundColor: 'rgba(39, 39, 42, 0.5)',
    borderRadius: 16,
    padding: 20,
    marginTop: 32,
    marginBottom: 32,
    width: '100%',
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  instructionsTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  instructionsText: {
    color: '#a1a1aa',
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  resendButton: {
    marginTop: 16,
    padding: 12,
  },
  resendText: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: '600',
  },
});
