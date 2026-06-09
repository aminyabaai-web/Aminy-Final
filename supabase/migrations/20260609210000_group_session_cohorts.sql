-- BCBA-moderated cohorts — extends group_sessions to multi-week programs.
-- A cohort is the community cold-start answer: 8-12 families + 1 BCBA over
-- N weeks guarantees response density (vs an empty open forum). Single
-- sessions stay the default (format='single', session_count=1).

ALTER TABLE group_sessions
  ADD COLUMN IF NOT EXISTS format TEXT NOT NULL DEFAULT 'single'
    CHECK (format IN ('single', 'cohort')),
  ADD COLUMN IF NOT EXISTS session_count INTEGER NOT NULL DEFAULT 1,   -- weekly meetings in the program
  ADD COLUMN IF NOT EXISTS cohort_description TEXT;                    -- week-by-week curriculum outline

-- Cohorts support larger groups than single office-hours sessions
COMMENT ON COLUMN group_sessions.format IS 'single = one-off office hours (max ~4 families); cohort = multi-week BCBA-moderated program (8-12 families)';
COMMENT ON COLUMN group_sessions.session_count IS 'Number of weekly sessions; price_per_family_cents is for the WHOLE program';

CREATE INDEX IF NOT EXISTS group_sessions_format_idx ON group_sessions(format);
