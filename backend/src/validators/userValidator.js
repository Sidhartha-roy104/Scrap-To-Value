/**
 * validators/userValidator.js
 * ---------------------------
 * express-validator rules for user profile update (PATCH /api/users/me).
 * Phase 13 — Business Profiles & Contact Details.
 */

const { body } = require('express-validator');

const updateProfileRules = [
  // Contact person name
  body('display_name')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Contact person name must not exceed 100 characters'),

  // Business phone
  body('phone')
    .optional({ nullable: true })
    .trim()
    .custom((value) => {
      if (!value) return true; // allow null/empty
      // Accept formats: +91XXXXXXXXXX, 0XXXXXXXXXX, XXXXXXXXXX, with optional spaces/dashes
      const cleaned = value.replace(/[\s\-().]/g, '');
      if (!/^[+]?\d{7,15}$/.test(cleaned)) {
        throw new Error('Phone number must be a valid phone number (7–15 digits)');
      }
      return true;
    }),

  // Company name
  body('company_name')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 150 })
    .withMessage('Company name must not exceed 150 characters'),

  // Company address / facility address
  body('company_address')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage('Company address must not exceed 500 characters'),

  // City
  body('city')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('City must not exceed 100 characters'),

  // State
  body('state')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('State must not exceed 100 characters'),

  // Country
  body('country')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Country must not exceed 100 characters'),

  // Company type (e.g. "Recycling Company", "Metal Foundry", "Construction Firm")
  body('company_type')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 150 })
    .withMessage('Company type must not exceed 150 characters'),

  // Company description / about
  body('company_description')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage('Company description must not exceed 500 characters'),
];

module.exports = { updateProfileRules };
