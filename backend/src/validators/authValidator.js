/**
 * validators/authValidator.js
 * ----------------------------
 * express-validator chains for all auth routes.
 * Import and spread into route definitions.
 */

const { body } = require('express-validator');

/**
 * Validation rules for POST /api/auth/register
 */
const registerRules = [
  body('full_name')
    .trim()
    .notEmpty().withMessage('Full name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Full name must be 2–100 characters'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),

  body('role')
    .optional()
    .isIn(['buyer', 'seller']).withMessage('Role must be buyer or seller'),
];

/**
 * Validation rules for POST /api/auth/login
 */
const loginRules = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required'),
];

module.exports = { registerRules, loginRules };
