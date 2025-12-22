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

// Login - Com migração lazy para Firebase
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const normalizedEmail = email.toLowerCase().trim();

    // Check user in MongoDB
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password against MongoDB hash
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check user status
    if (user.status === 'blocked') {
      return res.status(403).json({ message: 'Sua conta foi bloqueada. Entre em contato com o suporte.' });
    }
    if (user.status === 'suspended') {
      return res.status(403).json({ message: 'Sua conta está suspensa temporariamente.' });
    }

    // === MIGRAÇÃO LAZY: Criar/atualizar usuário no Firebase ===
    // Isso acontece silenciosamente no login - usuário não percebe
    if (isFirebaseEnabled()) {
      try {
        const firebaseUser = await getFirebaseUserByEmail(normalizedEmail);
        
        if (!firebaseUser) {
          // Usuário ainda não existe no Firebase, criar agora (migração lazy)
          await createFirebaseUser(normalizedEmail, password, user.name);
          console.log(`[Auth] User migrated to Firebase: ${normalizedEmail}`);
        }
        // Se já existe no Firebase, não precisa fazer nada
      } catch (firebaseError) {
        // Não bloqueia login se Firebase der erro
        console.error('[Auth] Firebase migration failed (non-blocking):', firebaseError.message);
      }
    }

    // Create JWT token
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

    // Buscar usuário
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    // Por segurança, sempre retornamos sucesso mesmo se o email não existir
    if (!user) {
      return res.json({ 
        message: 'Se o email existir em nossa base, você receberá um link de recuperação.' 
      });
    }

    // Gerar token de reset (32 bytes = 64 caracteres hex)
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hash do token para armazenar no banco (mais seguro)
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Salvar token e expiração (1 hora)
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hora
    await user.save();

    // Construir URL de reset
    // Em produção, usar o URL do seu app ou deep link
    const resetUrl = process.env.APP_URL 
      ? `${process.env.APP_URL}/reset-password?token=${resetToken}`
      : `futscore://reset-password?token=${resetToken}`;

    // Configurar email
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"FutScore" <${process.env.EMAIL_USER || process.env.SMTP_USER}>`,
      to: user.email,
      subject: '⚽ FutScore - Recuperação de Senha',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background-color: #09090b;
              margin: 0;
              padding: 20px;
            }
            .container {
              max-width: 500px;
              margin: 0 auto;
              background: linear-gradient(145deg, #18181b, #27272a);
              border-radius: 16px;
              padding: 40px;
              border: 1px solid #3f3f46;
            }
            .logo {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo-text {
              font-size: 32px;
              color: #fff;
            }
            .logo-highlight {
              font-weight: 300;
            }
            .logo-bold {
              font-weight: 900;
            }
            .logo-dot {
              display: inline-block;
              width: 8px;
              height: 8px;
              background-color: #22c55e;
              border-radius: 50%;
              margin-left: 4px;
              vertical-align: super;
            }
            h1 {
              color: #fff;
              text-align: center;
              font-size: 24px;
              margin-bottom: 20px;
            }
            p {
              color: #a1a1aa;
              font-size: 16px;
              line-height: 1.6;
              text-align: center;
            }
            .button {
              display: block;
              width: 100%;
              max-width: 280px;
              margin: 30px auto;
              padding: 16px 32px;
              background: linear-gradient(135deg, #22c55e, #16a34a);
              color: #fff;
              text-decoration: none;
              border-radius: 12px;
              font-weight: bold;
              font-size: 16px;
              text-align: center;
              box-shadow: 0 4px 20px rgba(34, 197, 94, 0.3);
            }
            .code {
              background: #27272a;
              padding: 16px;
              border-radius: 8px;
              font-family: monospace;
              font-size: 14px;
              color: #22c55e;
              word-break: break-all;
              margin: 20px 0;
              border: 1px solid #3f3f46;
            }
            .warning {
              color: #71717a;
              font-size: 14px;
              margin-top: 30px;
            }
            .footer {
              text-align: center;
              color: #52525b;
              font-size: 12px;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #27272a;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">
              <span class="logo-text">
                <span class="logo-highlight">Fut</span><span class="logo-bold">Score</span>
              </span>
              <span class="logo-dot"></span>
            </div>
            
            <h1>Recuperação de Senha</h1>
            
            <p>Olá, <strong style="color: #fff;">${user.name}</strong>!</p>
            
            <p>Recebemos uma solicitação para redefinir sua senha. Use o código abaixo no aplicativo:</p>
            
            <div class="code">${resetToken}</div>
            
            <p class="warning">
              ⏰ Este código expira em <strong style="color: #fff;">1 hora</strong>.<br><br>
              Se você não solicitou a recuperação de senha, ignore este email.
            </p>
            
            <div class="footer">
              © 2024 FutScore. Todos os direitos reservados.<br>
              Este é um email automático, não responda.
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        FutScore - Recuperação de Senha
        
        Olá, ${user.name}!
        
        Recebemos uma solicitação para redefinir sua senha.
        
        Use o código abaixo no aplicativo:
        ${resetToken}
        
        Este código expira em 1 hora.
        
        Se você não solicitou a recuperação de senha, ignore este email.
      `,
    };

    // Enviar email
    await transporter.sendMail(mailOptions);
    
    console.log(`[Auth] Email de recuperação enviado para ${email}`);

    res.json({ 
      message: 'Se o email existir em nossa base, você receberá um link de recuperação.' 
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
