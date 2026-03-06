// Database types for the rowing app Supabase schema.
//
// These are hand-written to match the migration files.
// Replace with generated types by running:
//   supabase gen types typescript --local > src/generated.ts
// and then re-exporting from there instead.

// ─── Personal best metric names ───────────────────────────────────────────────

export type PersonalBestMetric =
  | "best_500m_split_s"
  | "best_split_avg_power_w"
  | "longest_distance_m"
  | "best_avg_power_w"
  | "best_500m_time_s"
  | "best_1000m_time_s"
  | "best_2000m_time_s"
  | "best_5000m_time_s"
  | "best_10000m_time_s"
  | "best_half_marathon_time_s"
  | "best_marathon_time_s";

export type SessionStatus = "active" | "completed" | "abandoned";

// ─── Raw row types (mirror DB columns exactly) ────────────────────────────────

export interface ProfileRow {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface SessionRow {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  status: SessionStatus;
  device_name: string | null;
  total_distance_m: number | null;
  duration_seconds: number | null;
  total_strokes: number | null;
  avg_pace_s500m: number | null;
  avg_power_watts: number | null;
  max_power_watts: number | null;
  avg_stroke_rate: number | null;
  total_energy_kcal: number | null;
  avg_heart_rate: number | null;
  updated_at: string;
}

/** A session that has been ended and had its summary computed. */
export interface CompletedSession extends SessionRow {
  ended_at: string;
  status: "completed";
  total_distance_m: number;
  duration_seconds: number;
}

export interface TelemetryRow {
  id: number;
  session_id: string;
  user_id: string;
  elapsed_time_s: number;
  recorded_at: string;
  total_distance_m: number | null;
  instant_pace_s500m: number | null;
  avg_pace_s500m: number | null;
  instant_power_w: number | null;
  avg_power_w: number | null;
  stroke_rate_spm: number | null;
  avg_stroke_rate_spm: number | null;
  stroke_count: number | null;
  resistance_level: number | null;
  total_energy_kcal: number | null;
  heart_rate_bpm: number | null;
  met: number | null;
  remaining_time_s: number | null;
}

export interface SplitRow {
  id: number;
  session_id: string;
  user_id: string;
  split_number: number;
  duration_seconds: number;
  stroke_count: number;
  avg_power_w: number;
  avg_stroke_rate_spm: number;
  created_at: string;
}

export interface PersonalBestRow {
  id: number;
  user_id: string;
  metric: PersonalBestMetric;
  value: number;
  session_id: string | null;
  achieved_at: string;
  updated_at: string;
}

export interface SessionEmbeddingRow {
  id: number;
  session_id: string;
  user_id: string;
  embedding: number[] | null;
  model_name: string | null;
  created_at: string;
}

// ─── Insert types (omit server-generated fields) ──────────────────────────────

export type SessionInsert = Pick<
  SessionRow,
  "user_id" | "device_name"
>;

export type TelemetryInsert = Omit<TelemetryRow, "id" | "recorded_at">;

export type SplitInsert = Omit<SplitRow, "id" | "created_at">;

// ─── metricsToTelemetryInsert ─────────────────────────────────────────────────

// Import RowingMetrics type from the app — we do this by declaring the shape
// inline so the database package doesn't depend on the app package.
export interface RowingMetricsLike {
  elapsedTime?: number;
  totalDistance?: number;
  instantPace?: number;
  instantPower?: number;
  strokeRate?: number;
  strokeCount?: number;
  resistanceLevel?: number;
  totalEnergy?: number;
}

/**
 * Maps a RowingMetrics snapshot (from useRowingMachine) to a TelemetryInsert
 * row ready to upsert into session_telemetry.
 *
 * Returns null if elapsedTime is missing (required for the UNIQUE constraint).
 */
export function metricsToTelemetryInsert(
  sessionId: string,
  userId: string,
  metrics: RowingMetricsLike
): TelemetryInsert | null {
  if (metrics.elapsedTime == null) return null;

  return {
    session_id: sessionId,
    user_id: userId,
    elapsed_time_s: metrics.elapsedTime,
    total_distance_m: metrics.totalDistance ?? null,
    instant_pace_s500m: metrics.instantPace ?? null,
    avg_pace_s500m: null,
    instant_power_w: metrics.instantPower ?? null,
    avg_power_w: null,
    stroke_rate_spm: metrics.strokeRate ?? null,
    avg_stroke_rate_spm: null,
    stroke_count: metrics.strokeCount ?? null,
    resistance_level: metrics.resistanceLevel ?? null,
    total_energy_kcal: metrics.totalEnergy ?? null,
    heart_rate_bpm: null,
    met: null,
    remaining_time_s: null,
  };
}
