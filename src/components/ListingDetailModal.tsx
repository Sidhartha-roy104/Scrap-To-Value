import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { deleteListing, updateListing } from '@/services/listingService';
import { 
  MapPin, 
  Clock, 
  Scale,
  IndianRupee,
  ShoppingCart,
  CheckCircle2,
  ArrowLeft,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Modal } from '@/components/Modal';
import { ListingImage } from '@/components/ListingImage';
import { PaymentCheckout } from '@/components/PaymentCheckout';
import { WasteBadge } from '@/components/WasteBadge';
import { Spinner } from '@/components/Spinner';
import { WasteType, formatCurrency, formatRelativeTime } from '@/data/mockData';
import { useNotifications } from '@/hooks/useNotifications';
import { useToastNotification } from '@/components/ToastNotification';
import type { DbWasteListing } from '@/hooks/useWasteListings';
import { SellerRatingBadge } from '@/components/SellerRatingBadge';

interface ListingDetailModalProps {
  listing: DbWasteListing | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (listing: DbWasteListing) => void;
}

interface ListingDetailModalProps {
  listing: DbWasteListing | null;
  isOpen: boolean;
  onClose: () => void;
}

type PurchaseStatus = 'idle' | 'confirming' | 'payment' | 'submitted';

export function ListingDetailModal({ listing, isOpen, onClose, onEdit }: ListingDetailModalProps) {
  const [purchaseStatus, setPurchaseStatus] = useState<PurchaseStatus>('idle');
  const [isDeleting, setIsDeleting] = useState(false);
  const { addToast } = useToastNotification();
  const { addNotification } = useNotifications();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isOwner = user?.id === listing?.user_id;

  if (!listing) return null;

  const handleRequestPurchase = async () => {
    if (!user) {
      handleClose();
      navigate('/auth');
      return;
    }
    if (purchaseStatus === 'idle') {
      setPurchaseStatus('confirming');
      return;
    }

    if (purchaseStatus === 'confirming') {
      setPurchaseStatus('payment');
    }
  };

  const handleClose = () => {
    setPurchaseStatus('idle');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Listing Details" size="lg">
      <div className="space-y-6">
        {/* Image */}
        <ListingImage
          src={listing.image_url}
          alt={listing.title}
          containerClassName="w-full h-56 rounded-xl overflow-hidden bg-muted relative"
          fallbackCategory={listing.waste_type}
        />

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-2">
              <WasteBadge type={listing.waste_type as WasteType} />
            </div>
            <h3 className="text-xl font-bold text-foreground">{listing.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Posted {formatRelativeTime(listing.created_at)}
            </p>
            <SellerRatingBadge sellerId={listing.user_id} size="md" />
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(listing.price_per_kg)}
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
            <p className="text-sm font-semibold text-foreground">{listing.quantity} {listing.unit}</p>
            <p className="text-xs text-muted-foreground">Quantity</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3 text-center">
            <IndianRupee className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
            <p className="text-sm font-semibold text-foreground">{formatCurrency(listing.price_per_kg)}</p>
            <p className="text-xs text-muted-foreground">Per kg</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3 text-center">
            <MapPin className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
            <p className="text-sm font-semibold text-foreground">{listing.location}</p>
            <p className="text-xs text-muted-foreground">Location</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3 text-center">
            <Clock className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
            <p className="text-sm font-semibold text-foreground">{listing.status}</p>
            <p className="text-xs text-muted-foreground">Status</p>
          </div>
        </div>

        {/* Description */}
        {listing.description && (
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">Description</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{listing.description}</p>
          </div>
        )}

        {/* Owner Actions */}
        {isOwner && listing.status === 'Available' && (
          <div className="border-t border-border pt-4 flex gap-3">
            <button
              onClick={() => { onEdit?.(listing); handleClose(); }}
              className="btn-secondary flex-1 gap-2"
            >
              <Pencil className="h-4 w-4" /> Edit Listing
            </button>
            <button
              onClick={async () => {
                if (!confirm('Are you sure you want to delete this listing?')) return;
                setIsDeleting(true);
                try {
                  await deleteListing(listing.id);
                  queryClient.invalidateQueries({ queryKey: ['waste_listings'] });
                  addToast({ type: 'success', title: 'Listing Deleted' });
                  handleClose();
                } catch (err: any) {
                  addToast({ type: 'error', title: err.message || 'Failed to delete' });
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
        )}

        {/* Purchase Action (hidden for owner) */}
        {!isOwner && <div className="border-t border-border pt-4">
          {!user ? (
            <div className="flex flex-col items-center gap-3 py-3 bg-secondary/50 rounded-lg px-4">
              <p className="text-sm text-muted-foreground text-center">
                You need to <strong className="text-foreground">sign in</strong> or <strong className="text-foreground">create an account</strong> to purchase this listing.
              </p>
              <button
                onClick={() => { handleClose(); navigate('/auth'); }}
                className="btn-primary gap-2"
              >
                Sign In / Sign Up
              </button>
            </div>
          ) : purchaseStatus === 'submitted' ? (
            <div className="flex items-center justify-center gap-2 py-3 bg-primary/5 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <p className="text-sm font-medium text-primary">Payment successful! Order confirmed.</p>
            </div>
          ) : purchaseStatus === 'payment' ? (
            <div>
              <button
                onClick={() => setPurchaseStatus('confirming')}
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-3 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </button>
              <PaymentCheckout
                amount={listing.total_price}
                description={`Purchase: ${listing.title} — ${listing.quantity} ${listing.unit}`}
                onSuccess={async (paymentId) => {
                  // Create transaction in the database
                  try {
                    const { data: txData, error } = await supabase
                      .from('transactions')
                      .insert({
                        buyer_id: user!.id,
                        seller_id: listing.user_id,
                        listing_id: listing.id,
                        waste_type: listing.waste_type,
                        quantity: listing.quantity,
                        amount: listing.total_price,
                        status: 'Processing',
                        tracking_updates: [
                          { status: 'Order Placed', timestamp: new Date().toISOString(), note: `Payment ID: ${paymentId}` },
                        ],
                      })
                      .select('id')
                      .single();

                    if (error) throw error;

                    // Mark listing as sold
                    await updateListing(listing.id, { status: 'Sold' });

                    queryClient.invalidateQueries({ queryKey: ['transactions'] });
                    queryClient.invalidateQueries({ queryKey: ['waste_listings'] });

                    setPurchaseStatus('submitted');
                    addToast({
                      type: 'success',
                      title: 'Payment Successful!',
                      message: `Payment of ${formatCurrency(listing.total_price)} completed for ${listing.title}.`,
                    });
                    // Notifications are now auto-generated by database triggers

                    // Redirect to order tracking after a short delay
                    setTimeout(() => {
                      handleClose();
                      navigate(`/orders/${txData.id}`);
                    }, 1500);
                  } catch (err: any) {
                    addToast({
                      type: 'error',
                      title: 'Order Failed',
                      message: err.message || 'Could not create order. Please try again.',
                    });
                    setPurchaseStatus('confirming');
                  }
                }}
                onCancel={() => setPurchaseStatus('confirming')}
              />
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              {purchaseStatus === 'confirming' && (
                <p className="text-sm text-muted-foreground flex-1 flex items-center">
                  Confirm your purchase for <strong className="text-foreground mx-1">{formatCurrency(listing.total_price)}</strong>?
                </p>
              )}
              {purchaseStatus === 'confirming' && (
                <button onClick={() => setPurchaseStatus('idle')} className="btn-secondary">
                  Cancel
                </button>
              )}
              <button
                onClick={handleRequestPurchase}
                className={`btn-primary gap-2 ${purchaseStatus === 'idle' ? 'flex-1' : ''}`}
              >
                {purchaseStatus === 'confirming' ? (
                  'Proceed to Payment'
                ) : (
                  <><ShoppingCart className="h-4 w-4" />Buy Now</>
                )}
              </button>
            </div>
          )}
        </div>}
      </div>
    </Modal>
  );
}
