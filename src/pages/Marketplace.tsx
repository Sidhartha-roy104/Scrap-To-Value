import { useState, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useUserRole } from '@/hooks/useUserRole';
import { 
  Search, 
  Plus, 
  MapPin, 
  Package,
  ChevronDown,
  ImagePlus,
  X,
} from 'lucide-react';
import { Modal } from '@/components/Modal';
import { ListingDetailModal } from '@/components/ListingDetailModal';
import { EditListingModal } from '@/components/EditListingModal';
import { WasteBadge } from '@/components/WasteBadge';
import { EmptyState } from '@/components/EmptyState';
import { ListingCardSkeleton } from '@/components/Skeleton';
import { Spinner } from '@/components/Spinner';
import { useWasteListings, ListingFilters, DbWasteListing } from '@/hooks/useWasteListings';
import { useToastNotification } from '@/components/ToastNotification';
import { WasteType, formatCurrency, formatRelativeTime } from '@/data/mockData';
import { SellerRatingBadge } from '@/components/SellerRatingBadge';

const wasteTypes: (WasteType | 'All')[] = ['All', 'Organic', 'Plastic', 'Metal', 'Paper', 'E-waste', 'Textile'];
const locations = ['All', 'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Vellore', 'Erode', 'Tirupur'];

interface ListingFormData {
  wasteType: WasteType;
  quantity: number;
  pricePerKg: number;
  location: string;
  description: string;
}

