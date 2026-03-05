// ─── Types ────────────────────────────────────────────────────────────────────

export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export type SimSpeed = 1 | 5 | 10 | 50;

export interface RowingMetrics {
  strokeRate?: number;
  strokeCount?: number;
  avgStrokeRate?: number;
  totalDistance?: number;
  instantPace?: number;
  avgPace?: number;
  instantPower?: number;
  avgPower?: number;
  resistanceLevel?: number;
  totalEnergy?: number;
  heartRate?: number;
  metabolicEquivalent?: number;
  elapsedTime?: number;
  remainingTime?: number;
}

// ─── Distance markers & zones ─────────────────────────────────────────────────

export const DISTANCE_MARKERS = [
  500, 1000, 2000, 5000, 10000, 21097, 42195,
] as const;

export interface DistanceZone {
  zoneIndex: number; // 0–7
  zoneStart: number;
  zoneEnd: number; // Infinity for zone 7
  progressFraction: number; // 0–1 within zone
  nextMarker: number | null; // null beyond marathon
}

// Dark background color per zone (used as inline style, not Tailwind class)
export const ZONE_COLORS: Record<number, string> = {
  0: "#020617", // slate-950:   0–500m
  1: "#172554", // blue-950:    500–1000m
  2: "#083344", // cyan-950:    1000–2000m
  3: "#042f2e", // teal-950:    2000–5000m
  4: "#022c22", // emerald-950: 5000–10000m
  5: "#2e1065", // violet-950:  10000–21097m
  6: "#3b0764", // purple-950:  21097–42195m
  7: "#4c0519", // rose-950:    42195m+
};

// Slightly lighter version for the "already rowed" fill on the left
export const ZONE_FILL_COLORS: Record<number, string> = {
  0: "#0f172a", // slate-900
  1: "#1e3a8a", // blue-900
  2: "#164e63", // cyan-900
  3: "#134e4a", // teal-900
  4: "#064e3b", // emerald-900
  5: "#4c1d95", // violet-900
  6: "#581c87", // purple-900
  7: "#881337", // rose-900
};

export function computeDistanceZone(totalDistance: number): DistanceZone {
  const starts = [0, ...DISTANCE_MARKERS];
  for (let i = 0; i < DISTANCE_MARKERS.length; i++) {
    const zoneStart = starts[i]!;
    const zoneEnd = DISTANCE_MARKERS[i]!;
    if (totalDistance < zoneEnd) {
      return {
        zoneIndex: i,
        zoneStart,
        zoneEnd,
        progressFraction: (totalDistance - zoneStart) / (zoneEnd - zoneStart),
        nextMarker: zoneEnd,
      };
    }
  }
  // Beyond marathon
  const lastMarker = DISTANCE_MARKERS[DISTANCE_MARKERS.length - 1]!;
  return {
    zoneIndex: 7,
    zoneStart: lastMarker,
    zoneEnd: Infinity,
    progressFraction: 0,
    nextMarker: null,
  };
}

// ─── Split tracking ───────────────────────────────────────────────────────────

export interface Split500m {
  splitNumber: number; // 1-based (split 1 = 0→500m)
  durationSeconds: number;
  strokeCount: number;
  avgPower: number;
  avgRate: number;
}

export interface SplitAccumulator {
  splitNumber: number;
  startElapsedTime: number;
  startStrokeCount: number;
  powerReadings: number[];
  rateReadings: number[];
}

export function freshAccumulator(splitNumber: number): SplitAccumulator {
  return {
    splitNumber,
    startElapsedTime: 0,
    startStrokeCount: 0,
    powerReadings: [],
    rateReadings: [],
  };
}

// Called on every metrics tick. Mutates `acc` and returns a completed Split500m
// when a boundary is crossed, otherwise returns null.
export function checkSplitBoundary(
  metrics: RowingMetrics,
  acc: SplitAccumulator
): Split500m | null {
  if (metrics.instantPower !== undefined && metrics.instantPower > 0) {
    acc.powerReadings.push(metrics.instantPower);
  }
  if (metrics.strokeRate !== undefined && metrics.strokeRate > 0) {
    acc.rateReadings.push(metrics.strokeRate);
  }

  const dist = metrics.totalDistance ?? 0;
  const boundary = acc.splitNumber * 500;

  if (dist < boundary) return null;

  const duration = (metrics.elapsedTime ?? 0) - acc.startElapsedTime;
  const strokes = (metrics.strokeCount ?? 0) - acc.startStrokeCount;
  const avgPower =
    acc.powerReadings.length > 0
      ? Math.round(
          acc.powerReadings.reduce((a, b) => a + b, 0) /
            acc.powerReadings.length
        )
      : 0;
  const avgRate =
    acc.rateReadings.length > 0
      ? Math.round(
          (acc.rateReadings.reduce((a, b) => a + b, 0) /
            acc.rateReadings.length) *
            10
        ) / 10
      : 0;

  return {
    splitNumber: acc.splitNumber,
    durationSeconds: Math.max(1, duration),
    strokeCount: Math.max(0, strokes),
    avgPower,
    avgRate,
  };
}

