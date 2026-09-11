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
async function getListings(req, res, next) {
  try {
    const {
      waste_type,
      location,
      status,
      search,
      user_id,
      page,
      limit,
    } = req.query;

    const result = await listingService.getListings({
      waste_type,
      location,
      status: status !== undefined ? status : 'Available',
      search,
      user_id,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
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
