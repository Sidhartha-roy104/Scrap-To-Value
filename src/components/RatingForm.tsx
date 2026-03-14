import { useState } from 'react';
import { StarRating } from '@/components/StarRating';
import { useRatings } from '@/hooks/useRatings';
import { useToastNotification } from '@/components/ToastNotification';
import { CheckCircle2 } from 'lucide-react';
import { Spinner } from '@/components/Spinner';

interface RatingFormProps {
  transactionId: string;
  sellerId: string;
}

export function RatingForm({ transactionId, sellerId }: RatingFormProps) {
  const { getRatingForTransaction, submitRating, isSubmitting } = useRatings();
  const { addToast } = useToastNotification();
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');

  const existing = getRatingForTransaction(transactionId);

  if (existing) {
    return (
      <div className="card-base p-4 space-y-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <h4 className="text-sm font-semibold text-foreground">Your Rating</h4>
        </div>
        <StarRating value={existing.rating} readonly size="md" />
        {existing.review && (
          <p className="text-sm text-muted-foreground">{existing.review}</p>
        )}
      </div>
    );
  }

  const handleSubmit = async () => {
    if (rating === 0) {
      addToast({ type: 'error', title: 'Please select a rating' });
      return;
    }
    try {
      await submitRating({
        transaction_id: transactionId,
        seller_id: sellerId,
        rating,
        review: review.trim() || undefined,
      });
      addToast({ type: 'success', title: 'Rating submitted!', message: 'Thank you for your feedback.' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to submit rating', message: err.message });
    }
  };

  return (
    <div className="card-base p-4 space-y-3">
      <h4 className="text-sm font-semibold text-foreground">Rate this seller</h4>
      <StarRating value={rating} onChange={setRating} size="lg" />
      <textarea
        value={review}
        onChange={e => setReview(e.target.value)}
        placeholder="Write a review (optional)..."
        maxLength={500}
        className="input-base w-full h-20 resize-none text-sm"
      />
      <button
        onClick={handleSubmit}
        disabled={isSubmitting || rating === 0}
        className="btn-primary gap-2 w-full"
      >
        {isSubmitting ? <Spinner size="sm" /> : 'Submit Rating'}
      </button>
    </div>
  );
}
