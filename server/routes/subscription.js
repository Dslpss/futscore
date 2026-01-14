const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const User = require("../models/User");
const Subscription = require("../models/Subscription");

/**
 * GET /api/subscription/status
 * Obter status da assinatura do usuário autenticado
 */
router.get("/status", auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    // Verificar trial
    const isTrialActive = user.hasActiveTrial ? user.hasActiveTrial() : false;
    const trialEndDate = user.getTrialEndDate ? user.getTrialEndDate() : null;
    let trialDaysRemaining = 0;
    
    if (isTrialActive && trialEndDate) {
      const now = new Date();
      const diff = trialEndDate.getTime() - now.getTime();
      trialDaysRemaining = Math.ceil(diff / (1000 * 60 * 60 * 24));
    }

    // Check for active gift
    const hasActiveGift = user.hasActiveGift ? user.hasActiveGift() : false;
    const giftDaysRemaining = user.getGiftDaysRemaining ? user.getGiftDaysRemaining() : 0;

    // Check for pending gift (not yet claimed)
    const pendingGift = user.giftPremiumDays > 0 ? {
      days: user.giftPremiumDays,
      message: user.giftPremiumMessage || `Parabéns! Você ganhou ${user.giftPremiumDays} dias de acesso Premium!`,
    } : null;

    // Se não tem subscriptionId, retornar como não premium (mas pode ter trial ou gift)
    if (!user.subscriptionId) {
      return res.json({
        isPremium: user.isPremium || isTrialActive || hasActiveGift,
        hasSubscription: false,
        // Trial info
        trial: {
          hasTrialAvailable: !user.trialUsed && !user.trialStartDate,
          isTrialActive,
          trialUsed: user.trialUsed || false,
          trialEndDate,
          daysRemaining: trialDaysRemaining,
        },
        // Gift info
        gift: hasActiveGift ? {
          isActive: true,
          endDate: user.giftPremiumEndDate,
          daysRemaining: giftDaysRemaining,
        } : null,
        pendingGift,
      });
    }

    // Buscar assinatura separadamente para evitar erros de populate
    const subscription = await Subscription.findById(user.subscriptionId);

    // Se assinatura não existe mais no banco
    if (!subscription) {
      return res.json({
        isPremium: isTrialActive,
        hasSubscription: false,
        trial: {
          hasTrialAvailable: !user.trialUsed && !user.trialStartDate,
          isTrialActive,
          trialUsed: user.trialUsed || false,
          trialEndDate,
          daysRemaining: trialDaysRemaining,
        },
      });
    }

    // Verificar se assinatura está ativa
    const isActive = subscription.isActive ? subscription.isActive() : (subscription.status === "active" && subscription.endDate > new Date());

    // Se expirou, atualizar status
    if (!isActive && subscription.status === "active") {
      subscription.status = "expired";
      if (subscription.addEvent) {
        subscription.addEvent("expired");
      }
      await subscription.save();

      user.isPremium = false;
      await user.save();
    }

    return res.json({
      isPremium: (user.isPremium && isActive) || isTrialActive || hasActiveGift,
      hasSubscription: true,
      subscription: {
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        renewalDate: subscription.renewalDate,
        amount: subscription.amount,
        paymentMethod: subscription.paymentMethod,
      },
      trial: {
        hasTrialAvailable: !user.trialUsed && !user.trialStartDate,
        isTrialActive,
        trialUsed: user.trialUsed || false,
        trialEndDate,
        daysRemaining: trialDaysRemaining,
      },
      // Gift info
      gift: hasActiveGift ? {
        isActive: true,
        endDate: user.giftPremiumEndDate,
        daysRemaining: giftDaysRemaining,
      } : null,
      pendingGift,
    });
  } catch (error) {
    console.error("Erro ao buscar status de assinatura:", error);
    res.status(500).json({ error: "Erro ao buscar assinatura" });
  }
});

/**
 * GET /api/subscription/checkout-url
 * Obter URL de checkout da Cakto com email do usuário
 */
router.get("/checkout-url", auth, async (req, res) => {
  try {
    const baseCheckoutUrl = process.env.CAKTO_PRODUCT_LINK;

    if (!baseCheckoutUrl) {
      return res.status(500).json({ error: "Link de checkout não configurado" });
    }

    // Buscar email do usuário autenticado
    const user = await User.findById(req.userId).select('email');
    
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    // Adicionar email como parâmetro na URL do checkout
    // Isso garante que o pagamento seja vinculado ao usuário correto
    const checkoutUrl = `${baseCheckoutUrl}?email=${encodeURIComponent(user.email)}`;

    return res.json({
      checkoutUrl,
      amount: 6.0,
      period: "monthly",
    });
  } catch (error) {
    console.error("Erro ao obter URL de checkout:", error);
    res.status(500).json({ error: "Erro ao obter URL" });
  }
});