export default function Marketplace() {
  const { listings, isLoading, filterListings, addListing, isAdding } = useWasteListings();
  const { role } = useUserRole();
  const isSeller = role === 'seller';
  const { addToast } = useToastNotification();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWasteType, setSelectedWasteType] = useState<WasteType | 'All'>('All');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<DbWasteListing | null>(null);
  const [editingListing, setEditingListing] = useState<DbWasteListing | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ListingFormData>();

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        addToast({ type: 'error', title: 'Image too large', message: 'Maximum file size is 5MB' });
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const filters: ListingFilters = useMemo(() => ({
    search: searchQuery,
    wasteType: selectedWasteType,
    location: selectedLocation === 'All' ? undefined : selectedLocation,
    status: 'Available'
  }), [searchQuery, selectedWasteType, selectedLocation]);

  const filteredListings = useMemo(() => 
    filterListings(filters),
    [filterListings, filters]
  );

  const handleAddListing = async (data: ListingFormData) => {
    try {
      await addListing({
        waste_type: data.wasteType,
        title: `${data.wasteType} Waste - ${data.quantity}kg`,
        quantity: data.quantity,
        unit: 'kg',
        price_per_kg: data.pricePerKg,
        total_price: data.quantity * data.pricePerKg,
        location: data.location,
        description: data.description,
        image: imageFile || undefined,
      });
      setIsModalOpen(false);
      reset();
      clearImage();
      addToast({
        type: 'success',
        title: 'Listing Created',
        message: 'Your waste listing is now live on the marketplace'
      });
    } catch (err: any) {
      addToast({ type: 'error', title: err.message || 'Failed to create listing' });
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedWasteType('All');
    setSelectedLocation('All');
  };

  if (isLoading) {
    return (
      <div className="container-main py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Marketplace</h1>
            <p className="text-muted-foreground mt-1">Browse and list industrial waste</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <ListingCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="container-main py-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Marketplace</h1>
          <p className="text-muted-foreground mt-1">Browse and list industrial waste</p>
        </div>
        {isSeller && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="btn-primary gap-2"
          >
            <Plus className="h-4 w-4" />
            Post New Listing
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search waste by type, company, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-base pl-10"
          />
        </div>

        <div className="relative">
          <select
            value={selectedWasteType}
            onChange={(e) => setSelectedWasteType(e.target.value as WasteType | 'All')}
            className="input-base appearance-none pr-10 min-w-[140px]"
          >
            {wasteTypes.map(type => (
              <option key={type} value={type}>{type === 'All' ? 'All Types' : type}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="input-base appearance-none pr-10 min-w-[140px]"
          >
            {locations.map(loc => (
              <option key={loc} value={loc}>{loc === 'All' ? 'All Locations' : loc}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-medium text-foreground">{filteredListings.length}</span> listings
        </p>
        {(searchQuery || selectedWasteType !== 'All' || selectedLocation !== 'All') && (
          <button 
            onClick={clearFilters}
            className="text-sm text-primary hover:text-primary-dark font-medium transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Listings Grid */}
      {filteredListings.length === 0 ? (
        <EmptyState
          icon={<Package className="h-8 w-8 text-muted-foreground" />}
          title="No listings found"
          description="Try adjusting your filters or post a new listing to get started."
          action={{ label: 'Clear Filters', onClick: clearFilters }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredListings.map(listing => (
            <div 
              key={listing.id}
              className="card-base overflow-hidden cursor-pointer group"
              onClick={() => setSelectedListing(listing)}
            >
              {listing.image_url && (
                <div className="w-full h-40 overflow-hidden">
                  <img 
                    src={listing.image_url} 
                    alt={listing.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
              )}
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <WasteBadge type={listing.waste_type as WasteType} />
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(listing.created_at)}
                  </span>
                </div>
                
                <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                  {listing.title}
                </h3>

                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {listing.description}
                </p>
              
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div>
                  <p className="text-lg font-bold text-foreground">
                    {formatCurrency(listing.price_per_kg)}<span className="text-sm font-normal text-muted-foreground">/kg</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Total: {formatCurrency(listing.total_price)}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {listing.location}
                </div>
                <SellerRatingBadge sellerId={listing.user_id} />
              </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Listing Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Post New Listing"
        size="lg"
      >
        <form onSubmit={handleSubmit(handleAddListing)} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Waste Type</label>
              <select
                {...register('wasteType', { required: 'Waste type is required' })}
                className="input-base"
              >
                <option value="">Select type</option>
                {wasteTypes.filter(t => t !== 'All').map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              {errors.wasteType && <p className="text-xs text-destructive mt-1">{errors.wasteType.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Quantity (kg)</label>
              <input
                type="number"
                {...register('quantity', { required: 'Quantity is required', min: { value: 1, message: 'Minimum 1 kg' }, valueAsNumber: true })}
                placeholder="e.g., 500"
                className="input-base"
              />
              {errors.quantity && <p className="text-xs text-destructive mt-1">{errors.quantity.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Price per kg (₹)</label>
              <input
                type="number"
                {...register('pricePerKg', { required: 'Price is required', min: { value: 1, message: 'Minimum ₹1' }, valueAsNumber: true })}
                placeholder="e.g., 12"
                className="input-base"
              />
              {errors.pricePerKg && <p className="text-xs text-destructive mt-1">{errors.pricePerKg.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Location</label>
              <select
                {...register('location', { required: 'Location is required' })}
                className="input-base"
              >
                <option value="">Select location</option>
                {locations.filter(l => l !== 'All').map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
              {errors.location && <p className="text-xs text-destructive mt-1">{errors.location.message}</p>}
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Image (optional)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            {imagePreview ? (
              <div className="relative w-full h-40 rounded-lg overflow-hidden border border-border">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute top-2 right-2 p-1 rounded-full bg-background/80 hover:bg-background text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-28 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-secondary/30 transition-colors"
              >
                <ImagePlus className="h-6 w-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Click to upload image</span>
                <span className="text-xs text-muted-foreground">Max 5MB</span>
              </button>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Description</label>
            <textarea
              {...register('description', { required: 'Description is required' })}
              rows={3}
              placeholder="Describe the waste material, its condition, and any special handling requirements..."
              className="input-base resize-none"
            />
            {errors.description && <p className="text-xs text-destructive mt-1">{errors.description.message}</p>}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={isAdding} className="btn-primary flex-1 gap-2">
              {isAdding ? (<><Spinner size="sm" />Creating...</>) : 'Create Listing'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Listing Detail Modal */}
      <ListingDetailModal
        listing={selectedListing}
        isOpen={!!selectedListing}
        onClose={() => setSelectedListing(null)}
        onEdit={(listing) => setEditingListing(listing)}
      />

      {/* Edit Listing Modal */}
      <EditListingModal
        listing={editingListing}
        isOpen={!!editingListing}
        onClose={() => setEditingListing(null)}
      />
    </div>
  );
}
