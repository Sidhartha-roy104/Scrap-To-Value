/**
 * validators/listingValidator.js
 * ------------------------------
 * express-validator rules for listing endpoints.
 */

const { body, param, query } = require('express-validator');

const VALID_WASTE_TYPES = [
  'Organic',
  'Plastic',
  'Metal',
  'Paper',
  'E-waste',
  'Textile',
];

const VALID_STATUSES = ['Available', 'Pending', 'Sold'];

const createListingRules = [
  body('waste_type')
    .trim()
    .notEmpty().withMessage('Waste type is required')
    .isIn(VALID_WASTE_TYPES).withMessage(`Waste type must be one of: ${VALID_WASTE_TYPES.join(', ')}`),

  body('title')
    .trim()
    .notEmpty().withMessage('Listing title is required')
    .isLength({ min: 3, max: 255 }).withMessage('Title must be between 3 and 255 characters'),

  body('description')
    .optional({ nullable: true })
    .trim(),

  body('quantity')
    .notEmpty().withMessage('Quantity is required')
    .isFloat({ gt: 0 }).withMessage('Quantity must be a positive number greater than 0'),

  body('unit')
    .optional()
    .trim()
    .isLength({ max: 20 }).withMessage('Unit must not exceed 20 characters'),

  body('price_per_kg')
    .notEmpty().withMessage('Price per kg is required')
    .isFloat({ min: 0 }).withMessage('Price per kg must be 0 or greater'),

  body('location')
    .trim()
    .notEmpty().withMessage('Location is required')
    .isLength({ min: 2, max: 255 }).withMessage('Location must be between 2 and 255 characters'),

  body('image_url')
    .optional({ nullable: true })
    .trim(),

  body('status')
    .optional()
    .isIn(VALID_STATUSES).withMessage(`Status must be one of: ${VALID_STATUSES.join(', ')}`),
];

const updateListingRules = [
  param('id')
    .trim()
    .notEmpty().withMessage('Listing ID is required'),

  body('waste_type')
    .optional()
    .trim()
    .isIn(VALID_WASTE_TYPES).withMessage(`Waste type must be one of: ${VALID_WASTE_TYPES.join(', ')}`),

  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 255 }).withMessage('Title must be between 3 and 255 characters'),

  body('description')
    .optional({ nullable: true })
    .trim(),

  body('quantity')
    .optional()
    .isFloat({ gt: 0 }).withMessage('Quantity must be a positive number greater than 0'),

  body('unit')
    .optional()
    .trim()
    .isLength({ max: 20 }).withMessage('Unit must not exceed 20 characters'),

  body('price_per_kg')
    .optional()
    .isFloat({ min: 0 }).withMessage('Price per kg must be 0 or greater'),

  body('location')
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 }).withMessage('Location must be between 2 and 255 characters'),

  body('image_url')
    .optional({ nullable: true })
    .trim(),

  body('status')
    .optional()
    .isIn(VALID_STATUSES).withMessage(`Status must be one of: ${VALID_STATUSES.join(', ')}`),
];

module.exports = {
  VALID_WASTE_TYPES,
  VALID_STATUSES,
  createListingRules,
  updateListingRules,
};
