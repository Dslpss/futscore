const express = require("express");
const router = express.Router();
const { getFootballChatResponse } = require("../services/aiChatService");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

// Middleware to extract user (helper local ou importar de middleware/auth)
const getUserFromToken = async (req) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return null;
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return await User.findById(decoded.id);
  } catch (err) {
    return null;
  }
};

/**
 * Endpoint para chat com IA (Guru)
 * Limitado a perguntas de futebol
 * POST /api/ai-predictions/chat
 */
router.post("/chat", async (req, res) => {
  try {
    const { message, history } = req.body;

    // 1. Identificar usuário
    const user = await getUserFromToken(req);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Faça login para conversar com o Guru",
        message: "Você precisa entrar na sua conta para falar comigo! 🔒"
      });
    }

    // 2. Verificar Limites Diários
    const isPremium = await user.hasPremiumAccess();
    const limit = isPremium ? 10 : 5; // Premium: 10, Free: 5
    
    // Resetar contador se for um novo dia
    const now = new Date();
    const lastReset = user.aiChatUsage?.lastReset ? new Date(user.aiChatUsage.lastReset) : new Date(0);
    
    // Reset diário (verificando se mudou o dia)
    if (now.getDate() !== lastReset.getDate() || now.getMonth() !== lastReset.getMonth()) {
      user.aiChatUsage = {
        count: 0,
        lastReset: now
      };
    }
    
    // Verificar se excedeu o limite
    if (user.aiChatUsage.count >= limit) {
      const type = isPremium ? "Premium" : "Gratuito";
      const upgradeMsg = !isPremium ? "\n\nAssine o Premium para ter o dobro de perguntas diárias!" : "";
      
      return res.json({
        success: true,
        message: `✋ **Fim de papo por hoje!**\n\nComo usuário ${type}, você tem direito a ${limit} perguntas por dia e já usou todas.\n\nO Guru precisa descansar. Volto amanhã! 💤${upgradeMsg}`
      });
    }

    if (!message || message.trim() === "") {
      return res.status(400).json({
        success: false,
        error: "Mensagem é obrigatória",
      });
    }

    if (!process.env.PERPLEXITY_API_KEY) {
      return res.status(503).json({
        success: false,
        message: "O Guru está treinando... (Chave de API não configurada)"
      });
    }

    // 3. Processar resposta com tratamento de erro específico da IA
    let response;
    try {
      response = await getFootballChatResponse(message, history || []);
    } catch (aiError) {
      // Se for erro conhecido da IA, retorna mensagem amigável SEM descontar uso
      if (aiError.userMessage) {
        return res.json({
          success: true,
          message: aiError.userMessage,
          usage: {
            used: user.aiChatUsage.count,
            limit: limit,
            remaining: limit - user.aiChatUsage.count
          }
        });
      }
      throw aiError; // Erro desconhecido, passa para o catch geral
    }

    // 4. Incrementar uso (apenas se sucesso)
    user.aiChatUsage.count += 1;
    await user.save();

    res.json({
      success: true,
      message: response,
      usage: {
        used: user.aiChatUsage.count,
        limit: limit,
        remaining: limit - user.aiChatUsage.count
      }
    });

  } catch (error) {
    console.error("[AIChat] Erro no endpoint:", error.message);
    res.status(500).json({
      success: false,
      error: "Erro interno",
      message: "Tive um problema tático. Tente novamente."
    });
  }
});

// Endpoint debug - test if alive
router.get("/status", (req, res) => {
  res.json({
    status: "online",
    service: "AI Chat Guru",
    apiKeyConfigured: !!process.env.PERPLEXITY_API_KEY
  });
});

// Endpoint para consultar uso e limites
router.get("/usage", async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ success: false, error: "Unauthorized" });

    const isPremium = await user.hasPremiumAccess();
    const limit = isPremium ? 10 : 5;
    
    // Check reset (apenas visualização, não salva no banco no GET para evitar writes desnecessários)
    const now = new Date();
    const lastReset = user.aiChatUsage?.lastReset ? new Date(user.aiChatUsage.lastReset) : new Date(0);
    let used = user.aiChatUsage.count;
    
    if (now.getDate() !== lastReset.getDate() || now.getMonth() !== lastReset.getMonth()) {
       used = 0;
    }

    res.json({
      success: true,
      usage: {
        used,
        limit,
        remaining: limit - used
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
