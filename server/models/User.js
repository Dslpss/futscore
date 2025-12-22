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
});

module.exports = mongoose.model("User", userSchema);
