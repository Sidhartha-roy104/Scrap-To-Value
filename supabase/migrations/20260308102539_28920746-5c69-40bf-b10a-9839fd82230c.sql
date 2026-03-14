
-- Allow sellers to update status and tracking on their transactions
CREATE POLICY "Sellers can update their transactions"
ON public.transactions
FOR UPDATE
TO authenticated
USING (auth.uid() = seller_id)
WITH CHECK (auth.uid() = seller_id);
