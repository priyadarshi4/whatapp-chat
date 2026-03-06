const crypto = require('crypto');
const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const { sendEmail } = require('../utils/email');

// @desc    Register user
// @route   POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered.' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const user = await User.create({
      name,
      email,
      password,
      verificationToken,
      verificationTokenExpires,
    });

    // Send verification email
    const verifyUrl = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;
    try {
      await sendEmail({
        to: email,
        subject: 'Verify your ChatApp account',
        html: `
          <h2>Welcome to ChatApp, ${name}!</h2>
          <p>Click the link below to verify your email address:</p>
          <a href="${verifyUrl}" style="background:#25D366;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;">Verify Email</a>
          <p>This link expires in 24 hours.</p>
          <p>If you didn't create an account, ignore this email.</p>
        `,
      });
    } catch (emailErr) {
      console.warn('Email send failed:', emailErr.message);
    }

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your email.',
      token,
      user: user.toJSON(),
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Update online status
    user.online = true;
    user.lastSeen = new Date();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: user.toJSON(),
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
exports.logout = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      online: false,
      lastSeen: new Date(),
    });

    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed.' });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user data.' });
  }
};

// @desc    Verify email
// @route   GET /api/auth/verify-email/:token
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification token.' });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save({ validateBeforeSave: false });

    res.json({ success: true, message: 'Email verified successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Email verification failed.' });
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if email exists
      return res.json({ success: true, message: 'If that email exists, a reset link was sent.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
    try {
      await sendEmail({
        to: email,
        subject: 'Reset your ChatApp password',
        html: `
          <h2>Password Reset Request</h2>
          <p>Click the link below to reset your password:</p>
          <a href="${resetUrl}" style="background:#25D366;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;">Reset Password</a>
          <p>This link expires in 1 hour.</p>
          <p>If you didn't request this, ignore this email.</p>
        `,
      });
    } catch (emailErr) {
      console.warn('Reset email failed:', emailErr.message);
    }

    res.json({ success: true, message: 'If that email exists, a reset link was sent.' });
  } catch (error) {
    res.status(500).json({ error: 'Password reset request failed.' });
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password/:token
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token.' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ success: true, message: 'Password reset successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Password reset failed.' });
  }
};
