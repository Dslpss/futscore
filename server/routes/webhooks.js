const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Subscription = require("../models/Subscription");
const caktoService = require("../services/caktoService");

/**
 * POST /api/webhooks/cakto
 * Receber notificações de eventos da Cakto
 */
router.post("/cakto", async (req, res) => {
  try {
    const signature = req.headers["x-cakto-signature"];
    const payload = req.body;

    // Validar assinatura do webhook
    if (!caktoService.validateWebhookSignature(payload, signature)) {
      console.error("Webhook Cakto: Assinatura inválida");
      return res.status(401).json({ error: "Invalid signature" });
    }

    console.log("Webhook Cakto recebido:", JSON.stringify(payload, null, 2));

    const { event, data } = payload;

    // Processar evento baseado no tipo
    switch (event) {
      case "payment.approved":
      case "order.approved":
        await handlePaymentApproved(data);
        break;

      case "payment.refused":
      case "order.refused":
        await handlePaymentRefused(data);
        break;

      case "subscription.canceled":
      case "order.canceled":
        await handleSubscriptionCanceled(data);
        break;

      case "subscription.renewed":
        await handleSubscriptionRenewed(data);
        break;

      default:
        console.log(`Evento não tratado: ${event}`);
    }

    // Sempre retornar 200 para a Cakto saber que recebemos
    res.status(200).json({ received: true });
  } catch (error) {
    console.error("Erro ao processar webhook Cakto:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Processar pagamento aprovado
 */
async function handlePaymentApproved(data) {
  try {
    const { order_id, customer_email, amount, payment_method } = data;

    console.log(`Pagamento aprovado - Order: ${order_id}, Cliente: ${customer_email}`);

    // Buscar ou criar usuário pelo email
    let user = await User.findOne({ email: customer_email });

    if (!user) {
      console.warn(`Usuário não encontrado para email: ${customer_email}`);
      // Criar usuário temporário ou ignorar
      return;
    }

    // Verificar se já existe assinatura para este pedido
    let subscription = await Subscription.findOne({ caktoOrderId: order_id });

    if (!subscription) {
      // Criar nova assinatura
      subscription = new Subscription({
        userId: user._id,
        caktoOrderId: order_id,
        caktoCustomerEmail: customer_email,
        status: "active",
        amount: amount || 6.0,
        paymentMethod: payment_method,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
        renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      subscription.addEvent("created");
      subscription.addEvent("approved", data);
    } else {
      // Atualizar assinatura existente
      subscription.status = "active";
      subscription.startDate = new Date();
      subscription.endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      subscription.renewalDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      subscription.addEvent("approved", data);
    }

    await subscription.save();

    // Ativar premium no usuário
    user.isPremium = true;
    user.subscriptionId = subscription._id;
    await user.save();

    console.log(`Premium ativado para usuário: ${user.email}`);
  } catch (error) {
    console.error("Erro ao processar pagamento aprovado:", error);
    throw error;
  }
}

/**
 * Processar pagamento recusado
 */
async function handlePaymentRefused(data) {
  try {
    const { order_id, customer_email } = data;

    console.log(`Pagamento recusado - Order: ${order_id}, Cliente: ${customer_email}`);

    const subscription = await Subscription.findOne({ caktoOrderId: order_id });

    if (subscription) {
      subscription.status = "failed";
      subscription.addEvent("refused", data);
      await subscription.save();
    }
  } catch (error) {
    console.error("Erro ao processar pagamento recusado:", error);
  }
}

/**
 * Processar cancelamento de assinatura
 */
async function handleSubscriptionCanceled(data) {
  try {
    const { order_id, customer_email } = data;

    console.log(`Assinatura cancelada - Order: ${order_id}, Cliente: ${customer_email}`);

    const subscription = await Subscription.findOne({ caktoOrderId: order_id });

    if (subscription) {
      subscription.status = "canceled";
      subscription.addEvent("canceled", data);
      await subscription.save();

      // Desativar premium do usuário
      const user = await User.findById(subscription.userId);
      if (user) {
        user.isPremium = false;
        await user.save();
        console.log(`Premium desativado para usuário: ${user.email}`);
      }
    }
  } catch (error) {
    console.error("Erro ao processar cancelamento:", error);
  }
}

/**
 * Processar renovação de assinatura
 */
async function handleSubscriptionRenewed(data) {
  try {
    const { order_id, customer_email } = data;

    console.log(`Assinatura renovada - Order: ${order_id}, Cliente: ${customer_email}`);

    const subscription = await Subscription.findOne({ caktoOrderId: order_id });

    if (subscription) {
      subscription.status = "active";
      subscription.endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // +30 dias
      subscription.renewalDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      subscription.addEvent("renewed", data);
      await subscription.save();

      console.log(`Assinatura renovada até: ${subscription.endDate}`);
    }
  } catch (error) {
    console.error("Erro ao processar renovação:", error);
  }
}

module.exports = router;
