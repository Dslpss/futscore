const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');

// Directory for APK storage
const DOWNLOADS_DIR = path.join(__dirname, '../public/downloads');

// Ensure downloads directory exists
if (!fs.existsSync(DOWNLOADS_DIR)) {
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
}

// APK metadata file
const METADATA_FILE = path.join(DOWNLOADS_DIR, 'metadata.json');

// Get current metadata
function getMetadata() {
  try {
    if (fs.existsSync(METADATA_FILE)) {
      return JSON.parse(fs.readFileSync(METADATA_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading metadata:', e);
  }
  return null;
}

// Save metadata
function saveMetadata(metadata) {
  fs.writeFileSync(METADATA_FILE, JSON.stringify(metadata, null, 2));
}

// Admin check middleware
const requireAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Error checking admin status' });
  }
};

// Multer config for APK upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, DOWNLOADS_DIR);
  },
  filename: (req, file, cb) => {
    // Always save as FutScore-latest.apk
    cb(null, 'FutScore-latest.apk');
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB max
  fileFilter: (req, file, cb) => {
    if (file.originalname.endsWith('.apk')) {
      cb(null, true);
    } else {
      cb(new Error('Only .apk files are allowed'));
    }
  }
});

// ===== PUBLIC ROUTES =====

// Get APK info (public)
router.get('/info', (req, res) => {
  const metadata = getMetadata();
  
  if (!metadata) {
    return res.json({
      available: false,
      message: 'No APK available yet'
    });
  }
  
  res.json({
    available: true,
    version: metadata.version,
    changelog: metadata.changelog,
    uploadedAt: metadata.uploadedAt,
    filename: metadata.filename,
    size: metadata.size,
    downloadUrl: '/download/apk'
  });
});

// Download APK (public)
router.get('/apk', (req, res) => {
  const apkPath = path.join(DOWNLOADS_DIR, 'FutScore-latest.apk');
  
  if (!fs.existsSync(apkPath)) {
    return res.status(404).json({ error: 'APK not found' });
  }
  
  const metadata = getMetadata();
  const filename = metadata?.filename || 'FutScore.apk';
  
  res.download(apkPath, filename);
});

// ===== ADMIN ROUTES =====

// Upload new APK (admin only)
router.post('/upload', authMiddleware, requireAdmin, upload.single('apk'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No APK file uploaded' });
    }
    
    const { version, changelog } = req.body;
    
    if (!version) {
      return res.status(400).json({ error: 'Version is required' });
    }
    
    // Save metadata
    const metadata = {
      version,
      changelog: changelog || '',
      uploadedAt: new Date().toISOString(),
      filename: `FutScore-v${version}.apk`,
      size: req.file.size,
      uploadedBy: req.user?.email || 'admin'
    };
    
    saveMetadata(metadata);
    
    console.log(`[APK Upload] New version ${version} uploaded by ${metadata.uploadedBy}`);
    
    res.json({
      success: true,
      message: `APK v${version} uploaded successfully`,
      metadata
    });
  } catch (error) {
    console.error('[APK Upload] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get current APK info (admin)
router.get('/current', authMiddleware, requireAdmin, (req, res) => {
  const metadata = getMetadata();
  const apkPath = path.join(DOWNLOADS_DIR, 'FutScore-latest.apk');
  const exists = fs.existsSync(apkPath);
  
  res.json({
    exists,
    metadata
  });
});

// Delete current APK (admin)
router.delete('/current', authMiddleware, requireAdmin, (req, res) => {
  try {
    const apkPath = path.join(DOWNLOADS_DIR, 'FutScore-latest.apk');
    
    if (fs.existsSync(apkPath)) {
      fs.unlinkSync(apkPath);
    }
    
    if (fs.existsSync(METADATA_FILE)) {
      fs.unlinkSync(METADATA_FILE);
    }
    
    res.json({ success: true, message: 'APK deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
