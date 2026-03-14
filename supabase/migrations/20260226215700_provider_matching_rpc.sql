-- ============================================================================
-- RPC: find_matching_providers
-- Description: Used by the AI flow to find nearby, in-network clinicians
-- ============================================================================

CREATE OR REPLACE FUNCTION find_matching_providers(
  p_state TEXT,
  p_insurance TEXT,
  p_type TEXT DEFAULT 'bcba',
  p_limit INT DEFAULT 3
)
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT,
  title TEXT,
  avatar_url TEXT,
  hourly_rate INTEGER,
  rating DECIMAL
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.first_name,
    p.last_name,
    p.title,
    p.avatar_url,
    p.hourly_rate,
    p.rating
  FROM 
    providers p
  WHERE 
    p.provider_type = p_type
    AND p.verified = TRUE
    AND p.accepts_new_patients = TRUE
    AND (p.location_state = p_state OR p.offers_telehealth = TRUE)
    AND (
      p_insurance IS NULL 
      OR p_insurance = '' 
      OR p_insurance = ANY(p.insurance_accepted)
      OR 'Out of Network' = ANY(p.insurance_accepted)
    )
  ORDER BY 
    -- Prioritize in-state matches if they exist, then rating, then random to distribute load
    (p.location_state = p_state) DESC,
    p.rating DESC,
    random()
  LIMIT 
    p_limit;
END;
$$;
-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION find_matching_providers(TEXT, TEXT, TEXT, INT) TO authenticated;
