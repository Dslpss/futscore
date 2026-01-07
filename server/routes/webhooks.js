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
    const payload = req.body;
    const { secret, event, data } = payload;

    console.log(`[Cakto Webhook] Evento recebido: ${event}`);

    // Validar secret (a Cakto envia no body, não no header)
    const expectedSecret = process.env.CAKTO_WEBHOOK_SECRET;
    
    if (expectedSecret && secret !== expectedSecret) {
      console.error("[Cakto Webhook] Secret inválido");
      return res.status(401).json({ error: "Invalid secret" });
    }

    // Mapear eventos da Cakto para nossos handlers
    // Baseado na documentação real da Cakto
    const eventMapping = {
      // Eventos de pagamento/pedido
      "pedido_aprovado": "payment.approved",
      "compra_aprovada": "payment.approved",
      "pagamento_aprovado": "payment.approved",
      
      "pedido_recusado": "payment.refused",
      "compra_recusada": "payment.refused",
      
      "pedido_cancelado": "subscription.canceled",
      "compra_cancelada": "subscription.canceled",
      
      "assinatura_renovada": "subscription.renewed",
      "renovacao_aprovada": "subscription.renewed",
      
      // Evento de teste
      "pix_gerado": "test",
    };

    const mappedEvent = eventMapping[event] || event;
    console.log(`[Cakto Webhook] Evento mapeado: ${event} -> ${mappedEvent}`);

    // Processar evento baseado no tipo
    switch (mappedEvent) {
      case "payment.approved":
        await handlePaymentApproved(data);
        break;

      case "payment.refused":
        await handlePaymentRefused(data);
        break;

      case "subscription.canceled":
        await handleSubscriptionCanceled(data);
        break;

      case "subscription.renewed":
        await handleSubscriptionRenewed(data);
        break;

      case "test":
        console.log("[Cakto Webhook] Evento de teste recebido - OK");
        break;

      default:
        console.log(`[Cakto Webhook] Evento não mapeado: ${event}`);
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
    // Estrutura real da Cakto:
    // data.id = order ID
    // data.customer.email = email do cliente
    // data.amount = valor total
    // data.subscription.paymentMethod = método de pagamento
    
    const orderId = data.id;
    const customerEmail = data.customer?.email;
    const amount = data.amount || data.subscription?.amount || 6.0;
    const paymentMethod = data.subscription?.paymentMethod || data.paymentMethod || "unknown";

    console.log(`[Cakto] Pagamento aprovado - Order: ${orderId}, Cliente: ${customerEmail}`);

    if (!customerEmail) {
      console.error("[Cakto] Email do cliente não encontrado no payload");
      return;
    }

    // Buscar usuário pelo email
    let user = await User.findOne({ email: customerEmail.toLowerCase().trim() });

    if (!user) {
      console.warn(`[Cakto] Usuário não encontrado para email: ${customerEmail}`);
      // Em produção você pode criar o usuário automaticamente ou enviar notificação
      return;
    }

    // Verificar se já existe assinatura para este pedido
    let subscription = await Subscription.findOne({ caktoOrderId: orderId });

    if (!subscription) {
      // Criar nova assinatura
      subscription = new Subscription({
        userId: user._id,
        caktoOrderId: orderId,
        caktoCustomerEmail: customerEmail,
        status: "active",
        amount: parseFloat(amount),
        paymentMethod: paymentMethod,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
        renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      subscription.addEvent("created");
      subscription.addEvent("approved", data);
      
      console.log(`[Cakto] Nova assinatura criada: ${subscription._id}`);
    } else {
      // Renovar assinatura existente
      subscription.status = "active";
      subscription.startDate = new Date();
      subscription.endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      subscription.renewalDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      subscription.addEvent("approved", data);
      
      console.log(`[Cakto] Assinatura renovada: ${subscription._id}`);
    }

    await subscription.save();

    // Ativar premium no usuário
    user.isPremium = true;
    user.subscriptionId = subscription._id;
    await user.save();

    console.log(`[Cakto] ✅ Premium ativado para: ${user.email}`);
  } catch (error) {
    console.error("[Cakto] Erro ao processar pagamento aprovado:", error);
    throw error;
  }
}

/**
 * Processar pagamento recusado
 */
async function handlePaymentRefused(data) {
  try {
    const orderId = data.id;
    const customerEmail = data.customer?.email;

    console.log(`[Cakto] Pagamento recusado - Order: ${orderId}, Cliente: ${customerEmail}`);

    const subscription = await Subscription.findOne({ caktoOrderId: orderId });

    if (subscription) {
      subscription.status = "failed";
      subscription.addEvent("refused", data);
      await subscription.save();
      console.log(`[Cakto] ❌ Assinatura marcada como falha: ${subscription._id}`);
    }
  } catch (error) {
    console.error("[Cakto] Erro ao processar pagamento recusado:", error);
  }
}

/**
 * Processar cancelamento de assinatura
 */
async function handleSubscriptionCanceled(data) {
  try {
    const orderId = data.id;
    const customerEmail = data.customer?.email;

    console.log(`[Cakto] Assinatura cancelada - Order: ${orderId}, Cliente: ${customerEmail}`);

    const subscription = await Subscription.findOne({ caktoOrderId: orderId });

    if (subscription) {
      subscription.status = "canceled";
      subscription.addEvent("canceled", data);
      await subscription.save();

      // Desativar premium do usuário
      const user = await User.findById(subscription.userId);
      if (user) {
        user.isPremium = false;
        await user.save();
        console.log(`[Cakto] Premium desativado para: ${user.email}`);
      }
    }
  } catch (error) {
    console.error("[Cakto] Erro ao processar cancelamento:", error);
  }
}

/**
 * Processar renovação de assinatura
 */
async function handleSubscriptionRenewed(data) {
  try {
    const orderId = data.id;
    const customerEmail = data.customer?.email;

    console.log(`[Cakto] Assinatura renovada - Order: ${orderId}, Cliente: ${customerEmail}`);

    const subscription = await Subscription.findOne({ caktoOrderId: orderId });

    if (subscription) {
      subscription.status = "active";
      subscription.endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // +30 dias
      subscription.renewalDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      subscription.addEvent("renewed", data);
      await subscription.save();

      console.log(`[Cakto] 🔄 Assinatura renovada até: ${subscription.endDate}`);
    }
  } catch (error) {
    console.error("[Cakto] Erro ao processar renovação:", error);
  }
}

module.exports = router;
