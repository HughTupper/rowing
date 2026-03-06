-- Session embeddings: pgvector storage for AI-powered session similarity search.
--
-- Schema-only for now. Embedding generation will be added later via a Supabase
-- Edge Function that calls the OpenAI embeddings API (or Supabase's hosted
-- gte-small model) after a session is completed.
--
-- Embedding dimension: 1536 (OpenAI text-embedding-3-small).
-- To switch model:
--   ALTER TABLE public.session_embeddings
--   ALTER COLUMN embedding TYPE vector(N);
--   DROP INDEX session_embeddings_hnsw_idx;
--   CREATE INDEX ... USING hnsw ...
--
-- HNSW index parameters:
--   m = 16          — connections per node (higher = better recall, more memory)
--   ef_construction = 64  — build-time search width (higher = better quality, slower build)
-- These are sensible defaults for a personal fitness dataset (< 10 000 sessions).
--
-- The embedding will encode a structured text representation of the session:
--   "Distance: 5000m  Duration: 25min  Avg pace: 2:30/500m  Avg power: 180W
--    Best split: 2:15 (split 3)  Resistance: 3"
-- This allows natural language similarity queries like:
--   "Find sessions similar to this one"
--   "Show me all marathon-pace sessions"

CREATE TABLE public.session_embeddings (
  id          BIGSERIAL   PRIMARY KEY,
  session_id  UUID        NOT NULL UNIQUE REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  embedding   vector(1536),
  model_name  TEXT,       -- e.g. 'text-embedding-3-small'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX session_embeddings_user_id_idx
  ON public.session_embeddings (user_id);

-- HNSW index for approximate nearest-neighbour cosine similarity search.
-- Cosine is the correct metric for normalised embeddings.
CREATE INDEX session_embeddings_hnsw_idx
  ON public.session_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
