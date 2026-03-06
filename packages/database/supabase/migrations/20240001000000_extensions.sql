-- Enable extensions used across all migrations.
-- uuid-ossp: gen_random_uuid() is already available in PG14+, but this
--   extension provides uuid_generate_v4() as an alias many tools expect.
-- vector: pgvector extension for AI embedding storage and similarity search.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;
