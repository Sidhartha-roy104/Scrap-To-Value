import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { 
  Search, 
  Plus, 
  MapPin, 
  Package, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  SlidersHorizontal,
  RotateCcw,
  IndianRupee,
  Scale,
  ArrowUpDown,
  AlertCircle,
} from 'lucide-react';
import { ListingDetailModal } from '@/components/ListingDetailModal';
import { EditListingModal } from '@/components/EditListingModal';
import { CreateListingModal } from '@/components/CreateListingModal';
import { ListingImage } from '@/components/ListingImage';
import { WasteBadge } from '@/components/WasteBadge';
import { EmptyState } from '@/components/EmptyState';
import { ListingCardSkeleton } from '@/components/Skeleton';
import { useMarketplaceListings, DbWasteListing } from '@/hooks/useWasteListings';
import { WasteType, formatCurrency, formatRelativeTime } from '@/data/mockData';
import { SellerRatingBadge } from '@/components/SellerRatingBadge';

const wasteCategories = ['All', 'Organic', 'Plastic', 'Metal', 'Paper', 'E-waste', 'Textile'];
const locations = ['All', 'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Vellore', 'Erode', 'Tirupur'];

const sortOptions = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'quantity_desc', label: 'Quantity: High to Low' },
];

export default function Marketplace() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { role } = useUserRole();
  const isSeller = role === 'seller';

  // Read URL query parameters
  const querySearch = searchParams.get('search') || '';
  const queryCategory = searchParams.get('category') || 'All';
  const queryLocation = searchParams.get('location') || 'All';
  const queryMinPrice = searchParams.get('min_price') || '';
  const queryMaxPrice = searchParams.get('max_price') || '';
  const queryMinQuantity = searchParams.get('min_quantity') || '';
  const querySort = searchParams.get('sort') || 'newest';
  const queryPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10));

  // Local state for search text input
  const [searchInput, setSearchInput] = useState(querySearch);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // Sync local search input when URL changes (e.g., back/forward navigation or clear)
  useEffect(() => {
    setSearchInput(querySearch);
  }, [querySearch]);

  // Debounce search input to URL (350ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== querySearch) {
        updateFilter('search', searchInput.trim() || undefined);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<DbWasteListing | null>(null);
  const [editingListing, setEditingListing] = useState<DbWasteListing | null>(null);

  // Helper to update search params while resetting page to 1
  const updateFilter = useCallback((key: string, value: string | undefined) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === undefined || value === '' || value === 'All') {
        next.delete(key);
      } else {
        next.set(key, value);
      }
      // Reset page to 1 on filter/search/sort change
      if (key !== 'page') {
        next.delete('page');
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const setPage = (newPage: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newPage <= 1) {
        next.delete('page');
      } else {
        next.set('page', String(newPage));
      }
      return next;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearFilters = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const hasActiveFilters = Boolean(
    querySearch ||
    queryCategory !== 'All' ||
    queryLocation !== 'All' ||
    queryMinPrice ||
    queryMaxPrice ||
    queryMinQuantity ||
    querySort !== 'newest'
  );

  // Build query filters for backend API
  const apiFilters = useMemo(() => ({
    search: querySearch || undefined,
    category: queryCategory !== 'All' ? queryCategory : undefined,
    location: queryLocation !== 'All' ? queryLocation : undefined,
    min_price: queryMinPrice ? parseFloat(queryMinPrice) : undefined,
    max_price: queryMaxPrice ? parseFloat(queryMaxPrice) : undefined,
    min_quantity: queryMinQuantity ? parseFloat(queryMinQuantity) : undefined,
    sort: (['newest', 'price_asc', 'price_desc', 'quantity_desc'].includes(querySort)
      ? querySort
      : 'newest') as any,
    page: queryPage,
    limit: 12,
  }), [querySearch, queryCategory, queryLocation, queryMinPrice, queryMaxPrice, queryMinQuantity, querySort, queryPage]);

  // Query backend with pagination
  const { data, isLoading, isError, error, refetch, isFetching } = useMarketplaceListings(apiFilters);

  const listings = data?.listings || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;
  const currentPage = data?.page || queryPage;

  return (
    <div className="container-main py-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Scrap Marketplace</h1>
          <p className="text-muted-foreground mt-1">Discover, procure, and list industrial recyclable materials from verified supplier companies</p>
        </div>
        {isSeller && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="btn-primary gap-2 self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            Post Scrap Listing
          </button>
        )}
      </div>

      {/* Main Search and Quick Filters Bar */}
      <div className="card-base p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="relative md:col-span-5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by title, scrap material, supplier company, or description..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="input-base pl-9 pr-8 w-full text-sm"
            />
            {searchInput && (
              <button
                onClick={() => {
                  setSearchInput('');
                  updateFilter('search', undefined);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                title="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="relative md:col-span-2 sm:col-span-4">
            <select
              value={queryCategory}
              onChange={(e) => updateFilter('category', e.target.value)}
              className="input-base appearance-none pr-8 w-full text-sm font-medium"
            >
              {wasteCategories.map((type) => (
                <option key={type} value={type}>
                  {type === 'All' ? 'All Categories' : type}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>

          {/* Location Dropdown */}
          <div className="relative md:col-span-2 sm:col-span-4">
            <select
              value={queryLocation}
              onChange={(e) => updateFilter('location', e.target.value)}
              className="input-base appearance-none pr-8 w-full text-sm font-medium"
            >
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc === 'All' ? 'All Locations' : loc}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>

          {/* Sort Dropdown */}
          <div className="relative md:col-span-3 sm:col-span-4">
            <select
              value={querySort}
              onChange={(e) => updateFilter('sort', e.target.value)}
              className="input-base appearance-none pr-8 w-full text-sm font-medium"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {/* Filter Toggle & Price / Quantity Controls */}
        <div className="pt-2 border-t border-border/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                isFilterPanelOpen || queryMinPrice || queryMaxPrice || queryMinQuantity
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'bg-secondary/40 border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Price & Quantity Filters</span>
              {(queryMinPrice || queryMaxPrice || queryMinQuantity) && (
                <span className="ml-1 h-2 w-2 rounded-full bg-primary" />
              )}
            </button>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Reset all filters"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Clear all</span>
              </button>
            )}
          </div>

          {/* Active Filter summary tags */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            {queryCategory !== 'All' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                Category: {queryCategory}
                <X className="h-3 w-3 cursor-pointer hover:text-foreground" onClick={() => updateFilter('category', undefined)} />
              </span>
            )}
            {queryLocation !== 'All' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                Location: {queryLocation}
                <X className="h-3 w-3 cursor-pointer hover:text-foreground" onClick={() => updateFilter('location', undefined)} />
              </span>
            )}
            {queryMinPrice && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                Min: ₹{queryMinPrice}/kg
                <X className="h-3 w-3 cursor-pointer hover:text-foreground" onClick={() => updateFilter('min_price', undefined)} />
              </span>
            )}
            {queryMaxPrice && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                Max: ₹{queryMaxPrice}/kg
                <X className="h-3 w-3 cursor-pointer hover:text-foreground" onClick={() => updateFilter('max_price', undefined)} />
              </span>
            )}
            {queryMinQuantity && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                Min Qty: {queryMinQuantity} kg
                <X className="h-3 w-3 cursor-pointer hover:text-foreground" onClick={() => updateFilter('min_quantity', undefined)} />
              </span>
            )}
          </div>
        </div>

        {/* Collapsible Range Filters */}
        {isFilterPanelOpen && (
          <div className="pt-3 border-t border-border/40 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fade-in">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Min Price (₹/kg)</label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={queryMinPrice}
                  onChange={(e) => updateFilter('min_price', e.target.value)}
                  className="input-base pl-8 w-full text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1">Max Price (₹/kg)</label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="number"
                  min="0"
                  placeholder="Any"
                  value={queryMaxPrice}
                  onChange={(e) => updateFilter('max_price', e.target.value)}
                  className="input-base pl-8 w-full text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1">Min Available Quantity (kg)</label>
              <div className="relative">
                <Scale className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={queryMinQuantity}
                  onChange={(e) => updateFilter('min_quantity', e.target.value)}
                  className="input-base pl-8 w-full text-xs"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results Count & Meta */}
      <div className="flex items-center justify-between text-sm">
        <p className="text-muted-foreground">
          {isLoading ? (
            <span>Loading marketplace inventory...</span>
          ) : total > 0 ? (
            <span>
              Showing <strong className="text-foreground font-semibold">{(currentPage - 1) * 12 + 1}–{Math.min(currentPage * 12, total)}</strong> of <strong className="text-foreground font-semibold">{total}</strong> listings
            </span>
          ) : (
            <span>No listings match your search criteria</span>
          )}
          {isFetching && !isLoading && (
            <span className="ml-2 text-xs text-primary animate-pulse">Updating...</span>
          )}
        </p>

        {hasActiveFilters && (
          <button 
            onClick={clearFilters}
            className="text-xs font-semibold text-primary hover:text-primary-dark transition-colors"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <div className="card-base p-8 text-center space-y-3 bg-destructive/5 border-destructive/20">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
          <h3 className="font-semibold text-foreground">Failed to load marketplace listings</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {(error as any)?.message || 'An error occurred while communicating with the server.'}
          </p>
          <button onClick={() => refetch()} className="btn-secondary text-xs mt-2">
            Try Again
          </button>
        </div>
      ) : listings.length === 0 ? (
        <EmptyState
          icon={<Package className="h-8 w-8 text-muted-foreground" />}
          title="No listings found"
          description="No listings found. Try adjusting your search or filters."
          action={{ label: 'Clear Filters', onClick: clearFilters }}
        />
      ) : (
        <div className="space-y-6">
          {/* Listings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((listing) => (
              <div 
                key={listing.id}
                className="card-base overflow-hidden cursor-pointer group hover:border-primary/40 transition-all shadow-sm hover:shadow"
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
                  
                  <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors line-clamp-1">
                    {listing.title}
                  </h3>

                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {listing.description || 'Verified industrial recyclable listing.'}
                  </p>
                
                  <div className="flex items-center justify-between pt-3 border-t border-border gap-2">
                    <div>
                      <p className="text-lg font-bold text-foreground">
                        {formatCurrency(listing.price_per_kg)}
                        <span className="text-xs font-normal text-muted-foreground">/{listing.unit || 'kg'}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Avail: <strong className="font-semibold text-foreground">{listing.available_quantity ?? listing.quantity} {listing.unit || 'kg'}</strong>
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

          {/* Server-Side Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <button
                onClick={() => setPage(currentPage - 1)}
                disabled={currentPage <= 1 || isFetching}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Previous</span>
              </button>

              <div className="text-xs font-medium text-muted-foreground">
                Page <strong className="text-foreground">{currentPage}</strong> of <strong className="text-foreground">{totalPages}</strong>
              </div>

              <button
                onClick={() => setPage(currentPage + 1)}
                disabled={currentPage >= totalPages || isFetching}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <span>Next</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
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
