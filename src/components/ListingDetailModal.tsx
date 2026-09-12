import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { deleteListing } from '@/services/listingService';
import { createRequest } from '@/services/requestService';
import { 
  MapPin, 
  Clock, 
  Scale, 
  IndianRupee, 
  CheckCircle2, 
  ArrowLeft, 
  Pencil, 
  Trash2,
  Send,
  Building2,
  Phone,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Modal } from '@/components/Modal';
import { ListingImage } from '@/components/ListingImage';
import { WasteBadge } from '@/components/WasteBadge';
import { Spinner } from '@/components/Spinner';
import { WasteType, formatCurrency, formatRelativeTime } from '@/data/mockData';
import { useToastNotification } from '@/components/ToastNotification';
import type { DbWasteListing } from '@/hooks/useWasteListings';
import { SellerRatingBadge } from '@/components/SellerRatingBadge';
import { LocationMapView } from '@/components/maps/LocationMapView';

interface ListingDetailModalProps {
  listing: DbWasteListing | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (listing: DbWasteListing) => void;
}

export function ListingDetailModal({ listing, isOpen, onClose, onEdit }: ListingDetailModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addToast } = useToastNotification();

  // Request form state
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestedQuantity, setRequestedQuantity] = useState<string>('');
  const [buyerMessage, setBuyerMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Owner action state
  const [isDeleting, setIsDeleting] = useState(false);

  // Initialize or reset form whenever modal opens or listing changes
  useEffect(() => {
    if (listing) {
      setRequestedQuantity(String(listing.quantity));
      setBuyerMessage('');
      setIsRequesting(false);
      setIsSubmitted(false);
      setErrorMessage(null);
    }
  }, [listing, isOpen]);

  if (!listing) return null;

  const isOwner = user?.id === listing.user_id;
  const isBuyer = user?.role === 'buyer';
  const totalQty = Number(listing.total_quantity !== undefined ? listing.total_quantity : listing.quantity);
  const availableQty = Number(listing.available_quantity !== undefined ? listing.available_quantity : listing.quantity);
  const reservedQty = Number(listing.reserved_quantity ?? 0);
  const isOutOfStock = availableQty <= 0;
  const pricePerKg = Number(listing.price_per_kg);
  const numQty = parseFloat(requestedQuantity) || 0;
  const calculatedTotal = Math.max(0, parseFloat((numQty * pricePerKg).toFixed(2)));

  // Validation logic
  const isQuantityValid = numQty > 0 && numQty <= availableQty;
  let quantityError: string | null = null;
  if (requestedQuantity !== '' && numQty <= 0) {
    quantityError = 'Quantity must be greater than 0.';
  } else if (numQty > availableQty) {
    quantityError = `Only ${availableQty} ${listing.unit || 'kg'} is available for this listing.`;
  }

  const handleClose = () => {
    setIsRequesting(false);
    setIsSubmitted(false);
    setErrorMessage(null);
    onClose();
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      handleClose();
      navigate('/auth');
      return;
    }

    if (user.role !== 'buyer') {
      const roleLabel = user.role === 'admin' ? 'Platform Administrator' : 'Supplier Company';
      const msg = `Access denied: Logged in as ${roleLabel}. Only registered purchasing companies can submit procurement requests.`;
      setErrorMessage(msg);
      addToast({
        type: 'error',
        title: 'Action Not Allowed',
        message: msg,
      });
      return;
    }

    if (!isQuantityValid) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await createRequest({
        listing_id: listing.id,
        requested_quantity: numQty,
        buyer_message: buyerMessage.trim() || undefined,
      });

      setIsSubmitted(true);
      addToast({
        type: 'success',
        title: 'Request Sent',
        message: `Your request for ${numQty} ${listing.unit || 'kg'} of ${listing.waste_type} scrap is now pending supplier approval.`,
      });

      // Invalidate requests and listing caches
      queryClient.invalidateQueries({ queryKey: ['buyer_requests'] });
      queryClient.invalidateQueries({ queryKey: ['seller_requests'] });
      queryClient.invalidateQueries({ queryKey: ['collection_requests'] });
      queryClient.invalidateQueries({ queryKey: ['waste_listings'] });
      queryClient.invalidateQueries({ queryKey: ['waste_listing', listing.id] });

      // Automatically close after a short delay
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err: unknown) {
      const msg = (err as any)?.message || (err instanceof Error ? err.message : 'Failed to submit request');
      setErrorMessage(msg);
      addToast({
        type: 'error',
        title: 'Request Failed',
        message: msg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Scrap Material Details" size="lg">
      <div className="space-y-6">
        {/* Listing Image */}
        <ListingImage
          src={listing.image_url}
          alt={listing.title}
          containerClassName="w-full h-56 rounded-xl overflow-hidden bg-muted relative"
          fallbackCategory={listing.waste_type}
        />

        {/* Header Title & Pricing */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-2">
              <WasteBadge type={listing.waste_type as WasteType} />
            </div>
            <h3 className="text-xl font-bold text-foreground">{listing.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Posted {formatRelativeTime(listing.created_at)}
            </p>
            <div className="mt-2">
              <SellerRatingBadge sellerId={listing.user_id} size="md" />
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(pricePerKg)}
              <span className="text-sm font-normal text-muted-foreground">/kg</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Total: {formatCurrency(listing.total_price)}
            </p>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-secondary/50 rounded-lg p-3 text-center">
            <Scale className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
            <p className={`text-sm font-semibold ${isOutOfStock ? 'text-destructive' : 'text-foreground'}`}>
              {availableQty} {listing.unit || 'kg'}
            </p>
            <p className="text-xs text-muted-foreground">
              {reservedQty > 0 ? `Available (${reservedQty}kg res.)` : 'Available'}
            </p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3 text-center">
            <IndianRupee className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
            <p className="text-sm font-semibold text-foreground">{formatCurrency(pricePerKg)}</p>
            <p className="text-xs text-muted-foreground">Per kg</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3 text-center min-w-0">
            <MapPin className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
            <p className="text-sm font-semibold text-foreground truncate" title={listing.location}>
              {listing.city && listing.state ? `${listing.city}, ${listing.state}` : listing.location}
            </p>
            <p className="text-xs text-muted-foreground">Location</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3 text-center">
            <Clock className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
            <p className="text-sm font-semibold text-foreground">{listing.status}</p>
            <p className="text-xs text-muted-foreground">Status</p>
          </div>
        </div>

        {/* Supplier Info (if available from API) */}
        {listing.seller && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-secondary/30 border border-border/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0">
                {listing.seller.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Supplier Company</span>
                  <span className="text-sm font-semibold text-foreground truncate">{listing.seller.name}</span>
                </div>
                {listing.seller.company && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                    <Building2 className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{listing.seller.company}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap justify-end">
              <SellerRatingBadge
                sellerId={listing.user_id}
                initialRating={(listing.seller as any)?.avg_rating !== undefined ? {
                  avg_rating: (listing.seller as any).avg_rating,
                  total_ratings: (listing.seller as any).total_ratings,
                } : undefined}
                size="sm"
                showEmpty
              />
              {listing.seller.phone && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground bg-background/80 px-2.5 py-1 rounded-md border border-border/40">
                  <Phone className="h-3 w-3 text-primary" />
                  <span>{listing.seller.phone}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pickup Location Map / Summary */}
        <LocationMapView
          latitude={listing.latitude}
          longitude={listing.longitude}
          locationName={listing.location}
          height="220px"
        />

        {/* Description */}
        {listing.description && (
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-1.5">Description</h4>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{listing.description}</p>
          </div>
        )}

        {/* Owner Actions */}
        {isOwner && (
          <div className="border-t border-border pt-4">
            <p className="text-xs text-muted-foreground mb-3 italic">You are the supplier of this scrap listing.</p>
            <div className="flex gap-3">
              {listing.status === 'Available' && (
                <button
                  onClick={() => { onEdit?.(listing); handleClose(); }}
                  className="btn-secondary flex-1 gap-2"
                >
                  <Pencil className="h-4 w-4" /> Edit Listing
                </button>
              )}
              <button
                onClick={async () => {
                  if (!confirm('Are you sure you want to delete this listing?')) return;
                  setIsDeleting(true);
                  try {
                    await deleteListing(listing.id);
                    queryClient.invalidateQueries({ queryKey: ['waste_listings'] });
                    addToast({ type: 'success', title: 'Listing Deleted' });
                    handleClose();
                  } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : 'Failed to delete';
                    addToast({ type: 'error', title: msg });
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                disabled={isDeleting}
                className="btn-secondary gap-2 text-destructive hover:bg-destructive/10"
              >
                {isDeleting ? <Spinner size="sm" /> : <Trash2 className="h-4 w-4" />}
                Delete
              </button>
            </div>
          </div>
        )}

        {/* Buyer Request Section (hidden for owner) */}
        {!isOwner && (
          <div className="border-t border-border pt-4">
            {!user ? (
              <div className="flex flex-col items-center gap-3 py-4 bg-secondary/40 rounded-xl px-4 text-center">
                <p className="text-sm text-muted-foreground">
                  You need to <strong className="text-foreground">sign in</strong> or <strong className="text-foreground">create a buyer account</strong> to request scrap from this listing.
                </p>
                <button
                  onClick={() => { handleClose(); navigate('/auth'); }}
                  className="btn-primary gap-2"
                >
                  Sign In / Sign Up
                </button>
              </div>
            ) : isSubmitted ? (
              <div className="flex items-center justify-center gap-3 py-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <div className="text-left">
                  <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                    Request Submitted Successfully!
                  </p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400">
                    Status is <span className="font-semibold uppercase tracking-wider">pending</span>. The supplier company will review your request.
                  </p>
                </div>
              </div>
            ) : isRequesting ? (
              <form onSubmit={handleSubmitRequest} className="space-y-4 bg-secondary/30 p-4 rounded-xl border border-border/60">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <Send className="h-4 w-4 text-primary" /> Request Scrap Procurement Quantity
                  </h4>
                  <button
                    type="button"
                    onClick={() => { setIsRequesting(false); setErrorMessage(null); }}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <ArrowLeft className="h-3 w-3" /> Back
                  </button>
                </div>

                {errorMessage && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-xs flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Requested Quantity */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-foreground">
                      Requested Quantity ({listing.unit || 'kg'}) <span className="text-destructive">*</span>
                    </label>
                    <span className="text-xs text-muted-foreground">
                      Max available: {availableQty} {listing.unit || 'kg'}
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0.01"
                    max={availableQty}
                    step="any"
                    value={requestedQuantity}
                    onChange={(e) => setRequestedQuantity(e.target.value)}
                    required
                    placeholder={`e.g. ${availableQty}`}
                    className={`input-base ${quantityError ? 'border-destructive focus:ring-destructive' : ''}`}
                  />
                  {quantityError && (
                    <p className="text-xs text-destructive mt-1">{quantityError}</p>
                  )}
                </div>

                {/* Live Total Calculation Card */}
                <div className="p-3 bg-background rounded-lg border border-border flex items-center justify-between">
                  <div>
                    <span className="text-xs text-muted-foreground block">Estimated Total Value</span>
                    <span className="text-xs text-muted-foreground">
                      {numQty > 0 ? numQty : 0} {listing.unit || 'kg'} × {formatCurrency(pricePerKg)}/kg
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-foreground block">
                      {formatCurrency(calculatedTotal)}
                    </span>
                    <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                      Pending supplier approval
                    </span>
                  </div>
                </div>

                {/* Optional Buyer Message */}
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">
                    Optional Message to Supplier Company
                  </label>
                  <textarea
                    value={buyerMessage}
                    onChange={(e) => setBuyerMessage(e.target.value)}
                    placeholder="Add notes about pickup schedule, transportation, or specifications for the supplier..."
                    rows={3}
                    maxLength={1000}
                    className="input-base text-sm resize-none"
                  />
                </div>

                {/* Form Buttons */}
                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => { setIsRequesting(false); setErrorMessage(null); }}
                    disabled={isSubmitting}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!isQuantityValid || isSubmitting}
                    className="btn-primary flex-1 gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Confirm & Send Request
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">Interested in this scrap material?</p>
                  <p className="text-xs text-muted-foreground">
                    Submit a procurement request for the quantity required by your operations.
                  </p>
                </div>
                {listing.status !== 'Available' ? (
                  <button disabled className="btn-secondary opacity-60 cursor-not-allowed">
                    {listing.status}
                  </button>
                ) : isOutOfStock ? (
                  <button disabled className="btn-secondary opacity-70 cursor-not-allowed text-destructive border-destructive/30 bg-destructive/5 font-semibold text-xs px-3 py-2 rounded-lg">
                    Out of Stock / Fully Reserved
                  </button>
                ) : !isBuyer ? (
                  <div className="text-xs text-muted-foreground bg-secondary/50 px-3 py-2 rounded-lg text-right border border-border/40">
                    Logged in as <strong className="text-foreground">{user.role === 'admin' ? 'Platform Administrator' : 'Supplier Company'}</strong>. (Only purchasing companies can submit procurement requests)
                  </div>
                ) : (
                  <button
                    onClick={() => setIsRequesting(true)}
                    className="btn-primary gap-2 w-full sm:w-auto"
                  >
                    <Send className="h-4 w-4" />
                    Procure Scrap
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
