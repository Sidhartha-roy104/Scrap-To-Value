import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ImagePlus, X } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Spinner } from '@/components/Spinner';
import { useWasteListings, DbWasteListing } from '@/hooks/useWasteListings';
import { uploadListingImage, resolveImageUrl } from '@/services/listingService';
import { useToastNotification } from '@/components/ToastNotification';
import { WasteType } from '@/data/mockData';
import { LocationMapPicker, type LocationCoordinates } from '@/components/maps/LocationMapPicker';
import {
  INDIAN_STATE_NAMES,
  getDistrictsForState,
  formatStructuredLocation,
} from '@/data/indiaLocations';

const wasteTypes: WasteType[] = ['Organic', 'Plastic', 'Metal', 'Paper', 'E-waste', 'Textile'];

interface EditFormData {
  title: string;
  wasteType: WasteType;
  quantity: number;
  pricePerKg: number;
  country: string;
  state: string;
  district: string;
  city: string;
  description: string;
}

interface EditListingModalProps {
  listing: DbWasteListing | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EditListingModal({ listing, isOpen, onClose }: EditListingModalProps) {
  const { updateListing } = useWasteListings();
  const { addToast } = useToastNotification();
  const [isSaving, setIsSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<LocationCoordinates | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EditFormData>();

  const watchedState = watch('state');
  const watchedQuantity = watch('quantity') || 0;
  const watchedPrice = watch('pricePerKg') || 0;
  const estimatedTotal = Number(watchedQuantity) * Number(watchedPrice);

  const availableDistricts = getDistrictsForState(watchedState);

  useEffect(() => {
    if (listing && isOpen) {
      reset({
        title: listing.title || `${listing.waste_type} Scrap`,
        wasteType: listing.waste_type as WasteType,
        quantity: listing.quantity,
        pricePerKg: listing.price_per_kg,
        country: listing.country || 'India',
        state: listing.state || '',
        district: listing.district || '',
        city: listing.city || (listing.location ? listing.location.split(',')[0].trim() : ''),
        description: listing.description || '',
      });
      setImagePreview(resolveImageUrl(listing.image_url) || null);
      setImageFile(null);
      if (typeof listing.latitude === 'number' && typeof listing.longitude === 'number') {
        setCoordinates({ latitude: listing.latitude, longitude: listing.longitude });
      } else {
        setCoordinates(null);
      }
    }
  }, [listing, isOpen, reset]);

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newState = e.target.value;
    setValue('state', newState, { shouldValidate: true });
    setValue('district', '', { shouldValidate: false });
    setValue('city', '', { shouldValidate: false });
  };

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

  const handleSave = async (data: EditFormData) => {
    if (!listing) return;
    setIsSaving(true);
    try {
      const computedLocation = formatStructuredLocation({
        city: data.city,
        district: data.district,
        state: data.state,
        country: data.country || 'India',
      });

      const updates: Record<string, unknown> = {
        title: data.title.trim(),
        waste_type: data.wasteType,
        quantity: data.quantity,
        price_per_kg: data.pricePerKg,
        total_price: data.quantity * data.pricePerKg,
        country: data.country || 'India',
        state: data.state.trim() || null,
        district: data.district.trim() || null,
        city: data.city.trim() || null,
        location: computedLocation || listing.location,
        latitude: coordinates?.latitude ?? null,
        longitude: coordinates?.longitude ?? null,
        description: data.description,
      };

      // Handle image upload if a new file was selected
      if (imageFile) {
        updates.image_url = await uploadListingImage(imageFile);
      } else if (!imagePreview) {
        updates.image_url = null;
      }

      await updateListing(listing.id, updates);
      addToast({ type: 'success', title: 'Listing Updated', message: 'Your listing has been updated successfully.' });
      onClose();
    } catch (err: any) {
      addToast({ type: 'error', title: err.message || 'Failed to update listing' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!listing) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Scrap Listing" size="lg">
      <form onSubmit={handleSubmit(handleSave)} className="space-y-4">
        {/* Basic Scrap Material Details */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Scrap Material Name *</label>
              <input
                type="text"
                {...register('title', {
                  required: 'Scrap material name is required',
                  minLength: { value: 3, message: 'Minimum 3 characters' },
                  maxLength: { value: 150, message: 'Maximum 150 characters' },
                })}
                placeholder="e.g., Aluminium Scrap 6063"
                className="input-base"
              />
              {errors.title && <p className="text-xs text-destructive mt-1">{errors.title.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Scrap Material Category *</label>
              <select {...register('wasteType', { required: 'Required' })} className="input-base">
                {wasteTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              {errors.wasteType && <p className="text-xs text-destructive mt-1">{errors.wasteType.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Available Quantity (kg) *</label>
              <input
                type="number"
                step="any"
                {...register('quantity', {
                  required: 'Required',
                  min: { value: 0.1, message: 'Min 0.1 kg' },
                  valueAsNumber: true,
                })}
                className="input-base"
              />
              {errors.quantity && <p className="text-xs text-destructive mt-1">{errors.quantity.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Price per kg (₹) *</label>
              <input
                type="number"
                step="any"
                {...register('pricePerKg', {
                  required: 'Required',
                  min: { value: 0.01, message: 'Min ₹0.01' },
                  valueAsNumber: true,
                })}
                className="input-base"
              />
              {errors.pricePerKg && <p className="text-xs text-destructive mt-1">{errors.pricePerKg.message}</p>}
            </div>
          </div>
        </div>

        {/* Live Estimated Price Summary */}
        {estimatedTotal > 0 && (
          <div className="p-2.5 bg-secondary/50 rounded-lg flex items-center justify-between text-sm">
            <span className="text-muted-foreground text-xs">Estimated Total Value:</span>
            <span className="font-semibold text-primary">₹{estimatedTotal.toLocaleString('en-IN')}</span>
          </div>
        )}

        {/* Structured Supplier Facility Location */}
        <div className="p-3.5 rounded-xl bg-secondary/30 border border-border/60 space-y-3">
          <div className="text-xs font-semibold text-foreground uppercase tracking-wider">
            Supplier Facility Location
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Country *</label>
              <input
                type="text"
                {...register('country')}
                value="India"
                readOnly
                disabled
                className="input-base bg-muted/60 cursor-not-allowed opacity-80"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">State / UT *</label>
              <select
                {...register('state', { required: 'State is required' })}
                onChange={handleStateChange}
                className="input-base"
              >
                <option value="">Select State / UT</option>
                {INDIAN_STATE_NAMES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
              {errors.state && <p className="text-xs text-destructive mt-1">{errors.state.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">District *</label>
              <select
                {...register('district', { required: 'District is required' })}
                className="input-base"
                disabled={!watchedState}
              >
                <option value="">{watchedState ? 'Select District' : 'Select State first'}</option>
                {availableDistricts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              {errors.district && <p className="text-xs text-destructive mt-1">{errors.district.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">City / Town / Industrial Area *</label>
              <input
                type="text"
                {...register('city', {
                  required: 'City or town is required',
                  minLength: { value: 2, message: 'Minimum 2 characters' },
                  maxLength: { value: 100, message: 'Maximum 100 characters' },
                })}
                placeholder="e.g., Guindy, Peenya, Andheri, Jeedimetla"
                className="input-base"
              />
              {errors.city && <p className="text-xs text-destructive mt-1">{errors.city.message}</p>}
            </div>
          </div>
        </div>

        {/* Interactive Pickup Location Map */}
        <div className="p-3.5 rounded-xl bg-secondary/30 border border-border/60 space-y-2">
          <label className="block text-xs font-medium text-foreground uppercase tracking-wider">
            Pickup Location Pin <span className="text-[11px] text-muted-foreground font-normal normal-case">(Interactive Map — Optional)</span>
          </label>
          <LocationMapPicker
            latitude={coordinates?.latitude}
            longitude={coordinates?.longitude}
            onLocationChange={setCoordinates}
            disabled={isSaving}
            height="240px"
          />
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Image (optional)</label>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
          {imagePreview ? (
            <div className="relative w-full h-36 rounded-lg overflow-hidden border border-border">
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
              className="w-full h-24 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1.5 hover:border-primary/50 hover:bg-secondary/30 transition-colors"
            >
              <ImagePlus className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Click to upload image (Max 5MB)</span>
            </button>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Description</label>
          <textarea
            {...register('description', { required: 'Required' })}
            rows={3}
            className="input-base resize-none text-sm"
          />
          {errors.description && <p className="text-xs text-destructive mt-1">{errors.description.message}</p>}
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" disabled={isSaving} className="btn-primary flex-1 gap-2">
            {isSaving ? (
              <>
                <Spinner size="sm" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
