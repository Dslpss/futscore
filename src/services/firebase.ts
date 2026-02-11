/**
 * Firebase Configuration for FutScore App
 * 
 * Revertendo para persistência padrão (AsyncStorage) para corrigir erros de build.
 * Compatível com Expo Go e Firebase JS SDK v12.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  initializeAuth,

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

// @ts-ignore
import { getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// Configuração do Firebase
// Projeto: anotacoes-estudos
const firebaseConfig = {
  apiKey: "AIzaSyAqvfTFpri7-quRf8uKf9lKjQElQuBUTu8",
  authDomain: "anotacoes-estudos.firebaseapp.com",
  projectId: "anotacoes-estudos",
  storageBucket: "anotacoes-estudos.firebasestorage.app",
  messagingSenderId: "730890275748",
  appId: "1:730890275748:android:6305cd6b1b2ef753f60f31"
};

// Inicializar Apps
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Inicializar Auth com persistência padrão
// Usamos try-catch para lidar com hot-reload (evita 'auth already initialized')
let auth: any;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
  });
} catch (e) {
  auth = getAuth(app);
}

// ====== FUNÇÕES DE AUTENTICAÇÃO ======

export const sendPasswordReset = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email.toLowerCase().trim());
    console.log('[Firebase] Password reset email sent to:', email);
  } catch (error: any) {
    console.error('[Firebase] Error sending password reset:', error.code, error.message);
    throw error;
  }
};

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

export const signOutFirebase = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth);
    console.log('[Firebase] User signed out');
  } catch (error: any) {
    console.error('[Firebase] Error signing out:', error.code, error.message);
    throw error;
  }
};

export const onAuthChange = (callback: (user: FirebaseUser | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

export const getCurrentFirebaseUser = () => auth.currentUser;

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
