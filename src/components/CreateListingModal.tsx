import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { ImagePlus, X, AlertCircle } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Spinner } from '@/components/Spinner';
import { useWasteListings } from '@/hooks/useWasteListings';
import { useToastNotification } from '@/components/ToastNotification';
import { WasteType } from '@/data/mockData';
import { LocationMapPicker, type LocationCoordinates } from '@/components/maps/LocationMapPicker';
import {
  INDIAN_STATE_NAMES,
  getDistrictsForState,
  formatStructuredLocation,
} from '@/data/indiaLocations';

const wasteTypes: WasteType[] = ['Organic', 'Plastic', 'Metal', 'Paper', 'E-waste', 'Textile'];

export interface ListingFormData {
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

interface CreateListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateListingModal({ isOpen, onClose, onSuccess }: CreateListingModalProps) {
  const { addListing, isAdding } = useWasteListings();
  const { addToast } = useToastNotification();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<LocationCoordinates | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ListingFormData>({
    defaultValues: {
      country: 'India',
      state: '',
      district: '',
      city: '',
    },
  });

  const watchedState = watch('state');
  const watchedQuantity = watch('quantity') || 0;
  const watchedPrice = watch('pricePerKg') || 0;
  const estimatedTotal = Number(watchedQuantity) * Number(watchedPrice);

  const availableDistricts = getDistrictsForState(watchedState);

  // When state changes, reset district and city
  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newState = e.target.value;
    setValue('state', newState, { shouldValidate: true });
    setValue('district', '', { shouldValidate: false });
    setValue('city', '', { shouldValidate: false });
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type.toLowerCase())) {
        addToast({ type: 'error', title: 'Invalid image format', message: 'Only JPG, PNG, or WEBP images are allowed' });
        return;
      }
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

  const handleModalClose = () => {
    if (isAdding) return;
    setErrorMessage(null);
    reset({
      country: 'India',
      state: '',
      district: '',
      city: '',
    });
    clearImage();
    setCoordinates(null);
    onClose();
  };

  const onSubmit = async (data: ListingFormData) => {
    setErrorMessage(null);
    try {
      const computedLocation = formatStructuredLocation({
        city: data.city,
        district: data.district,
        state: data.state,
        country: data.country || 'India',
      });

      await addListing({
        waste_type: data.wasteType,
        title: data.title.trim(),
        quantity: Number(data.quantity),
        unit: 'kg',
        price_per_kg: Number(data.pricePerKg),
        country: data.country || 'India',
        state: data.state.trim(),
        district: data.district.trim(),
        city: data.city.trim(),
        location: computedLocation,
        latitude: coordinates?.latitude ?? null,
        longitude: coordinates?.longitude ?? null,
        description: data.description?.trim() || '',
        image: imageFile || undefined,
      });

      addToast({
        type: 'success',
        title: 'Listing Created Successfully',
        message: 'Your scrap material listing is now published and active on the buyer marketplace.',
      });

      reset({
        country: 'India',
        state: '',
        district: '',
        city: '',
      });
      clearImage();
      setCoordinates(null);
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to publish listing';
      console.error('[CreateListingModal Error]', err);
      setErrorMessage(msg);
      addToast({
        type: 'error',
        title: 'Listing Creation Failed',
        message: msg,
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title="Post New Scrap Material Listing"
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {errorMessage && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div className="flex-1 leading-snug">{errorMessage}</div>
          </div>
        )}

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
                placeholder="e.g., Aluminium Scrap 6063, Copper Wire, PET Bottles"
                className="input-base"
                disabled={isAdding}
              />
              {errors.title && <p className="text-xs text-destructive mt-1">{errors.title.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Scrap Material Category *</label>
              <select
                {...register('wasteType', { required: 'Scrap category is required' })}
                className="input-base"
                disabled={isAdding}
              >
                <option value="">Select category</option>
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
                  required: 'Quantity is required',
                  min: { value: 0.1, message: 'Quantity must be greater than 0' },
                  valueAsNumber: true,
                })}
                placeholder="e.g., 500"
                className="input-base"
                disabled={isAdding}
              />
              {errors.quantity && <p className="text-xs text-destructive mt-1">{errors.quantity.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Price per kg (₹) *</label>
              <input
                type="number"
                step="any"
                {...register('pricePerKg', {
                  required: 'Price per kg is required',
                  min: { value: 0.01, message: 'Price must be greater than 0' },
                  valueAsNumber: true,
                })}
                placeholder="e.g., 18.50"
                className="input-base"
                disabled={isAdding}
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
                disabled={isAdding}
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
                disabled={isAdding || !watchedState}
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
                disabled={isAdding}
              />
              {errors.city && <p className="text-xs text-destructive mt-1">{errors.city.message}</p>}
            </div>
          </div>
        </div>

        {/* Interactive Pickup Location Map */}
        <div className="p-3.5 rounded-xl bg-secondary/30 border border-border/60 space-y-2">
          <label className="block text-xs font-medium text-foreground uppercase tracking-wider">
            Interactive Pickup Location Map <span className="text-[11px] text-muted-foreground font-normal normal-case">(Optional Pin)</span>
          </label>
          <LocationMapPicker
            latitude={coordinates?.latitude}
            longitude={coordinates?.longitude}
            onLocationChange={setCoordinates}
            disabled={isAdding}
            height="240px"
          />
        </div>

        {/* Material Image Upload */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Material Image (optional)</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
            disabled={isAdding}
          />
          {imagePreview ? (
            <div className="relative w-full h-36 rounded-lg overflow-hidden border border-border">
              <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={clearImage}
                disabled={isAdding}
                className="absolute top-2 right-2 p-1 rounded-full bg-background/80 hover:bg-background text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isAdding}
              className="w-full h-24 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1.5 hover:border-primary/50 hover:bg-secondary/30 transition-colors cursor-pointer disabled:opacity-50"
            >
              <ImagePlus className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Click to upload scrap material photo (PNG, JPG up to 5MB)</span>
            </button>
          )}
        </div>

        {/* Material Description */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Material Description & Specifications *</label>
          <textarea
            {...register('description', { required: 'Description is required' })}
            rows={3}
            placeholder="Describe scrap specifications, industrial source, grade, packaging, pickup instructions..."
            className="input-base resize-none text-sm"
            disabled={isAdding}
          />
          {errors.description && <p className="text-xs text-destructive mt-1">{errors.description.message}</p>}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={handleModalClose}
            disabled={isAdding}
            className="btn-secondary flex-1"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isAdding}
            className="btn-primary flex-1 gap-2"
          >
            {isAdding ? (
              <>
                <Spinner size="sm" />
                Publishing Scrap Listing...
              </>
            ) : (
              'Publish Scrap Listing'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
