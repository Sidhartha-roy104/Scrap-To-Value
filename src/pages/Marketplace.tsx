import { useState, useMemo } from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import { 
  Search, 
  Plus, 
  MapPin, 
  Package,
  ChevronDown,
} from 'lucide-react';
import { ListingDetailModal } from '@/components/ListingDetailModal';
import { EditListingModal } from '@/components/EditListingModal';
import { CreateListingModal } from '@/components/CreateListingModal';
import { ListingImage } from '@/components/ListingImage';
import { WasteBadge } from '@/components/WasteBadge';
import { EmptyState } from '@/components/EmptyState';
import { ListingCardSkeleton } from '@/components/Skeleton';
import { useWasteListings, ListingFilters, DbWasteListing } from '@/hooks/useWasteListings';
import { WasteType, formatCurrency, formatRelativeTime } from '@/data/mockData';
import { SellerRatingBadge } from '@/components/SellerRatingBadge';

const wasteTypes: (WasteType | 'All')[] = ['All', 'Organic', 'Plastic', 'Metal', 'Paper', 'E-waste', 'Textile'];
const locations = ['All', 'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Vellore', 'Erode', 'Tirupur'];

export default function Marketplace() {
  const { listings, isLoading, filterListings } = useWasteListings();
  const { role } = useUserRole();
  const isSeller = role === 'seller';
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWasteType, setSelectedWasteType] = useState<WasteType | 'All'>('All');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<DbWasteListing | null>(null);
  const [editingListing, setEditingListing] = useState<DbWasteListing | null>(null);

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
              <ListingImage
                src={listing.image_url}
                alt={listing.title}
                fallbackCategory={listing.waste_type}
              />
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
              
              <div className="flex items-center justify-between pt-3 border-t border-border gap-2">
                <div>
                  <p className="text-lg font-bold text-foreground">
                    {formatCurrency(listing.price_per_kg)}<span className="text-sm font-normal text-muted-foreground">/kg</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Total: {formatCurrency(listing.total_price)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    <span className="truncate max-w-[120px]">{listing.location}</span>
                  </div>
                  <SellerRatingBadge
                    sellerId={listing.user_id}
                    initialRating={(listing.seller as any)?.avg_rating !== undefined ? {
                      avg_rating: (listing.seller as any).avg_rating,
                      total_ratings: (listing.seller as any).total_ratings,
                    } : undefined}
                    showEmpty
                  />
                </div>
              </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Listing Modal */}
      <CreateListingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

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
