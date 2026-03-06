-- Triggers.
--
-- Trigger chain on session end:
--   1. sessions.ended_at set (NULL → non-NULL)
--   2. sessions_on_end fires → compute_session_summary → sets status = 'completed'
--   3. sessions_after_complete fires → update_personal_bests (sees final summary)
--
-- Split PBs fire immediately on each session_splits INSERT.
--
-- Each trigger is dropped before creation so this migration is idempotent.
-- PostgreSQL 14 added CREATE OR REPLACE TRIGGER but Supabase may already seed
-- certain trigger names (e.g. on_auth_user_created), so DROP IF EXISTS is safest.

-- ─── profiles ─────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS on_auth_user_created    ON auth.users;
DROP TRIGGER IF EXISTS profiles_updated_at     ON public.profiles;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ─── sessions ─────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS sessions_updated_at     ON public.sessions;
DROP TRIGGER IF EXISTS sessions_on_end         ON public.sessions;
DROP TRIGGER IF EXISTS sessions_after_complete ON public.sessions;

CREATE TRIGGER sessions_updated_at
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Fire when ended_at transitions from NULL → non-NULL.
-- Calls compute_session_summary which aggregates telemetry and sets status = 'completed'.
CREATE TRIGGER sessions_on_end
  AFTER UPDATE OF ended_at ON public.sessions
  FOR EACH ROW
  WHEN (OLD.ended_at IS NULL AND NEW.ended_at IS NOT NULL)
  EXECUTE FUNCTION public.trigger_compute_session_summary();

-- Fire when status becomes 'completed' (set by compute_session_summary above).
-- Calls update_personal_bests which has access to the fully-computed summary columns.
CREATE TRIGGER sessions_after_complete
  AFTER UPDATE OF status ON public.sessions
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION public.update_personal_bests();

-- ─── session_splits ───────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS session_splits_after_insert ON public.session_splits;

-- Fire after each 500m split is recorded; updates split-level PBs immediately.
CREATE TRIGGER session_splits_after_insert
  AFTER INSERT ON public.session_splits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_personal_bests();
