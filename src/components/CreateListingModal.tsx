import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { ImagePlus, X, AlertCircle } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Spinner } from '@/components/Spinner';
import { useWasteListings } from '@/hooks/useWasteListings';
import { useToastNotification } from '@/components/ToastNotification';
import { WasteType } from '@/data/mockData';

const wasteTypes: WasteType[] = ['Organic', 'Plastic', 'Metal', 'Paper', 'E-waste', 'Textile'];
const locations = ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Vellore', 'Erode', 'Tirupur'];

export interface ListingFormData {
  wasteType: WasteType;
  quantity: number;
  pricePerKg: number;
  location: string;
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ListingFormData>();

  const watchedQuantity = watch('quantity') || 0;
  const watchedPrice = watch('pricePerKg') || 0;
  const estimatedTotal = Number(watchedQuantity) * Number(watchedPrice);

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
    reset();
    clearImage();
    onClose();
  };

  const onSubmit = async (data: ListingFormData) => {
    setErrorMessage(null);
    try {
      await addListing({
        waste_type: data.wasteType,
        title: `${data.wasteType} Waste - ${data.quantity}kg`,
        quantity: Number(data.quantity),
        unit: 'kg',
        price_per_kg: Number(data.pricePerKg),
        location: data.location,
        description: data.description?.trim() || '',
        image: imageFile || undefined,
      });

      addToast({
        type: 'success',
        title: 'Listing Created Successfully',
        message: 'Your waste listing is now published and active on the buyer marketplace.',
      });

      reset();
      clearImage();
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
      title="Create New Scrap Listing"
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {errorMessage && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div className="flex-1 leading-snug">{errorMessage}</div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Waste Category *</label>
            <select
              {...register('wasteType', { required: 'Waste type is required' })}
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

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Quantity (kg) *</label>
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
            <label className="block text-sm font-medium text-foreground mb-1.5">Price per kg (₹) *</label>
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

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Location *</label>
            <select
              {...register('location', { required: 'Location is required' })}
              className="input-base"
              disabled={isAdding}
            >
              <option value="">Select location</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
            {errors.location && <p className="text-xs text-destructive mt-1">{errors.location.message}</p>}
          </div>
        </div>

        {/* Live Estimated Price Summary */}
        {estimatedTotal > 0 && (
          <div className="p-3 bg-secondary/50 rounded-lg flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Estimated Total Value:</span>
            <span className="font-semibold text-primary">₹{estimatedTotal.toLocaleString('en-IN')}</span>
          </div>
        )}

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Listing Image (optional)</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
            disabled={isAdding}
          />
          {imagePreview ? (
            <div className="relative w-full h-40 rounded-lg overflow-hidden border border-border">
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
              className="w-full h-28 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-secondary/30 transition-colors cursor-pointer disabled:opacity-50"
            >
              <ImagePlus className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Click to upload material image</span>
              <span className="text-xs text-muted-foreground">PNG, JPG up to 5MB</span>
            </button>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Description *</label>
          <textarea
            {...register('description', { required: 'Description is required' })}
            rows={3}
            placeholder="Describe the material condition, packaging, pickup instructions..."
            className="input-base resize-none"
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
                Publishing Listing...
              </>
            ) : (
              'Publish Listing'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
