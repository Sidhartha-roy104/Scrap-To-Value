
-- Ratings table: one rating per transaction by the buyer
CREATE TABLE public.ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL UNIQUE REFERENCES public.transactions(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  rating smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_ratings_seller_id ON public.ratings(seller_id);
CREATE INDEX idx_ratings_buyer_id ON public.ratings(buyer_id);

-- RLS
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- Anyone can read ratings (public reviews)
CREATE POLICY "Ratings are viewable by everyone"
  ON public.ratings FOR SELECT
  USING (true);

-- Buyers can insert a rating for their own transaction
CREATE POLICY "Buyers can create ratings"
  ON public.ratings FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

-- Buyers can update their own rating
CREATE POLICY "Buyers can update their own ratings"
  ON public.ratings FOR UPDATE
  USING (auth.uid() = buyer_id);

-- Function to get average seller rating
CREATE OR REPLACE FUNCTION public.get_seller_avg_rating(_seller_id uuid)
RETURNS TABLE(avg_rating numeric, total_ratings bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    COALESCE(ROUND(AVG(rating)::numeric, 1), 0) as avg_rating,
    COUNT(*) as total_ratings
  FROM public.ratings
  WHERE seller_id = _seller_id;
$$;
