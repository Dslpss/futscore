const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');

// ==========================================
// PUBLIC ROUTES (require auth but not admin)
// ==========================================

// Get active announcements for current user
router.get('/active', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('subscription');
    const isPremium = user?.subscription?.isActive || false;
    
    const announcements = await Announcement.getActiveForUser(req.userId, isPremium);
    
    res.json({ announcements });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// Dismiss an announcement
router.post('/:id/dismiss', authMiddleware, async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    
    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    // Add user to dismissed list
    if (!announcement.dismissedBy.includes(req.userId)) {
      announcement.dismissedBy.push(req.userId);
      await announcement.save();
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error dismissing announcement:', error);
    res.status(500).json({ error: 'Failed to dismiss announcement' });
  }
});

// Increment view count
router.post('/:id/view', authMiddleware, async (req, res) => {
  try {
    await Announcement.findByIdAndUpdate(req.params.id, {
      $inc: { viewCount: 1 }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record view' });
  }
});

// ==========================================
// ADMIN ROUTES
// ==========================================

// Middleware to check if user is admin
const adminMiddleware = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Authorization failed' });
  }
};

// Get all announcements (admin)
router.get('/admin/all', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const announcements = await Announcement.find()
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email');
    
    res.json({ announcements });
  } catch (error) {
    console.error('Error fetching all announcements:', error);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// Create announcement (admin)
router.post('/admin/create', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const {
      title,
      message,
      type,
      icon,
      primaryColor,
      secondaryColor,
      actionType,
      actionTarget,
      actionLabel,
      imageUrl,
      priority,
      isActive,
      startDate,
      endDate,
      targetAudience,
    } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    const announcement = new Announcement({
      title,
      message,
      type: type || 'news',
      icon: icon || '🎉',
      primaryColor: primaryColor || '#22c55e',
      secondaryColor: secondaryColor || '#16a34a',
      actionType: actionType || 'dismiss',
      actionTarget: actionTarget || '',
      actionLabel: actionLabel || 'Entendi',
      imageUrl: imageUrl || '',
      priority: priority || 0,
      isActive: isActive !== false,
      startDate: startDate || new Date(),
      endDate: endDate || null,
      targetAudience: targetAudience || 'all',
      createdBy: req.userId,
    });

    await announcement.save();

    res.status(201).json({
      success: true,
      announcement,
      message: 'Announcement created successfully',
    });
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

// Update announcement (admin)
router.put('/admin/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const announcement = await Announcement.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    res.json({
      success: true,
      announcement,
      message: 'Announcement updated successfully',
    });
  } catch (error) {
    console.error('Error updating announcement:', error);
    res.status(500).json({ error: 'Failed to update announcement' });
  }
});

// Delete announcement (admin)
router.delete('/admin/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const announcement = await Announcement.findByIdAndDelete(req.params.id);

    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    res.json({
      success: true,
      message: 'Announcement deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
});

// Toggle announcement status (admin)
router.patch('/admin/:id/toggle', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    announcement.isActive = !announcement.isActive;
    await announcement.save();

    res.json({
      success: true,
      isActive: announcement.isActive,
      message: `Announcement ${announcement.isActive ? 'activated' : 'deactivated'}`,
    });
  } catch (error) {
    console.error('Error toggling announcement:', error);
    res.status(500).json({ error: 'Failed to toggle announcement' });
  }
});

module.exports = router;
