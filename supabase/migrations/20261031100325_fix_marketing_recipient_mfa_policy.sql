-- Fix the marketing recipient MFA policy predicate.
-- Both USING and WITH CHECK are limited to the authorized AAL2 admin.

DROP POLICY IF EXISTS "Marketing recipients admin MFA" ON public.marketing_campaign_recipients;
CREATE POLICY "Marketing recipients admin MFA"
  ON public.marketing_campaign_recipients FOR ALL TO authenticated
  USING (lower(coalesce((SELECT auth.jwt())->>'email','')) = 'halalfoodbd.official@gmail.com'
    AND coalesce((SELECT auth.jwt())->>'aal','aal1') = 'aal2')
  WITH CHECK (lower(coalesce((SELECT auth.jwt())->>'email','')) = 'halalfoodbd.official@gmail.com'
    AND coalesce((SELECT auth.jwt())->>'aal','aal1') = 'aal2');
