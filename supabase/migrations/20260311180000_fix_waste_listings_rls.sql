-- =============================================================================
-- Migration: Fix waste_listings RLS & Marketplace Policies
-- =============================================================================

-- 1. Ensure RLS is active on waste_listings
ALTER TABLE public.waste_listings ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "Listings are viewable by everyone" ON public.waste_listings;
DROP POLICY IF EXISTS "Users can create their own listings" ON public.waste_listings;
DROP POLICY IF EXISTS "Users can update their own listings" ON public.waste_listings;
DROP POLICY IF EXISTS "Users can delete their own listings" ON public.waste_listings;
DROP POLICY IF EXISTS "Public and buyers can view available listings, sellers can view own" ON public.waste_listings;
DROP POLICY IF EXISTS "Authenticated sellers can insert their own listings" ON public.waste_listings;
DROP POLICY IF EXISTS "Sellers can update their own listings" ON public.waste_listings;
DROP POLICY IF EXISTS "Sellers can delete their own listings" ON public.waste_listings;

-- 3. SELECT Policy:
-- Public/buyers can view active ('Available') listings.
-- Sellers can view all of their own listings regardless of status.
CREATE POLICY "Public and buyers can view available listings, sellers can view own"
  ON public.waste_listings
  FOR SELECT
  USING (
    status = 'Available'
    OR (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  );

-- 4. INSERT Policy:
-- Authenticated sellers can create listings only where user_id matches their own auth.uid().
CREATE POLICY "Authenticated sellers can insert their own listings"
  ON public.waste_listings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = user_id
  );

-- 5. UPDATE Policy:
-- Sellers can update only their own listings.
CREATE POLICY "Sellers can update their own listings"
  ON public.waste_listings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6. DELETE Policy:
-- Sellers can delete only their own listings.
CREATE POLICY "Sellers can delete their own listings"
  ON public.waste_listings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 7. Ensure listing-images storage bucket exists and policies allow uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('listing-images', 'listing-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Authenticated users can upload listing images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view listing images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own listing images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated sellers can upload listing images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view listing images" ON storage.objects;
DROP POLICY IF EXISTS "Sellers can delete their own listing images" ON storage.objects;

CREATE POLICY "Authenticated sellers can upload listing images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'listing-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Public can view listing images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'listing-images');

CREATE POLICY "Sellers can delete their own listing images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'listing-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 8. Enable Realtime on waste_listings table
ALTER PUBLICATION supabase_realtime ADD TABLE public.waste_listings;

-- 9. Auto-confirm all existing users in auth.users (resolves 'email_not_confirmed')
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, now()),
    confirmed_at = COALESCE(confirmed_at, now())
WHERE confirmed_at IS NULL;

-- 10. Automatically confirm any newly created users in auth.users
CREATE OR REPLACE FUNCTION public.handle_auto_confirm_user()
RETURNS trigger AS $$
BEGIN
  NEW.email_confirmed_at := COALESCE(NEW.email_confirmed_at, now());
  NEW.confirmed_at := COALESCE(NEW.confirmed_at, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_auto_confirm ON auth.users;

CREATE TRIGGER on_auth_user_auto_confirm
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auto_confirm_user();
