-- PL/pgSQL helper functions.
--
-- compute_session_summary   — aggregates telemetry into session summary columns
-- trigger_compute_session_summary — trigger wrapper (triggers can't call functions with args)
-- get_ghost_position        — RPC: telemetry row nearest to a given elapsed time
-- get_ghost_position_at_distance — RPC: telemetry row nearest to a given distance
-- update_personal_bests     — trigger function: upserts PBs after split/session completion

-- ─── compute_session_summary ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.compute_session_summary(p_session_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_first_elapsed  INT4;
  v_last_elapsed   INT4;
  v_total_distance INT4;
  v_total_strokes  INT4;
  v_avg_pace       INT4;
  v_avg_power      INT4;
  v_max_power      INT4;
  v_avg_rate       NUMERIC(4,1);
  v_total_energy   INT4;
  v_avg_hr         INT4;
  v_duration       INT4;
BEGIN
  -- Aggregate from telemetry, filtering FTMS invalid values (65535 = not available sentinel)
  SELECT
    MIN(elapsed_time_s),
    MAX(elapsed_time_s),
    MAX(total_distance_m),
    MAX(stroke_count),
    AVG(NULLIF(instant_pace_s500m, 65535))::INT4,
    AVG(NULLIF(instant_power_w, 0))::INT4,
    MAX(NULLIF(instant_power_w, 0)),
    AVG(NULLIF(stroke_rate_spm, 0))::NUMERIC(4,1),
    MAX(total_energy_kcal),
    AVG(NULLIF(heart_rate_bpm, 0))::INT4
  INTO
    v_first_elapsed,
    v_last_elapsed,
    v_total_distance,
    v_total_strokes,
    v_avg_pace,
    v_avg_power,
    v_max_power,
    v_avg_rate,
    v_total_energy,
    v_avg_hr
  FROM public.session_telemetry
  WHERE session_id = p_session_id;

  v_duration := COALESCE(v_last_elapsed - v_first_elapsed, 0);

  UPDATE public.sessions
  SET
    total_distance_m  = v_total_distance,
    duration_seconds  = v_duration,
    total_strokes     = v_total_strokes,
    avg_pace_s500m    = v_avg_pace,
    avg_power_watts   = v_avg_power,
    max_power_watts   = v_max_power,
    avg_stroke_rate   = v_avg_rate,
    total_energy_kcal = v_total_energy,
    avg_heart_rate    = v_avg_hr,
    status            = 'completed'
  WHERE id = p_session_id;
END;
$$;

-- ─── trigger_compute_session_summary ──────────────────────────────────────────

-- Trigger functions cannot receive arguments, so this wrapper calls the above.
CREATE OR REPLACE FUNCTION public.trigger_compute_session_summary()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.compute_session_summary(NEW.id);
  RETURN NEW;
END;
$$;

-- ─── get_ghost_position ───────────────────────────────────────────────────────

-- Returns the telemetry row with elapsed_time_s closest to p_elapsed_time.
-- Uses the UNIQUE index on (session_id, elapsed_time_s) for an efficient range scan.
CREATE OR REPLACE FUNCTION public.get_ghost_position(
  p_session_id  UUID,
  p_elapsed_time INT4
)
RETURNS SETOF public.session_telemetry
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM (
    (
      SELECT * FROM public.session_telemetry
      WHERE session_id = p_session_id
        AND elapsed_time_s <= p_elapsed_time
      ORDER BY elapsed_time_s DESC
      LIMIT 1
    )
    UNION ALL
    (
      SELECT * FROM public.session_telemetry
      WHERE session_id = p_session_id
        AND elapsed_time_s > p_elapsed_time
      ORDER BY elapsed_time_s ASC
      LIMIT 1
    )
  ) candidates
  ORDER BY ABS(elapsed_time_s - p_elapsed_time)
  LIMIT 1;
$$;

-- ─── get_ghost_position_at_distance ───────────────────────────────────────────

-- Returns the telemetry row with total_distance_m closest to p_distance_m.
-- Uses the partial index on (session_id, total_distance_m).
CREATE OR REPLACE FUNCTION public.get_ghost_position_at_distance(
  p_session_id UUID,
  p_distance_m INT4
)
RETURNS SETOF public.session_telemetry
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM (
    (
      SELECT * FROM public.session_telemetry
      WHERE session_id = p_session_id
        AND total_distance_m IS NOT NULL
        AND total_distance_m <= p_distance_m
      ORDER BY total_distance_m DESC
      LIMIT 1
    )
    UNION ALL
    (
      SELECT * FROM public.session_telemetry
      WHERE session_id = p_session_id
        AND total_distance_m IS NOT NULL
        AND total_distance_m > p_distance_m
      ORDER BY total_distance_m ASC
      LIMIT 1
    )
  ) candidates
  ORDER BY ABS(total_distance_m - p_distance_m)
  LIMIT 1;
$$;

-- ─── update_personal_bests ────────────────────────────────────────────────────

-- Upserts personal_bests rows after a split insert or session completion.
-- All variables declared at the top (PostgreSQL does not support nested DECLARE blocks).
-- Called by two triggers; idempotent via INSERT ... ON CONFLICT DO UPDATE.
CREATE OR REPLACE FUNCTION public.update_personal_bests()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id   UUID;
  v_user_id      UUID;
  v_session      public.sessions%ROWTYPE;
  v_metric       TEXT;
  v_value        INT4;
  v_dist         INT4;
  v_time         INT4;
  -- Fixed distance targets: (distance_m, metric_name) pairs
  v_distances    INT4[]  := ARRAY[500, 1000, 2000, 5000, 10000, 21097, 42195];
  v_dist_metrics TEXT[]  := ARRAY[
    'best_500m_time_s', 'best_1000m_time_s', 'best_2000m_time_s',
    'best_5000m_time_s', 'best_10000m_time_s',
    'best_half_marathon_time_s', 'best_marathon_time_s'
  ];
  v_idx          INT4;
BEGIN
  -- Determine session_id and user_id depending on the calling trigger table
  IF TG_TABLE_NAME = 'session_splits' THEN
    v_session_id := NEW.session_id;
    v_user_id    := NEW.user_id;

    -- Best 500m split pace (duration_seconds of a single 500m split)
    v_metric := 'best_500m_split_s';
    v_value  := NEW.duration_seconds;
    INSERT INTO public.personal_bests (user_id, metric, value, session_id, achieved_at)
    VALUES (v_user_id, v_metric, v_value, v_session_id, NOW())
    ON CONFLICT (user_id, metric) DO UPDATE
      SET value      = EXCLUDED.value,
          session_id = EXCLUDED.session_id,
          achieved_at = EXCLUDED.achieved_at,
          updated_at  = NOW()
      WHERE EXCLUDED.value < personal_bests.value;

    -- Best average power in a 500m split
    v_metric := 'best_split_avg_power_w';
    v_value  := NEW.avg_power_w;
    INSERT INTO public.personal_bests (user_id, metric, value, session_id, achieved_at)
    VALUES (v_user_id, v_metric, v_value, v_session_id, NOW())
    ON CONFLICT (user_id, metric) DO UPDATE
      SET value      = EXCLUDED.value,
          session_id = EXCLUDED.session_id,
          achieved_at = EXCLUDED.achieved_at,
          updated_at  = NOW()
      WHERE EXCLUDED.value > personal_bests.value;

  ELSIF TG_TABLE_NAME = 'sessions' THEN
    v_session_id := NEW.id;
    v_user_id    := NEW.user_id;
    v_session    := NEW;

    -- Longest distance
    IF v_session.total_distance_m IS NOT NULL THEN
      INSERT INTO public.personal_bests (user_id, metric, value, session_id, achieved_at)
      VALUES (v_user_id, 'longest_distance_m', v_session.total_distance_m, v_session_id, NOW())
      ON CONFLICT (user_id, metric) DO UPDATE
        SET value      = EXCLUDED.value,
            session_id = EXCLUDED.session_id,
            achieved_at = EXCLUDED.achieved_at,
            updated_at  = NOW()
        WHERE EXCLUDED.value > personal_bests.value;
    END IF;

    -- Best average power across a full session
    IF v_session.avg_power_watts IS NOT NULL THEN
      INSERT INTO public.personal_bests (user_id, metric, value, session_id, achieved_at)
      VALUES (v_user_id, 'best_avg_power_w', v_session.avg_power_watts, v_session_id, NOW())
      ON CONFLICT (user_id, metric) DO UPDATE
        SET value      = EXCLUDED.value,
            session_id = EXCLUDED.session_id,
            achieved_at = EXCLUDED.achieved_at,
            updated_at  = NOW()
        WHERE EXCLUDED.value > personal_bests.value;
    END IF;

    -- Fixed-distance time PBs: find elapsed_time_s when total_distance_m first crossed each target
    FOR v_idx IN 1 .. array_length(v_distances, 1) LOOP
      v_dist   := v_distances[v_idx];
      v_metric := v_dist_metrics[v_idx];

      -- Only attempt if the session covered this distance
      IF COALESCE(v_session.total_distance_m, 0) >= v_dist THEN
        SELECT elapsed_time_s
        INTO   v_time
        FROM   public.session_telemetry
        WHERE  session_id       = v_session_id
          AND  total_distance_m >= v_dist
        ORDER BY total_distance_m ASC, elapsed_time_s ASC
        LIMIT 1;

        IF FOUND AND v_time IS NOT NULL THEN
          INSERT INTO public.personal_bests (user_id, metric, value, session_id, achieved_at)
          VALUES (v_user_id, v_metric, v_time, v_session_id, NOW())
          ON CONFLICT (user_id, metric) DO UPDATE
            SET value      = EXCLUDED.value,
                session_id = EXCLUDED.session_id,
                achieved_at = EXCLUDED.achieved_at,
                updated_at  = NOW()
            WHERE EXCLUDED.value < personal_bests.value;
        END IF;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;
