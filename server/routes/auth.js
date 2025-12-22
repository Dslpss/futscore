const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const { 
  createFirebaseUser, 
  getFirebaseUserByEmail, 
  generatePasswordResetLink,
  isFirebaseEnabled 
} = require('../services/firebaseAdmin');

const router = express.Router();

// Configuração do transporte de email (suporta múltiplos provedores)
const createTransporter = () => {
  // Se houver configuração de SMTP customizada
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  
  // Fallback para Gmail (requer configuração de "apps menos seguras" ou App Password)
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Register - Cria usuário no MongoDB e Firebase
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists in MongoDB
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password for MongoDB
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user in MongoDB
    const user = new User({
      name,
      email: normalizedEmail,
      password: hashedPassword,
    });

    await user.save();

    // === MIGRAÇÃO: Criar usuário no Firebase também ===
    if (isFirebaseEnabled()) {
      try {
        await createFirebaseUser(normalizedEmail, password, name);
        console.log(`[Auth] User also created in Firebase: ${normalizedEmail}`);
      } catch (firebaseError) {
        // Não falha o registro se Firebase der erro, apenas loga
        console.error('[Auth] Firebase user creation failed (non-blocking):', firebaseError.message);
      }
    }

    // Create JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '30d',
    });

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin || false,
        favoriteTeams: user.favoriteTeams || [],
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login - Usa MongoDB ou Firebase baseado no flag useFirebaseAuth
router.post('/login', async (req, res) => {
  try {
    const { email, password, firebaseToken } = req.body;

    const normalizedEmail = email.toLowerCase().trim();

    // Buscar usuário no MongoDB
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(400).json({ message: 'Credenciais inválidas' });
    }

    // Verificar status do usuário
    if (user.status === 'blocked') {
      return res.status(403).json({ message: 'Sua conta foi bloqueada. Entre em contato com o suporte.' });
    }
    if (user.status === 'suspended') {
      return res.status(403).json({ message: 'Sua conta está suspensa temporariamente.' });
    }

    let isAuthenticated = false;

    // === DECISÃO: MongoDB ou Firebase ===
    if (user.useFirebaseAuth && isFirebaseEnabled()) {
      // Usuário trocou senha via Firebase - DEVE autenticar via Firebase
      console.log(`[Auth] User ${normalizedEmail} uses Firebase Auth`);
      
      if (firebaseToken) {
        // Verificar token do Firebase
        try {
          const { verifyIdToken } = require('../services/firebaseAdmin');
          const decodedToken = await verifyIdToken(firebaseToken);
          
          if (decodedToken && decodedToken.email?.toLowerCase() === normalizedEmail) {
            isAuthenticated = true;
            console.log(`[Auth] Firebase token valid for: ${normalizedEmail}`);
          }
        } catch (tokenError) {
          console.error('[Auth] Firebase token verification failed:', tokenError.message);
        }
      }
      
      if (!isAuthenticated) {
        // Não tem token ou token inválido - pedir para autenticar via Firebase
        return res.status(401).json({ 
          message: 'Por favor, faça login com sua senha atualizada.',
          requireFirebaseAuth: true 
        });
      }
    } else {
      // Usuário normal - autenticar via MongoDB
      isAuthenticated = await bcrypt.compare(password, user.password);
      
      if (!isAuthenticated) {
        return res.status(400).json({ message: 'Credenciais inválidas' });
      }
      
      // Migração lazy: criar no Firebase se não existir
      if (isFirebaseEnabled()) {
        try {
          const firebaseUser = await getFirebaseUserByEmail(normalizedEmail);
          if (!firebaseUser) {
            await createFirebaseUser(normalizedEmail, password, user.name);
            console.log(`[Auth] User migrated to Firebase: ${normalizedEmail}`);
          }
        } catch (firebaseError) {
          console.error('[Auth] Firebase migration failed:', firebaseError.message);
        }
      }
    }

    // Criar JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '30d',
    });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin || false,
        favoriteTeams: user.favoriteTeams || [],
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Forgot Password - Solicita recuperação de senha
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email é obrigatório' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Buscar usuário
    const user = await User.findOne({ email: normalizedEmail });
    
    // Por segurança, sempre retornamos sucesso mesmo se o email não existir
    if (!user) {
      return res.json({ 
        message: 'Se o email existir em nossa base, você receberá um link de recuperação.' 
      });
    }

    // === MARCAR QUE USUÁRIO USARÁ FIREBASE AUTH A PARTIR DE AGORA ===
    // O email de reset é enviado pelo frontend via Firebase SDK
    user.useFirebaseAuth = true;
    await user.save();
    console.log(`[Auth] User ${normalizedEmail} marked to use Firebase Auth`);

    // Retornar sucesso - o frontend envia o email via Firebase
    return res.json({ 
      message: 'Enviamos um link de recuperação para seu email.',
      useFirebase: true
    });

  } catch (error) {
    console.error('[Auth] Erro em forgot-password:', error);
    res.status(500).json({ message: 'Erro ao processar solicitação. Tente novamente.' });
  }
});

// Reset Password - Redefine a senha com o token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token e nova senha são obrigatórios' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'A senha deve ter pelo menos 6 caracteres' });
    }

    // Hash do token recebido para comparar com o armazenado
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Buscar usuário com token válido e não expirado
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ 
        message: 'Token inválido ou expirado. Solicite uma nova recuperação de senha.' 
      });
    }

    // Hash da nova senha
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Atualizar senha e limpar token
    user.password = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    console.log(`[Auth] Senha redefinida com sucesso para ${user.email}`);

    res.json({ message: 'Senha redefinida com sucesso! Faça login com sua nova senha.' });

  } catch (error) {
    console.error('[Auth] Erro em reset-password:', error);
    res.status(500).json({ message: 'Erro ao redefinir senha. Tente novamente.' });
  }
});

// Verify Reset Token - Verifica se o token é válido (opcional, para validar antes de mostrar form)
router.post('/verify-reset-token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ valid: false, message: 'Token é obrigatório' });
    }

    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ valid: false, message: 'Token inválido ou expirado' });
    }

    res.json({ valid: true, message: 'Token válido' });

  } catch (error) {
    console.error('[Auth] Erro em verify-reset-token:', error);
    res.status(500).json({ valid: false, message: 'Erro ao verificar token' });
  }
});

module.exports = router;
