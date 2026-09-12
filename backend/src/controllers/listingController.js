/**
 * controllers/listingController.js
 * --------------------------------
 * Express HTTP handlers for waste listing operations.
 * Supports multipart file uploads and base64 payloads.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { validationResult } = require('express-validator');
const listingService = require('../services/listingService');
const { UPLOAD_DIR } = require('../utils/upload');

/**
 * POST /api/listings
 * Creates a new waste listing (authenticated sellers).
 */
async function createListing(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array(),
      });
    }

    let image_url = req.body.image_url || null;

    // Check if multipart file was uploaded
    if (req.file) {
      image_url = `/uploads/listings/${req.file.filename}`;
    } else if (req.body.image && typeof req.body.image === 'string' && req.body.image.startsWith('data:image')) {
      // Base64 upload fallback
      const matches = req.body.image.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const ext = `.${matches[1]}`;
        const uniqueName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
        const buffer = Buffer.from(matches[2], 'base64');
        fs.writeFileSync(path.join(UPLOAD_DIR, uniqueName), buffer);
        image_url = `/uploads/listings/${uniqueName}`;
      }
    }

    const {
      waste_type,
      title,
      description,
      quantity,
      unit,
      price_per_kg,
      location,
      status,
    } = req.body;

    const listing = await listingService.createListing({
      userId: req.user.id, // Derived strictly from verified JWT
      waste_type,
      title,
      description,
      quantity,
      unit: unit || 'kg',
      price_per_kg,
      location,
      image_url,
      status: status || 'Available',
    });

    return res.status(201).json({
      success: true,
      message: 'Listing created successfully',
      data: { listing },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/listings
 * Retrieves listings with optional filters.
 */
/**
 * GET /api/listings
 * Retrieves listings with search, filters, sorting, and pagination.
 */
async function getListings(req, res, next) {
  try {
    const {
      waste_type,
      category,
      location,
      status,
      search,
      user_id,
      min_price,
      max_price,
      min_quantity,
      sort,
      page,
      limit,
    } = req.query;

    // 1. Validate search length
    if (search !== undefined && search !== null) {
      if (typeof search === 'string' && search.length > 100) {
        return res.status(400).json({
          success: false,
          message: 'Search query must not exceed 100 characters.',
        });
      }
    }

    // 2. Validate numeric min_price
    let parsedMinPrice = undefined;
    if (min_price !== undefined && min_price !== null && min_price !== '') {
      const num = Number(min_price);
      if (isNaN(num) || num < 0) {
        return res.status(400).json({
          success: false,
          message: 'Minimum price must be a valid non-negative number.',
        });
      }
      parsedMinPrice = num;
    }

    // 3. Validate numeric max_price
    let parsedMaxPrice = undefined;
    if (max_price !== undefined && max_price !== null && max_price !== '') {
      const num = Number(max_price);
      if (isNaN(num) || num < 0) {
        return res.status(400).json({
          success: false,
          message: 'Maximum price must be a valid non-negative number.',
        });
      }
      parsedMaxPrice = num;
    }

    // 4. Validate numeric min_quantity
    let parsedMinQuantity = undefined;
    if (min_quantity !== undefined && min_quantity !== null && min_quantity !== '') {
      const num = Number(min_quantity);
      if (isNaN(num) || num < 0) {
        return res.status(400).json({
          success: false,
          message: 'Minimum quantity must be a valid non-negative number.',
        });
      }
      parsedMinQuantity = num;
    }

    // 5. Validate page
    let parsedPage = 1;
    if (page !== undefined && page !== null && page !== '') {
      const p = Number(page);
      if (!Number.isInteger(p) || p < 1) {
        return res.status(400).json({
          success: false,
          message: 'Page must be a positive integer greater than or equal to 1.',
        });
      }
      parsedPage = p;
    }

    // 6. Validate limit
    let parsedLimit = 12;
    if (limit !== undefined && limit !== null && limit !== '') {
      const l = Number(limit);
      if (!Number.isInteger(l) || l < 1 || l > 100) {
        return res.status(400).json({
          success: false,
          message: 'Limit must be an integer between 1 and 100.',
        });
      }
      parsedLimit = l;
    }

    // 7. Validate sort
    const ALLOWED_SORTS = ['newest', 'price_asc', 'price_desc', 'quantity_desc'];
    let selectedSort = 'newest';
    if (sort !== undefined && sort !== null && sort !== '') {
      if (!ALLOWED_SORTS.includes(sort)) {
        return res.status(400).json({
          success: false,
          message: `Invalid sort option "${sort}". Allowed values: ${ALLOWED_SORTS.join(', ')}.`,
        });
      }
      selectedSort = sort;
    }

    const result = await listingService.getListings({
      waste_type,
      category,
      location,
      status: status !== undefined ? status : 'Available',
      search,
      user_id,
      min_price: parsedMinPrice,
      max_price: parsedMaxPrice,
      min_quantity: parsedMinQuantity,
      sort: selectedSort,
      page: parsedPage,
      limit: parsedLimit,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/listings/:id
 * Retrieves a single listing.
 */
async function getListingById(req, res, next) {
  try {
    const listing = await listingService.getListingById(req.params.id);
    return res.status(200).json({
      success: true,
      data: { listing },
    });
  } catch (err) {
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'Listing not found',
      });
    }
    next(err);
  }
}

/**
 * PATCH /api/listings/:id
 * Updates a listing owned by the authenticated seller.
 */
async function updateListing(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array(),
      });
    }

    const updates = { ...req.body };

    if (req.file) {
      updates.image_url = `/uploads/listings/${req.file.filename}`;
    } else if (req.body.image && typeof req.body.image === 'string' && req.body.image.startsWith('data:image')) {
      const matches = req.body.image.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const ext = `.${matches[1]}`;
        const uniqueName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
        const buffer = Buffer.from(matches[2], 'base64');
        fs.writeFileSync(path.join(UPLOAD_DIR, uniqueName), buffer);
        updates.image_url = `/uploads/listings/${uniqueName}`;
      }
    }

    const listing = await listingService.updateListing(
      req.params.id,
      req.user.id,
      updates
    );

    return res.status(200).json({
      success: true,
      message: 'Listing updated successfully',
      data: { listing },
    });
  } catch (err) {
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }
    if (err.code === 'FORBIDDEN') {
      return res.status(403).json({ success: false, message: err.message });
    }
    next(err);
  }
}

