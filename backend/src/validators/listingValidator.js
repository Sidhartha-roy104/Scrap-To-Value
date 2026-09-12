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
    .notEmpty().withMessage('Scrap material name is required')
    .isLength({ min: 3, max: 150 }).withMessage('Scrap material name must be between 3 and 150 characters'),

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
    .optional({ nullable: true })
    .custom((val, { req }) => {
      const loc = (val && typeof val === 'string') ? val.trim() : '';
      const state = (req.body.state && typeof req.body.state === 'string') ? req.body.state.trim() : '';
      const city = (req.body.city && typeof req.body.city === 'string') ? req.body.city.trim() : '';
      if (!loc && (!state || !city)) {
        throw new Error('Facility location is required (provide location or city and state)');
      }
      return true;
    }),

  body('country')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 }).withMessage('Country must not exceed 100 characters'),

  body('state')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 }).withMessage('State must not exceed 100 characters'),

  body('district')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 }).withMessage('District must not exceed 100 characters'),

  body('city')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 }).withMessage('City must not exceed 100 characters'),

  body('image_url')
    .optional({ nullable: true })
    .trim(),

  body('status')
    .optional()
    .isIn(VALID_STATUSES).withMessage(`Status must be one of: ${VALID_STATUSES.join(', ')}`),

  body('latitude')
    .optional({ nullable: true })
    .custom((val, { req }) => {
      if (val === null || val === undefined || val === '') return true;
      const num = Number(val);
      if (typeof val === 'boolean' || isNaN(num) || typeof val === 'object') {
        throw new Error('Latitude must be a valid number between -90 and 90');
      }
      if (num < -90 || num > 90) {
        throw new Error('Latitude must be between -90 and 90');
      }
      if (req.body.longitude === null || req.body.longitude === undefined || req.body.longitude === '') {
        throw new Error('Longitude is required when latitude is provided');
      }
      return true;
    }),

  body('longitude')
    .optional({ nullable: true })
    .custom((val, { req }) => {
      if (val === null || val === undefined || val === '') return true;
      const num = Number(val);
      if (typeof val === 'boolean' || isNaN(num) || typeof val === 'object') {
        throw new Error('Longitude must be a valid number between -180 and 180');
      }
      if (num < -180 || num > 180) {
        throw new Error('Longitude must be between -180 and 180');
      }
      if (req.body.latitude === null || req.body.latitude === undefined || req.body.latitude === '') {
        throw new Error('Latitude is required when longitude is provided');
      }
      return true;
    }),
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
    .isLength({ min: 3, max: 150 }).withMessage('Scrap material name must be between 3 and 150 characters'),

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
    .optional({ nullable: true })
    .trim()
    .isLength({ min: 2, max: 255 }).withMessage('Location must be between 2 and 255 characters'),

  body('country')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 }).withMessage('Country must not exceed 100 characters'),

  body('state')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 }).withMessage('State must not exceed 100 characters'),

  body('district')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 }).withMessage('District must not exceed 100 characters'),

  body('city')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 }).withMessage('City must not exceed 100 characters'),

  body('image_url')
    .optional({ nullable: true })
    .trim(),

  body('status')
    .optional()
    .isIn(VALID_STATUSES).withMessage(`Status must be one of: ${VALID_STATUSES.join(', ')}`),

  body('latitude')
    .optional({ nullable: true })
    .custom((val, { req }) => {
      if (val === null || val === undefined || val === '') return true;
      const num = Number(val);
      if (typeof val === 'boolean' || isNaN(num) || typeof val === 'object') {
        throw new Error('Latitude must be a valid number between -90 and 90');
      }
      if (num < -90 || num > 90) {
        throw new Error('Latitude must be between -90 and 90');
      }
      if (req.body.longitude === null || req.body.longitude === undefined || req.body.longitude === '') {
        throw new Error('Longitude is required when latitude is provided');
      }
      return true;
    }),

  body('longitude')
    .optional({ nullable: true })
    .custom((val, { req }) => {
      if (val === null || val === undefined || val === '') return true;
      const num = Number(val);
      if (typeof val === 'boolean' || isNaN(num) || typeof val === 'object') {
        throw new Error('Longitude must be a valid number between -180 and 180');
      }
      if (num < -180 || num > 180) {
        throw new Error('Longitude must be between -180 and 180');
      }
      if (req.body.latitude === null || req.body.latitude === undefined || req.body.latitude === '') {
        throw new Error('Latitude is required when longitude is provided');
      }
      return true;
    }),
];

module.exports = {
  VALID_WASTE_TYPES,
  VALID_STATUSES,
  createListingRules,
  updateListingRules,
};
