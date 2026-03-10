-- =============================================================================
-- Migration: AI Integration Tables (March 11, 2026)
--
-- Adds tables needed by the new AI integration modules:
--   1. document_embeddings — pgvector RAG with 1536-dim embeddings (rag-engine.ts)
--   2. ai_conversations — normalized conversation persistence (conversation-store.ts)
--   3. ai_messages — individual message rows (conversation-store.ts)
--   4. conversation_summaries — cross-conversation memory (multi-turn-memory.ts)
--   5. search_document_embeddings() — vector similarity search RPC
--
-- Existing tables leveraged (NOT recreated):
--   - ai_insights (from 20260309_sprint_comprehensive.sql) → proactive-insights.ts
--   - abc_entries → ai-data-extractor.ts, proactive-insights.ts
--   - care_plan_goals, care_plan_action_items → ai-care-plan-generator.ts
--   - adaptive_difficulty → proactive-insights.ts
--   - conversations (JSON-blob version) → left intact for backward compat
--   - embeddings (512-dim version from earlier) → left intact for rag-service.ts
-- =============================================================================


-- ============================================
-- 0. ENABLE PGVECTOR EXTENSION
-- ============================================

CREATE EXTENSION IF NOT EXISTS vector;


-- ============================================
-- 1. DOCUMENT EMBEDDINGS (RAG Engine - 1536 dims)
-- ============================================

CREATE TABLE IF NOT EXISTS document_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id TEXT, -- Reference to source document (vault, conversation, etc.)
  chunk_index INT NOT NULL DEFAULT 0,
  content TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own embeddings" ON document_embeddings
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert own embeddings" ON document_embeddings
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own embeddings" ON document_embeddings
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Service role full access embeddings" ON document_embeddings
  FOR ALL TO service_role USING (true);

-- Indexes for efficient search
CREATE INDEX IF NOT EXISTS idx_doc_embeddings_user ON document_embeddings(user_id);
CREATE INDEX IF NOT EXISTS idx_doc_embeddings_document ON document_embeddings(document_id);

-- IVFFlat index for fast approximate nearest-neighbor search
-- Lists = sqrt(expected_rows); start with 100, tune as data grows
CREATE INDEX IF NOT EXISTS idx_doc_embeddings_vector
  ON document_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);


-- ============================================
-- 2. AI CONVERSATIONS (Normalized)
-- ============================================

CREATE TABLE IF NOT EXISTS ai_conversations (
  id TEXT PRIMARY KEY, -- Client-generated: "conv-{timestamp}-{rand}"
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID REFERENCES children(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  summary TEXT,
  message_count INT NOT NULL DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ai_conversations" ON ai_conversations
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can create ai_conversations" ON ai_conversations
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own ai_conversations" ON ai_conversations
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can delete own ai_conversations" ON ai_conversations
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_ai_conv_user ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conv_child ON ai_conversations(child_id);
CREATE INDEX IF NOT EXISTS idx_ai_conv_last_msg ON ai_conversations(last_message_at DESC);


-- ============================================
-- 3. AI MESSAGES (One row per message)
-- ============================================

CREATE TABLE IF NOT EXISTS ai_messages (
  id TEXT PRIMARY KEY, -- Client-generated: "msg-{timestamp}-{rand}"
  conversation_id TEXT NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;

-- RLS via join to ai_conversations for user ownership
CREATE POLICY "Users can view own ai_messages" ON ai_messages
  FOR SELECT TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM ai_conversations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own ai_messages" ON ai_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM ai_conversations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own ai_messages" ON ai_messages
  FOR DELETE TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM ai_conversations WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_ai_msg_conv ON ai_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_msg_created ON ai_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_msg_role ON ai_messages(role);


-- ============================================
-- 4. CONVERSATION SUMMARIES (Multi-Turn Memory)
-- ============================================

CREATE TABLE IF NOT EXISTS conversation_summaries (
  id TEXT PRIMARY KEY, -- Client-generated: "summary-{timestamp}-{rand}"
  conversation_id TEXT UNIQUE, -- One summary per conversation
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID REFERENCES children(id) ON DELETE SET NULL,
  summary TEXT NOT NULL,
  key_topics TEXT[] DEFAULT '{}',
  emotional_tone TEXT CHECK (emotional_tone IN ('positive', 'neutral', 'concerned', 'crisis')),
  action_items TEXT[] DEFAULT '{}',
  strategies_mentioned TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE conversation_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own summaries" ON conversation_summaries
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert own summaries" ON conversation_summaries
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own summaries" ON conversation_summaries
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_conv_summaries_user ON conversation_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_summaries_child ON conversation_summaries(child_id);
CREATE INDEX IF NOT EXISTS idx_conv_summaries_created ON conversation_summaries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_summaries_conv ON conversation_summaries(conversation_id);


-- ============================================
-- 5. VECTOR SEARCH RPC (RAG Engine)
-- ============================================

-- Search for semantically similar document chunks
-- Called by rag-engine.ts EmbeddingService.searchSimilar()
CREATE OR REPLACE FUNCTION search_document_embeddings(
  p_user_id UUID,
  p_query_embedding vector(1536),
  p_match_threshold FLOAT DEFAULT 0.6,
  p_match_count INT DEFAULT 5,
  p_document_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  document_id TEXT,
  chunk_index INT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    de.id,
    de.document_id,
    de.chunk_index,
    de.content,
    de.metadata,
    1 - (de.embedding <=> p_query_embedding) AS similarity
  FROM document_embeddings de
  WHERE de.user_id = p_user_id
    AND 1 - (de.embedding <=> p_query_embedding) > p_match_threshold
    AND (p_document_id IS NULL OR de.document_id = p_document_id)
  ORDER BY de.embedding <=> p_query_embedding
  LIMIT p_match_count;
END;
$$;


-- ============================================
-- 6. UPDATE TRIGGERS
-- ============================================

-- ai_conversations updated_at trigger
DROP TRIGGER IF EXISTS ai_conversations_updated ON ai_conversations;
CREATE TRIGGER ai_conversations_updated
  BEFORE UPDATE ON ai_conversations
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();


-- ============================================
-- 7. ADD source + confidence COLUMNS TO abc_entries
-- (needed by ai-data-extractor.ts for marking AI-extracted entries)
-- ============================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'abc_entries' AND schemaname = 'public') THEN
    -- Add source column if not exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'abc_entries' AND column_name = 'source'
    ) THEN
      ALTER TABLE abc_entries ADD COLUMN source TEXT DEFAULT 'manual';
    END IF;

    -- Add confidence column if not exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'abc_entries' AND column_name = 'confidence'
    ) THEN
      ALTER TABLE abc_entries ADD COLUMN confidence FLOAT;
    END IF;
  END IF;
END $$;


-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE document_embeddings IS 'pgvector RAG embeddings (1536-dim) for semantic search over user content';
COMMENT ON TABLE ai_conversations IS 'Normalized conversation persistence — one row per conversation (replaces JSON-blob approach)';
COMMENT ON TABLE ai_messages IS 'Individual messages within ai_conversations — enables per-message querying and indexing';
COMMENT ON TABLE conversation_summaries IS 'AI-generated conversation summaries for cross-conversation memory';
COMMENT ON FUNCTION search_document_embeddings IS 'pgvector cosine similarity search for RAG retrieval';
