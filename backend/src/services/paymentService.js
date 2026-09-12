/**
 * services/paymentService.js
 * --------------------------
 * Core payment business domain logic for Rubbish Revamp.
 * Coordinates payment creation, mock simulation, idempotency guards,
 * order confirmation upon success, and audit ledger tracking.
 */

const crypto = require('crypto');
const { pool } = require('../config/db');
const paymentProviderService = require('./paymentProviderService');
const notificationService = require('./notificationService');

/**
 * Maps a raw payments row to a clean API response object.
 */
function formatPayment(row) {
  return {
    id: row.id,
    request_id: row.request_id,
    buyer_id: row.buyer_id,
    seller_id: row.seller_id,
    amount: parseFloat(row.amount),
    currency: row.currency || 'INR',
    payment_method: row.payment_method,
    provider: row.provider,
    provider_order_id: row.provider_order_id ?? null,
    provider_payment_id: row.provider_payment_id ?? null,
    status: row.status,
    failure_reason: row.failure_reason ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    paid_at: row.paid_at ?? null,
    failed_at: row.failed_at ?? null,
    refunded_at: row.refunded_at ?? null,
  };
}

/**
 * Initiates or retrieves an existing pending payment for an eligible collection request.
 * The amount is strictly computed from trusted backend data.
 */
async function createPayment({
  requestId,
  buyerId,
  paymentMethod = 'mock_upi',
  idempotencyKey = null,
}) {
  if (!requestId) {
    const err = new Error('request_id is required to create a payment.');
    err.code = 'BAD_REQUEST';
    throw err;
  }

  // 1. Fetch request from MySQL
  const [requestRows] = await pool.execute(
    'SELECT * FROM collection_requests WHERE id = ? LIMIT 1',
    [requestId]
  );

  if (requestRows.length === 0) {
    const err = new Error('Order not found.');
    err.code = 'NOT_FOUND';
    throw err;
  }

  const request = requestRows[0];

  // 2. Authorization: Only the buyer who owns this request can pay
  if (request.buyer_id !== buyerId) {
    const err = new Error('Forbidden: You can only initiate payment for your own orders.');
    err.code = 'FORBIDDEN';
    throw err;
  }

  // 3. Status eligibility check: payment can ONLY be initiated after seller acceptance (awaiting_payment)
  if (request.status !== 'awaiting_payment') {
    const err = new Error(
      `Cannot initiate payment for an order with status "${request.status}". Order must be accepted by seller (awaiting payment) before payment can be initiated.`
    );
    err.code = 'INVALID_ORDER_STATE';
    throw err;
  }

  // 4. Check for an existing successful payment
  const [existingSuccess] = await pool.execute(
    "SELECT * FROM payments WHERE request_id = ? AND status = 'SUCCEEDED' LIMIT 1",
    [requestId]
  );

  if (existingSuccess.length > 0) {
    const err = new Error('Order is already paid.');
    err.code = 'ALREADY_PAID';
    err.payment = formatPayment(existingSuccess[0]);
    throw err;
  }

  // 5. Check for an existing active PENDING payment (reuse to prevent duplicate pending records)
  const [existingPending] = await pool.execute(
    "SELECT * FROM payments WHERE request_id = ? AND status = 'PENDING' ORDER BY created_at DESC LIMIT 1",
    [requestId]
  );

  if (existingPending.length > 0) {
    const p = existingPending[0];
    return {
      payment: formatPayment(p),
      order_id: request.id,
      provider: p.provider,
      provider_order_id: p.provider_order_id,
      amount: parseFloat(p.amount),
      currency: p.currency,
      status: p.status,
      reused: true,
    };
  }

  // 6. Trusted amount calculation from backend
  const trustedAmount = parseFloat(request.amount);
  if (isNaN(trustedAmount) || trustedAmount <= 0) {
    const err = new Error('Invalid order amount for payment.');
    err.code = 'BAD_REQUEST';
    throw err;
  }

  // 7. Verify inventory reservation is active
  const [resRows] = await pool.execute(
    "SELECT * FROM inventory_reservations WHERE order_id = ? AND status = 'RESERVED' LIMIT 1",
    [requestId]
  );

  if (resRows.length === 0 && request.status !== 'confirmed') {
    const err = new Error('Inventory reservation is not active for this order.');
    err.code = 'INVENTORY_RESERVATION_INVALID';
    throw err;
  }

  // 8. Create gateway payment order via provider abstraction
  const paymentId = crypto.randomUUID();
  const providerOrder = await paymentProviderService.createOrder({
    amount: trustedAmount,
    currency: 'INR',
    receipt: paymentId,
    notes: {
      requestId: request.id,
      buyerId,
      sellerId: request.seller_id,
    },
  });

  // 9. Persist payment record
  const insertQuery = `
    INSERT INTO payments (
      id, request_id, buyer_id, seller_id, amount, currency,
      payment_method, provider, provider_order_id, status, idempotency_key
    ) VALUES (?, ?, ?, ?, ?, 'INR', ?, ?, ?, 'PENDING', ?)
  `;

  await pool.execute(insertQuery, [
    paymentId,
    request.id,
    buyerId,
    request.seller_id,
    trustedAmount,
    paymentMethod,
    providerOrder.provider,
    providerOrder.providerOrderId,
    idempotencyKey,
  ]);

  // 10. Record audit ledger event
  const txId = crypto.randomUUID();
  await pool.execute(
    `INSERT INTO payment_transactions (
      id, payment_id, request_id, event_type, provider, provider_reference,
      amount, previous_status, resulting_status, actor_id, source, note
    ) VALUES (?, ?, ?, 'PAYMENT_CREATED', ?, ?, ?, NULL, 'PENDING', ?, 'BUYER_CHECKOUT', ?)`,
    [
      txId,
      paymentId,
      request.id,
      providerOrder.provider,
      providerOrder.providerOrderId,
      trustedAmount,
      buyerId,
      `Payment order created for ${trustedAmount} INR`,
    ]
  );

  const [created] = await pool.execute(
    'SELECT * FROM payments WHERE id = ? LIMIT 1',
    [paymentId]
  );

  return {
    payment: formatPayment(created[0]),
    order_id: request.id,
    provider: providerOrder.provider,
    provider_order_id: providerOrder.providerOrderId,
    mock_checkout_token: providerOrder.mockCheckoutToken,
    amount: trustedAmount,
    currency: 'INR',
    status: 'PENDING',
    reused: false,
  };
}

