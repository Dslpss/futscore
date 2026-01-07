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
    const user = await User.findById(req.user.id).populate("subscriptionId");

    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const subscription = user.subscriptionId;

    // Se não tem assinatura
    if (!subscription) {
      return res.json({
        isPremium: false,
        hasSubscription: false,
      });
    }

    // Verificar se assinatura está ativa
    const isActive = subscription.isActive();

    // Se expirou, atualizar status
    if (!isActive && subscription.status === "active") {
      subscription.status = "expired";
      subscription.addEvent("expired");
      await subscription.save();

      user.isPremium = false;
      await user.save();
    }

    return res.json({
      isPremium: user.isPremium && isActive,
      hasSubscription: true,
      subscription: {
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        renewalDate: subscription.renewalDate,
        amount: subscription.amount,
        paymentMethod: subscription.paymentMethod,
      },
    });
  } catch (error) {
    console.error("Erro ao buscar status de assinatura:", error);
    res.status(500).json({ error: "Erro ao buscar assinatura" });
  }
});

/**
 * GET /api/subscription/checkout-url
 * Obter URL de checkout da Cakto
 */
router.get("/checkout-url", auth, async (req, res) => {
  try {
    const checkoutUrl = process.env.CAKTO_PRODUCT_LINK;

    if (!checkoutUrl) {
      return res.status(500).json({ error: "Link de checkout não configurado" });
    }

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
    const user = await User.findById(req.user.id).populate("subscriptionId");

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

module.exports = router;
