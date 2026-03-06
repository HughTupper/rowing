-- Personal bests: one row per user per metric.
--
-- NEVER written by client code. Managed exclusively by the update_personal_bests()
-- SECURITY DEFINER trigger function (which bypasses RLS). Clients can only SELECT.
--
-- The UNIQUE (user_id, metric) constraint makes upserts a single atomic operation:
--   INSERT ... ON CONFLICT (user_id, metric) DO UPDATE WHERE EXCLUDED.value < current
--
-- Supported metric values (enforced in TypeScript, not in SQL for flexibility):
--   best_500m_split_s         — fastest single 500 m split (duration_seconds, lower = better)
--   best_split_avg_power_w    — highest avg power in a single split (higher = better)
--   longest_distance_m        — farthest total distance in one session (higher = better)
--   best_avg_power_w          — highest session avg_power_watts (higher = better)
--   best_500m_time_s          — fastest elapsed_time to reach 500 m (lower = better)
--   best_1000m_time_s         — fastest elapsed_time to reach 1000 m
--   best_2000m_time_s         — fastest elapsed_time to reach 2000 m
--   best_5000m_time_s         — fastest elapsed_time to reach 5000 m
--   best_10000m_time_s        — fastest elapsed_time to reach 10000 m
--   best_half_marathon_time_s — fastest elapsed_time to reach 21097 m
--   best_marathon_time_s      — fastest elapsed_time to reach 42195 m
--
-- All numeric values are INT4:
--   times    → seconds (fits INT4 easily; a marathon under 3 h = ~10 800 s)
--   distances → metres
--   power    → watts

CREATE TABLE public.personal_bests (
  id          BIGSERIAL   PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric      TEXT        NOT NULL,
  value       INT4        NOT NULL,
  session_id  UUID        REFERENCES public.sessions(id) ON DELETE SET NULL,
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (user_id, metric)
);

CREATE INDEX personal_bests_user_id_idx
  ON public.personal_bests (user_id);
