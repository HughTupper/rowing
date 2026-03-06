-- Session telemetry: one row per second per active session.
--
-- Streamed live from the browser via Supabase Realtime INSERT.
-- Upserted (not inserted) by the client so that BLE reconnects and
-- browser retries are idempotent.
--
-- Design notes:
--   elapsed_time_s: uses the device's own FTMS elapsed counter (not wall clock).
--     This makes ghost-race comparisons immune to reconnects, pauses, and tab
--     backgrounding — two sessions are directly comparable at elapsed_time_s = 300
--     regardless of when they were recorded.
--
--   user_id denormalisation: RLS checks "user_id = auth.uid()" on every row read.
--     Without user_id here, each check would need a correlated subquery to sessions.
--     With user_id directly on this table, it is a single index lookup.
--
--   INT2 for watt / bpm columns: valid rowing power is 0–3000 W max, heart rate
--     0–255 bpm — both fit INT2 (max 32767) and save 2 bytes per row. Over
--     14 400 rows for a marathon session, that matters.
--
--   instant_pace_s500m = 65535: FTMS "not available" sentinel. Filtered out by
--     compute_session_summary() and ghost query functions.

CREATE TABLE public.session_telemetry (
  id                  BIGSERIAL   PRIMARY KEY,
  session_id          UUID        NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Time axis (primary ghost-race key)
  elapsed_time_s      INT4        NOT NULL,
  recorded_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Distance
  total_distance_m    INT4,

  -- Pace
  instant_pace_s500m  INT4,       -- seconds / 500 m; 65535 = FTMS invalid
  avg_pace_s500m      INT4,

  -- Power
  instant_power_w     INT2,
  avg_power_w         INT2,

  -- Stroke
  stroke_rate_spm     NUMERIC(4, 1),
  avg_stroke_rate_spm NUMERIC(4, 1),
  stroke_count        INT4,

  -- Other FTMS fields
  resistance_level    INT2,
  total_energy_kcal   INT4,
  heart_rate_bpm      INT2,
  met                 NUMERIC(4, 1),  -- metabolic equivalent (/10 from raw)
  remaining_time_s    INT4
);

-- Primary ghost-race index: "at elapsed time T in session S, what was my position?"
-- UNIQUE enforces idempotency for upserts.
CREATE UNIQUE INDEX telemetry_session_elapsed_idx
  ON public.session_telemetry (session_id, elapsed_time_s);

-- Secondary ghost-race index: "at distance D in session S, what was my pace/power?"
-- Partial index excludes NULL rows to keep it lean.
CREATE INDEX telemetry_session_distance_idx
  ON public.session_telemetry (session_id, total_distance_m)
  WHERE total_distance_m IS NOT NULL;

-- RLS lookup index (user_id = auth.uid())
CREATE INDEX telemetry_user_id_idx
  ON public.session_telemetry (user_id);
