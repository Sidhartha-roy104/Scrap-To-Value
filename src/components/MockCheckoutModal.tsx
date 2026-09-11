import { useState, useEffect } from 'react';
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ShieldAlert,
  Loader2,
  IndianRupee,
  Scale,
  Package,
} from 'lucide-react';
import { Modal } from '@/components/Modal';
import { WasteBadge } from '@/components/WasteBadge';
import { WasteType, formatCurrency, formatNumber } from '@/data/mockData';
import {
  createPayment,
  simulateMockSuccess,
  simulateMockFailure,
  cancelPaymentCheckout,
  type PaymentInfo,
} from '@/services/paymentService';
import type { CollectionRequest } from '@/services/requestService';
import { useToastNotification } from '@/components/ToastNotification';

interface MockCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: CollectionRequest;
  onPaymentComplete: () => void;
}

export function MockCheckoutModal({
  isOpen,
  onClose,
  request,
  onPaymentComplete,
}: MockCheckoutModalProps) {
  const { addToast } = useToastNotification();

  const [payment, setPayment] = useState<PaymentInfo | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize or fetch existing pending payment order
  useEffect(() => {
    let mounted = true;

    async function init() {
      if (!isOpen || !request) return;
      setIsInitializing(true);
      setErrorMessage(null);

      try {
        const res = await createPayment({
          requestId: request.id,
          paymentMethod: 'mock_upi',
        });

        if (mounted && res.data?.payment) {
          setPayment(res.data.payment);
        }
      } catch (err: unknown) {
        if (mounted) {
          const msg = err instanceof Error ? err.message : 'Failed to initiate payment.';
          setErrorMessage(msg);
        }
      } finally {
        if (mounted) setIsInitializing(false);
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, [isOpen, request]);

  const handleSimulateSuccess = async () => {
    if (!payment || isProcessing) return;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const res = await simulateMockSuccess({
        paymentId: payment.id,
      });

      addToast({
        type: 'success',
        title: 'Mock Payment Successful',
        message: res.data?.message || 'Payment confirmed. Your order is now confirmed!',
      });

      onPaymentComplete();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Mock payment processing failed.';
      setErrorMessage(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSimulateFailure = async () => {
    if (!payment || isProcessing) return;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      await simulateMockFailure({
        paymentId: payment.id,
        reason: 'Payment simulation rejected by user (Test Mode)',
      });

      addToast({
        type: 'error',
        title: 'Mock Payment Failed',
        message: 'Payment simulation marked as failed. Order remains unpaid.',
      });

      onPaymentComplete();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record simulated payment failure.';
      setErrorMessage(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelCheckout = async () => {
    if (!payment || isProcessing) {
      onClose();
      return;
    }

    setIsProcessing(true);
    try {
      await cancelPaymentCheckout({
        paymentId: payment.id,
        reason: 'Buyer cancelled checkout modal',
      });
      onPaymentComplete();
      onClose();
    } catch {
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  const listingTitle = request.listing?.title || `${request.waste_type} Scrap`;

  return (
    <Modal isOpen={isOpen} onClose={handleCancelCheckout} title="Payment Checkout" size="md">
      <div className="space-y-5 pt-1">
        {/* Test Mode Warning Banner */}
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3 text-xs">
          <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-amber-700 dark:text-amber-300">
              Mock Payment Gateway — Test Mode
            </p>
            <p className="text-muted-foreground leading-relaxed">
              This is a development simulation environment. No real bank accounts, cards, or funds are involved.
            </p>
          </div>
        </div>

        {/* Order & Amount Summary */}
        <div className="card-base p-4 bg-secondary/20 border border-border space-y-3">
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-border/60">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-secondary font-semibold text-foreground">
                  ORDER #{request.id.slice(0, 8).toUpperCase()}
                </span>
                <WasteBadge type={request.waste_type as WasteType} size="sm" />
              </div>
              <p className="text-sm font-semibold text-foreground line-clamp-1">{listingTitle}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <span className="text-xs text-muted-foreground block">Payable Amount</span>
              <span className="text-lg font-bold text-primary">
                {formatCurrency(request.amount)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Scale className="h-3.5 w-3.5" />
              <span>Quantity: <strong className="text-foreground">{formatNumber(request.quantity)} kg</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <IndianRupee className="h-3.5 w-3.5" />
              <span>Rate: <strong className="text-foreground">{formatCurrency(request.price_per_kg)}/kg</strong></span>
            </div>
            <div className="flex items-center gap-1.5 col-span-2 pt-1 border-t border-border/40">
              <Package className="h-3.5 w-3.5 text-emerald-500" />
              <span>Inventory Status: <strong className="text-emerald-600 dark:text-emerald-400 font-medium">Reserved (Allocated)</strong></span>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 bg-destructive/10 border border-destructive/25 text-destructive rounded-lg text-xs flex items-start gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {/* Checkout Simulation Action Controls */}
        {isInitializing ? (
          <div className="py-8 flex flex-col items-center justify-center space-y-2 text-muted-foreground text-xs">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span>Initiating secure mock checkout session...</span>
          </div>
        ) : (
          <div className="space-y-2.5 pt-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Select Simulation Outcome:
            </p>

            <button
              onClick={handleSimulateSuccess}
              disabled={isProcessing}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 group-hover:scale-110 transition-transform" />
              )}
              <span>Simulate Successful Payment ({formatCurrency(request.amount)})</span>
            </button>

            <button
              onClick={handleSimulateFailure}
              disabled={isProcessing}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-destructive/30 bg-destructive/5 hover:bg-destructive/10 text-destructive text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <XCircle className="h-3.5 w-3.5" />
              <span>Simulate Payment Failure (Declined / Network error)</span>
            </button>

            <button
              onClick={handleCancelCheckout}
              disabled={isProcessing}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel Checkout
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
