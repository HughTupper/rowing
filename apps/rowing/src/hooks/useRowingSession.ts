"use client";

import { useCallback, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  metricsToTelemetryInsert,
  insertSplit,
  upsertTelemetry,
  createSession,
  endSession,
} from "@repo/database";
import type { RowingMachineState } from "@/hooks/useRowingMachine";
import type { Split500m } from "@/lib/rowing";

/**
 * Wraps any RowingMachineState hook and layers DB persistence on top.
 * Forwards the same interface so existing UI components need no changes.
 *
 * Usage:
 *   const machine = useRowingMachine();           // or useSimulatedRowingMachine()
 *   const session = useRowingSession(machine);
 *   // use `session` exactly like `machine` — same shape
 */
export function useRowingSession(machine: RowingMachineState): RowingMachineState {
  const db = createClient();

  const sessionIdRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);

  // Fetch the current user once on mount
  useEffect(() => {
    db.auth.getUser().then(({ data }) => {
      userIdRef.current = data.user?.id ?? null;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Persist telemetry on every metrics change ──────────────────────────────

  const prevElapsedRef = useRef<number | null>(null);

  useEffect(() => {
    const sessionId = sessionIdRef.current;
    const userId = userIdRef.current;
    if (!sessionId || !userId || machine.status !== "connected") return;
    if (machine.metrics.elapsedTime === prevElapsedRef.current) return;

    prevElapsedRef.current = machine.metrics.elapsedTime ?? null;

    const row = metricsToTelemetryInsert(sessionId, userId, machine.metrics);
    if (!row) return;

    // Fire-and-forget; errors are non-fatal (idempotent upsert means safe to retry)
    upsertTelemetry(db, row).then(({ error }) => {
      if (error) console.error("[useRowingSession] telemetry upsert failed", error);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [machine.metrics, machine.status]);

  // ── Persist splits as they complete ───────────────────────────────────────

  const savedSplitCountRef = useRef(0);

  useEffect(() => {
    const sessionId = sessionIdRef.current;
    const userId = userIdRef.current;
    if (!sessionId || !userId) return;

    const newSplits = machine.splits.slice(savedSplitCountRef.current);
    if (newSplits.length === 0) return;

    savedSplitCountRef.current = machine.splits.length;

    newSplits.forEach((split: Split500m) => {
      insertSplit(db, {
        session_id: sessionId,
        user_id: userId,
        split_number: split.splitNumber,
        duration_seconds: split.durationSeconds,
        stroke_count: split.strokeCount,
        avg_power_w: split.avgPower,
        avg_stroke_rate_spm: split.avgRate / 10, // avgRate is stored ×10 as an integer
      }).then(({ error }) => {
        if (error) console.error("[useRowingSession] split insert failed", error);
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [machine.splits]);

  // ── Wrapped connect: create session row, then connect BLE ─────────────────

  const connect = useCallback(async () => {
    const userId = userIdRef.current;
    if (!userId) {
      console.error("[useRowingSession] no authenticated user");
      return;
    }

    const { data, error } = await createSession(db, userId, machine.deviceName);
    if (error || !data) {
      console.error("[useRowingSession] createSession failed", error);
      return;
    }

    sessionIdRef.current = data.id;
    savedSplitCountRef.current = 0;
    prevElapsedRef.current = null;

    await machine.connect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [machine.connect, machine.deviceName]);

  // ── Wrapped disconnect: end session row, then disconnect BLE ──────────────

  const disconnect = useCallback(() => {
    const sessionId = sessionIdRef.current;
    if (sessionId) {
      endSession(db, sessionId).then(({ error }) => {
        if (error) console.error("[useRowingSession] endSession failed", error);
      });
      sessionIdRef.current = null;
    }
    machine.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [machine.disconnect]);

  return {
    ...machine,
    connect,
    disconnect,
  };
}
