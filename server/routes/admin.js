const express = require("express");
const router = express.Router();
const Warning = require("../models/Warning");
const AppVersion = require("../models/AppVersion");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

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
      .select("name email isAdmin status statusUpdatedAt createdAt pushToken favoriteTeams")
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(
      users.map((user) => ({
        _id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        status: user.status || "active",
        statusUpdatedAt: user.statusUpdatedAt,
        createdAt: user.createdAt,
        hasPushToken: !!user.pushToken,
        favoriteTeamsCount: user.favoriteTeams?.length || 0,
      }))
    );
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

module.exports = router;
