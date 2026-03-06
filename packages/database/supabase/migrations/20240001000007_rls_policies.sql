-- Row Level Security policies.
--
-- All tables use the same core pattern: user_id = auth.uid()
-- Tables with denormalised user_id (session_telemetry, session_splits) benefit
-- from a direct index lookup rather than a correlated subquery to sessions.
--
-- personal_bests and session_embeddings have SELECT-only policies from the
-- client — writes are done by SECURITY DEFINER functions that bypass RLS.

-- ─── Enable RLS on all tables ─────────────────────────────────────────────────

ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_splits    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_bests    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_embeddings ENABLE ROW LEVEL SECURITY;

-- ─── profiles ─────────────────────────────────────────────────────────────────

CREATE POLICY "profiles: select own"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "profiles: insert own"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles: update own"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- No DELETE policy — profile deletion cascades from auth.users deletion.

-- ─── sessions ─────────────────────────────────────────────────────────────────

CREATE POLICY "sessions: select own"
  ON public.sessions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "sessions: insert own"
  ON public.sessions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "sessions: update own"
  ON public.sessions FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "sessions: delete own"
  ON public.sessions FOR DELETE
  USING (user_id = auth.uid());

-- ─── session_telemetry ────────────────────────────────────────────────────────

CREATE POLICY "session_telemetry: select own"
  ON public.session_telemetry FOR SELECT
  USING (user_id = auth.uid());

-- Append-only from the client: INSERT is allowed, UPDATE and DELETE are not.
-- Deletes happen only via CASCADE when the parent session is deleted.
CREATE POLICY "session_telemetry: insert own"
  ON public.session_telemetry FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ─── session_splits ───────────────────────────────────────────────────────────

CREATE POLICY "session_splits: select own"
  ON public.session_splits FOR SELECT
  USING (user_id = auth.uid());

-- Append-only from the client.
CREATE POLICY "session_splits: insert own"
  ON public.session_splits FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ─── personal_bests ───────────────────────────────────────────────────────────

-- Read-only from the client. Writes are performed by the SECURITY DEFINER
-- update_personal_bests() trigger function, which runs as the postgres superuser
-- and bypasses RLS entirely.
CREATE POLICY "personal_bests: select own"
  ON public.personal_bests FOR SELECT
  USING (user_id = auth.uid());

-- ─── session_embeddings ───────────────────────────────────────────────────────

-- Read-only from the client. Writes come from Edge Functions using the
-- service_role key, which bypasses RLS.
CREATE POLICY "session_embeddings: select own"
  ON public.session_embeddings FOR SELECT
  USING (user_id = auth.uid());
