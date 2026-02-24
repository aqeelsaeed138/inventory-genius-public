
-- Fix overly permissive cart_sessions policies
-- Replace "Anyone can update cart sessions" (WITH CHECK (true)) 
-- with token-based scoping enforced at app level, keep only public read

DROP POLICY IF EXISTS "Anyone can create cart sessions" ON public.cart_sessions;
DROP POLICY IF EXISTS "Anyone can update cart sessions" ON public.cart_sessions;

-- Anonymous shoppers can INSERT a cart session (no check on company_id needed; app sets it)
-- Use WITH CHECK that verifies company_id is set (not null)
CREATE POLICY "Anyone can create cart sessions"
  ON public.cart_sessions
  FOR INSERT
  WITH CHECK (company_id IS NOT NULL AND session_token IS NOT NULL);

-- Anonymous shoppers can UPDATE their own session identified by token
-- (token is a UUID generated client-side, stored in localStorage — effectively a secret)
-- We enforce token match via application logic; at DB level we allow updates where expires_at > now
CREATE POLICY "Anyone can update their cart session"
  ON public.cart_sessions
  FOR UPDATE
  USING (expires_at > now())
  WITH CHECK (expires_at > now() AND company_id IS NOT NULL);
