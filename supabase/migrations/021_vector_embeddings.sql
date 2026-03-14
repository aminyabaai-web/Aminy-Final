-- Migration 021: Vector Embeddings for Semantic Search
-- Requires pgvector extension

-- ============================================
-- ENABLE PGVECTOR EXTENSION
-- ============================================

CREATE EXTENSION IF NOT EXISTS vector;
-- ============================================
-- EMBEDDINGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('fact', 'memory', 'document', 'message')),
  -- Using 512 dimensions for text-embedding-3-small with reduced dims
  embedding vector(512),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- ============================================
-- INDEXES
-- ============================================

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_embeddings_user ON embeddings(user_id);
-- Index for content type filtering
CREATE INDEX IF NOT EXISTS idx_embeddings_content_type ON embeddings(content_type);
-- Index for timestamp queries
CREATE INDEX IF NOT EXISTS idx_embeddings_created ON embeddings(created_at);
-- HNSW index for fast approximate nearest neighbor search
-- Using cosine distance which works well for text embeddings
CREATE INDEX IF NOT EXISTS idx_embeddings_vector 
  ON embeddings 
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
-- Full-text search index on content
CREATE INDEX IF NOT EXISTS idx_embeddings_content_fts 
  ON embeddings 
  USING gin (to_tsvector('english', content));
-- ============================================
-- SIMILARITY SEARCH FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION search_embeddings(
  p_user_id UUID,
  p_query_embedding vector(512),
  p_match_threshold FLOAT DEFAULT 0.7,
  p_match_count INT DEFAULT 10,
  p_content_types TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  content_type TEXT,
  similarity FLOAT,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.content,
    e.content_type,
    1 - (e.embedding <=> p_query_embedding) as similarity,
    e.metadata
  FROM embeddings e
  WHERE 
    e.user_id = p_user_id
    AND (p_content_types IS NULL OR e.content_type = ANY(p_content_types))
    AND 1 - (e.embedding <=> p_query_embedding) > p_match_threshold
  ORDER BY e.embedding <=> p_query_embedding
  LIMIT p_match_count;
END;
$$ LANGUAGE plpgsql STABLE;
-- ============================================
-- BATCH SIMILARITY SEARCH
-- ============================================

CREATE OR REPLACE FUNCTION search_embeddings_batch(
  p_user_id UUID,
  p_query_embeddings vector(512)[],
  p_match_threshold FLOAT DEFAULT 0.7,
  p_match_count INT DEFAULT 5
)
RETURNS TABLE (
  query_index INT,
  id UUID,
  content TEXT,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    q.idx as query_index,
    e.id,
    e.content,
    1 - (e.embedding <=> q.embedding) as similarity
  FROM 
    unnest(p_query_embeddings) WITH ORDINALITY AS q(embedding, idx),
    embeddings e
  WHERE 
    e.user_id = p_user_id
    AND 1 - (e.embedding <=> q.embedding) > p_match_threshold
  ORDER BY q.idx, e.embedding <=> q.embedding
  LIMIT p_match_count * array_length(p_query_embeddings, 1);
END;
$$ LANGUAGE plpgsql STABLE;
-- ============================================
-- UPDATE TIMESTAMP TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION update_embedding_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS embedding_updated_at ON embeddings;
CREATE TRIGGER embedding_updated_at
  BEFORE UPDATE ON embeddings
  FOR EACH ROW
  EXECUTE FUNCTION update_embedding_timestamp();
-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;
-- Users can only access their own embeddings
CREATE POLICY "Users can view own embeddings"
  ON embeddings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users can insert own embeddings"
  ON embeddings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own embeddings"
  ON embeddings FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users can delete own embeddings"
  ON embeddings FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get embedding count by type for a user
CREATE OR REPLACE FUNCTION get_embedding_stats(p_user_id UUID)
RETURNS TABLE (
  content_type TEXT,
  count BIGINT,
  oldest TIMESTAMPTZ,
  newest TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.content_type,
    COUNT(*),
    MIN(e.created_at),
    MAX(e.created_at)
  FROM embeddings e
  WHERE e.user_id = p_user_id
  GROUP BY e.content_type;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
-- Clean up old embeddings (for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_embeddings(
  p_user_id UUID,
  p_content_type TEXT,
  p_days_old INT DEFAULT 90
)
RETURNS INT AS $$
DECLARE
  deleted_count INT;
BEGIN
  DELETE FROM embeddings
  WHERE 
    user_id = p_user_id
    AND content_type = p_content_type
    AND created_at < NOW() - (p_days_old || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE embeddings IS 'Vector embeddings for semantic search on user content';
COMMENT ON FUNCTION search_embeddings IS 'Search for similar content using cosine similarity';
COMMENT ON FUNCTION search_embeddings_batch IS 'Batch similarity search for multiple queries';
COMMENT ON FUNCTION get_embedding_stats IS 'Get statistics about user embeddings';
COMMENT ON FUNCTION cleanup_old_embeddings IS 'Remove old embeddings for maintenance';
