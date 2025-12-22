const admin = require('firebase-admin');

// Inicializar Firebase Admin SDK
// Em produção, use variáveis de ambiente para as credenciais
const initializeFirebase = () => {
  if (admin.apps.length === 0) {
    // Opção 1: Usando variáveis de ambiente (recomendado para Railway)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('[Firebase] Initialized with service account from env');
    } 
    // Opção 2: Usando arquivo local (para desenvolvimento)
    else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
      console.log('[Firebase] Initialized with application default credentials');
    }
    // Opção 3: Usando project ID apenas (funcionalidade limitada)
    else if (process.env.FIREBASE_PROJECT_ID) {
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
      console.log('[Firebase] Initialized with project ID only');
    }
    // Fallback: Não inicializa Firebase (continua usando apenas MongoDB)
    else {
      console.log('[Firebase] No credentials found. Firebase Auth disabled.');
      console.log('[Firebase] To enable, set FIREBASE_SERVICE_ACCOUNT env variable');
      return null;
    }
  }
  return admin;
};

// Tentar inicializar
const firebaseAdmin = initializeFirebase();

// Criar usuário no Firebase Auth
const createFirebaseUser = async (email, password, displayName) => {
  if (!firebaseAdmin) {
    console.log('[Firebase] Skipping user creation - Firebase not initialized');
    return null;
  }

  try {
    const userRecord = await firebaseAdmin.auth().createUser({
      email,
      password,
      displayName,
      emailVerified: false,
    });
    console.log(`[Firebase] User created: ${userRecord.uid}`);
    return userRecord;
  } catch (error) {
    // Se usuário já existe, retorna o existente
    if (error.code === 'auth/email-already-exists') {
      console.log(`[Firebase] User already exists: ${email}`);
      const existingUser = await firebaseAdmin.auth().getUserByEmail(email);
      return existingUser;
    }
    console.error('[Firebase] Error creating user:', error.message);
    throw error;
  }
};

// Verificar se usuário existe no Firebase
const getFirebaseUserByEmail = async (email) => {
  if (!firebaseAdmin) return null;

  try {
    const userRecord = await firebaseAdmin.auth().getUserByEmail(email);
    return userRecord;
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      return null;
    }
    throw error;
  }
};

// Gerar link de reset de senha via Firebase
const generatePasswordResetLink = async (email) => {
  if (!firebaseAdmin) {
    console.log('[Firebase] Skipping password reset - Firebase not initialized');
    return null;
  }

  try {
    const link = await firebaseAdmin.auth().generatePasswordResetLink(email, {
      url: process.env.APP_URL || 'https://futscore.app',
    });
    return link;
  } catch (error) {
    console.error('[Firebase] Error generating reset link:', error.message);
    throw error;
  }
};

// Verificar token ID do Firebase (para autenticação do cliente)
const verifyIdToken = async (idToken) => {
  if (!firebaseAdmin) return null;

  try {
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('[Firebase] Error verifying token:', error.message);
    return null;
  }
};

// Atualizar senha do usuário no Firebase
const updateUserPassword = async (uid, newPassword) => {
  if (!firebaseAdmin) return null;

  try {
    await firebaseAdmin.auth().updateUser(uid, { password: newPassword });
    console.log(`[Firebase] Password updated for user: ${uid}`);
    return true;
  } catch (error) {
    console.error('[Firebase] Error updating password:', error.message);
    throw error;
  }
};

// Deletar usuário do Firebase
const deleteFirebaseUser = async (uid) => {
  if (!firebaseAdmin) return null;

  try {
    await firebaseAdmin.auth().deleteUser(uid);
    console.log(`[Firebase] User deleted: ${uid}`);
    return true;
  } catch (error) {
    console.error('[Firebase] Error deleting user:', error.message);
    throw error;
  }
};

module.exports = {
  firebaseAdmin,
  createFirebaseUser,
  getFirebaseUserByEmail,
  generatePasswordResetLink,
  verifyIdToken,
  updateUserPassword,
  deleteFirebaseUser,
  isFirebaseEnabled: () => !!firebaseAdmin,
};
