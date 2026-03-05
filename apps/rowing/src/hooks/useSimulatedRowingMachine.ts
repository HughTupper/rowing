"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ConnectionStatus,
  RowingMetrics,
  SimSpeed,
  Split500m,
  SplitAccumulator,
  checkSplitBoundary,
  freshAccumulator,
} from "@/lib/rowing";
import { RowingMachineState } from "@/hooks/useRowingMachine";

const HISTORY_MAX = 60;
const TICK_MS = 1000;

export interface SimulatedRowingMachineState extends RowingMachineState {
  simSpeed: SimSpeed;
  setSimSpeed: (speed: SimSpeed) => void;
}

interface SimState {
  tick: number;
  strokeAccumulator: number;
  strokeCount: number;
  totalDistance: number;
  totalEnergy: number;
}

function noise(amplitude: number): number {
  return (Math.random() - 0.5) * 2 * amplitude;
}

function computeTick(sim: SimState): { metrics: RowingMetrics; next: SimState } {
  const t = sim.tick;

  const strokeRate = Math.max(
    18,
    Math.min(28, Math.round(23 + Math.sin(t / 15) * 3 + noise(0.5)))
  );

  const strokeAccumulator = sim.strokeAccumulator + strokeRate / 60;
  const strokeCount = sim.strokeCount + Math.floor(strokeAccumulator);
  const remainingAccumulator = strokeAccumulator % 1;

  const instantPace = Math.max(
    130,
    Math.min(240, Math.round(180 + Math.sin(t / 20) * 25 + noise(3)))
  );

  const instantPower = Math.max(
    30,
    Math.min(250, Math.round(2.8e9 / Math.pow(instantPace, 3) + noise(4)))
  );

  const distancePerSecond = 500 / instantPace;
  const totalDistance = Math.round(sim.totalDistance + distancePerSecond);
  const totalEnergy = Math.floor(t / 12);

  const metrics: RowingMetrics = {
    strokeRate,
    strokeCount,
    totalDistance,
    instantPace,
    instantPower,
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

export function useSimulatedRowingMachine(): SimulatedRowingMachineState {
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [metrics, setMetrics] = useState<RowingMetrics>({});
  const [history, setHistory] = useState<RowingMetrics[]>([]);
  const [splits, setSplits] = useState<Split500m[]>([]);
  const [simSpeed, setSimSpeedState] = useState<SimSpeed>(1);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const simSpeedRef = useRef<SimSpeed>(1);
  const simStateRef = useRef<SimState>({
    tick: 0,
    strokeAccumulator: 0,
    strokeCount: 0,
    totalDistance: 0,
    totalEnergy: 0,
  });
  const splitAccRef = useRef<SplitAccumulator>(freshAccumulator(1));
  // Stable ref for setSplits to use inside the interval without re-creating it
  const setSplitsRef = useRef(setSplits);
  setSplitsRef.current = setSplits;

  const stopInterval = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const setSimSpeed = useCallback((speed: SimSpeed) => {
    simSpeedRef.current = speed;
    setSimSpeedState(speed);
  }, []);

  const connect = useCallback(async () => {
    setStatus("connecting");
    setMetrics({});
    setHistory([]);
    setSplits([]);
    simStateRef.current = {
      tick: 0,
      strokeAccumulator: 0,
      strokeCount: 0,
      totalDistance: 0,
      totalEnergy: 0,
    };
    splitAccRef.current = freshAccumulator(1);

    await new Promise((r) => setTimeout(r, 1500));

    setStatus("connected");

    intervalRef.current = setInterval(() => {
      const speed = simSpeedRef.current;
      let currentSim = simStateRef.current;
      let lastMetrics: RowingMetrics = {};
      const newSplits: Split500m[] = [];

      // Process N ticks per interval fire based on speed multiplier
      for (let i = 0; i < speed; i++) {
        const { metrics: tickMetrics, next: nextSim } = computeTick(currentSim);
        currentSim = nextSim;
        lastMetrics = tickMetrics;

        // Check split boundary on every sub-tick to handle fast speeds correctly
        const completed = checkSplitBoundary(tickMetrics, splitAccRef.current);
        if (completed) {
          newSplits.push(completed);
          splitAccRef.current = {
            ...freshAccumulator(completed.splitNumber + 1),
            startElapsedTime: tickMetrics.elapsedTime ?? 0,
            startStrokeCount: tickMetrics.strokeCount ?? 0,
          };
        }
      }

      simStateRef.current = currentSim;

      if (newSplits.length > 0) {
        setSplitsRef.current((prev) => [...prev, ...newSplits]);
      }

      setMetrics(lastMetrics);
      setHistory((h) => {
        const updated = [...h, lastMetrics];
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
    setSplits([]);
    splitAccRef.current = freshAccumulator(1);
    setStatus("idle");
  }, []);

  useEffect(() => stopInterval, []);

  return {
    status,
    deviceName: "ERG780 (Sim)",
    metrics,
    history,
    splits,
    connect,
    disconnect,
    simSpeed,
    setSimSpeed,
  };
}
