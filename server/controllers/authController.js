// Authentication controller - handles register, login, profile update
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// @desc    Register new shopkeeper
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const { name, email, password, shopName, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const user = await User.create({ name, email, password, shopName, phone });
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        shopName: user.shopName,
        phone: user.phone,
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login shopkeeper
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    // Find user and include password field
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Verify password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        shopName: user.shopName,
        phone: user.phone,
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged-in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      shopName: req.user.shopName,
      phone: req.user.phone,
      profilePicture: req.user.profilePicture
    }
  });
};

// @desc    Update owner profile (name, email, shopName, phone, profilePicture)
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const { name, email, shopName, phone } = req.body;
    const userId = req.user._id;

    // Validate that required fields are not empty when provided
    if (name !== undefined && !name.trim()) {
      return res.status(400).json({ success: false, message: 'Name cannot be empty' });
    }

    // If email is changing, make sure it is not taken by another account
    if (email && email.toLowerCase() !== req.user.email) {
      const taken = await User.findOne({ email: email.toLowerCase(), _id: { $ne: userId } });
      if (taken) {
        return res.status(400).json({ success: false, message: 'Email is already in use by another account' });
      }
    }

    // Build update object
    const updates = {};
    if (name)     updates.name     = name.trim();
    if (email)    updates.email    = email.toLowerCase().trim();
    if (shopName) updates.shopName = shopName.trim();
    if (phone !== undefined) updates.phone = phone.trim();

    // If a profile picture was uploaded, save its path
    if (req.file) {
      updates.profilePicture = `/uploads/${req.file.filename}`;
    }

    const user = await User.findByIdAndUpdate(userId, updates, { new: true, runValidators: true });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        shopName: user.shopName,
        phone: user.phone,
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getMe, updateProfile };