/**
 * Simulates a successful mock payment.
 * Idempotent: safe against repeated success calls.
 * Atomically updates payment status to SUCCEEDED and confirms the order.
 */
async function processMockSuccess({
  paymentId,
  buyerId,
  mockPaymentId = null,
}) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Lock payment record
    const [paymentRows] = await connection.execute(
      'SELECT * FROM payments WHERE id = ? FOR UPDATE',
      [paymentId]
    );

    if (paymentRows.length === 0) {
      const err = new Error('Payment record not found.');
      err.code = 'NOT_FOUND';
      throw err;
    }

    const payment = paymentRows[0];

    // 2. Ownership check
    if (payment.buyer_id !== buyerId) {
      const err = new Error('Forbidden: You can only process your own payments.');
      err.code = 'FORBIDDEN';
      throw err;
    }

    // 3. Idempotency guard: If already succeeded, return cleanly
    if (payment.status === 'SUCCEEDED') {
      await connection.commit();
      return {
        success: true,
        alreadyProcessed: true,
        payment: formatPayment(payment),
        message: 'Payment was already processed successfully.',
      };
    }

    if (payment.status !== 'PENDING' && payment.status !== 'PROCESSING') {
      const err = new Error(
        `Cannot confirm payment with current status "${payment.status}".`
      );
      err.code = 'BAD_REQUEST';
      throw err;
    }

    // 4. Verify payment with provider
    const verification = await paymentProviderService.verifyPayment({
      providerOrderId: payment.provider_order_id,
      providerPaymentId: mockPaymentId,
      mockAction: 'success',
    });

    if (!verification.success) {
      const err = new Error('Provider verification failed.');
      err.code = 'PAYMENT_VERIFICATION_FAILED';
      throw err;
    }

    // 5. Update payment status to SUCCEEDED
    await connection.execute(
      `UPDATE payments 
       SET status = 'SUCCEEDED',
           provider_payment_id = ?,
           provider_signature = ?,
           paid_at = NOW(),
           updated_at = NOW()
       WHERE id = ?`,
      [verification.providerPaymentId, verification.providerSignature, payment.id]
    );

    // 6. Lock and confirm collection request
    const [reqRows] = await connection.execute(
      'SELECT * FROM collection_requests WHERE id = ? FOR UPDATE',
      [payment.request_id]
    );

    if (reqRows.length > 0) {
      const req = reqRows[0];

      let trackingUpdates = [];
      if (req.tracking_updates) {
        try {
          trackingUpdates = typeof req.tracking_updates === 'string'
            ? JSON.parse(req.tracking_updates)
            : req.tracking_updates;
        } catch {
          trackingUpdates = [];
        }
      }

      trackingUpdates.push({
        status: 'confirmed',
        timestamp: new Date().toISOString(),
        note: `Payment of ₹${payment.amount} verified successfully (${verification.providerPaymentId}). Order confirmed.`,
      });

      // Update status to 'confirmed' if currently pending
      await connection.execute(
        `UPDATE collection_requests 
         SET status = 'confirmed',
             tracking_updates = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [JSON.stringify(trackingUpdates), req.id]
      );
    }

    // 7. Record audit ledger event
    const txId = crypto.randomUUID();
    await connection.execute(
      `INSERT INTO payment_transactions (
        id, payment_id, request_id, event_type, provider, provider_reference,
        amount, previous_status, resulting_status, actor_id, source, note
      ) VALUES (?, ?, ?, 'PAYMENT_SUCCEEDED', ?, ?, ?, 'PENDING', 'SUCCEEDED', ?, 'MOCK_CHECKOUT', ?)`,
      [
        txId,
        payment.id,
        payment.request_id,
        payment.provider,
        verification.providerPaymentId,
        payment.amount,
        buyerId,
        `Payment captured successfully via ${payment.provider}`,
      ]
    );

    await connection.commit();

    // Trigger non-blocking notifications
    notificationService.createNotification({
      recipientId: buyerId,
      type: notificationService.NotificationTypes.PAYMENT_SUCCEEDED,
      title: 'Payment Confirmed',
      message: `Your payment of ₹${payment.amount} succeeded. Order #${payment.request_id.slice(0, 8).toUpperCase()} is now confirmed.`,
      relatedRequestId: payment.request_id,
      relatedEntityType: 'order',
      relatedEntityId: payment.request_id,
      link: '/orders',
      dedupKey: `payment:SUCCEEDED_BUYER:${payment.id}`,
    });

    if (payment.seller_id) {
      notificationService.createNotification({
        recipientId: payment.seller_id,
        type: notificationService.NotificationTypes.ORDER_CONFIRMED,
        title: 'Payment Received — Prepare Fulfillment',
        message: `Buyer completed payment of ₹${payment.amount} for Order #${payment.request_id.slice(0, 8).toUpperCase()}. You may now prepare the scrap for pickup.`,
        relatedRequestId: payment.request_id,
        relatedEntityType: 'order',
        relatedEntityId: payment.request_id,
        link: '/orders',
        dedupKey: `payment:CONFIRMED_SELLER:${payment.id}`,
      });
    }

    const [updatedPayment] = await pool.execute(
      'SELECT * FROM payments WHERE id = ? LIMIT 1',
      [payment.id]
    );

    return {
      success: true,
      alreadyProcessed: false,
      payment: formatPayment(updatedPayment[0]),
      providerPaymentId: verification.providerPaymentId,
      message: 'Payment completed successfully. Order is now confirmed.',
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Simulates a failed mock payment.
 * Idempotent: safe against repeated failure calls.
 * Leaves the order in 'pending' so the buyer can retry payment.
 */
async function processMockFailure({
  paymentId,
  buyerId,
  reason = 'Payment simulation rejected by user',
}) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [paymentRows] = await connection.execute(
      'SELECT * FROM payments WHERE id = ? FOR UPDATE',
      [paymentId]
    );

    if (paymentRows.length === 0) {
      const err = new Error('Payment record not found.');
      err.code = 'NOT_FOUND';
      throw err;
    }

    const payment = paymentRows[0];

    if (payment.buyer_id !== buyerId) {
      const err = new Error('Forbidden: You can only process your own payments.');
      err.code = 'FORBIDDEN';
      throw err;
    }

    // Idempotency: if already failed, return cleanly
    if (payment.status === 'FAILED') {
      await connection.commit();
      return {
        success: false,
        alreadyProcessed: true,
        payment: formatPayment(payment),
        message: 'Payment already marked as failed.',
      };
    }

    if (payment.status === 'SUCCEEDED') {
      const err = new Error('Cannot fail an already succeeded payment.');
      err.code = 'BAD_REQUEST';
      throw err;
    }

    // Update payment to FAILED
    await connection.execute(
      `UPDATE payments 
       SET status = 'FAILED',
           failure_reason = ?,
           failed_at = NOW(),
           updated_at = NOW()
       WHERE id = ?`,
      [reason, payment.id]
    );

    // Record audit ledger event
    const txId = crypto.randomUUID();
    await connection.execute(
      `INSERT INTO payment_transactions (
        id, payment_id, request_id, event_type, provider, provider_reference,
        amount, previous_status, resulting_status, actor_id, source, note
      ) VALUES (?, ?, ?, 'PAYMENT_FAILED', ?, ?, ?, ?, 'FAILED', ?, 'MOCK_CHECKOUT', ?)`,
      [
        txId,
        payment.id,
        payment.request_id,
        payment.provider,
        payment.provider_order_id,
        payment.amount,
        payment.status,
        buyerId,
        reason,
      ]
    );

    await connection.commit();

    // Trigger non-blocking notification to buyer
    notificationService.createNotification({
      recipientId: buyerId,
      type: notificationService.NotificationTypes.PAYMENT_FAILED,
      title: 'Payment Attempt Failed',
      message: `Payment of ₹${payment.amount} for Order #${payment.request_id.slice(0, 8).toUpperCase()} failed: ${reason}. Please retry your payment.`,
      relatedRequestId: payment.request_id,
      relatedEntityType: 'order',
      relatedEntityId: payment.request_id,
      link: '/orders',
      dedupKey: `payment:FAILED:${payment.id}`,
    });

    const [updatedPayment] = await pool.execute(
      'SELECT * FROM payments WHERE id = ? LIMIT 1',
      [payment.id]
    );

    return {
      success: false,
      alreadyProcessed: false,
      payment: formatPayment(updatedPayment[0]),
      message: reason,
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Cancels a pending checkout session.
 */
async function cancelPayment({
  paymentId,
  buyerId,
  reason = 'User cancelled checkout',
}) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [paymentRows] = await connection.execute(
      'SELECT * FROM payments WHERE id = ? FOR UPDATE',
      [paymentId]
    );

    if (paymentRows.length === 0) {
      const err = new Error('Payment record not found.');
      err.code = 'NOT_FOUND';
      throw err;
    }

    const payment = paymentRows[0];

    if (payment.buyer_id !== buyerId) {
      const err = new Error('Forbidden: You can only cancel your own payments.');
      err.code = 'FORBIDDEN';
      throw err;
    }

    if (payment.status === 'CANCELLED') {
      await connection.commit();
      return {
        success: true,
        alreadyProcessed: true,
        payment: formatPayment(payment),
      };
    }

    if (payment.status === 'SUCCEEDED') {
      const err = new Error('Cannot cancel an already completed payment.');
      err.code = 'BAD_REQUEST';
      throw err;
    }

    await connection.execute(
      `UPDATE payments 
       SET status = 'CANCELLED',
           failure_reason = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [reason, payment.id]
    );

    const txId = crypto.randomUUID();
    await connection.execute(
      `INSERT INTO payment_transactions (
        id, payment_id, request_id, event_type, provider, provider_reference,
        amount, previous_status, resulting_status, actor_id, source, note
      ) VALUES (?, ?, ?, 'PAYMENT_CANCELLED', ?, ?, ?, ?, 'CANCELLED', ?, 'BUYER_CANCEL', ?)`,
      [
        txId,
        payment.id,
        payment.request_id,
        payment.provider,
        payment.provider_order_id,
        payment.amount,
        payment.status,
        buyerId,
        reason,
      ]
    );

    await connection.commit();

    const [updatedPayment] = await pool.execute(
      'SELECT * FROM payments WHERE id = ? LIMIT 1',
      [payment.id]
    );

    return {
      success: true,
      alreadyProcessed: false,
      payment: formatPayment(updatedPayment[0]),
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Retrieves payment details by payment ID.
 */
async function getPaymentById(paymentId, userId, userRole) {
  const [rows] = await pool.execute(
    'SELECT * FROM payments WHERE id = ? LIMIT 1',
    [paymentId]
  );

  if (rows.length === 0) {
    const err = new Error('Payment not found.');
    err.code = 'NOT_FOUND';
    throw err;
  }

  const payment = rows[0];

  // Authorization: buyer or seller
  if (payment.buyer_id !== userId && payment.seller_id !== userId) {
    const err = new Error('Forbidden: You do not have permission to view this payment.');
    err.code = 'FORBIDDEN';
    throw err;
  }

  return formatPayment(payment);
}

/**
 * Retrieves latest payment associated with an order/request.
 */
async function getPaymentByRequestId(requestId, userId, userRole) {
  // Verify request ownership
  const [reqRows] = await pool.execute(
    'SELECT buyer_id, seller_id FROM collection_requests WHERE id = ? LIMIT 1',
    [requestId]
  );

  if (reqRows.length === 0) {
    const err = new Error('Order not found.');
    err.code = 'NOT_FOUND';
    throw err;
  }

  const req = reqRows[0];
  if (req.buyer_id !== userId && req.seller_id !== userId) {
    const err = new Error('Forbidden: Access denied to this order.');
    err.code = 'FORBIDDEN';
    throw err;
  }

  const [paymentRows] = await pool.execute(
    'SELECT * FROM payments WHERE request_id = ? ORDER BY created_at DESC LIMIT 1',
    [requestId]
  );

  if (paymentRows.length === 0) {
    return null;
  }

  return formatPayment(paymentRows[0]);
}

/**
 * Simulates refunding a succeeded payment.
 */
async function processMockRefund({ paymentId, userId, reason = 'Order cancelled' }) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      'SELECT * FROM payments WHERE id = ? FOR UPDATE',
      [paymentId]
    );

    if (rows.length === 0) {
      const err = new Error('Payment not found.');
      err.code = 'NOT_FOUND';
      throw err;
    }

    const payment = rows[0];

    if (payment.status !== 'SUCCEEDED') {
      const err = new Error(`Cannot refund a payment with status "${payment.status}".`);
      err.code = 'BAD_REQUEST';
      throw err;
    }

    const refundRes = await paymentProviderService.refundPayment({
      providerPaymentId: payment.provider_payment_id,
      amount: payment.amount,
      reason,
    });

    await connection.execute(
      `UPDATE payments 
       SET status = 'REFUNDED',
           refunded_at = NOW(),
           updated_at = NOW()
       WHERE id = ?`,
      [payment.id]
    );

    const txId = crypto.randomUUID();
    await connection.execute(
      `INSERT INTO payment_transactions (
        id, payment_id, request_id, event_type, provider, provider_reference,
        amount, previous_status, resulting_status, actor_id, source, note
      ) VALUES (?, ?, ?, 'REFUND_SUCCEEDED', ?, ?, ?, 'SUCCEEDED', 'REFUNDED', ?, 'SYSTEM_REFUND', ?)`,
      [
        txId,
        payment.id,
        payment.request_id,
        payment.provider,
        refundRes.refundId,
        payment.amount,
        userId,
        reason,
      ]
    );

    await connection.commit();

    const [updated] = await pool.execute('SELECT * FROM payments WHERE id = ? LIMIT 1', [payment.id]);
    return {
      success: true,
      payment: formatPayment(updated[0]),
      refundId: refundRes.refundId,
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Retrieves payment audit ledger entries for a payment or request.
 */
async function getPaymentAuditLedger(paymentId) {
  const [rows] = await pool.execute(
    `SELECT * FROM payment_transactions WHERE payment_id = ? ORDER BY created_at ASC`,
    [paymentId]
  );
  return rows.map((r) => ({
    id: r.id,
    payment_id: r.payment_id,
    request_id: r.request_id,
    event_type: r.event_type,
    provider: r.provider,
    provider_reference: r.provider_reference,
    amount: parseFloat(r.amount),
    previous_status: r.previous_status,
    resulting_status: r.resulting_status,
    actor_id: r.actor_id,
    source: r.source,
    note: r.note,
    created_at: r.created_at,
  }));
}

module.exports = {
  createPayment,
  processMockSuccess,
  processMockFailure,
  cancelPayment,
  getPaymentById,
  getPaymentByRequestId,
  processMockRefund,
  getPaymentAuditLedger,
};
