const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');
const {
  register,
  login,
  logout,
  getMe,
  verifyEmail,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');
const { validate } = require('../middleware/validate');

router.post(
  '/register',
  [
    body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    validate,
  ],
  register
);

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
    validate,
  ],
  login
);

router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.get('/verify-email/:token', verifyEmail);
router.post('/forgot-password', body('email').isEmail(), validate, forgotPassword);
router.post('/reset-password/:token', body('password').isLength({ min: 6 }), validate, resetPassword);

module.exports = router;
