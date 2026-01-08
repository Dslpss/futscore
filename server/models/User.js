const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  // Status do usuário: active, suspended, blocked
  status: {
    type: String,
    enum: ["active", "suspended", "blocked"],
    default: "active",
  },
  statusUpdatedAt: {
    type: Date,
    default: null,
  },
  // Expo Push Token para notificações em segundo plano
  pushToken: {
    type: String,
    default: null,
  },
  // Configurações de notificação
  notificationSettings: {
    allMatches: { type: Boolean, default: true }, // Notificar todos os jogos
    favoritesOnly: { type: Boolean, default: false }, // Apenas favoritos
    goals: { type: Boolean, default: true }, // Notificar gols
    matchStart: { type: Boolean, default: true }, // Notificar início de jogo
  },
  favoriteTeams: [
    {
      id: {
        type: Number,
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
      logo: {
        type: String,
        required: true,
      },
      country: {
        type: String,
        required: true,
      },
      msnId: {
        type: String,
        default: null,
      },
    },
  ],
  // IDs de partidas marcadas para receber notificações (sino 🔔)
  favoriteMatchIds: [{
    type: String, // Armazena fixtureId ou msnGameId como string
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // Campos para recuperação de senha
  resetPasswordToken: {
    type: String,
    default: null,
  },
  resetPasswordExpires: {
    type: Date,
    default: null,
  },
  // Se true, usuário autentica via Firebase (trocou senha pelo Firebase)
  // Se false, autentica via MongoDB (senha original)
  useFirebaseAuth: {
    type: Boolean,
    default: false,
  },
  // Controle de acesso a funcionalidades premium
  canAccessTV: {
    type: Boolean,
    default: true, // Por padrão, todos têm acesso
  },
  // Sistema de assinatura Cakto
  isPremium: {
    type: Boolean,
    default: false,
  },
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subscription",
    default: null,
  },
  // Sistema de Trial de 7 dias
  trialStartDate: {
    type: Date,
    default: null,
  },
  trialUsed: {
    type: Boolean,
    default: false,
  },
});

// Método para verificar se o trial está ativo
userSchema.methods.hasActiveTrial = function () {
  if (!this.trialStartDate || this.trialUsed) {
    return false;
  }
  
  const now = new Date();
  const trialEnd = new Date(this.trialStartDate);
  trialEnd.setDate(trialEnd.getDate() + 7); // 7 dias de trial
  
  // Se o trial expirou, marcar como usado
  if (now >= trialEnd) {
    this.trialUsed = true;
    return false;
  }
  
  return true;
};

// Método para obter data de expiração do trial
userSchema.methods.getTrialEndDate = function () {
  if (!this.trialStartDate) return null;
  
  const trialEnd = new Date(this.trialStartDate);
  trialEnd.setDate(trialEnd.getDate() + 7);
  return trialEnd;
};

// Método para verificar se o usuário tem acesso premium ativo
userSchema.methods.hasPremiumAccess = async function () {
  // Primeiro, verificar trial
  if (this.hasActiveTrial()) {
    return true;
  }
  
  if (!this.isPremium || !this.subscriptionId) {
    return false;
  }

  // Populate subscription se necessário
  if (!this.populated("subscriptionId")) {
    await this.populate("subscriptionId");
  }

  const subscription = this.subscriptionId;
  
  if (!subscription) {
    return false;
  }

  // Verificar se a assinatura está ativa e não expirada
  return subscription.status === "active" && subscription.endDate > new Date();
};

module.exports = mongoose.model("User", userSchema);
