const express = require('express');
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const authController = require('../controller/auth');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Slow down password guessing and bulk sign-ups.
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: process.env.NODE_ENV === 'test' ? 1000 : 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { message: 'Too many attempts. Please try again later.' }
});

const emailRule = body('email')
    .isEmail()
    .withMessage('Please enter a valid email address.')
    .normalizeEmail({ gmail_remove_dots: false });

const registerRules = [
    body('name').trim().notEmpty().withMessage('Your name is required.'),
    body('shopName').trim().notEmpty().withMessage('Shop name is required.'),
    emailRule,
    body('password')
        .isString()
        .isLength({ min: 8, max: 72 })
        .withMessage('Password must be 8 to 72 characters long.'),
    body('mobileno').optional({ values: 'falsy' }).trim().isLength({ max: 20 }),
    body('address').optional({ values: 'falsy' }).trim().isLength({ max: 200 }),
    body('gstin').optional({ values: 'falsy' }).trim().isLength({ max: 20 })
];

const loginRules = [
    emailRule,
    body('password').isString().notEmpty().withMessage('Password is required.')
];

router
    .post('/register', authLimiter, registerRules, authController.register)
    .post('/login', authLimiter, loginRules, authController.login)
    .get('/me', protect, authController.me);

exports.router = router;
