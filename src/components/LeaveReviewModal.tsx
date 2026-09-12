/**
 * LeaveReviewModal.tsx
 * --------------------
 * Modal allowing buyers and sellers to review each other on delivered orders.
 * Supports creating a new review or viewing/editing an existing review.
 */

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/Modal';
import { Star, ShieldCheck, Loader2, Edit3, Trash2, CheckCircle2 } from 'lucide-react';
import { useToastNotification } from '@/components/ToastNotification';
import {
  createReview,
  updateReview,
  deleteReview,
  type Review,
  type OrderReviewsData,
} from '@/services/reviewService';

interface LeaveReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderData: {
    id: string;
    waste_type?: string;
    amount?: number;
    buyer_id?: string;
    seller_id?: string;
    counterpartyName?: string;
    counterpartyCompany?: string;
    counterpartyRole?: 'buyer' | 'seller';
  };
  existingReview?: Review | null;
  onReviewSubmitted?: () => void;
}

const RATING_LABELS: Record<number, string> = {
  1: '1 - Poor Experience',
  2: '2 - Fair',
  3: '3 - Satisfactory / Good',
  4: '4 - Very Good Quality',
  5: '5 - Outstanding & Highly Recommended',
};

export function LeaveReviewModal({
  isOpen,
  onClose,
  orderData,
  existingReview,
  onReviewSubmitted,
}: LeaveReviewModalProps) {
  const { addToast } = useToastNotification();
  const [rating, setRating] = useState<number>(existingReview?.rating || 5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>(existingReview?.comment || '');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(!existingReview);

  useEffect(() => {
    if (existingReview) {
      setRating(existingReview.rating);
      setComment(existingReview.comment || '');
      setIsEditing(false);
    } else {
      setRating(5);
      setComment('');
      setIsEditing(true);
    }
  }, [existingReview, isOpen]);

  const sellerDisplayName = orderData.counterpartyName || 'Seller';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1 || rating > 5) {
      addToast({ type: 'error', title: 'Invalid Rating', message: 'Please select a rating from 1 to 5 stars.' });
      return;
    }

    setIsSubmitting(true);
    try {
      if (existingReview) {
        // Update review
        await updateReview(existingReview.id, {
          rating,
          comment: comment.trim() || null,
        });
        addToast({
          type: 'success',
          title: 'Review Updated',
          message: 'Your review feedback has been successfully updated.',
        });
      } else {
        // Create review
        await createReview({
          requestId: orderData.id,
          rating,
          comment: comment.trim() || null,
        });
        addToast({
          type: 'success',
          title: 'Review Submitted',
          message: 'Thank you! Your seller review helps build trust in the Rubbish Revamp marketplace.',
        });
      }

      onReviewSubmitted?.();
      onClose();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: existingReview ? 'Failed to update review' : 'Failed to submit review',
        message: err.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!existingReview) return;
    if (!window.confirm('Are you sure you want to remove this review?')) return;

    setIsSubmitting(true);
    try {
      await deleteReview(existingReview.id);
      addToast({
        type: 'success',
        title: 'Review Removed',
        message: 'Your review has been withdrawn.',
      });
      onReviewSubmitted?.();
      onClose();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Failed to remove review',
        message: err.message || 'Could not delete review.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeRating = hoverRating || rating;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        existingReview && !isEditing
          ? `Your Review for Seller: ${sellerDisplayName}`
          : `Review Seller: ${sellerDisplayName}`
      }
    >
      <div className="space-y-5">
        {/* Verification banner */}
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300">
          <ShieldCheck className="h-4 w-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>
            Verified Delivered Order: <strong className="font-semibold text-foreground">#{orderData.id.slice(0, 8).toUpperCase()}</strong>
            {orderData.waste_type ? ` (${orderData.waste_type.toUpperCase()})` : ''}
          </span>
        </div>

        {/* Existing review readonly view */}
        {existingReview && !isEditing ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-secondary/30 border border-border/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-5 w-5 ${
                        star <= existingReview.rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-muted-foreground/30'
                      }`}
                    />
                  ))}
                  <span className="ml-2 text-sm font-bold text-foreground">
                    {existingReview.rating} / 5
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(existingReview.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>

              {existingReview.comment ? (
                <p className="text-sm text-foreground bg-card p-3 rounded-lg border border-border/40 italic">
                  "{existingReview.comment}"
                </p>
              ) : (
                <p className="text-xs text-muted-foreground italic">No written comments provided.</p>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 text-xs text-rose-500 hover:text-rose-600 font-medium transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Remove Review</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Edit Review</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium hover:bg-secondary/80 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Submission / Editing Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Star Selector */}
            <div className="space-y-1.5 text-center py-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Your Overall Rating
              </label>
              <div className="flex items-center justify-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1.5 rounded-lg hover:bg-secondary/60 transition-transform active:scale-95"
                    aria-label={`Rate ${star} star`}
                  >
                    <Star
                      className={`h-8 w-8 transition-colors ${
                        star <= activeRating
                          ? 'fill-amber-400 text-amber-400 drop-shadow-sm'
                          : 'text-muted-foreground/30 hover:text-amber-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-xs font-medium text-primary mt-1 min-h-[18px]">
                {RATING_LABELS[activeRating] || 'Click stars to rate'}
              </p>
            </div>

            {/* Comment Area */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium">
                <label className="text-foreground">Feedback Comments (Optional)</label>
                <span
                  className={
                    comment.length > 450
                      ? 'text-amber-500 font-bold'
                      : 'text-muted-foreground'
                  }
                >
                  {comment.length} / 500
                </span>
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder={`Share your experience regarding material quality, logistics, communication, or transaction promptness...`}
                className="input-base w-full resize-none text-sm"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              {existingReview && (
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={isSubmitting}
                  className="px-3 py-2 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium hover:bg-secondary/80 transition-colors"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={isSubmitting || rating < 1}
                className="btn-primary gap-1.5 px-4 py-2 text-xs"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>
                      {existingReview
                        ? 'Update Review'
                        : 'Submit Seller Review'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
