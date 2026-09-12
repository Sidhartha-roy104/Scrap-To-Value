import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createDispute } from '@/services/disputeService';
import { Modal } from '@/components/Modal';
import { useToastNotification } from '@/components/ToastNotification';
import { ShieldAlert, AlertTriangle, Loader2 } from 'lucide-react';
import type { CollectionRequest } from '@/services/requestService';

interface RaiseDisputeModalProps {
  order: CollectionRequest;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const COMMON_REASONS = [
  'Quantity mismatch upon receipt',
  'Material quality or grading dispute',
  'Delivery delay / not received',
  'Carrier / transport damage',
  'Billing / price calculation dispute',
  'Seller cancelled without notice',
  'Other operational issue',
];

export function RaiseDisputeModal({ order, isOpen, onClose, onSuccess }: RaiseDisputeModalProps) {
  const queryClient = useQueryClient();
  const { addToast } = useToastNotification();

  const [selectedReason, setSelectedReason] = useState(COMMON_REASONS[0]);
  const [description, setDescription] = useState('');

  const disputeMutation = useMutation({
    mutationFn: async () => {
      const res = await createDispute({
        request_id: order.id,
        reason: selectedReason,
        description: description.trim() || undefined,
      });
      return res.data?.dispute;
    },
    onSuccess: (disp) => {
      queryClient.invalidateQueries({ queryKey: ['buyer_requests'] });
      queryClient.invalidateQueries({ queryKey: ['seller_requests'] });
      addToast({
        type: 'success',
        title: 'Dispute Submitted',
        message: `Case #${disp?.id.slice(0, 8).toUpperCase()} has been submitted for administrative review.`,
      });
      onSuccess?.();
      onClose();
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to submit dispute';
      addToast({
        type: 'error',
        title: 'Submission Failed',
        message: msg,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    disputeMutation.mutate();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Raise Order Dispute" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4 pt-1 text-xs">
        <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20 text-amber-800 dark:text-amber-300 space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <ShieldAlert className="h-4 w-4" />
            <span>Case Mediation</span>
          </div>
          <p className="text-[11px] text-amber-700 dark:text-amber-400">
            Raising a dispute places order <strong>#{order.id.slice(0, 8).toUpperCase()}</strong> under review. Our administrative team will inspect the case and mediate a resolution.
          </p>
        </div>

        <div>
          <label className="block text-foreground font-semibold mb-1">
            Primary Dispute Reason *
          </label>
          <select
            value={selectedReason}
            onChange={(e) => setSelectedReason(e.target.value)}
            className="input-base text-xs w-full"
          >
            {COMMON_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-foreground font-semibold mb-1">
            Detailed Explanation & Evidence <span className="text-muted-foreground font-normal">(Optional)</span>
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what went wrong, discrepancy details, weight ticket numbers, etc..."
            className="input-base text-xs resize-none w-full"
          />
        </div>

        <div className="pt-2 border-t border-border flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={disputeMutation.isPending}
            className="btn-secondary text-xs px-3.5 py-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={disputeMutation.isPending}
            className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
          >
            {disputeMutation.isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Submitting...
              </>
            ) : (
              <>
                <ShieldAlert className="h-3.5 w-3.5" /> Submit Dispute
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
