-- Sessions table: one row per rowing session.
--
-- A row is created when the user connects their rower (status = 'active').
-- Summary columns (total_distance_m, avg_pace_s500m, etc.) are NULL while active
-- and are populated by the compute_session_summary() trigger function when
-- ended_at is set.
--
-- Design notes:
--   - status is TEXT with CHECK (not ENUM) so new values can be added without
--     requiring ALTER TYPE and an exclusive table lock.
--   - avg_pace_s500m stores seconds-per-500m; the FTMS device invalid sentinel
--     (65535) is filtered out by compute_session_summary().

CREATE TABLE public.sessions (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Lifecycle
  started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at          TIMESTAMPTZ,          -- NULL while active; setting this fires the summary trigger
  status            TEXT        NOT NULL  DEFAULT 'active'
                    CHECK (status IN ('active', 'completed', 'abandoned')),
  device_name       TEXT,

  -- Summary columns — populated by trigger when ended_at is set
  total_distance_m  INT4,
  duration_seconds  INT4,
  total_strokes     INT4,
  avg_pace_s500m    INT4,                 -- seconds / 500 m
  avg_power_watts   INT4,
  max_power_watts   INT4,
  avg_stroke_rate   NUMERIC(4, 1),
  total_energy_kcal INT4,
  avg_heart_rate    INT4,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast history queries: "show me my last N sessions"
CREATE INDEX sessions_user_started_idx
  ON public.sessions (user_id, started_at DESC);

-- Filter active sessions (e.g. to prevent duplicate active sessions)
CREATE INDEX sessions_user_status_idx
  ON public.sessions (user_id, status)
  WHERE status = 'active';

CREATE TRIGGER sessions_updated_at
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
