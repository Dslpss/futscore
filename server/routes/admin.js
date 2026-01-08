const express = require("express");
const router = express.Router();
const Warning = require("../models/Warning");
const AppVersion = require("../models/AppVersion");
const SystemSetting = require("../models/SystemSetting");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { sendPushToAll, expo, Expo } = require("../services/pushNotifications");

// Middleware to check if user is admin
const authMiddleware = async (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token)
    return res.status(401).json({ message: "No token, authorization denied" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: "Token is not valid" });
  }
};

// --- WARNINGS ---

// Get all warnings (Public for app)
router.get("/warnings", async (req, res) => {
  try {
    const warnings = await Warning.find({ active: true }).sort({
      createdAt: -1,
    });
    res.json(warnings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create warning (Admin)
router.post("/warnings", authMiddleware, async (req, res) => {
  try {
    const newWarning = new Warning(req.body);
    const savedWarning = await newWarning.save();
    res.json(savedWarning);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete warning (Admin)
router.delete("/warnings/:id", authMiddleware, async (req, res) => {
  try {
    await Warning.findByIdAndDelete(req.params.id);
    res.json({ message: "Warning deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- APP VERSION ---

// Get latest version (Public for app)
router.get("/version", async (req, res) => {
  try {
    const latestVersion = await AppVersion.findOne().sort({ createdAt: -1 });
    res.json(
      latestVersion || {
        version: "1.0.0",
        downloadLink: "",
        forceUpdate: false,
      }
    );
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// --- SYSTEM SETTINGS ---

// Get specific setting (Public for app to check minimum version)
router.get("/system-settings/:key", async (req, res) => {
  try {
    const { key } = req.params;
    const setting = await SystemSetting.findOne({ key });
    
    if (!setting) {
      return res.json({ key, value: null });
    }
    
    res.json({ key, value: setting.value });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all system settings (Admin)
router.get("/system-settings", authMiddleware, async (req, res) => {
  try {
    const settings = await SystemSetting.find();
    // Convert array to object for easier frontend consumption
    const settingsMap = {};
    settings.forEach(s => {
      settingsMap[s.key] = s.value;
    });
    res.json(settingsMap);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update system settings (Admin)
router.put("/system-settings", authMiddleware, async (req, res) => {
  try {
    const updates = req.body; // Expect object like { "channels_maintenance": true }
    
    const results = {};
    
    for (const [key, value] of Object.entries(updates)) {
      const setting = await SystemSetting.findOneAndUpdate(
        { key },
        { 
          value, 
          updatedAt: new Date() 
        },
        { upsert: true, new: true }
      );
      results[key] = setting.value;
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Set new version (Admin)
router.post("/version", authMiddleware, async (req, res) => {
  try {
    const newVersion = new AppVersion(req.body);
    const savedVersion = await newVersion.save();
    res.json(savedVersion);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- USER STATS ---

// Get user statistics (Admin)
router.get("/users/stats", authMiddleware, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const usersWithPushToken = await User.countDocuments({
      pushToken: { $exists: true, $ne: null },
    });
    const admins = await User.countDocuments({ isAdmin: true });

    // Users registered in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const newUsersLast7Days = await User.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
    });

    // Users registered in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newUsersLast30Days = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });

    // Users with favorite teams
    const usersWithFavorites = await User.countDocuments({
      "favoriteTeams.0": { $exists: true },
    });

    res.json({
      totalUsers,
      usersWithPushToken,
      admins,
      newUsersLast7Days,
      newUsersLast30Days,
      usersWithFavorites,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all users list (Admin)
router.get("/users", authMiddleware, async (req, res) => {
  try {
    const users = await User.find()
      .select("name email isAdmin status statusUpdatedAt createdAt pushToken favoriteTeams canAccessTV isPremium trialStartDate trialUsed subscriptionId")
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(
      users.map((user) => {
        // Calculate trial status
        let trialStatus = 'none';
        let trialDaysRemaining = 0;
        
        if (user.trialStartDate && !user.trialUsed) {
          const trialEnd = new Date(user.trialStartDate);
          trialEnd.setDate(trialEnd.getDate() + 7);
          const now = new Date();
          
          if (now < trialEnd) {
            trialStatus = 'active';
            trialDaysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          } else {
            trialStatus = 'expired';
          }
        } else if (user.trialUsed) {
          trialStatus = 'used';
        }
        
        return {
          _id: user._id,
          name: user.name,
          email: user.email,
          isAdmin: user.isAdmin,
          isPremium: user.isPremium || false,
          status: user.status || "active",
          statusUpdatedAt: user.statusUpdatedAt,
          createdAt: user.createdAt,
          hasPushToken: !!user.pushToken,
          favoriteTeamsCount: user.favoriteTeams?.length || 0,
          canAccessTV: user.canAccessTV !== false,
          // Trial info
          trialStatus,
          trialDaysRemaining,
          trialStartDate: user.trialStartDate,
          hasSubscription: !!user.subscriptionId,
        };
      })
    );
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Toggle TV access for user (Admin)
router.put("/users/:id/tv-access", authMiddleware, async (req, res) => {
  try {
    const userId = req.params.id;
    const { canAccessTV } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { canAccessTV },
      { new: true }
    ).select("name email canAccessTV");

    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    console.log(`[Admin] User ${user.email} TV access changed to ${canAccessTV} by ${req.user.email}`);
    res.json({ 
      message: canAccessTV ? "Acesso à TV liberado." : "Acesso à TV bloqueado.", 
      user 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete user (Admin)
router.delete("/users/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Prevent deleting yourself
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: "Você não pode deletar sua própria conta." });
    }

    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    console.log(`[Admin] User deleted: ${user.email} by ${req.user.email}`);
    res.json({ message: "Usuário deletado com sucesso." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update user status (Admin) - block, suspend, activate
router.put("/users/:id/status", authMiddleware, async (req, res) => {
  try {
    const userId = req.params.id;
    const { status } = req.body;

    if (!["active", "suspended", "blocked"].includes(status)) {
      return res.status(400).json({ message: "Status inválido." });
    }

    // Prevent modifying yourself
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: "Você não pode alterar seu próprio status." });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { status, statusUpdatedAt: new Date() },
      { new: true }
    ).select("name email status");

    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    console.log(`[Admin] User ${user.email} status changed to ${status} by ${req.user.email}`);
    res.json({ message: `Status atualizado para ${status}.`, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Toggle admin status (Admin)
router.put("/users/:id/admin", authMiddleware, async (req, res) => {
  try {
    const userId = req.params.id;
    const { isAdmin } = req.body;

    // Prevent modifying yourself
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: "Você não pode alterar seu próprio status de admin." });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { isAdmin },
      { new: true }
    ).select("name email isAdmin");

    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    console.log(`[Admin] User ${user.email} admin status changed to ${isAdmin} by ${req.user.email}`);
    res.json({ message: isAdmin ? "Usuário promovido a admin." : "Privilégios de admin removidos.", user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Toggle premium status (Admin)
router.put("/users/:id/premium", authMiddleware, async (req, res) => {
  try {
    const userId = req.params.id;
    const { isPremium } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { isPremium },
      { new: true }
    ).select("name email isPremium");

    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    console.log(`[Admin] User ${user.email} premium status changed to ${isPremium} by ${req.user.email}`);
    res.json({ message: isPremium ? "Premium ativado manualmente." : "Premium desativado.", user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- PUSH NOTIFICATIONS ---

// Send update notification to all users (Admin)
router.post("/notifications/update", authMiddleware, async (req, res) => {
  try {
    const { title, body, version } = req.body;

    if (!title || !body) {
      return res.status(400).json({ message: "Título e mensagem são obrigatórios." });
    }

    // Fetch all users with push tokens
    const users = await User.find({ pushToken: { $ne: null } }).select("pushToken");

    if (users.length === 0) {
      return res.json({ 
        message: "Nenhum usuário com token de push encontrado.",
        sentCount: 0,
        totalEligible: 0
      });
    }

    // Build messages array
    const { Expo } = require("expo-server-sdk");
    const messages = [];

    for (const user of users) {
      if (!Expo.isExpoPushToken(user.pushToken)) continue;

      messages.push({
        to: user.pushToken,
        sound: "default",
        title,
        body,
        data: { 
          type: "app_update",
          version: version || null
        },
        priority: "high",
        channelId: "updates",
      });
    }

    if (messages.length === 0) {
      return res.json({ 
        message: "Nenhum token de push válido encontrado.",
        sentCount: 0,
        totalEligible: users.length
      });
    }

    // Send notifications individually to avoid PUSH_TOO_MANY_EXPERIENCE_IDS error
    let successCount = 0;
    let errorCount = 0;

    for (const message of messages) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync([message]);
        
        if (ticketChunk[0]?.status === 'error') {
          console.error(`[Admin Push] ❌ Erro para token ${message.to?.substring(0, 30)}...: ${ticketChunk[0].message}`);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (error) {
        console.error(`[Admin Push] ❌ Erro ao enviar para ${message.to?.substring(0, 30)}...:`, error.message);
        errorCount++;
      }
    }

    console.log(`[Admin] Update notification sent by ${req.user.email}: ${successCount}/${messages.length} success`);

    res.json({
      message: `Notificação enviada com sucesso!`,
      sentCount: successCount,
      errorCount,
      totalEligible: messages.length
    });
  } catch (err) {
    console.error("[Admin Push] Error:", err);
    res.status(500).json({ message: err.message });
  }
});

// Send custom notification to all users (Admin)
router.post("/notifications/broadcast", authMiddleware, async (req, res) => {
  try {
    const { title, body, data = {} } = req.body;

    if (!title || !body) {
      return res.status(400).json({ message: "Título e mensagem são obrigatórios." });
    }

    // Fetch all users with push tokens
    const users = await User.find({ pushToken: { $ne: null } }).select("pushToken");

    if (users.length === 0) {
      return res.json({ 
        message: "Nenhum usuário com token de push encontrado.",
        sentCount: 0,
        totalEligible: 0
      });
    }

    const { Expo } = require("expo-server-sdk");
    const messages = [];

    for (const user of users) {
      if (!Expo.isExpoPushToken(user.pushToken)) continue;

      messages.push({
        to: user.pushToken,
        sound: "default",
        title,
        body,
        data: { type: "broadcast", ...data },
        priority: "high",
        channelId: "updates",
      });
    }

    if (messages.length === 0) {
      return res.json({ 
        message: "Nenhum token de push válido encontrado.",
        sentCount: 0,
        totalEligible: users.length
      });
    }

    let successCount = 0;
    let errorCount = 0;

    for (const message of messages) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync([message]);
        
        if (ticketChunk[0]?.status === 'error') {
          errorCount++;
        } else {
          successCount++;
        }
      } catch (error) {
        errorCount++;
      }
    }

    console.log(`[Admin] Broadcast notification sent by ${req.user.email}: ${successCount}/${messages.length} success`);

    res.json({
      message: `Notificação enviada com sucesso!`,
      sentCount: successCount,
      errorCount,
      totalEligible: messages.length
    });
  } catch (err) {
    console.error("[Admin Push] Error:", err);
    res.status(500).json({ message: err.message });
  }
});

// --- SUBSCRIPTIONS ---

// Get subscriptions statistics (Admin)
router.get("/subscriptions/stats", authMiddleware, async (req, res) => {
  try {
    const Subscription = require("../models/Subscription");
    
    const totalSubscribers = await Subscription.countDocuments();
    const activeSubscribers = await Subscription.countDocuments({ status: "active" });
    
    // Monthly recurring revenue (MRR)
    const activeSubscriptions = await Subscription.find({ status: "active" });
    const monthlyRevenue = activeSubscriptions.reduce((sum, sub) => sum + sub.amount, 0);
    
    // New subscriptions this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const newThisMonth = await Subscription.countDocuments({
      createdAt: { $gte: startOfMonth },
    });
    
    // Trial stats
    const usersOnActiveTrial = await User.countDocuments({
      trialStartDate: { $exists: true, $ne: null },
      trialUsed: { $ne: true },
      $expr: {
        $gt: [
          { $add: ["$trialStartDate", 7 * 24 * 60 * 60 * 1000] }, // trial end date
          new Date() // current date
        ]
      }
    });
    
    const usersTrialExpired = await User.countDocuments({
      trialUsed: true
    });
    
    res.json({
      totalSubscribers,
      activeSubscribers,
      monthlyRevenue,
      newThisMonth,
      usersOnActiveTrial,
      usersTrialExpired,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all subscriptions (Admin)
router.get("/subscriptions", authMiddleware, async (req, res) => {
  try {
    const Subscription = require("../models/Subscription");
    
    const subscriptions = await Subscription.find()
      .populate("userId", "name email")
      .sort({ createdAt: -1 });
    
    res.json(subscriptions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Toggle subscription status manually (Admin)
router.put("/subscriptions/:id/status", authMiddleware, async (req, res) => {
  try {
    const Subscription = require("../models/Subscription");
    const { status } = req.body;
    
    if (!["active", "canceled", "expired"].includes(status)) {
      return res.status(400).json({ message: "Status inválido." });
    }
    
    const subscription = await Subscription.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate("userId", "name email");
    
    if (!subscription) {
      return res.status(404).json({ message: "Assinatura não encontrada." });
    }
    
    // Update user premium status
    if (status === "active") {
      await User.findByIdAndUpdate(subscription.userId._id, { isPremium: true });
    } else {
      await User.findByIdAndUpdate(subscription.userId._id, { isPremium: false });
    }
    
    console.log(`[Admin] Subscription status changed to ${status} by ${req.user.email}`);
    res.json({ message: `Status atualizado para ${status}.`, subscription });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
