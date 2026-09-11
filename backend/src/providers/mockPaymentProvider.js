/**
 * providers/mockPaymentProvider.js
 * --------------------------------
 * Mock payment gateway provider implementation.
 * Implements the standard payment provider interface for test/development mode.
 * Razorpay or other payment providers can later implement the identical interface.
 */

const crypto = require('crypto');

class MockPaymentProvider {
  constructor() {
    this.name = 'mock';
  }

  /**
   * Creates a mock payment order.
   * @param {Object} params
   * @param {number} params.amount - Amount in currency units (e.g. INR)
   * @param {string} params.currency - ISO Currency code (default 'INR')
   * @param {string} params.receipt - Internal order/payment identifier
   * @param {Object} [params.notes] - Key-value metadata
   */
  async createPaymentOrder({ amount, currency = 'INR', receipt, notes = {} }) {
    const rawId = crypto.randomUUID().replace(/-/g, '');
    const providerOrderId = `mock_order_${rawId.slice(0, 16)}`;
    const mockCheckoutToken = `mock_tok_${rawId}`;

    return {
      provider: this.name,
      providerOrderId,
      amount: parseFloat(amount),
      currency: currency.toUpperCase(),
      receipt,
      status: 'created',
      mockCheckoutToken,
      notes,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Verifies mock payment completion.
   * Supports simulating explicit success or failure.
   */
  async verifyPayment({
    providerOrderId,
    providerPaymentId = null,
    providerSignature = null,
    mockAction = 'success',
  }) {
    if (mockAction === 'failure') {
      return {
        success: false,
        providerOrderId,
        providerPaymentId: providerPaymentId || `mock_pay_failed_${Date.now()}`,
        status: 'failed',
        reason: 'Payment simulation rejected by user',
      };
    }

    const rawPayId = crypto.randomUUID().replace(/-/g, '');
    const paymentId = providerPaymentId || `mock_pay_${rawPayId.slice(0, 16)}`;
    const mockSignature = providerSignature || `mock_sig_${rawPayId.slice(0, 24)}`;

    return {
      success: true,
      providerOrderId,
      providerPaymentId: paymentId,
      providerSignature: mockSignature,
      status: 'captured',
    };
  }

  /**
   * Fetches status of a payment.
   */
  async getPaymentStatus(providerOrderId, providerPaymentId = null) {
    return {
      provider: this.name,
      providerOrderId,
      providerPaymentId,
      status: providerPaymentId ? 'captured' : 'created',
    };
  }

  /**
   * Simulates refunding a payment.
   */
  async refundPayment({ providerPaymentId, amount, reason = null }) {
    const rawRefundId = crypto.randomUUID().replace(/-/g, '');
    const refundId = `mock_rfnd_${rawRefundId.slice(0, 16)}`;

    return {
      success: true,
      provider: this.name,
      refundId,
      providerPaymentId,
      amount: parseFloat(amount),
      status: 'processed',
      reason: reason || 'Mock refund processed',
      refundedAt: new Date().toISOString(),
    };
  }
}

module.exports = new MockPaymentProvider();
