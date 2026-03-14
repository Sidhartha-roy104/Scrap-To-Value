import { useState } from 'react';
import {
  IndianRupee,
  CreditCard,
  ShieldCheck,
  Loader2,
  Smartphone,
  Building2,
  CheckCircle2,
  Copy,
  Check,
} from 'lucide-react';
import { formatCurrency } from '@/data/mockData';
import { useToastNotification } from '@/components/ToastNotification';

interface PaymentCheckoutProps {
  amount: number;
  description: string;
  onSuccess: (paymentId: string) => void;
  onCancel: () => void;
}

type PaymentMethod = 'upi' | 'card' | 'netbanking';

const BANKS = [
  { id: 'sbi', name: 'State Bank of India' },
  { id: 'hdfc', name: 'HDFC Bank' },
  { id: 'icici', name: 'ICICI Bank' },
  { id: 'axis', name: 'Axis Bank' },
  { id: 'kotak', name: 'Kotak Mahindra Bank' },
  { id: 'bob', name: 'Bank of Baroda' },
];

function generatePaymentId() {
  return 'pay_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

export function PaymentCheckout({ amount, description, onSuccess, onCancel }: PaymentCheckoutProps) {
  const [method, setMethod] = useState<PaymentMethod>('upi');
  const [isProcessing, setIsProcessing] = useState(false);
  const [upiId, setUpiId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [selectedBank, setSelectedBank] = useState('');
  const { addToast } = useToastNotification();

  const simulatePayment = async () => {
    setIsProcessing(true);
    // Simulate processing delay
    await new Promise((r) => setTimeout(r, 2200));
    const paymentId = generatePaymentId();
    setIsProcessing(false);
    onSuccess(paymentId);
  };

  const handlePay = async () => {
    if (method === 'upi') {
      if (!upiId || !upiId.includes('@')) {
        addToast({ type: 'error', title: 'Invalid UPI ID', message: 'Please enter a valid UPI ID (e.g. name@upi)' });
        return;
      }
    }
    if (method === 'card') {
      if (cardNumber.replace(/\s/g, '').length < 16) {
        addToast({ type: 'error', title: 'Invalid Card', message: 'Please enter a valid 16-digit card number.' });
        return;
      }
      if (!cardExpiry || !cardCvv || !cardName) {
        addToast({ type: 'error', title: 'Missing Details', message: 'Please fill all card details.' });
        return;
      }
    }
    if (method === 'netbanking' && !selectedBank) {
      addToast({ type: 'error', title: 'Select Bank', message: 'Please select a bank to proceed.' });
      return;
    }
    await simulatePayment();
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\D/g, '').slice(0, 16);
    return v.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\D/g, '').slice(0, 4);
    if (v.length >= 3) return v.slice(0, 2) + '/' + v.slice(2);
    return v;
  };

  const methods: { id: PaymentMethod; label: string; icon: typeof CreditCard }[] = [
    { id: 'upi', label: 'UPI', icon: Smartphone },
    { id: 'card', label: 'Card', icon: CreditCard },
    { id: 'netbanking', label: 'Net Banking', icon: Building2 },
  ];

  return (
    <div className="space-y-4">
      {/* Order Summary */}
      <div className="bg-secondary/50 rounded-xl p-4 space-y-3">
        <h4 className="text-sm font-semibold text-foreground">Order Summary</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-sm font-medium text-muted-foreground">Total Amount</span>
          <span className="text-xl font-bold text-foreground flex items-center gap-0.5">
            <IndianRupee className="h-4 w-4" />
            {amount.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Payment Method Tabs */}
      <div className="flex gap-1 bg-secondary/50 rounded-lg p-1">
        {methods.map((m) => {
          const Icon = m.icon;
          const active = method === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setMethod(m.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-medium transition-all ${
                active
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {m.label}
            </button>
          );
        })}
      </div>

      {/* UPI Form */}
      {method === 'upi' && (
        <div className="space-y-3 animate-fade-in">
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">UPI ID</span>
            <input
              type="text"
              placeholder="yourname@upi"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {['@ybl', '@paytm', '@oksbi', '@okicici'].map((suffix) => (
              <button
                key={suffix}
                onClick={() => setUpiId((prev) => (prev.includes('@') ? prev.split('@')[0] + suffix : prev + suffix))}
                className="text-xs bg-secondary hover:bg-secondary/80 text-foreground px-2.5 py-1 rounded-md transition-colors"
              >
                {suffix}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Card Form */}
      {method === 'card' && (
        <div className="space-y-3 animate-fade-in">
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Card Number</span>
            <input
              type="text"
              placeholder="1234 5678 9012 3456"
              value={cardNumber}
              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors font-mono tracking-wider"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Cardholder Name</span>
            <input
              type="text"
              placeholder="Name on card"
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Expiry</span>
              <input
                type="text"
                placeholder="MM/YY"
                value={cardExpiry}
                onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors font-mono"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">CVV</span>
              <input
                type="password"
                placeholder="•••"
                maxLength={4}
                value={cardCvv}
                onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors font-mono"
              />
            </label>
          </div>
        </div>
      )}

      {/* Net Banking */}
      {method === 'netbanking' && (
        <div className="space-y-2 animate-fade-in">
          <span className="text-xs font-medium text-muted-foreground">Select your bank</span>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {BANKS.map((bank) => (
              <button
                key={bank.id}
                onClick={() => setSelectedBank(bank.id)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm text-left transition-all ${
                  selectedBank === bank.id
                    ? 'border-primary bg-primary/5 text-foreground ring-1 ring-primary/30'
                    : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
                }`}
              >
                <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate text-xs">{bank.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Security Badge */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <span>Your payment details are encrypted and secure. This is a simulated payment.</span>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={onCancel} disabled={isProcessing} className="btn-secondary flex-1">
          Cancel
        </button>
        <button
          onClick={handlePay}
          disabled={isProcessing}
          className="btn-primary flex-1 gap-2"
        >
          {isProcessing ? (
            <><Loader2 className="h-4 w-4 animate-spin" />Processing...</>
          ) : (
            <><CreditCard className="h-4 w-4" />Pay {formatCurrency(amount)}</>
          )}
        </button>
      </div>
    </div>
  );
}
