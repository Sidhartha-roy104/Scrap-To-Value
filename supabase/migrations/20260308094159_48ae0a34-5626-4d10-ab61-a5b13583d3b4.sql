
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS estimated_delivery timestamp with time zone,
ADD COLUMN IF NOT EXISTS tracking_updates jsonb DEFAULT '[]'::jsonb;
