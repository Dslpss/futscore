/**
 * Firebase Configuration for FutScore App
 * 
 * Este arquivo configura o Firebase para uso no app React Native com Expo.
 * Usamos o Firebase JS SDK que é compatível com Expo.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  initializeAuth,
  // @ts-ignore
  getReactNativePersistence,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  confirmPasswordReset,
  updatePassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  getAuth
} from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// Configuração do Firebase (do google-services.json)
const firebaseConfig = {
  apiKey: "AIzaSyAqvfTFpri7-quRf8uKf9lKjQElQuBUTu8",
  authDomain: "anotacoes-estudos.firebaseapp.com",
  projectId: "anotacoes-estudos",
  storageBucket: "anotacoes-estudos.firebasestorage.app",
  messagingSenderId: "730890275748",
  appId: "1:730890275748:android:6305cd6b1b2ef753f60f31"
};

// Inicializar Firebase (evita reinicialização)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth with persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

// ====== FUNÇÕES DE AUTENTICAÇÃO ======

/**
 * Envia email de recuperação de senha via Firebase
 * @param email - Email do usuário
 */
export const sendPasswordReset = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email.toLowerCase().trim());
    console.log('[Firebase] Password reset email sent to:', email);
  } catch (error: any) {
    console.error('[Firebase] Error sending password reset:', error.code, error.message);
    throw error;
  }
};

/**
 * Confirma o reset de senha com o código recebido por email
 * @param oobCode - Código de verificação do email
 * @param newPassword - Nova senha
 */
export const confirmPasswordResetWithCode = async (
  oobCode: string, 
  newPassword: string
): Promise<void> => {
  try {
    await confirmPasswordReset(auth, oobCode, newPassword);
    console.log('[Firebase] Password reset confirmed');
  } catch (error: any) {
    console.error('[Firebase] Error confirming password reset:', error.code, error.message);
    throw error;
  }
};

/**
 * Login com email e senha via Firebase
 * @param email - Email do usuário
 * @param password - Senha do usuário
 */
export const signInWithFirebase = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth, 
      email.toLowerCase().trim(), 
      password
    );
    console.log('[Firebase] User signed in:', userCredential.user.uid);
    return userCredential.user;
  } catch (error: any) {
    console.error('[Firebase] Error signing in:', error.code, error.message);
    throw error;
  }
};

/**
 * Criar conta com email e senha via Firebase
 * @param email - Email do usuário
 * @param password - Senha do usuário
 */
export const createFirebaseAccount = async (email: string, password: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      email.toLowerCase().trim(), 
      password
    );
    console.log('[Firebase] User created:', userCredential.user.uid);
    return userCredential.user;
  } catch (error: any) {
    console.error('[Firebase] Error creating account:', error.code, error.message);
    throw error;
  }
};

/**
 * Atualizar senha do usuário logado
 * @param newPassword - Nova senha
 */
export const updateUserPassword = async (newPassword: string): Promise<void> => {
  const user = auth.currentUser;
  if (!user) throw new Error('No user logged in');
  
  try {
    await updatePassword(user, newPassword);
    console.log('[Firebase] Password updated');
  } catch (error: any) {
    console.error('[Firebase] Error updating password:', error.code, error.message);
    throw error;
  }
};

/**
 * Logout do Firebase
 */
export const signOutFirebase = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth);
    console.log('[Firebase] User signed out');
  } catch (error: any) {
    console.error('[Firebase] Error signing out:', error.code, error.message);
    throw error;
  }
};

/**
 * Observa mudanças no estado de autenticação
 * @param callback - Função chamada quando o estado muda
 */
export const onAuthChange = (callback: (user: FirebaseUser | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

/**
 * Retorna o usuário atual do Firebase
 */
export const getCurrentFirebaseUser = () => auth.currentUser;

/**
 * Traduz códigos de erro do Firebase para mensagens em português
 */
export const getFirebaseErrorMessage = (errorCode: string): string => {
  const errorMessages: Record<string, string> = {
    'auth/email-already-in-use': 'Este email já está em uso',
    'auth/invalid-email': 'Email inválido',
    'auth/operation-not-allowed': 'Operação não permitida',
    'auth/weak-password': 'Senha muito fraca. Use pelo menos 6 caracteres',
    'auth/user-disabled': 'Esta conta foi desativada',
    'auth/user-not-found': 'Usuário não encontrado',
    'auth/wrong-password': 'Senha incorreta',
    'auth/invalid-credential': 'Credenciais inválidas',
    'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde',
    'auth/network-request-failed': 'Erro de conexão. Verifique sua internet',
    'auth/expired-action-code': 'O código expirou. Solicite um novo',
    'auth/invalid-action-code': 'Código inválido. Solicite um novo',
  };

  return errorMessages[errorCode] || 'Ocorreu um erro. Tente novamente';
};

export { auth, app };
