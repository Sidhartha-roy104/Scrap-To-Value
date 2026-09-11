/**
 * services/authService.js
 * ------------------------
 * Business logic for authentication.
 * All DB queries live here — controllers only handle HTTP concerns.
 *
 * Database: MySQL via mysql2/promise pool (lazy — won't crash if DB is down)
 */

const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { signToken } = require('../utils/jwt');

const BCRYPT_ROUNDS = 12;

// ---------------------------------------------------------------------------
// Safe user projection — never return password_hash
// ---------------------------------------------------------------------------
function safeUser(row) {
  return {
    id: row.id,
    full_name: row.display_name,
    email: row.email,
    role: row.role,
    company_name: row.company_name ?? null,
    company_address: row.company_address ?? null,
    phone: row.phone ?? null,
    avatar_url: row.avatar_url ?? null,
    kyc_verified: Boolean(row.kyc_verified),
    created_at: row.created_at,
  };
}

// ---------------------------------------------------------------------------
// registerUser
// ---------------------------------------------------------------------------
/**
 * Create a new user account.
 * @param {string} full_name
 * @param {string} email
 * @param {string} password - Plain text (will be hashed)
 * @param {'buyer'|'seller'} role
 * @returns {{ user: Object, token: string }}
 * @throws {Error} with code 'EMAIL_EXISTS' if email is taken
 */
async function registerUser(full_name, email, password, role = 'buyer') {
  // 1. Check duplicate email
  const [existing] = await pool.execute(
    'SELECT id FROM users WHERE email = ? LIMIT 1',
    [email]
  );
  if (existing.length > 0) {
    const err = new Error('An account with this email already exists');
    err.code = 'EMAIL_EXISTS';
    throw err;
  }

  // 2. Hash password
  const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // 3. Generate UUID
  const [uuidRow] = await pool.execute('SELECT UUID() AS id');
  const id = uuidRow[0].id;

  // 4. Insert user
  await pool.execute(
    `INSERT INTO users
       (id, email, password_hash, role, display_name, is_active)
     VALUES (?, ?, ?, ?, ?, 1)`,
    [id, email, password_hash, role, full_name]
  );

  // 5. Fetch the created user
  const [rows] = await pool.execute(
    'SELECT * FROM users WHERE id = ? LIMIT 1',
    [id]
  );
  const user = safeUser(rows[0]);

  // 6. Sign JWT
  const token = signToken({ id: user.id, email: user.email, role: user.role });

  return { user, token };
}

// ---------------------------------------------------------------------------
// loginUser
// ---------------------------------------------------------------------------
/**
 * Authenticate a user with email + password.
 * @param {string} email
 * @param {string} password - Plain text
 * @returns {{ user: Object, token: string }}
 * @throws {Error} with code 'INVALID_CREDENTIALS' or 'ACCOUNT_INACTIVE'
 */
async function loginUser(email, password) {
  // 1. Find user
  const [rows] = await pool.execute(
    'SELECT * FROM users WHERE email = ? LIMIT 1',
    [email]
  );

  if (rows.length === 0) {
    // Use same message as wrong password to prevent email enumeration
    const err = new Error('Invalid email or password');
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  const row = rows[0];

  // 2. Check account is active
  if (!row.is_active) {
    const err = new Error('Your account has been deactivated. Please contact support.');
    err.code = 'ACCOUNT_INACTIVE';
    throw err;
  }

  // 3. Verify password
  const passwordMatch = await bcrypt.compare(password, row.password_hash);
  if (!passwordMatch) {
    const err = new Error('Invalid email or password');
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  // 4. Build safe user + sign token
  const user = safeUser(row);
  const token = signToken({ id: user.id, email: user.email, role: user.role });

  return { user, token };
}

// ---------------------------------------------------------------------------
// getUserById
// ---------------------------------------------------------------------------
/**
 * Fetch a user by ID (for /api/auth/me).
 * @param {string} id
 * @returns {Object} Safe user object
 * @throws {Error} with code 'USER_NOT_FOUND'
 */
async function getUserById(id) {
  const [rows] = await pool.execute(
    'SELECT * FROM users WHERE id = ? AND is_active = 1 LIMIT 1',
    [id]
  );

  if (rows.length === 0) {
    const err = new Error('User not found');
    err.code = 'USER_NOT_FOUND';
    throw err;
  }

  return safeUser(rows[0]);
}

module.exports = { registerUser, loginUser, getUserById };
