const express = require("express");
const router = express.Router();
const Channel = require("../models/Channel");
const { parseM3U } = require("../services/m3uParser");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const SystemSetting = require("../models/SystemSetting");

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

// Optional auth middleware (doesn't require admin, just validates token)
const optionalAuth = async (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    req.user = user;
    next();
  } catch (err) {
    req.user = null;
    next();
  }
};

// Check if user has TV access (requires auth)
router.get("/check-access", async (req, res) => {
  try {
    // Check maintenance mode first
    const maintenanceSetting = await SystemSetting.findOne({ key: "channels_maintenance" });
    if (maintenanceSetting && maintenanceSetting.value === true) {
      return res.json({ 
        hasAccess: false, 
        reason: "maintenance",
        message: "O sistema de canais está em manutenção. Voltaremos em breve."
      });
    }

    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return res.json({ hasAccess: true }); // No auth = allow access
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.json({ hasAccess: true }); // User not found = allow (might be new user)
    }

    if (user.canAccessTV === false) {
      return res.json({ hasAccess: false, reason: "tv_blocked" });
    }

    return res.json({ hasAccess: true });
  } catch (err) {
    console.error("[Channels] Check access error:", err.message);
    return res.json({ hasAccess: true }); // On error, allow access
  }
});

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

// Upload M3U content directly (for when URL is blocked)
router.post("/upload", authMiddleware, async (req, res) => {
  try {
    console.log(`[Channels] Upload started by ${req.user.email}`);
    
    const { m3uContent } = req.body;

    if (!m3uContent || typeof m3uContent !== 'string') {
      return res.status(400).json({ message: "M3U content is required" });
    }

    console.log(`[Channels] Processing uploaded content, length: ${m3uContent.length}`);

    // Parse the M3U content directly
    const lines = m3uContent.split('\n');
    console.log(`[Channels] Total lines: ${lines.length}`);
    
    const channels = [];
    let currentChannel = {};

    // Sports keywords for filtering
    const sportsKeywords = [
      'sport', 'espn', 'fox sports', 'futebol', 'football', 'soccer',
      'nfl', 'nba', 'nhl', 'mlb', 'ufc', 'fight', 'boxing', 'premiere',
      'combate', 'sportv', 'band sports', 'esporte', 'champions',
      'copa', 'liga', 'arena', 'racing', 'tennis', 'golf', 'rugby',
      'cricket', 'formula', 'f1', 'moto', 'volei', 'basquete',
      'beinsports', 'sky sports', 'dazn', 'eleven', 'fox deportes',
      'tnt sports', 'star+', 'paramount', 'peacock', 'nbcsn',
      'disney +', 'disney+', 'goat', 'caze'
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('#EXTINF:')) {
        // Parse channel metadata
        currentChannel = {
          name: '',
          logo: null,
          groupTitle: null,
          country: null,
          language: null,
        };

        const logoMatch = line.match(/tvg-logo="([^"]*)"/);
        if (logoMatch) currentChannel.logo = logoMatch[1];

        const groupMatch = line.match(/group-title="([^"]*)"/);
        if (groupMatch) currentChannel.groupTitle = groupMatch[1];

        const countryMatch = line.match(/tvg-country="([^"]*)"/);
        if (countryMatch) currentChannel.country = countryMatch[1];

        const languageMatch = line.match(/tvg-language="([^"]*)"/);
        if (languageMatch) currentChannel.language = languageMatch[1];

        const nameMatch = line.match(/,(.+)$/);
        if (nameMatch) currentChannel.name = nameMatch[1].trim();
      }
      else if (line && !line.startsWith('#') && currentChannel.name) {
        currentChannel.url = line;
        
        // Check if it's a sports channel
        const searchText = `${currentChannel.name} ${currentChannel.groupTitle || ''}`.toLowerCase();
        const isSports = sportsKeywords.some(keyword => searchText.includes(keyword));
        
        if (isSports) {
          channels.push({ ...currentChannel });
        }
        
        currentChannel = {};
      }
    }

    console.log(`[Channels] Parsed ${channels.length} sports channels`);

    if (channels.length === 0) {
      return res.json({ 
        message: "No sports channels found in uploaded content",
        synced: 0,
        total: 0
      });
    }

    // Update or create channels
    let newCount = 0;
    let updatedCount = 0;

    for (const channelData of channels) {
      // Garantir que language seja sempre string (nunca null - evita conflito com text index)
      const safeLanguage = channelData.language && typeof channelData.language === 'string' 
        ? channelData.language 
        : '';
      
      const existing = await Channel.findOne({ url: channelData.url });

      if (existing) {
        await Channel.findByIdAndUpdate(existing._id, {
          name: channelData.name,
          logo: channelData.logo || existing.logo,
          groupTitle: channelData.groupTitle || existing.groupTitle,
          country: channelData.country || existing.country,
          language: safeLanguage || existing.language || '',
          updatedAt: new Date(),
        });
        updatedCount++;
      } else {
        await Channel.create({
          name: channelData.name,
          url: channelData.url,
          logo: channelData.logo,
          category: "sports",
          groupTitle: channelData.groupTitle,
          country: channelData.country,
          language: safeLanguage,
        });
        newCount++;
      }
    }

    console.log(`[Channels] ✅ Upload complete: ${newCount} new, ${updatedCount} updated`);

    res.json({
      message: "Channels uploaded successfully",
      synced: newCount + updatedCount,
      new: newCount,
      updated: updatedCount,
      total: channels.length,
    });
  } catch (err) {
    console.error("[Channels] ❌ Upload error:", err);
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
