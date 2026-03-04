"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ConnectionStatus, RowingMetrics } from "@/lib/rowing";
import { RowingMachineState } from "@/hooks/useRowingMachine";

const HISTORY_MAX = 60;
const TICK_MS = 1000;

// Simulate a realistic moderate-effort 20-minute rowing session.
// Values are based on observed ERG780 data at resistance level 3.

function noise(amplitude: number): number {
  return (Math.random() - 0.5) * 2 * amplitude;
}

interface SimState {
  tick: number;
  strokeAccumulator: number;
  strokeCount: number;
  totalDistance: number;
  totalEnergy: number;
}

function computeTick(sim: SimState): { metrics: RowingMetrics; next: SimState } {
  const t = sim.tick;

  // Stroke rate: 20–26 SPM, oscillates on a slow sine wave
  const strokeRate = Math.round(23 + Math.sin(t / 15) * 3 + noise(0.5));
  const clampedRate = Math.max(18, Math.min(28, strokeRate));

  // Accumulate fractional strokes (rate is strokes/min → per second = rate/60)
  const strokeAccumulator = sim.strokeAccumulator + clampedRate / 60;
  const strokeCount = sim.strokeCount + Math.floor(strokeAccumulator);
  const remainingAccumulator = strokeAccumulator % 1;

  // Pace in s/500m: varies 150–210 (2:30–3:30/500m)
  const instantPace = Math.round(180 + Math.sin(t / 20) * 25 + noise(3));
  const clampedPace = Math.max(130, Math.min(240, instantPace));

  // Power from pace: roughly power ∝ 2.8e9 / pace³ (empirical rowing formula)
  const instantPower = Math.round(2.8e9 / Math.pow(clampedPace, 3) + noise(4));
  const clampedPower = Math.max(30, Math.min(250, instantPower));

  // Distance: each stroke covers ~ (500 / pace) * (60 / strokeRate) metres
  // Simpler: distance from pace — 500m takes `clampedPace` seconds
  const distancePerSecond = 500 / clampedPace;
  const totalDistance = Math.round(sim.totalDistance + distancePerSecond);

  // Energy: ~1 kcal per 12 seconds at moderate effort
  const totalEnergy = Math.floor(t / 12);

  const metrics: RowingMetrics = {
    strokeRate: clampedRate,
    strokeCount,
    totalDistance,
    instantPace: clampedPace,
    instantPower: clampedPower,
    resistanceLevel: 3,
    totalEnergy,
    elapsedTime: t,
  };

  return {
    metrics,
    next: {
      tick: t + 1,
      strokeAccumulator: remainingAccumulator,
      strokeCount,
      totalDistance: sim.totalDistance + distancePerSecond,
      totalEnergy,
    },
  };
}

export function useSimulatedRowingMachine(): RowingMachineState {
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [metrics, setMetrics] = useState<RowingMetrics>({});
  const [history, setHistory] = useState<RowingMetrics[]>([]);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const simStateRef = useRef<SimState>({
    tick: 0,
    strokeAccumulator: 0,
    strokeCount: 0,
    totalDistance: 0,
    totalEnergy: 0,
  });

  const stopInterval = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const connect = useCallback(async () => {
    setStatus("connecting");
    setMetrics({});
    setHistory([]);
    simStateRef.current = {
      tick: 0,
      strokeAccumulator: 0,
      strokeCount: 0,
      totalDistance: 0,
      totalEnergy: 0,
    };

    // Simulate a 1.5s connection delay
    await new Promise((r) => setTimeout(r, 1500));

    setStatus("connected");

    intervalRef.current = setInterval(() => {
      const { metrics: next, next: nextSim } = computeTick(simStateRef.current);
      simStateRef.current = nextSim;
      setMetrics(next);
      setHistory((h) => {
        const updated = [...h, next];
        return updated.length > HISTORY_MAX
          ? updated.slice(updated.length - HISTORY_MAX)
          : updated;
      });
    }, TICK_MS);
  }, []);

  const disconnect = useCallback(() => {
    stopInterval();
    setMetrics({});
    setHistory([]);
    setStatus("idle");
  }, []);

  // Clean up on unmount
  useEffect(() => stopInterval, []);

  return {
    status,
    deviceName: "ERG780 (Sim)",
    metrics,
    history,
    connect,
    disconnect,
  };
}
