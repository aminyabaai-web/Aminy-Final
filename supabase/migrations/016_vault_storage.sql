-- ============================================================================
-- Migration: 016_vault_storage.sql
-- Description: Document vault storage tables and policies
-- ============================================================================

-- Vault Documents Table
CREATE TABLE IF NOT EXISTS vault_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  record_type TEXT NOT NULL CHECK (record_type IN (
    'iep', 'evaluation', 'report', 'prescription', 'care-plan',
    'uploaded', 'coach-note', 'session-artifact', 'school-letter', 'other'
  )),
  source TEXT NOT NULL CHECK (source IN (
    'parent-upload', 'junior', 'coach', 'school', 'clinic', 'other'
  )),
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'shared')),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Indexes
  CONSTRAINT vault_documents_file_path_unique UNIQUE (file_path)
);
-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_vault_documents_user_id ON vault_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_vault_documents_record_type ON vault_documents(record_type);
CREATE INDEX IF NOT EXISTS idx_vault_documents_uploaded_at ON vault_documents(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_vault_documents_metadata_child_id ON vault_documents((metadata->>'childId'));
-- RLS Policies for vault_documents
ALTER TABLE vault_documents ENABLE ROW LEVEL SECURITY;
-- Users can view their own documents
CREATE POLICY "Users can view own vault documents"
  ON vault_documents
  FOR SELECT
  USING (auth.uid() = user_id);
-- Users can insert their own documents
CREATE POLICY "Users can insert own vault documents"
  ON vault_documents
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
-- Users can update their own documents
CREATE POLICY "Users can update own vault documents"
  ON vault_documents
  FOR UPDATE
  USING (auth.uid() = user_id);
-- Users can delete their own documents
CREATE POLICY "Users can delete own vault documents"
  ON vault_documents
  FOR DELETE
  USING (auth.uid() = user_id);
-- ============================================================================
-- Vault Share Links Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS vault_share_links (
  id TEXT PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES vault_documents(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  passcode TEXT,
  max_views INTEGER,
  view_count INTEGER NOT NULL DEFAULT 0,
  recipient_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_revoked BOOLEAN NOT NULL DEFAULT FALSE
);
-- Indexes for share links
CREATE INDEX IF NOT EXISTS idx_vault_share_links_document_id ON vault_share_links(document_id);
CREATE INDEX IF NOT EXISTS idx_vault_share_links_expires_at ON vault_share_links(expires_at);
-- RLS Policies for vault_share_links
ALTER TABLE vault_share_links ENABLE ROW LEVEL SECURITY;
-- Users can view share links they created
CREATE POLICY "Users can view own share links"
  ON vault_share_links
  FOR SELECT
  USING (auth.uid() = created_by);
-- Users can create share links for their documents
CREATE POLICY "Users can create share links"
  ON vault_share_links
  FOR INSERT
  WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM vault_documents
      WHERE id = document_id AND user_id = auth.uid()
    )
  );
-- Users can update their share links (e.g., revoke)
CREATE POLICY "Users can update own share links"
  ON vault_share_links
  FOR UPDATE
  USING (auth.uid() = created_by);
-- Users can delete their share links
CREATE POLICY "Users can delete own share links"
  ON vault_share_links
  FOR DELETE
  USING (auth.uid() = created_by);
-- ============================================================================
-- Vault Access Log Table (for audit trail)
-- ============================================================================

CREATE TABLE IF NOT EXISTS vault_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES vault_documents(id) ON DELETE CASCADE,
  share_link_id TEXT REFERENCES vault_share_links(id) ON DELETE SET NULL,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accessed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  access_type TEXT NOT NULL CHECK (access_type IN ('view', 'download', 'share')),
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);
-- Indexes for access log
CREATE INDEX IF NOT EXISTS idx_vault_access_log_document_id ON vault_access_log(document_id);
CREATE INDEX IF NOT EXISTS idx_vault_access_log_accessed_at ON vault_access_log(accessed_at DESC);
-- RLS for access log - users can view logs for their own documents
ALTER TABLE vault_access_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view access logs for own documents"
  ON vault_access_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM vault_documents
      WHERE id = document_id AND user_id = auth.uid()
    )
  );
-- Allow insert for any authenticated user (for logging access)
CREATE POLICY "Authenticated users can log access"
  ON vault_access_log
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
-- ============================================================================
-- Storage Bucket Configuration
-- Note: Bucket creation should be done via Supabase dashboard or CLI
-- ============================================================================

-- Create storage bucket for vault documents (if using Supabase storage)
-- This is a placeholder - actual bucket creation happens in Supabase dashboard
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('vault-documents', 'vault-documents', false)
-- ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies (applied to storage.objects)
-- These need to be created via Supabase dashboard or CLI:
--
-- Policy: Users can upload to their own folder
-- CREATE POLICY "Users can upload vault documents"
-- ON storage.objects
-- FOR INSERT
-- WITH CHECK (
--   bucket_id = 'vault-documents' AND
--   auth.uid()::text = (storage.foldername(name))[1]
-- );
--
-- Policy: Users can read their own documents
-- CREATE POLICY "Users can read own vault documents"
-- ON storage.objects
-- FOR SELECT
-- USING (
--   bucket_id = 'vault-documents' AND
--   auth.uid()::text = (storage.foldername(name))[1]
-- );
--
-- Policy: Users can delete their own documents
-- CREATE POLICY "Users can delete own vault documents"
-- ON storage.objects
-- FOR DELETE
-- USING (
--   bucket_id = 'vault-documents' AND
--   auth.uid()::text = (storage.foldername(name))[1]
-- );

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to increment view count on share link access
CREATE OR REPLACE FUNCTION increment_share_link_views(link_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE vault_share_links
  SET view_count = view_count + 1
  WHERE id = link_id
    AND is_revoked = FALSE
    AND expires_at > NOW()
    AND (max_views IS NULL OR view_count < max_views);
END;
$$;
-- Function to get storage usage for a user
CREATE OR REPLACE FUNCTION get_user_storage_usage(p_user_id UUID)
RETURNS TABLE(total_bytes BIGINT, file_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(file_size), 0)::BIGINT as total_bytes,
    COUNT(*)::BIGINT as file_count
  FROM vault_documents
  WHERE user_id = p_user_id;
END;
$$;
-- ============================================================================
-- Cleanup Function for Expired Share Links
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_share_links()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete share links that have been expired for more than 30 days
  DELETE FROM vault_share_links
  WHERE expires_at < NOW() - INTERVAL '30 days';

  -- Revoke share links that have reached max views
  UPDATE vault_share_links
  SET is_revoked = TRUE
  WHERE max_views IS NOT NULL
    AND view_count >= max_views
    AND is_revoked = FALSE;
END;
$$;
-- Comment on tables
COMMENT ON TABLE vault_documents IS 'Stores metadata for documents uploaded to the vault';
COMMENT ON TABLE vault_share_links IS 'Stores share links for vault documents with expiration and access control';
COMMENT ON TABLE vault_access_log IS 'Audit log for document access events';
