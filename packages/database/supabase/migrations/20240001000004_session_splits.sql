-- Session splits: one row per completed 500 m segment within a session.
--
-- Inserted by the client hook when checkSplitBoundary() returns a completed split.
-- Triggers update_personal_bests() after each INSERT.
-- The UNIQUE constraint on (session_id, split_number) prevents duplicate splits
-- from BLE reconnects.

CREATE TABLE public.session_splits (
  id                  BIGSERIAL    PRIMARY KEY,
  session_id          UUID         NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id             UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  split_number        INT2         NOT NULL,   -- 1-based (split 1 = 0→500 m)
  duration_seconds    INT4         NOT NULL,   -- time taken to row this 500 m
  stroke_count        INT4         NOT NULL,   -- strokes during this 500 m
  avg_power_w         INT2         NOT NULL,   -- mean instantPower during this 500 m
  avg_stroke_rate_spm NUMERIC(4,1) NOT NULL,   -- mean strokeRate during this 500 m

  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  UNIQUE (session_id, split_number)
);

CREATE INDEX session_splits_user_id_idx
  ON public.session_splits (user_id);

CREATE INDEX session_splits_session_id_idx
  ON public.session_splits (session_id, split_number);
