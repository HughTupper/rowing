// Typed query helpers for the rowing app.
// Each function accepts a SupabaseClient so callers can pass browser or server clients.

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CompletedSession,
  PersonalBestRow,
  SessionRow,
  SplitInsert,
  SplitRow,
  TelemetryInsert,
  TelemetryRow,
} from "./types";

// ─── Sessions ─────────────────────────────────────────────────────────────────

export async function createSession(
  db: SupabaseClient,
  userId: string,
  deviceName: string | null
): Promise<{ data: { id: string } | null; error: Error | null }> {
  const { data, error } = await db
    .from("sessions")
    .insert({ user_id: userId, device_name: deviceName })
    .select("id")
    .single();

  return { data, error: error as Error | null };
}

export async function endSession(
  db: SupabaseClient,
  sessionId: string
): Promise<{ error: Error | null }> {
  const { error } = await db
    .from("sessions")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", sessionId);

  return { error: error as Error | null };
}

export async function getSessionHistory(
  db: SupabaseClient,
  limit = 20
): Promise<{ data: CompletedSession[] | null; error: Error | null }> {
  const { data, error } = await db
    .from("sessions")
    .select("*")
    .eq("status", "completed")
    .order("started_at", { ascending: false })
    .limit(limit);

  return { data: data as CompletedSession[] | null, error: error as Error | null };
}

export async function getSession(
  db: SupabaseClient,
  sessionId: string
): Promise<{ data: SessionRow | null; error: Error | null }> {
  const { data, error } = await db
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  return { data: data as SessionRow | null, error: error as Error | null };
}

// ─── Telemetry ────────────────────────────────────────────────────────────────

/**
 * Upserts a telemetry row. Idempotent: safe to call even on BLE retries.
 * The UNIQUE constraint on (session_id, elapsed_time_s) makes this safe.
 */
export async function upsertTelemetry(
  db: SupabaseClient,
  row: TelemetryInsert
): Promise<{ error: Error | null }> {
  const { error } = await db
    .from("session_telemetry")
    .upsert(row, { onConflict: "session_id,elapsed_time_s" });

  return { error: error as Error | null };
}

// ─── Splits ───────────────────────────────────────────────────────────────────

export async function insertSplit(
  db: SupabaseClient,
  row: SplitInsert
): Promise<{ error: Error | null }> {
  const { error } = await db.from("session_splits").insert(row);
  return { error: error as Error | null };
}

export async function getSessionSplits(
  db: SupabaseClient,
  sessionId: string
): Promise<{ data: SplitRow[] | null; error: Error | null }> {
  const { data, error } = await db
    .from("session_splits")
    .select("*")
    .eq("session_id", sessionId)
    .order("split_number", { ascending: true });

  return { data: data as SplitRow[] | null, error: error as Error | null };
}

// ─── Personal bests ───────────────────────────────────────────────────────────

export async function getPersonalBests(
  db: SupabaseClient
): Promise<{ data: PersonalBestRow[] | null; error: Error | null }> {
  const { data, error } = await db
    .from("personal_bests")
    .select("*")
    .order("metric", { ascending: true });

  return { data: data as PersonalBestRow[] | null, error: error as Error | null };
}

// ─── Ghost race RPCs ──────────────────────────────────────────────────────────

/**
 * Returns the telemetry row nearest to the given elapsed time (seconds).
 * Calls the get_ghost_position SQL function via Supabase RPC.
 */
export async function getGhostPosition(
  db: SupabaseClient,
  sessionId: string,
  elapsedTime: number
): Promise<{ data: TelemetryRow | null; error: Error | null }> {
  const { data, error } = await db.rpc("get_ghost_position", {
    p_session_id: sessionId,
    p_elapsed_time: elapsedTime,
  });

  const row = Array.isArray(data) ? (data[0] as TelemetryRow | undefined) ?? null : null;
  return { data: row, error: error as Error | null };
}

/**
 * Returns the telemetry row nearest to the given distance (metres).
 * Calls the get_ghost_position_at_distance SQL function via Supabase RPC.
 */
export async function getGhostPositionAtDistance(
  db: SupabaseClient,
  sessionId: string,
  distanceM: number
): Promise<{ data: TelemetryRow | null; error: Error | null }> {
  const { data, error } = await db.rpc("get_ghost_position_at_distance", {
    p_session_id: sessionId,
    p_distance_m: distanceM,
  });

  const row = Array.isArray(data) ? (data[0] as TelemetryRow | undefined) ?? null : null;
  return { data: row, error: error as Error | null };
}
