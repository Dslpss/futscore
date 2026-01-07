const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  // ID do pedido na Cakto
  caktoOrderId: {
    type: String,
    required: true,
    unique: true,
  },
  // ID do cliente na Cakto (email usado no pagamento)
  caktoCustomerEmail: {
    type: String,
    required: true,
  },
  // Status da assinatura
  status: {
    type: String,
    enum: ["pending", "active", "canceled", "expired", "failed"],
    default: "pending",
  },
  // Valor da assinatura
  amount: {
    type: Number,
    required: true,
  },
  // Método de pagamento (pix, credit_card, boleto, etc)
  paymentMethod: {
    type: String,
    default: null,
  },
  // Data de início da assinatura
  startDate: {
    type: Date,
    default: null,
  },
  // Data de expiração (30 dias após ativação)
  endDate: {
    type: Date,
    default: null,
  },
  // Próxima data de renovação
  renewalDate: {
    type: Date,
    default: null,
  },
  // Histórico de eventos
  events: [
    {
      type: {
        type: String,
        enum: ["created", "approved", "refused", "canceled", "renewed", "expired"],
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
      data: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Atualizar updatedAt antes de salvar
subscriptionSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Método para verificar se a assinatura está ativa
subscriptionSchema.methods.isActive = function () {
  return this.status === "active" && this.endDate > new Date();
};

// Método para adicionar evento ao histórico
subscriptionSchema.methods.addEvent = function (type, data = {}) {
  this.events.push({
    type,
    timestamp: new Date(),
    data,
  });
};

module.exports = mongoose.model("Subscription", subscriptionSchema);
