/**
 * validators/requestValidator.js
 * ------------------------------
 * express-validator rules for collection request endpoints.
 */

const { body, param } = require('express-validator');

const VALID_STATUSES = [
  'pending',
  'awaiting_payment',
  'confirmed',
  'ready_for_pickup',
  'in_transit',
  'delivered',
  'cancelled',
  'disputed',
];

const createRequestRules = [
  body('listing_id')
    .trim()
    .notEmpty()
    .withMessage('listing_id is required'),

  body('requested_quantity')
    .notEmpty()
    .withMessage('requested_quantity is required')
    .isFloat({ gt: 0 })
    .withMessage('requested_quantity must be a positive number greater than 0'),

  body('buyer_message')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('buyer_message cannot exceed 1000 characters'),
];

const updateStatusRules = [
  param('id')
    .trim()
    .notEmpty()
    .withMessage('Request ID is required'),

  body('status')
    .trim()
    .notEmpty()
    .withMessage('Status is required')
    .isIn(VALID_STATUSES)
    .withMessage(`Status must be one of: ${VALID_STATUSES.join(', ')}`),

  body('note')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage('Note cannot exceed 500 characters'),

  body('estimated_delivery')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('estimated_delivery must be a valid date format (YYYY-MM-DD)'),
];

module.exports = {
  createRequestRules,
  updateStatusRules,
};
