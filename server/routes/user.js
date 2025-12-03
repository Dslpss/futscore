const express = require("express");
const User = require("../models/User");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// Get user's favorite teams
router.get("/favorites", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("favoriteTeams");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ favoriteTeams: user.favoriteTeams || [] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update user's favorite teams (replace entire list)
router.put("/favorites", authMiddleware, async (req, res) => {
  try {
    const { favoriteTeams } = req.body;

    if (!Array.isArray(favoriteTeams)) {
      return res
        .status(400)
        .json({ message: "favoriteTeams must be an array" });
    }

    // Validate each team object
    for (const team of favoriteTeams) {
      if (!team.id || !team.name || !team.logo || !team.country) {
        return res.status(400).json({
          message: "Each team must have id, name, logo, and country",
        });
      }
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { favoriteTeams },
      { new: true }
    ).select("favoriteTeams");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ favoriteTeams: user.favoriteTeams });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Add a single team to favorites
router.post("/favorites/:teamId", authMiddleware, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { name, logo, country } = req.body;

    if (!name || !logo || !country) {
      return res.status(400).json({
        message: "Team name, logo, and country are required",
      });
    }

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if team already exists
    const teamExists = user.favoriteTeams.some(
      (team) => team.id === parseInt(teamId)
    );

    if (teamExists) {
      return res.status(400).json({ message: "Team already in favorites" });
    }

    // Add team to favorites
    user.favoriteTeams.push({
      id: parseInt(teamId),
      name,
      logo,
      country,
    });

    await user.save();

    res.json({ favoriteTeams: user.favoriteTeams });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Remove a team from favorites
router.delete("/favorites/:teamId", authMiddleware, async (req, res) => {
  try {
    const { teamId } = req.params;

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Remove team from favorites
    user.favoriteTeams = user.favoriteTeams.filter(
      (team) => team.id !== parseInt(teamId)
    );

    await user.save();

    res.json({ favoriteTeams: user.favoriteTeams });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// ============ PUSH NOTIFICATIONS ============

// Registrar Push Token do dispositivo
router.post("/push-token", authMiddleware, async (req, res) => {
  try {
    const { pushToken } = req.body;

    if (!pushToken) {
      return res.status(400).json({ message: "Push token is required" });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { pushToken },
      { new: true }
    ).select("pushToken");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log(`[Push] Token registrado para usuário ${req.userId}`);
    res.json({ success: true, message: "Push token registered" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Remover Push Token (quando usuário deslogar)
router.delete("/push-token", authMiddleware, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.userId, { pushToken: null });
    res.json({ success: true, message: "Push token removed" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Atualizar configurações de notificação
router.put("/notification-settings", authMiddleware, async (req, res) => {
  try {
    const { allMatches, favoritesOnly, goals, matchStart } = req.body;

    const user = await User.findByIdAndUpdate(
      req.userId,
      {
        notificationSettings: {
          allMatches: allMatches !== undefined ? allMatches : true,
          favoritesOnly: favoritesOnly !== undefined ? favoritesOnly : false,
          goals: goals !== undefined ? goals : true,
          matchStart: matchStart !== undefined ? matchStart : true,
        },
      },
      { new: true }
    ).select("notificationSettings");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ notificationSettings: user.notificationSettings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Buscar configurações de notificação
router.get("/notification-settings", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("notificationSettings");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ notificationSettings: user.notificationSettings || {} });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// ============ DEBUG/TEST ENDPOINTS ============

// Verificar status do push token do usuário
router.get("/push-status", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select(
      "pushToken notificationSettings email"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      email: user.email,
      hasPushToken: !!user.pushToken,
      pushTokenPreview: user.pushToken
        ? user.pushToken.substring(0, 30) + "..."
        : null,
      notificationSettings: user.notificationSettings,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Enviar notificação de teste para o próprio usuário
router.post("/test-notification", authMiddleware, async (req, res) => {
  try {
    const { sendPushToUser } = require("../services/pushNotifications");
    const user = await User.findById(req.userId).select("pushToken");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.pushToken) {
      return res.status(400).json({
        message: "Push token not registered. Open the app and login again.",
        hasPushToken: false,
      });
    }

    const success = await sendPushToUser(
      user.pushToken,
      "🧪 Teste de Notificação",
      "Se você recebeu isso, as notificações estão funcionando!",
      { type: "test" }
    );

    res.json({
      success,
      message: success ? "Notification sent!" : "Failed to send notification",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
