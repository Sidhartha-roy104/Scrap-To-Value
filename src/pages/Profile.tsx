import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getCurrentUser, updateCurrentUser } from '@/services/userService';
import { useToastNotification } from '@/components/ToastNotification';
import {
  User,
  Building2,
  Phone,
  MapPin,
  Loader2,
  Save,
  Star,
  ShieldCheck,
  Award,
  MessageSquare,
  Globe,
  Info,
  CheckCircle2,
  Camera,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useUserReviews } from '@/hooks/useRatings';

interface ProfileData {
  display_name: string;
  phone: string;
  company_name: string;
  company_address: string;
  city: string;
  state: string;
  country: string;
  company_type: string;
  company_description: string;
  avatar_url: string;
}

const SUPPLIER_COMPANY_TYPES = [
  'Manufacturing Company',
  'Metal Fabrication',
  'Automobile Company',
  'Electronics Company',
  'Construction Company',
  'Factory / Industry',
  'Warehouse / Logistics',
  'Textile / Garments',
  'Chemical Industry',
  'Food Processing',
  'Other Business (Scrap Generating)',
];

const BUYER_COMPANY_TYPES = [
  'Recycling Company',
  'Metal Foundry / Smelter',
  'Metal Processing Company',
  'Scrap Trading Company',
  'Paper / Pulp Mill',
  'Plastics Recycler',
  'E-waste Processor',
  'Secondary Raw Material Supplier',
  'Other Buyer Business',
];

const STATES_OF_INDIA = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Chandigarh', 'Puducherry',
];

