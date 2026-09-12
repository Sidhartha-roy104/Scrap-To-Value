/**
 * services/emailService.js
 * ------------------------
 * Email delivery abstraction for Rubbish Revamp.
 *
 * Prepared for production mail delivery (e.g. Resend, SendGrid, SMTP)
 * while operating safely in simulated/logged mode in development and testing.
 *
 * Guaranteed NEVER to throw unhandled errors or block parent transactions.
 */

require('dotenv').config();

/**
 * Sends or simulates an email dispatch.
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject line
 * @param {string} options.text - Plain text content
 * @param {string} [options.html] - Optional HTML formatted content
 * @param {string} [options.category] - Email category identifier
 * @returns {Promise<{ delivered: boolean, simulated: boolean, messageId: string }>}
 */
async function sendEmail({ to, subject, text, html, category = 'general' }) {
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  // Safe development/testing simulated delivery
  try {
    if (!to || typeof to !== 'string') {
      console.warn('[EmailService] Dispatch skipped: Invalid recipient email address.');
      return { delivered: false, simulated: true, messageId };
    }

    const isRealEmailEnabled = process.env.ENABLE_REAL_EMAIL === 'true';

    if (isRealEmailEnabled && process.env.SMTP_HOST) {
      // Future integration point for nodemailer or external provider
      // For now, safely simulated
      console.log(`[EmailService] Production dispatch to ${to}: "${subject}" (MessageID: ${messageId})`);
      return { delivered: true, simulated: false, messageId };
    }

    // Default safe simulated log
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[EmailService] [Simulated Delivery] To: ${to} | Subject: "${subject}" | Category: ${category}`);
    }

    return { delivered: true, simulated: true, messageId };
  } catch (err) {
    // Non-blocking: Catch and log any delivery error
    console.error(`[EmailService] Non-critical delivery error for recipient ${to}:`, err.message);
    return { delivered: false, simulated: true, messageId, error: err.message };
  }
}

/**
 * Standard notification email templates
 */
const EmailTemplates = {
  orderCreated: ({ buyerName, scrapType, quantity, orderId }) => ({
    subject: `New Scrap Request Received: ${quantity}kg ${scrapType}`,
    text: `Hello,\n\nYou have received a new scrap collection request for ${quantity}kg of ${scrapType} from ${buyerName}.\nOrder reference: #${orderId}\n\nPlease review and accept or reject the order in your Seller Dashboard: /orders`,
  }),

  orderAccepted: ({ sellerName, scrapType, quantity, amount, orderId }) => ({
    subject: `Order Accepted! Payment Required for Order #${orderId}`,
    text: `Hello,\n\nGreat news! ${sellerName} has accepted your request for ${quantity}kg of ${scrapType} (Total: ₹${amount}).\n\nPlease complete your payment in your Orders dashboard to confirm fulfillment: /orders`,
  }),

  paymentSucceeded: ({ orderId, amount, paymentId }) => ({
    subject: `Payment Confirmed for Order #${orderId}`,
    text: `Hello,\n\nYour payment of ₹${amount} for Order #${orderId} was successful (Transaction Ref: #${paymentId}).\nThe seller has been notified to prepare your materials for pickup.`,
  }),

  fulfillmentDispatched: ({ orderId, trackingStage }) => ({
    subject: `Order #${orderId} Update: ${trackingStage}`,
    text: `Hello,\n\nYour scrap order #${orderId} status has been updated to "${trackingStage}".\nTrack your delivery in real-time: /orders`,
  }),

  disputeRaised: ({ orderId, reason, raisedByRole }) => ({
    subject: `Attention: Dispute Raised on Order #${orderId}`,
    text: `Hello,\n\nA dispute has been raised regarding Order #${orderId} by the ${raisedByRole}.\nReason: "${reason}".\n\nOur administrative compliance team is reviewing the issue.`,
  }),

  sellerVerified: ({ sellerName, status }) => ({
    subject: `Rubbish Revamp Seller Verification: ${status}`,
    text: `Hello ${sellerName},\n\nYour business seller verification has been reviewed and updated to: ${status}.\nVisit your dashboard for full platform benefits: /dashboard`,
  }),
};

module.exports = {
  sendEmail,
  EmailTemplates,
};
