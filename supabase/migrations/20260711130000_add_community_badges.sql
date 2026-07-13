-- community.ts writes profiles.community_badges but the column never existed,
-- so badge awards silently no-op'd (is_trial-class schema drift). Add it.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS community_badges jsonb DEFAULT '[]'::jsonb;
COMMENT ON COLUMN public.profiles.community_badges IS 'Community badges earned by the user (jsonb array). Written by src/lib/community.ts.';
