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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { ArrowLeft, Key, Lock, Eye, EyeOff, CheckCircle, ShieldCheck } from 'lucide-react-native';
import axios from 'axios';
import { API_URL } from '../context/AuthContext';

type ResetPasswordRouteParams = {
  email?: string;
  token?: string;
};

export const ResetPasswordScreen = () => {
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);
  
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ ResetPassword: ResetPasswordRouteParams }, 'ResetPassword'>>();

  // Animações
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

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

    // Se veio com token da URL/deep link, preencher automaticamente
    if (route.params?.token) {
      setToken(route.params.token);
      verifyToken(route.params.token);
    }
  }, []);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const verifyToken = async (tokenToVerify: string) => {
    if (!tokenToVerify) return;
    
    setIsVerifying(true);
    try {
      const response = await axios.post(`${API_URL}/verify-reset-token`, { 
        token: tokenToVerify 
      });
      setTokenValid(response.data.valid);
    } catch (error: any) {
      setTokenValid(false);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyToken = () => {
    if (!token) {
      shake();
      Alert.alert('Erro', 'Digite o código recebido por email');
      return;
    }

    if (token.length < 10) {
      shake();
      Alert.alert('Erro', 'Código inválido');
      return;
    }

    verifyToken(token);
  };

  const handleResetPassword = async () => {
    if (!token) {
      shake();
      Alert.alert('Erro', 'Digite o código recebido por email');
      return;
    }

    if (!newPassword || !confirmPassword) {
      shake();
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }

    if (newPassword.length < 6) {
      shake();
      Alert.alert('Erro', 'A senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      shake();
      Alert.alert('Erro', 'As senhas não coincidem');
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/reset-password`, {
        token,
        newPassword,
      });

      // Animar sucesso
      setResetSuccess(true);
      Animated.spring(successScale, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }).start();

    } catch (error: any) {
      console.error(error);
      let errorMessage = 'Erro ao redefinir senha';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message === 'Network Error') {
        errorMessage = 'Erro de conexão. Verifique sua internet.';
      }
      
      Alert.alert('Erro', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigation.navigate('Login');
  };

  // Indicadores de força da senha
  const getPasswordStrength = () => {
    if (!newPassword) return { level: 0, text: '', color: '#71717a' };
    
    let strength = 0;
    if (newPassword.length >= 6) strength++;
    if (newPassword.length >= 8) strength++;
    if (/[A-Z]/.test(newPassword)) strength++;
    if (/[0-9]/.test(newPassword)) strength++;
    if (/[^A-Za-z0-9]/.test(newPassword)) strength++;

    if (strength <= 1) return { level: 1, text: 'Fraca', color: '#ef4444' };
    if (strength <= 2) return { level: 2, text: 'Média', color: '#f59e0b' };
    if (strength <= 3) return { level: 3, text: 'Boa', color: '#22c55e' };
    return { level: 4, text: 'Forte', color: '#10b981' };
  };

  const passwordStrength = getPasswordStrength();

  if (resetSuccess) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#09090b', '#18181b']}
          style={styles.background}
        />
        
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
              <ShieldCheck size={60} color="#22c55e" />
            </LinearGradient>
          </View>

          <Text style={styles.successTitle}>Senha redefinida!</Text>
          <Text style={styles.successSubtitle}>
            Sua senha foi alterada com sucesso. Agora você pode fazer login com sua nova senha.
          </Text>

          <TouchableOpacity 
            style={styles.button}
            onPress={handleBackToLogin}
          >
            <LinearGradient
              colors={['#22c55e', '#16a34a']}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.buttonText}>Ir para o login</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

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
                transform: [
                  { translateY: slideAnim },
                  { translateX: shakeAnim }
                ],
              }
            ]}
          >
            {/* Ícone e Título */}
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={['rgba(34, 197, 94, 0.2)', 'rgba(34, 197, 94, 0.05)']}
                style={styles.iconGradient}
              >
                <Key size={40} color="#22c55e" />
              </LinearGradient>
            </View>

            <Text style={styles.title}>Redefinir senha</Text>
            <Text style={styles.subtitle}>
              Digite o código que você recebeu por email e escolha uma nova senha.
            </Text>

            {/* Formulário */}
            <View style={styles.form}>
              {/* Campo do código */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Código de recuperação</Text>
                <View style={[
                  styles.inputWrapper,
                  tokenValid === true && styles.inputValid,
                  tokenValid === false && styles.inputInvalid,
                ]}>
                  <Key size={20} color={tokenValid === true ? '#22c55e' : tokenValid === false ? '#ef4444' : '#71717a'} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Cole o código aqui"
                    placeholderTextColor="#71717a"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={token}
                    onChangeText={(text) => {
                      setToken(text);
                      setTokenValid(null);
                    }}
                    onBlur={() => token.length >= 10 && verifyToken(token)}
                    editable={!isLoading}
                  />
                  {isVerifying && (
                    <ActivityIndicator size="small" color="#22c55e" />
                  )}
                  {tokenValid === true && (
                    <CheckCircle size={20} color="#22c55e" />
                  )}
                </View>
                {tokenValid === false && (
                  <Text style={styles.errorText}>Código inválido ou expirado</Text>
                )}
              </View>

              {/* Campo nova senha */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Nova senha</Text>
                <View style={styles.passwordContainer}>
                  <Lock size={20} color="#71717a" style={styles.inputIcon} />
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Mínimo 6 caracteres"
                    placeholderTextColor="#71717a"
                    secureTextEntry={!showPassword}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    editable={!isLoading}
                  />
                  <TouchableOpacity 
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                  >
                    {showPassword ? (
                      <EyeOff size={20} color="#71717a" />
                    ) : (
                      <Eye size={20} color="#71717a" />
                    )}
                  </TouchableOpacity>
                </View>
                
                {/* Indicador de força da senha */}
                {newPassword.length > 0 && (
                  <View style={styles.strengthContainer}>
                    <View style={styles.strengthBars}>
                      {[1, 2, 3, 4].map((level) => (
                        <View
                          key={level}
                          style={[
                            styles.strengthBar,
                            {
                              backgroundColor: level <= passwordStrength.level 
                                ? passwordStrength.color 
                                : '#27272a',
                            },
                          ]}
                        />
                      ))}
                    </View>
                    <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
                      {passwordStrength.text}
                    </Text>
                  </View>
                )}
              </View>

              {/* Campo confirmar senha */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Confirmar senha</Text>
                <View style={[
                  styles.passwordContainer,
                  confirmPassword && newPassword === confirmPassword && styles.inputValid,
                  confirmPassword && newPassword !== confirmPassword && styles.inputInvalid,
                ]}>
                  <Lock size={20} color="#71717a" style={styles.inputIcon} />
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Digite novamente"
                    placeholderTextColor="#71717a"
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    editable={!isLoading}
                  />
                  <TouchableOpacity 
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.eyeButton}
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={20} color="#71717a" />
                    ) : (
                      <Eye size={20} color="#71717a" />
                    )}
                  </TouchableOpacity>
                  {confirmPassword && newPassword === confirmPassword && (
                    <CheckCircle size={20} color="#22c55e" style={{ marginLeft: 8 }} />
                  )}
                </View>
                {confirmPassword && newPassword !== confirmPassword && (
                  <Text style={styles.errorText}>As senhas não coincidem</Text>
                )}
              </View>

              <TouchableOpacity 
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleResetPassword}
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
                    <Text style={styles.buttonText}>Redefinir senha</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.linkButton}
                onPress={() => navigation.navigate('ForgotPassword')}
              >
                <Text style={styles.linkText}>
                  Não recebeu o código? <Text style={styles.linkHighlight}>Reenviar</Text>
                </Text>
              </TouchableOpacity>
            </View>
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
  inputValid: {
    borderColor: '#22c55e',
    backgroundColor: 'rgba(34, 197, 94, 0.05)',
  },
  inputInvalid: {
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 16,
    color: '#fff',
    fontSize: 16,
  },
  eyeButton: {
    padding: 4,
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
  },
  strengthBars: {
    flexDirection: 'row',
    gap: 4,
    flex: 1,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '600',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginLeft: 4,
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
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
    marginBottom: 40,
    paddingHorizontal: 20,
  },
});