// ─── BLE Constants ────────────────────────────────────────────────────────────

export const FTMS_SERVICE = "fitness_machine"; // 0x1826
export const ROWER_DATA_UUID = "00002ad1-0000-1000-8000-00805f9b34fb"; // 0x2AD1
export const FITNESS_MACHINE_STATUS_UUID =
  "00002ada-0000-1000-8000-00805f9b34fb"; // 0x2ADA
export const FITNESS_MACHINE_FEATURE_UUID =
  "00002acc-0000-1000-8000-00805f9b34fb"; // 0x2ACC

// ─── Formatters ───────────────────────────────────────────────────────────────

export function formatPace(secondsPer500m: number): string {
  if (!secondsPer500m || secondsPer500m === 65535) return "—";
  const mins = Math.floor(secondsPer500m / 60);
  const secs = secondsPer500m % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0)
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function toHex(dataView: DataView): string {
  const bytes: string[] = [];
  for (let i = 0; i < dataView.byteLength; i++) {
    bytes.push(dataView.getUint8(i).toString(16).padStart(2, "0"));
  }
  return bytes.join(" ");
}

// ─── FTMS Rower Data Parser (0x2AD1) ─────────────────────────────────────────

export function parseFTMSRowerData(
  dataView: DataView
): Partial<RowingMetrics> {
  const metrics: Partial<RowingMetrics> = {};

  if (dataView.byteLength < 2) return metrics;

  const flags = dataView.getUint16(0, true);
  let offset = 2;

  if ((flags & 0x01) === 0) {
    if (offset + 1 <= dataView.byteLength) {
      metrics.strokeRate = dataView.getUint8(offset) / 2;
      offset += 1;
    }
    if (offset + 2 <= dataView.byteLength) {
      metrics.strokeCount = dataView.getUint16(offset, true);
      offset += 2;
    }
  }

  if ((flags & 0x02) !== 0) {
    if (offset + 1 <= dataView.byteLength) {
      metrics.avgStrokeRate = dataView.getUint8(offset) / 2;
      offset += 1;
    }
  }

  if ((flags & 0x04) !== 0) {
    if (offset + 3 <= dataView.byteLength) {
      metrics.totalDistance =
        dataView.getUint8(offset) |
        (dataView.getUint8(offset + 1) << 8) |
        (dataView.getUint8(offset + 2) << 16);
      offset += 3;
    }
  }

  if ((flags & 0x08) !== 0) {
    if (offset + 2 <= dataView.byteLength) {
      metrics.instantPace = dataView.getUint16(offset, true);
      offset += 2;
    }
  }

  if ((flags & 0x10) !== 0) {
    if (offset + 2 <= dataView.byteLength) {
      metrics.avgPace = dataView.getUint16(offset, true);
      offset += 2;
    }
  }

  if ((flags & 0x20) !== 0) {
    if (offset + 2 <= dataView.byteLength) {
      metrics.instantPower = dataView.getInt16(offset, true);
      offset += 2;
    }
  }

  if ((flags & 0x40) !== 0) {
    if (offset + 2 <= dataView.byteLength) {
      metrics.avgPower = dataView.getInt16(offset, true);
      offset += 2;
    }
  }

  if ((flags & 0x80) !== 0) {
    if (offset + 2 <= dataView.byteLength) {
      metrics.resistanceLevel = dataView.getInt16(offset, true);
      offset += 2;
    }
  }

  if ((flags & 0x100) !== 0) {
    if (offset + 5 <= dataView.byteLength) {
      metrics.totalEnergy = dataView.getUint16(offset, true);
      offset += 5;
    }
  }

  if ((flags & 0x200) !== 0) {
    if (offset + 1 <= dataView.byteLength) {
      metrics.heartRate = dataView.getUint8(offset);
      offset += 1;
    }
  }

  if ((flags & 0x400) !== 0) {
    if (offset + 1 <= dataView.byteLength) {
      metrics.metabolicEquivalent = dataView.getUint8(offset) / 10;
      offset += 1;
    }
  }

  if ((flags & 0x800) !== 0) {
    if (offset + 2 <= dataView.byteLength) {
      metrics.elapsedTime = dataView.getUint16(offset, true);
      offset += 2;
    }
  }

  if ((flags & 0x1000) !== 0) {
    if (offset + 2 <= dataView.byteLength) {
      metrics.remainingTime = dataView.getUint16(offset, true);
      offset += 2;
    }
  }

  return metrics;
}
