-- Migration 013: Phase 4 UX Polish
-- Chat history persistence, attachments, and voice input support
-- Created: 2026-01-26

-- ============================================
-- CHAT CONVERSATIONS TABLE
-- ============================================

-- Store conversation metadata
CREATE TABLE IF NOT EXISTS ai_chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT, -- Auto-generated from first message
  preview TEXT, -- First 100 chars of last message
  message_count INTEGER DEFAULT 0,
  child_id UUID REFERENCES children(id), -- Which child this conversation is about
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id ON ai_chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_updated ON ai_chat_conversations(updated_at DESC);

-- Enable RLS
ALTER TABLE ai_chat_conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies (idempotent)
DROP POLICY IF EXISTS "Users can view own conversations" ON ai_chat_conversations;
CREATE POLICY "Users can view own conversations"
  ON ai_chat_conversations FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own conversations" ON ai_chat_conversations;
CREATE POLICY "Users can create own conversations"
  ON ai_chat_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own conversations" ON ai_chat_conversations;
CREATE POLICY "Users can update own conversations"
  ON ai_chat_conversations FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own conversations" ON ai_chat_conversations;
CREATE POLICY "Users can delete own conversations"
  ON ai_chat_conversations FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- CHAT MESSAGES TABLE
-- ============================================

-- Store individual messages
CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES ai_chat_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb, -- [{type: 'image', url: '...', name: '...'}, ...]
  context_used BOOLEAN DEFAULT FALSE, -- Whether AI used memory context
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON ai_chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON ai_chat_messages(created_at);

-- Enable RLS
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can access messages through conversation ownership)
DROP POLICY IF EXISTS "Users can view messages in own conversations" ON ai_chat_messages;
CREATE POLICY "Users can view messages in own conversations"
  ON ai_chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ai_chat_conversations
      WHERE ai_chat_conversations.id = ai_chat_messages.conversation_id
      AND ai_chat_conversations.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can add messages to own conversations" ON ai_chat_messages;
CREATE POLICY "Users can add messages to own conversations"
  ON ai_chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ai_chat_conversations
      WHERE ai_chat_conversations.id = ai_chat_messages.conversation_id
      AND ai_chat_conversations.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete messages in own conversations" ON ai_chat_messages;
CREATE POLICY "Users can delete messages in own conversations"
  ON ai_chat_messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM ai_chat_conversations
      WHERE ai_chat_conversations.id = ai_chat_messages.conversation_id
      AND ai_chat_conversations.user_id = auth.uid()
    )
  );

-- ============================================
-- CHAT ATTACHMENTS TABLE
-- ============================================

-- Store uploaded file metadata
CREATE TABLE IF NOT EXISTS chat_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id UUID REFERENCES ai_chat_messages(id) ON DELETE SET NULL,
  file_type TEXT NOT NULL, -- 'image', 'pdf', 'document'
  file_url TEXT NOT NULL, -- Supabase Storage URL
  file_name TEXT,
  file_size INTEGER, -- bytes
  mime_type TEXT,
  thumbnail_url TEXT, -- For images
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_chat_attachments_user ON chat_attachments(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_attachments_message ON chat_attachments(message_id);

-- Enable RLS
ALTER TABLE chat_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own attachments" ON chat_attachments;
CREATE POLICY "Users can view own attachments"
  ON chat_attachments FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can upload attachments" ON chat_attachments;
CREATE POLICY "Users can upload attachments"
  ON chat_attachments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own attachments" ON chat_attachments;
CREATE POLICY "Users can delete own attachments"
  ON chat_attachments FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- VOICE INPUT LOGS (Optional - for analytics)
-- ============================================

CREATE TABLE IF NOT EXISTS voice_input_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  transcript_length INTEGER, -- Character count
  duration_ms INTEGER, -- How long recording lasted
  language TEXT DEFAULT 'en-US',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE voice_input_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own voice logs" ON voice_input_logs;
CREATE POLICY "Users can view own voice logs"
  ON voice_input_logs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own voice logs" ON voice_input_logs;
CREATE POLICY "Users can create own voice logs"
  ON voice_input_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- TRIGGER: Update conversation on new message
-- ============================================

-- Function to update conversation metadata when message added
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ai_chat_conversations
  SET
    message_count = (
      SELECT COUNT(*) FROM ai_chat_messages
      WHERE conversation_id = NEW.conversation_id
    ),
    preview = LEFT(NEW.content, 100),
    updated_at = NOW(),
    title = COALESCE(
      title,
      CASE
        WHEN NEW.role = 'user' THEN LEFT(NEW.content, 50)
        ELSE NULL
      END
    )
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger (idempotent)
DROP TRIGGER IF EXISTS trigger_update_conversation_on_message ON ai_chat_messages;
CREATE TRIGGER trigger_update_conversation_on_message
  AFTER INSERT ON ai_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_on_message();

-- ============================================
-- STORAGE BUCKET FOR CHAT ATTACHMENTS
-- ============================================

-- Note: Run this in Supabase dashboard or via API:
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('chat-attachments', 'chat-attachments', false)
-- ON CONFLICT (id) DO NOTHING;

-- Storage policy for chat attachments:
-- Users can only access their own uploads
-- CREATE POLICY "Users can upload chat attachments"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'chat-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users can view own chat attachments"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'chat-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================
-- ANALYTICS VIEW
-- ============================================

CREATE OR REPLACE VIEW chat_analytics AS
SELECT
  user_id,
  COUNT(DISTINCT c.id) as total_conversations,
  SUM(c.message_count) as total_messages,
  COUNT(DISTINCT a.id) as total_attachments,
  MAX(c.updated_at) as last_conversation_at
FROM ai_chat_conversations c
LEFT JOIN chat_attachments a ON a.user_id = c.user_id
GROUP BY user_id;

-- Grant access to the view
GRANT SELECT ON chat_analytics TO authenticated;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE ai_chat_conversations IS 'Stores AI chat conversation metadata for history feature';
COMMENT ON TABLE ai_chat_messages IS 'Stores individual messages within conversations';
COMMENT ON TABLE chat_attachments IS 'Stores file upload metadata for chat attachments';
COMMENT ON TABLE voice_input_logs IS 'Analytics for voice input usage';
