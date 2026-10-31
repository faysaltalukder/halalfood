-- Allow signed-in customers to submit Pending reviews without account linkage.
-- If a customer_id is supplied, it must still belong to the authenticated user.

DROP POLICY IF EXISTS "Customers can submit pending product reviews" ON public.product_reviews;

CREATE POLICY "Customers can submit pending product reviews"
ON public.product_reviews
FOR INSERT
TO anon, authenticated
WITH CHECK (
  source = 'customer'
  AND status = 'pending'
  AND verified_purchase = false
  AND (
    customer_id IS NULL
    OR customer_id = (SELECT auth.uid())
  )
  AND EXISTS (
    SELECT 1
    FROM public.products p
    WHERE p.id = product_id
      AND p.is_active = true
  )
);
