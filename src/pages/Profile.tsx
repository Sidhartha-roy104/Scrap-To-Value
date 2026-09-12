import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getCurrentUser } from '@/services/userService';
import { supabase } from '@/integrations/supabase/client';
import { useToastNotification } from '@/components/ToastNotification';
import { User, Building2, Phone, MapPin, Camera, Loader2, Save, Star, ShieldCheck, Award, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import { useUserReviews } from '@/hooks/useRatings';

interface ProfileData {
  display_name: string;
  phone: string;
  company_name: string;
  company_address: string;
  avatar_url: string;
}

export default function Profile() {
  const { user } = useAuth();
  const { addToast } = useToastNotification();
  const { data: reviewData, isLoading: reviewsLoading } = useUserReviews(user?.id);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    display_name: '',
    phone: '',
    company_name: '',
    company_address: '',
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
          avatar_url: data.avatar_url || '',
        });
      }
    } catch (err: unknown) {
      console.warn('[Profile] Could not fetch profile from /api/users/me:', err);
      if (user) {
        setProfile({
          display_name: user.full_name || '',
          phone: user.phone || '',
          company_name: user.company_name || '',
          company_address: user.company_address || '',
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

    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: profile.display_name,
        phone: profile.phone,
        company_name: profile.company_name,
        company_address: profile.company_address,
      })
      .eq('user_id', user!.id);

    if (error) {
      addToast({ type: 'error', title: 'Failed to update profile' });
    } else {
      addToast({ type: 'success', title: 'Profile updated successfully!' });
    }
    setSaving(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const filePath = `${user!.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      addToast({ type: 'error', title: 'Failed to upload avatar' });
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('user_id', user!.id);

    if (!updateError) {
      setProfile(prev => ({ ...prev, avatar_url: publicUrl }));
      addToast({ type: 'success', title: 'Avatar updated!' });
    }
    setUploading(false);
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
    : 'U';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto p-6"
    >
      <h1 className="text-2xl font-bold text-foreground mb-6">My Profile</h1>

      {/* Avatar */}
      <div className="flex items-center gap-5 mb-8">
        <div className="relative group">
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
          <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            ) : (
              <Camera className="h-5 w-5 text-white" />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>
        <div>
          <p className="font-semibold text-foreground">{profile.display_name || 'Unnamed'}</p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSave} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Display Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={profile.display_name}
                onChange={(e) => setProfile(p => ({ ...p, display_name: e.target.value }))}
                className="input-base pl-10"
                placeholder="Your name"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Phone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile(p => ({ ...p, phone: e.target.value }))}
                className="input-base pl-10"
                placeholder="+91 9876543210"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Company Name</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={profile.company_name}
                onChange={(e) => setProfile(p => ({ ...p, company_name: e.target.value }))}
                className="input-base pl-10"
                placeholder="Your MSME name"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Company Address</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={profile.company_address}
                onChange={(e) => setProfile(p => ({ ...p, company_address: e.target.value }))}
                className="input-base pl-10"
                placeholder="City, Tamil Nadu"
              />
            </div>
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </button>
      </form>

      {/* Marketplace Trust & Reputation (Seller Profile Only) */}
      {user?.role === 'seller' && (
        <div className="mt-10 pt-8 border-t border-border space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-500" />
                Marketplace Seller Reputation
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Public marketplace ratings and reviews earned from verified buyers after completed deliveries.
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
              {/* Score & Distribution Breakdown */}
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

                {/* Star distribution bars */}
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
                          <div
                            className="h-full bg-amber-400 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-8 text-right text-[11px] text-muted-foreground">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Received Reviews List */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Recent Verified Buyer Reviews
                </h3>
                {reviewData.reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-4 rounded-xl bg-card border border-border/70 space-y-2.5"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground">
                            {rev.reviewer_name || 'Marketplace Buyer'}
                          </span>
                          {rev.reviewer_company && (
                            <span className="text-[11px] text-muted-foreground">
                              ({rev.reviewer_company})
                            </span>
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
                                s <= rev.rating
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-muted-foreground/30'
                              }`}
                            />
                          ))}
                          <span className="ml-1 text-xs font-bold text-foreground">{rev.rating}</span>
                        </div>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(rev.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
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
                Once you complete and deliver scrap collection orders, buyers will be able to rate your service and build your public marketplace rating.
              </p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
