/**
 * services/paymentProviderService.js
 * ----------------------------------
 * Gateway abstraction layer for payment providers.
 * Decouples the business logic from specific payment gateways.
 * Razorpay or Stripe can be configured here without rewriting order/payment workflows.
 */

const mockPaymentProvider = require('../providers/mockPaymentProvider');

class PaymentProviderService {
  constructor() {
    this.providers = {
      mock: mockPaymentProvider,
    };
    this.defaultProvider = 'mock';
  }

  /**
   * Retrieves the configured provider instance.
   * @param {string} [name]
   */
  getProvider(name) {
    const providerName = name || process.env.PAYMENT_PROVIDER || this.defaultProvider;
    const provider = this.providers[providerName.toLowerCase()];
    if (!provider) {
      throw new Error(`Payment provider "${providerName}" is not registered or supported.`);
    }
    return provider;
  }

  /**
   * Creates a payment order with the gateway.
   */
  async createOrder(params, providerName) {
    const provider = this.getProvider(providerName);
    return provider.createPaymentOrder(params);
  }

  /**
   * Verifies payment completion.
   */
  async verifyPayment(params, providerName) {
    const provider = this.getProvider(providerName);
    return provider.verifyPayment(params);
  }

  /**
   * Gets payment status.
   */
  async getStatus(providerOrderId, providerPaymentId, providerName) {
    const provider = this.getProvider(providerName);
    return provider.getPaymentStatus(providerOrderId, providerPaymentId);
  }

  /**
   * Refunds a payment.
   */
  async refundPayment(params, providerName) {
    const provider = this.getProvider(providerName);
    return provider.refundPayment(params);
  }
}

module.exports = new PaymentProviderService();