export default function Profile() {
  const { user } = useAuth();
  const { addToast } = useToastNotification();
  const { data: reviewData, isLoading: reviewsLoading } = useUserReviews(user?.id);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    display_name: '',
    phone: '',
    company_name: '',
    company_address: '',
    city: '',
    state: '',
    country: 'India',
    company_type: '',
    company_description: '',
    avatar_url: '',
  });

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    try {
      const data = await getCurrentUser();
      if (data) {
        setProfile({
          display_name: data.full_name || '',
          phone: data.phone || '',
          company_name: data.company_name || '',
          company_address: data.company_address || '',
          city: data.city || '',
          state: data.state || '',
          country: data.country || 'India',
          company_type: data.company_type || '',
          company_description: data.company_description || '',
          avatar_url: data.avatar_url || '',
        });
      }
    } catch (err: unknown) {
      console.warn('[Profile] Could not fetch profile from /api/users/me:', err);
      // Fallback to JWT-cached user data
      if (user) {
        setProfile({
          display_name: user.full_name || '',
          phone: user.phone || '',
          company_name: user.company_name || '',
          company_address: user.company_address || '',
          city: user.city || '',
          state: user.state || '',
          country: user.country || 'India',
          company_type: user.company_type || '',
          company_description: user.company_description || '',
          avatar_url: user.avatar_url || '',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await updateCurrentUser({
        display_name: profile.display_name.trim() || null,
        phone: profile.phone.trim() || null,
        company_name: profile.company_name.trim() || null,
        company_address: profile.company_address.trim() || null,
        city: profile.city.trim() || null,
        state: profile.state.trim() || null,
        country: profile.country.trim() || null,
        company_type: profile.company_type.trim() || null,
        company_description: profile.company_description.trim() || null,
      });
      addToast({ type: 'success', title: 'Profile updated successfully!' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile';
      addToast({ type: 'error', title: 'Update Failed', message: msg });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const initials = profile.display_name
    ? profile.display_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || 'U';

  const isSupplier = user?.role === 'seller';
  const isBuyer = user?.role === 'buyer';
  const companyTypeOptions = isSupplier ? SUPPLIER_COMPANY_TYPES : BUYER_COMPANY_TYPES;

  const roleLabel = isSupplier ? 'Supplier Company' : isBuyer ? 'Buyer Company' : 'Company';
  const companyTypeLabel = isSupplier ? 'Business Type (Scrap Source)' : 'Business Type (Purchasing)';
  const companyNamePlaceholder = isSupplier
    ? 'e.g. Acme Manufacturing Pvt Ltd'
    : 'e.g. Greentech Recyclers Pvt Ltd';
  const addressLabel = isSupplier ? 'Facility / Pickup Address' : 'Business / Registered Address';
  const addressPlaceholder = isSupplier
    ? 'Factory address, industrial area, etc.'
    : 'Registered office or processing facility address';

  // Profile completeness indicator
  const requiredFields = ['display_name', 'phone', 'company_name', 'company_type', 'city'];
  const completedFields = requiredFields.filter(f => Boolean(profile[f as keyof ProfileData]));
  const completionPct = Math.round((completedFields.length / requiredFields.length) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto p-6 space-y-8"
    >
      <h1 className="text-2xl font-bold text-foreground">Business Profile</h1>

      {/* Profile Completion Banner */}
      {completionPct < 100 && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
          <Info className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              Profile {completionPct}% complete
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Complete your {roleLabel.toLowerCase()} profile to build trust with{' '}
              {isSupplier ? 'purchasing companies' : 'suppliers'} on the marketplace.
            </p>
            <div className="mt-2 h-1.5 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>
        </div>
      )}
      {completionPct === 100 && (
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm font-medium">Profile complete — your business details are visible to trading partners.</span>
        </div>
      )}

      {/* Avatar + Identity */}
      <div className="flex items-center gap-5">
        <div className="relative">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="Avatar"
              className="h-20 w-20 rounded-full object-cover border-2 border-border"
            />
          ) : (
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center border-2 border-border">
              <span className="text-xl font-bold text-primary">{initials}</span>
            </div>
          )}
          {/* Avatar upload deferred — needs Node.js storage endpoint */}
          <div className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-secondary border-2 border-background flex items-center justify-center opacity-40 cursor-not-allowed" title="Avatar upload coming soon">
            <Camera className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-foreground">{profile.display_name || 'Unnamed User'}</p>
            {user?.role === 'seller' && (user?.is_verified || (user as any)?.kyc_verified) && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="h-3 w-3" />
                Verified Supplier
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
            isSupplier
              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
              : isBuyer
              ? 'bg-primary/10 text-primary border-primary/20'
              : 'bg-secondary text-muted-foreground border-border'
          }`}>
            <Building2 className="h-3 w-3" />
            {isSupplier ? 'Scrap Supplier' : isBuyer ? 'Scrap Buyer' : 'Administrator'}
          </span>
        </div>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSave} className="space-y-6">

        {/* Section: Contact Person */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" />
            Contact Person
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={profile.display_name}
                  onChange={(e) => setProfile(p => ({ ...p, display_name: e.target.value }))}
                  className="input-base pl-10"
                  placeholder="Contact person's full name"
                  maxLength={100}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Business Phone
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile(p => ({ ...p, phone: e.target.value }))}
                  className="input-base pl-10"
                  placeholder="+91 9876543210"
                  maxLength={20}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Visible to {isSupplier ? 'buyers' : 'sellers'} after order confirmation.
              </p>
            </div>
          </div>
        </div>

        {/* Section: Company Details */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5" />
            {roleLabel} Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Company Name
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={profile.company_name}
                  onChange={(e) => setProfile(p => ({ ...p, company_name: e.target.value }))}
                  className="input-base pl-10"
                  placeholder={companyNamePlaceholder}
                  maxLength={150}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {companyTypeLabel}
              </label>
              <select
                value={profile.company_type}
                onChange={(e) => setProfile(p => ({ ...p, company_type: e.target.value }))}
                className="input-base"
              >
                <option value="">Select business type</option>
                {companyTypeOptions.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                City
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={profile.city}
                  onChange={(e) => setProfile(p => ({ ...p, city: e.target.value }))}
                  className="input-base pl-10"
                  placeholder="City name"
                  maxLength={100}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                State
              </label>
              <select
                value={profile.state}
                onChange={(e) => setProfile(p => ({ ...p, state: e.target.value }))}
                className="input-base"
              >
                <option value="">Select state</option>
                {STATES_OF_INDIA.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Country
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={profile.country}
                  onChange={(e) => setProfile(p => ({ ...p, country: e.target.value }))}
                  className="input-base pl-10"
                  placeholder="India"
                  maxLength={100}
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {addressLabel}
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <textarea
                  value={profile.company_address}
                  onChange={(e) => setProfile(p => ({ ...p, company_address: e.target.value }))}
                  rows={2}
                  className="input-base pl-10 resize-none"
                  placeholder={addressPlaceholder}
                  maxLength={500}
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1.5">
                About {isSupplier ? 'Your Business / Scrap Source' : 'Your Purchasing Company'}
                <span className="text-muted-foreground font-normal ml-1">(optional)</span>
              </label>
              <textarea
                value={profile.company_description}
                onChange={(e) => setProfile(p => ({ ...p, company_description: e.target.value }))}
                rows={3}
                className="input-base resize-none"
                placeholder={
                  isSupplier
                    ? 'Describe your business, types of scrap generated, typical volumes, quality grades, etc.'
                    : 'Describe your purchasing requirements, processing capabilities, materials of interest, etc.'
                }
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground mt-1 text-right">
                {profile.company_description.length}/500
              </p>
            </div>
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn-primary w-full sm:w-auto">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Profile
            </>
          )}
        </button>
      </form>

      {/* Marketplace Trust & Reputation — Seller Only */}
      {user?.role === 'seller' && (
        <div className="pt-8 border-t border-border space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-500" />
                Marketplace Supplier Reputation
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Public marketplace ratings earned from purchasing companies after completed scrap deliveries.
              </p>
            </div>
            {reviewData?.summary && reviewData.summary.reviewCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="text-sm font-bold">{reviewData.summary.averageRating}</span>
                <span className="text-xs text-muted-foreground">({reviewData.summary.reviewCount})</span>
              </div>
            )}
          </div>

          {reviewsLoading ? (
            <div className="flex items-center justify-center p-8 bg-card rounded-xl border border-border">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : reviewData && reviewData.summary.reviewCount > 0 ? (
            <div className="space-y-5">
              {/* Score & Distribution */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5 rounded-xl bg-secondary/30 border border-border">
                <div className="flex flex-col items-center justify-center text-center p-2 sm:border-r border-border/60">
                  <span className="text-4xl font-extrabold text-foreground tracking-tight">
                    {reviewData.summary.averageRating}
                  </span>
                  <div className="flex items-center gap-1 my-1.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-4 w-4 ${
                          s <= Math.round(reviewData.summary.averageRating)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-muted-foreground/30'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Based on {reviewData.summary.reviewCount} verified buyer review{reviewData.summary.reviewCount > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="sm:col-span-2 space-y-1.5 justify-center flex flex-col">
                  {[5, 4, 3, 2, 1].map((starKey) => {
                    const count = reviewData.summary.distribution[starKey as keyof typeof reviewData.summary.distribution] || 0;
                    const pct = reviewData.summary.reviewCount > 0 ? (count / reviewData.summary.reviewCount) * 100 : 0;
                    return (
                      <div key={starKey} className="flex items-center gap-2 text-xs">
                        <span className="w-6 font-medium text-foreground flex items-center justify-end gap-0.5">
                          {starKey} <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400 inline" />
                        </span>
                        <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-8 text-right text-[11px] text-muted-foreground">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recent Reviews */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Recent Verified Buyer Reviews
                </h3>
                {reviewData.reviews.map((rev) => (
                  <div key={rev.id} className="p-4 rounded-xl bg-card border border-border/70 space-y-2.5">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground">
                            {rev.reviewer_name || 'Marketplace Buyer'}
                          </span>
                          {rev.reviewer_company && (
                            <span className="text-[11px] text-muted-foreground">({rev.reviewer_company})</span>
                          )}
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-secondary text-muted-foreground uppercase">
                            Buyer
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`h-3.5 w-3.5 ${
                                s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'
                              }`}
                            />
                          ))}
                          <span className="ml-1 text-xs font-bold text-foreground">{rev.rating}</span>
                        </div>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(rev.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </span>
                    </div>

                    {rev.comment && (
                      <p className="text-xs text-muted-foreground leading-relaxed bg-secondary/30 p-2.5 rounded-lg border border-border/40">
                        "{rev.comment}"
                      </p>
                    )}

                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="h-3 w-3" />
                      <span>Verified Delivered Order #{rev.request_id.slice(0, 8).toUpperCase()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-xl bg-secondary/20 border border-dashed border-border text-center space-y-2">
              <ShieldCheck className="h-8 w-8 text-muted-foreground/50 mx-auto" />
              <p className="text-sm font-medium text-foreground">No marketplace reviews yet</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Once you complete and deliver scrap orders, buyers will be able to rate your service and build your public marketplace rating.
              </p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
