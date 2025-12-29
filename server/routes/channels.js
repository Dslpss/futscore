const express = require("express");
const router = express.Router();
const Channel = require("../models/Channel");
const { parseM3U } = require("../services/m3uParser");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Admin middleware
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

// M3U URL (pode ser movido para variável de ambiente)
const M3U_URL = "http://tiralit.shop:8880/get.php?username=q8swvtcke46&password=mrjnuhq81dt&type=m3u_plus&output=ts";

// --- PUBLIC ROUTES ---

// Get all active channels
router.get("/", async (req, res) => {
  try {
    const { category, search, limit = 100 } = req.query;
    
    const query = { isActive: true };
    
    if (category) {
      query.category = category;
    }
    
    let channels;
    
    if (search) {
      // Text search
      channels = await Channel.find({
        ...query,
        $text: { $search: search }
      })
        .limit(parseInt(limit))
        .sort({ viewCount: -1 });
    } else {
      channels = await Channel.find(query)
        .limit(parseInt(limit))
        .sort({ viewCount: -1, name: 1 });
    }

    res.json(channels);
  } catch (err) {
    console.error("[Channels API] Error fetching channels:", err);
    res.status(500).json({ message: err.message });
  }
});

// Get sports channels only
router.get("/sports", async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    
    const channels = await Channel.find({ 
      isActive: true,
      category: "sports" 
    })
      .limit(parseInt(limit))
      .sort({ viewCount: -1, name: 1 });

    res.json(channels);
  } catch (err) {
    console.error("[Channels API] Error fetching sports channels:", err);
    res.status(500).json({ message: err.message });
  }
});

// Get channel by ID
router.get("/:id", async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id);
    
    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    res.json(channel);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Increment view count
router.post("/:id/view", async (req, res) => {
  try {
    const channel = await Channel.findByIdAndUpdate(
      req.params.id,
      { 
        $inc: { viewCount: 1 },
        lastAccessed: new Date()
      },
      { new: true }
    );

    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    res.json({ message: "View count updated" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- ADMIN ROUTES ---

// Sync channels from M3U
router.post("/sync", authMiddleware, async (req, res) => {
  try {
    console.log(`[Channels] Sync started by ${req.user.email}`);
    
    const { m3uUrl } = req.body;
    const url = m3uUrl || M3U_URL;

    // Parse M3U
    const parsedChannels = await parseM3U(url);

    if (parsedChannels.length === 0) {
      return res.json({ 
        message: "No sports channels found in M3U",
        synced: 0,
        total: 0
      });
    }

    // Update or create channels
    let syncedCount = 0;
    let newCount = 0;
    let updatedCount = 0;

    for (const channelData of parsedChannels) {
      const existing = await Channel.findOne({ url: channelData.url });

      if (existing) {
        // Update existing channel
        await Channel.findByIdAndUpdate(existing._id, {
          name: channelData.name,
          logo: channelData.logo || existing.logo,
          groupTitle: channelData.groupTitle || existing.groupTitle,
          country: channelData.country || existing.country,
          language: channelData.language || existing.language,
          updatedAt: new Date(),
        });
        updatedCount++;
      } else {
        // Create new channel
        await Channel.create({
          name: channelData.name,
          url: channelData.url,
          logo: channelData.logo,
          category: "sports",
          groupTitle: channelData.groupTitle,
          country: channelData.country,
          language: channelData.language,
        });
        newCount++;
      }
      
      syncedCount++;
    }

    console.log(`[Channels] ✅ Sync complete: ${newCount} new, ${updatedCount} updated`);

    res.json({
      message: "Channels synced successfully",
      synced: syncedCount,
      new: newCount,
      updated: updatedCount,
      total: parsedChannels.length,
    });
  } catch (err) {
    console.error("[Channels] ❌ Sync error:", err);
    res.status(500).json({ message: err.message });
  }
});

// Get all channels (including inactive) - Admin
router.get("/admin/all", authMiddleware, async (req, res) => {
  try {
    const channels = await Channel.find()
      .sort({ createdAt: -1 })
      .limit(500);

    res.json(channels);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update channel - Admin
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { name, logo, category, isActive } = req.body;

    const channel = await Channel.findByIdAndUpdate(
      req.params.id,
      {
        name,
        logo,
        category,
        isActive,
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    console.log(`[Channels] Channel updated: ${channel.name} by ${req.user.email}`);
    res.json(channel);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete channel - Admin
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const channel = await Channel.findByIdAndDelete(req.params.id);

    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    console.log(`[Channels] Channel deleted: ${channel.name} by ${req.user.email}`);
    res.json({ message: "Channel deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get channel statistics - Admin
router.get("/admin/stats", authMiddleware, async (req, res) => {
  try {
    const totalChannels = await Channel.countDocuments();
    const activeChannels = await Channel.countDocuments({ isActive: true });
    const sportsChannels = await Channel.countDocuments({ category: "sports", isActive: true });
    
    // Most viewed channels
    const mostViewed = await Channel.find({ isActive: true })
      .sort({ viewCount: -1 })
      .limit(10)
      .select("name viewCount logo");

    res.json({
      totalChannels,
      activeChannels,
      sportsChannels,
      inactiveChannels: totalChannels - activeChannels,
      mostViewed,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
