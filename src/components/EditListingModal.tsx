import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ImagePlus, X } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Spinner } from '@/components/Spinner';
import { useWasteListings, DbWasteListing } from '@/hooks/useWasteListings';
import { uploadListingImage, resolveImageUrl } from '@/services/listingService';
import { useToastNotification } from '@/components/ToastNotification';
import { WasteType } from '@/data/mockData';

const wasteTypes: WasteType[] = ['Organic', 'Plastic', 'Metal', 'Paper', 'E-waste', 'Textile'];
const locations = ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Vellore', 'Erode', 'Tirupur'];

interface EditFormData {
  wasteType: WasteType;
  quantity: number;
  pricePerKg: number;
  location: string;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<EditFormData>();

  useEffect(() => {
    if (listing && isOpen) {
      reset({
        wasteType: listing.waste_type as WasteType,
        quantity: listing.quantity,
        pricePerKg: listing.price_per_kg,
        location: listing.location,
        description: listing.description || '',
      });
      setImagePreview(resolveImageUrl(listing.image_url) || null);
      setImageFile(null);
    }
  }, [listing, isOpen, reset]);

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
      const updates: Record<string, unknown> = {
        waste_type: data.wasteType,
        title: `${data.wasteType} Waste - ${data.quantity}kg`,
        quantity: data.quantity,
        price_per_kg: data.pricePerKg,
        total_price: data.quantity * data.pricePerKg,
        location: data.location,
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
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Listing" size="lg">
      <form onSubmit={handleSubmit(handleSave)} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Waste Type</label>
            <select {...register('wasteType', { required: 'Required' })} className="input-base">
              {wasteTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            {errors.wasteType && <p className="text-xs text-destructive mt-1">{errors.wasteType.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Quantity (kg)</label>
            <input
              type="number"
              {...register('quantity', { required: 'Required', min: { value: 1, message: 'Min 1 kg' }, valueAsNumber: true })}
              className="input-base"
            />
            {errors.quantity && <p className="text-xs text-destructive mt-1">{errors.quantity.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Price per kg (₹)</label>
            <input
              type="number"
              {...register('pricePerKg', { required: 'Required', min: { value: 1, message: 'Min ₹1' }, valueAsNumber: true })}
              className="input-base"
            />
            {errors.pricePerKg && <p className="text-xs text-destructive mt-1">{errors.pricePerKg.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Location</label>
            <select {...register('location', { required: 'Required' })} className="input-base">
              <option value="">Select location</option>
              {locations.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
            {errors.location && <p className="text-xs text-destructive mt-1">{errors.location.message}</p>}
          </div>
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Image (optional)</label>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
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
            {...register('description', { required: 'Required' })}
            rows={3}
            className="input-base resize-none"
          />
          {errors.description && <p className="text-xs text-destructive mt-1">{errors.description.message}</p>}
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={isSaving} className="btn-primary flex-1 gap-2">
            {isSaving ? (<><Spinner size="sm" />Saving...</>) : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
