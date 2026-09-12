-- =============================================================================
-- Rubbish Revamp — MySQL Schema (PRELIMINARY — Phase 2 Design)
-- =============================================================================
-- STATUS: Preliminary design based on existing Supabase tables.
--         DO NOT execute this in production without Phase 2 review.
--         Column names and constraints are subject to change.
--
-- Supabase → MySQL Mapping:
--   profiles + user_roles  →  users
--   waste_listings          →  waste_listings
--   transactions            →  collection_requests
--   ratings                 →  ratings
--   notifications           →  notifications
-- =============================================================================

CREATE DATABASE IF NOT EXISTS rubbish_revamp
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE rubbish_revamp;

-- =============================================================================
-- ENUM DEFINITIONS (replicated as VARCHAR with CHECK constraints in MySQL 8.0+)
-- =============================================================================

-- =============================================================================
-- TABLE: users
-- Combines Supabase `profiles` and `user_roles` tables.
-- Authentication will be handled by bcrypt + JWT in Phase 2.
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
  id              CHAR(36)        NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  email           VARCHAR(255)    NOT NULL UNIQUE,
  password_hash   VARCHAR(255)    NOT NULL,
  role            ENUM('buyer', 'seller') NOT NULL DEFAULT 'buyer',
  display_name    VARCHAR(100)    DEFAULT NULL,
  company_name    VARCHAR(150)    DEFAULT NULL,
  company_address TEXT            DEFAULT NULL,
  phone           VARCHAR(20)     DEFAULT NULL,
  avatar_url      VARCHAR(500)    DEFAULT NULL,
  kyc_verified    TINYINT(1)      NOT NULL DEFAULT 0,
  is_active       TINYINT(1)      NOT NULL DEFAULT 1,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_users_email (email),
  INDEX idx_users_role  (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================================================
-- TABLE: waste_listings
-- Directly maps to Supabase `waste_listings` table.
-- =============================================================================
CREATE TABLE IF NOT EXISTS waste_listings (
  id              CHAR(36)        NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  user_id         CHAR(36)        NOT NULL,
  waste_type      VARCHAR(100)    NOT NULL,
  title           VARCHAR(255)    NOT NULL,
  description     TEXT            DEFAULT NULL,
  quantity        DECIMAL(10, 2)  NOT NULL,
  unit            VARCHAR(20)     NOT NULL DEFAULT 'kg',
  price_per_kg    DECIMAL(10, 2)  NOT NULL,
  total_price     DECIMAL(12, 2)  NOT NULL,
  location        VARCHAR(255)    NOT NULL,
  image_url       VARCHAR(500)    DEFAULT NULL,
  status          ENUM('Available', 'Pending', 'Sold') NOT NULL DEFAULT 'Available',
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_listings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

  INDEX idx_listings_user_id   (user_id),
  INDEX idx_listings_status    (status),
  INDEX idx_listings_waste_type(waste_type),
  INDEX idx_listings_location  (location)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================================================
-- TABLE: collection_requests
-- Maps to Supabase `transactions` table.
-- Renamed to clarify domain meaning (a "transaction" is too generic).
-- tracking_updates stored as JSON (MySQL 5.7.8+ / 8.0 supported).
-- =============================================================================
CREATE TABLE IF NOT EXISTS collection_requests (
  id                  CHAR(36)        NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  listing_id          CHAR(36)        DEFAULT NULL,
  buyer_id            CHAR(36)        NOT NULL,
  seller_id           CHAR(36)        NOT NULL,
  waste_type          VARCHAR(100)    NOT NULL,
  quantity            DECIMAL(10, 2)  NOT NULL,
  price_per_kg        DECIMAL(10, 2)  NOT NULL,
  amount              DECIMAL(12, 2)  NOT NULL,
  buyer_message       TEXT            DEFAULT NULL,
  status              ENUM(
                        'pending',
                        'awaiting_payment',
                        'confirmed',
                        'in_transit',
                        'delivered',
                        'cancelled',
                        'disputed'
                      ) NOT NULL DEFAULT 'pending',
  tracking_updates    JSON            DEFAULT NULL,
  estimated_delivery  DATE            DEFAULT NULL,
  delivery_otp        VARCHAR(10)     DEFAULT NULL,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_requests_listing FOREIGN KEY (listing_id) REFERENCES waste_listings(id) ON DELETE SET NULL,
  CONSTRAINT fk_requests_buyer   FOREIGN KEY (buyer_id)   REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_requests_seller  FOREIGN KEY (seller_id)  REFERENCES users(id) ON DELETE RESTRICT,

  INDEX idx_requests_buyer_id  (buyer_id),
  INDEX idx_requests_seller_id (seller_id),
  INDEX idx_requests_status    (status),
  INDEX idx_requests_listing_id(listing_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================================================
-- TABLE: ratings
-- Directly maps to Supabase `ratings` table.
-- Buyers rate sellers after delivery confirmation.
-- =============================================================================
CREATE TABLE IF NOT EXISTS ratings (
  id              CHAR(36)        NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  request_id      CHAR(36)        NOT NULL UNIQUE,  -- one rating per request
  buyer_id        CHAR(36)        NOT NULL,
  seller_id       CHAR(36)        NOT NULL,
  rating          TINYINT         NOT NULL,
  review          TEXT            DEFAULT NULL,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_ratings_request FOREIGN KEY (request_id) REFERENCES collection_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_ratings_buyer   FOREIGN KEY (buyer_id)   REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_ratings_seller  FOREIGN KEY (seller_id)  REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT chk_rating_value   CHECK (rating BETWEEN 1 AND 5),

  INDEX idx_ratings_seller_id (seller_id),
  INDEX idx_ratings_buyer_id  (buyer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================================================
-- TABLE: notifications
-- Maps to Supabase `notifications` table.
-- Realtime subscription will be replaced with SSE or polling in Phase 2.
-- =============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id          CHAR(36)        NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  user_id     CHAR(36)        NOT NULL,
  type        ENUM('listing', 'deal', 'score', 'system') NOT NULL DEFAULT 'system',
  title       VARCHAR(255)    NOT NULL,
  message     TEXT            NOT NULL,
  `read`      TINYINT(1)      NOT NULL DEFAULT 0,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

  INDEX idx_notifications_user_id (user_id),
  INDEX idx_notifications_read    (`read`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================================================
-- VIEWS (Phase 2 — add when needed)
-- =============================================================================
-- Example: avg rating per seller
-- CREATE VIEW seller_avg_ratings AS
-- SELECT seller_id, AVG(rating) AS avg_rating, COUNT(*) AS total_ratings
-- FROM ratings GROUP BY seller_id;