/**
 * GET /api/subscription/history
 * Obter histórico de eventos da assinatura
 */
router.get("/history", auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate("subscriptionId");

    if (!user || !user.subscriptionId) {
      return res.json({ events: [] });
    }

    return res.json({
      events: user.subscriptionId.events,
    });
  } catch (error) {
    console.error("Erro ao buscar histórico:", error);
    res.status(500).json({ error: "Erro ao buscar histórico" });
  }
});

/**
 * POST /api/subscription/activate-trial
 * Ativar trial de 7 dias para o usuário
 */
router.post("/activate-trial", auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    // Verificar se já usou o trial
    if (user.trialUsed) {
      return res.status(400).json({ 
        error: "Trial já utilizado", 
        message: "Você já utilizou seu período de teste gratuito. Assine o plano Premium para continuar usando." 
      });
    }

    // Verificar se trial já está ativo
    if (user.trialStartDate && user.hasActiveTrial()) {
      const trialEndDate = user.getTrialEndDate();
      return res.status(400).json({ 
        error: "Trial já ativo",
        message: "Seu trial já está ativo.",
        trialEndDate
      });
    }

    // Ativar trial
    user.trialStartDate = new Date();
    user.trialUsed = false; // Resetar para garantir que está correto
    await user.save();

    const trialEndDate = user.getTrialEndDate();

    console.log(`[Trial] Ativado para usuário ${user.email} - Expira em: ${trialEndDate}`);

    return res.json({
      success: true,
      message: "Trial de 7 dias ativado com sucesso!",
      trialStartDate: user.trialStartDate,
      trialEndDate,
      daysRemaining: 7,
    });
  } catch (error) {
    console.error("Erro ao ativar trial:", error);
    res.status(500).json({ error: "Erro ao ativar trial" });
  }
});

/**
 * GET /api/subscription/trial-status
 * Obter status do trial do usuário
 */
router.get("/trial-status", auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const isTrialActive = user.hasActiveTrial();
    const trialEndDate = user.getTrialEndDate();
    
    // Calcular dias restantes
    let daysRemaining = 0;
    if (isTrialActive && trialEndDate) {
      const now = new Date();
      const diff = trialEndDate.getTime() - now.getTime();
      daysRemaining = Math.ceil(diff / (1000 * 60 * 60 * 24));
    }

    return res.json({
      hasTrialAvailable: !user.trialUsed && !user.trialStartDate,
      isTrialActive,
      trialUsed: user.trialUsed || false,
      trialStartDate: user.trialStartDate || null,
      trialEndDate: trialEndDate || null,
      daysRemaining,
    });
  } catch (error) {
    console.error("Erro ao buscar status do trial:", error);
    res.status(500).json({ error: "Erro ao buscar status do trial" });
  }
});

/**
 * POST /api/subscription/claim-gift
 * Ativar gift premium pendente
 */
router.post("/claim-gift", auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    // Verificar se tem gift pendente
    if (!user.giftPremiumDays || user.giftPremiumDays <= 0) {
      return res.status(400).json({ 
        error: "Nenhum presente pendente",
        message: "Você não tem nenhum presente para resgatar." 
      });
    }

    const days = user.giftPremiumDays;
    const message = user.giftPremiumMessage;

    // Calcular data de expiração do gift
    // Se já tem um gift ativo, adicionar dias ao existente
    let giftEndDate;
    if (user.giftPremiumEndDate && user.giftPremiumEndDate > new Date()) {
      giftEndDate = new Date(user.giftPremiumEndDate);
      giftEndDate.setDate(giftEndDate.getDate() + days);
    } else {
      giftEndDate = new Date();
      giftEndDate.setDate(giftEndDate.getDate() + days);
    }

    // Atualizar usuário
    user.giftPremiumEndDate = giftEndDate;
    user.giftPremiumClaimedAt = new Date();
    user.giftPremiumDays = 0; // Limpar pending
    user.giftPremiumMessage = null;
    await user.save();

    console.log(`[Gift] User ${user.email} claimed ${days} days gift. Expires: ${giftEndDate}`);

    return res.json({
      success: true,
      message: `${days} dias de Premium ativados com sucesso!`,
      giftEndDate,
      daysRemaining: days,
    });
  } catch (error) {
    console.error("Erro ao resgatar gift:", error);
    res.status(500).json({ error: "Erro ao resgatar presente" });
  }
});

module.exports = router;
