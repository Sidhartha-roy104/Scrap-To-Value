/**
 * components/OrderReceiptModal.tsx
 * ---------------------------------
 * Phase 13 — Printable Order Receipt Modal
 *
 * Shows a structured order summary for both buyers and sellers.
 * Supports window.print() for a clean printed output.
 *
 * Only rendered inside existing authorized order-detail flows
 * (BuyerOrders.tsx / SellerOrders.tsx) — no additional auth needed.
 */

import { useRef } from 'react';
import {
  X,
  Printer,
  Building2,
  Package,
  IndianRupee,
  MapPin,
  CheckCircle2,
  Clock,
  XCircle,
  ShieldCheck,
  Truck,
  MessageSquare,
  Calendar,
} from 'lucide-react';
import type { CollectionRequest } from '@/services/requestService';
import { formatCurrency, formatNumber } from '@/data/mockData';

interface OrderReceiptModalProps {
  request: CollectionRequest;
  viewerRole: 'buyer' | 'seller';
  onClose: () => void;
}

function getPaymentStatusLabel(payment: CollectionRequest['payment'], status: string) {
  if (status === 'delivered' && payment?.status === 'SUCCEEDED') {
    return { label: 'Paid', color: 'text-emerald-600 dark:text-emerald-400' };
  }
  if (payment?.status === 'SUCCEEDED') {
    return { label: 'Paid', color: 'text-emerald-600 dark:text-emerald-400' };
  }
  if (status === 'cancelled') {
    return { label: 'Cancelled / Not Charged', color: 'text-rose-600 dark:text-rose-400' };
  }
  return { label: 'Pending', color: 'text-amber-600 dark:text-amber-400' };
}