/**
 * DELETE /api/listings/:id
 * Deletes a listing owned by the authenticated seller.
 */
async function deleteListing(req, res, next) {
  try {
    await listingService.deleteListing(req.params.id, req.user.id);
    return res.status(200).json({
      success: true,
      message: 'Listing deleted successfully',
    });
  } catch (err) {
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }
    if (err.code === 'FORBIDDEN') {
      return res.status(403).json({ success: false, message: err.message });
    }
    next(err);
  }
}

/**
 * POST /api/listings/upload-image
 * Accepts a multipart file or base64 encoded image, saves to disk, returns full public URL.
 */
async function uploadImage(req, res, next) {
  try {
    let uniqueName;

    if (req.file) {
      uniqueName = req.file.filename;
    } else if (req.body.image) {
      const { image, filename } = req.body;
      const ext = (filename && path.extname(filename)) ? path.extname(filename) : '.png';
      const safeExt = ext.replace(/[^a-zA-Z0-9.]/g, '');
      uniqueName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${safeExt}`;
      const filePath = path.join(UPLOAD_DIR, uniqueName);

      const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      let buffer;
      if (matches && matches.length === 3) {
        buffer = Buffer.from(matches[2], 'base64');
      } else {
        buffer = Buffer.from(image, 'base64');
      }

      if (buffer.length > 5 * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          message: 'Image size exceeds maximum 5MB limit',
        });
      }

      fs.writeFileSync(filePath, buffer);
    } else {
      return res.status(400).json({
        success: false,
        message: 'No image file or data provided',
      });
    }

    const relativePath = `/uploads/listings/${uniqueName}`;
    const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    const fullUrl = `${baseUrl.replace(/\/+$/, '')}${relativePath}`;

    return res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        imageUrl: fullUrl,
        imagePath: relativePath,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createListing,
  getListings,
  getListingById,
  updateListing,
  deleteListing,
  uploadImage,
};