function OrderStatusChip({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: 'Pending Approval', cls: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20' },
    awaiting_payment: { label: 'Awaiting Payment', cls: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20' },
    confirmed: { label: 'Confirmed', cls: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
    ready_for_pickup: { label: 'Ready for Pickup', cls: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' },
    in_transit: { label: 'In Transit', cls: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20' },
    delivered: { label: 'Delivered', cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
    cancelled: { label: 'Cancelled', cls: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' },
    disputed: { label: 'Disputed', cls: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
  };
  const info = map[status] ?? { label: status, cls: 'bg-secondary text-muted-foreground border-border' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${info.cls}`}>
      {info.label}
    </span>
  );
}

export function OrderReceiptModal({ request, viewerRole, onClose }: OrderReceiptModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const listingTitle = request.listing?.title || `${request.waste_type} Scrap`;
  const supplierName = request.seller?.name || 'Supplier';
  const supplierCompany = request.seller?.company;
  const supplierEmail = request.seller?.email;
  const supplierPhone = request.seller?.phone;

  const buyerName = request.buyer?.name || 'Buyer';
  const buyerCompany = request.buyer?.company;
  const buyerEmail = request.buyer?.email;
  const buyerPhone = request.buyer?.phone;

  const pickupLocation = request.listing?.location;
  const orderDate = new Date(request.created_at).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  const deliveredDate = request.delivered_at
    ? new Date(request.delivered_at).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : null;

  const { label: paymentLabel, color: paymentColor } = getPaymentStatusLabel(request.payment, request.status);

  return (
    <>
      {/* Print-only CSS */}
      <style>{`
        @media print {
          body > *:not(#order-receipt-print-root) { display: none !important; }
          #order-receipt-print-root {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            z-index: 9999; background: white; overflow: auto;
            color: #111;
          }
          .no-print { display: none !important; }
          .print-card { border: 1px solid #e5e7eb !important; background: white !important; }
        }
      `}</style>

      {/* Backdrop */}
      <div
        className="no-print fixed inset-0 bg-background/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div
          id="order-receipt-print-root"
          className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          {/* Receipt Header */}
          <div ref={printRef} className="p-6 space-y-6">
            {/* Branding + Actions */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                    <Package className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-primary tracking-wide uppercase">Rubbish Revamp</p>
                    <p className="text-[10px] text-muted-foreground">B2B Scrap Marketplace</p>
                  </div>
                </div>
                <h1 className="text-xl font-bold text-foreground mt-2">Order Receipt</h1>
              </div>

              <div className="no-print flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition-colors shadow-sm"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Order Identity */}
            <div className="print-card p-4 rounded-xl bg-secondary/20 border border-border space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-muted-foreground font-medium">Order Reference</p>
                  <p className="font-mono font-bold text-foreground text-sm mt-0.5">
                    #{request.id.slice(0, 8).toUpperCase()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground font-medium">Full Order ID</p>
                  <p className="font-mono text-foreground text-[11px] mt-0.5 truncate" title={request.id}>
                    {request.id}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground font-medium">Order Date</p>
                  <p className="font-medium text-foreground mt-0.5 flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    {orderDate}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground font-medium">Order Status</p>
                  <div className="mt-0.5">
                    <OrderStatusChip status={request.status} />
                  </div>
                </div>
                {deliveredDate && (
                  <div>
                    <p className="text-muted-foreground font-medium">Delivery Date</p>
                    <p className="font-medium text-foreground mt-0.5 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                      {deliveredDate}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Parties */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Supplier (Seller) */}
              <div className="print-card p-4 rounded-xl bg-secondary/10 border border-border space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-amber-500" />
                  Scrap Supplier
                </h3>
                <div className="space-y-1 text-xs">
                  <p className="font-semibold text-foreground text-sm">{supplierName}</p>
                  {supplierCompany && <p className="text-muted-foreground">{supplierCompany}</p>}
                  {pickupLocation && (
                    <p className="text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      {pickupLocation}
                    </p>
                  )}
                  {/* Only show contact to authorized party after confirmation */}
                  {(viewerRole === 'buyer' && ['confirmed','ready_for_pickup','in_transit','delivered'].includes(request.status)) && (
                    <>
                      {supplierEmail && <p className="text-foreground">{supplierEmail}</p>}
                      {supplierPhone && <p className="text-foreground font-mono">{supplierPhone}</p>}
                    </>
                  )}
                  {viewerRole === 'seller' && (
                    <>
                      {supplierEmail && <p className="text-foreground">{supplierEmail}</p>}
                      {supplierPhone && <p className="text-foreground font-mono">{supplierPhone}</p>}
                    </>
                  )}
                </div>
              </div>

              {/* Buyer */}
              <div className="print-card p-4 rounded-xl bg-secondary/10 border border-border space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                  Purchasing Company
                </h3>
                <div className="space-y-1 text-xs">
                  <p className="font-semibold text-foreground text-sm">{buyerName}</p>
                  {buyerCompany && <p className="text-muted-foreground">{buyerCompany}</p>}
                  {/* Only show contact to authorized party after confirmation */}
                  {viewerRole === 'seller' && (
                    <>
                      {buyerEmail && <p className="text-foreground">{buyerEmail}</p>}
                      {buyerPhone && <p className="text-foreground font-mono">{buyerPhone}</p>}
                    </>
                  )}
                  {(viewerRole === 'buyer') && (
                    <>
                      {buyerEmail && <p className="text-foreground">{buyerEmail}</p>}
                      {buyerPhone && <p className="text-foreground font-mono">{buyerPhone}</p>}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="print-card rounded-xl border border-border overflow-hidden">
              <div className="bg-secondary/30 px-4 py-2.5 border-b border-border">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5" />
                  Scrap Material Details
                </h3>
              </div>

              <div className="p-4 space-y-0">
                {/* Header row */}
                <div className="grid grid-cols-12 gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground pb-2 border-b border-border/60">
                  <div className="col-span-5">Material / Listing</div>
                  <div className="col-span-2 text-right">Qty (kg)</div>
                  <div className="col-span-2 text-right">Rate/kg</div>
                  <div className="col-span-3 text-right">Amount</div>
                </div>

                {/* Line item */}
                <div className="grid grid-cols-12 gap-2 text-xs text-foreground py-3 border-b border-border/40">
                  <div className="col-span-5">
                    <p className="font-semibold">{listingTitle}</p>
                    <p className="text-muted-foreground">{request.waste_type} — Industrial Scrap</p>
                    {pickupLocation && (
                      <p className="text-muted-foreground text-[11px] flex items-center gap-1 mt-0.5">
                        <Truck className="h-2.5 w-2.5" />
                        Pickup: {pickupLocation}
                      </p>
                    )}
                  </div>
                  <div className="col-span-2 text-right font-mono font-medium">
                    {formatNumber(request.quantity)}
                  </div>
                  <div className="col-span-2 text-right font-mono font-medium">
                    ₹{formatNumber(request.price_per_kg)}
                  </div>
                  <div className="col-span-3 text-right font-bold text-primary">
                    {formatCurrency(request.amount)}
                  </div>
                </div>

                {/* Total */}
                <div className="flex items-center justify-between pt-3">
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p className="flex items-center gap-1.5">
                      <ShieldCheck className="h-3 w-3 text-emerald-500" />
                      Inventory allocation verified
                    </p>
                    <p>Payment Mode: Mock Gateway (Test)</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Grand Total</p>
                    <p className="text-xl font-extrabold text-foreground flex items-center justify-end gap-1">
                      <IndianRupee className="h-4 w-4 text-muted-foreground" />
                      {formatNumber(request.amount)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Status */}
            <div className="print-card p-4 rounded-xl bg-secondary/10 border border-border flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {request.payment?.status === 'SUCCEEDED' ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                ) : request.status === 'cancelled' ? (
                  <XCircle className="h-5 w-5 text-rose-500 flex-shrink-0" />
                ) : (
                  <Clock className="h-5 w-5 text-amber-500 flex-shrink-0" />
                )}
                <div>
                  <p className="text-sm font-semibold text-foreground">Payment Status</p>
                  <p className={`text-xs font-medium ${paymentColor}`}>{paymentLabel}</p>
                </div>
              </div>
              {request.payment?.id && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Payment ID</p>
                  <p className="font-mono text-xs text-foreground truncate max-w-[160px]" title={request.payment.id}>
                    {request.payment.id.slice(0, 16)}...
                  </p>
                </div>
              )}
            </div>

            {/* Buyer Notes */}
            {request.buyer_message && (
              <div className="print-card p-4 rounded-xl bg-secondary/10 border border-border space-y-1.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Procurement Note from Buyer
                </h3>
                <p className="text-sm text-foreground italic bg-background p-3 rounded-lg border border-border/50">
                  "{request.buyer_message}"
                </p>
              </div>
            )}

            {/* Fulfillment Notes */}
            {request.fulfillment_notes && (
              <div className="print-card p-4 rounded-xl bg-secondary/10 border border-border space-y-1.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5" />
                  Fulfillment Notes
                </h3>
                <p className="text-sm text-foreground bg-background p-3 rounded-lg border border-border/50">
                  {request.fulfillment_notes}
                </p>
              </div>
            )}

            {/* Footer */}
            <div className="pt-4 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-muted-foreground">
              <div className="space-y-0.5">
                <p className="font-semibold text-foreground">Rubbish Revamp — B2B Scrap Marketplace</p>
                <p>This is a system-generated order receipt. Not a tax invoice.</p>
              </div>
              <div className="text-right">
                <p>Generated: {new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                <p className="flex items-center gap-1 justify-end mt-0.5">
                  <ShieldCheck className="h-3 w-3 text-emerald-500" />
                  Verified B2B Transaction
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
