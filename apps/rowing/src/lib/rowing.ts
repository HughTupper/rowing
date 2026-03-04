// ─── Types ────────────────────────────────────────────────────────────────────

export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

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

  // Bit 0: More Data (0 = Stroke Rate + Stroke Count present)
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

  // Bit 1: Average Stroke Rate
  if ((flags & 0x02) !== 0) {
    if (offset + 1 <= dataView.byteLength) {
      metrics.avgStrokeRate = dataView.getUint8(offset) / 2;
      offset += 1;
    }
  }

  // Bit 2: Total Distance (uint24)
  if ((flags & 0x04) !== 0) {
    if (offset + 3 <= dataView.byteLength) {
      metrics.totalDistance =
        dataView.getUint8(offset) |
        (dataView.getUint8(offset + 1) << 8) |
        (dataView.getUint8(offset + 2) << 16);
      offset += 3;
    }
  }

  // Bit 3: Instantaneous Pace (uint16, s/500m)
  if ((flags & 0x08) !== 0) {
    if (offset + 2 <= dataView.byteLength) {
      metrics.instantPace = dataView.getUint16(offset, true);
      offset += 2;
    }
  }

  // Bit 4: Average Pace (uint16)
  if ((flags & 0x10) !== 0) {
    if (offset + 2 <= dataView.byteLength) {
      metrics.avgPace = dataView.getUint16(offset, true);
      offset += 2;
    }
  }

  // Bit 5: Instantaneous Power (int16, W)
  if ((flags & 0x20) !== 0) {
    if (offset + 2 <= dataView.byteLength) {
      metrics.instantPower = dataView.getInt16(offset, true);
      offset += 2;
    }
  }

  // Bit 6: Average Power (int16)
  if ((flags & 0x40) !== 0) {
    if (offset + 2 <= dataView.byteLength) {
      metrics.avgPower = dataView.getInt16(offset, true);
      offset += 2;
    }
  }

  // Bit 7: Resistance Level (int16)
  if ((flags & 0x80) !== 0) {
    if (offset + 2 <= dataView.byteLength) {
      metrics.resistanceLevel = dataView.getInt16(offset, true);
      offset += 2;
    }
  }

  // Bit 8: Expended Energy (uint16 total + uint16/hr + uint8/min)
  if ((flags & 0x100) !== 0) {
    if (offset + 5 <= dataView.byteLength) {
      metrics.totalEnergy = dataView.getUint16(offset, true);
      offset += 5;
    }
  }

  // Bit 9: Heart Rate (uint8)
  if ((flags & 0x200) !== 0) {
    if (offset + 1 <= dataView.byteLength) {
      metrics.heartRate = dataView.getUint8(offset);
      offset += 1;
    }
  }

  // Bit 10: Metabolic Equivalent (uint8, /10)
  if ((flags & 0x400) !== 0) {
    if (offset + 1 <= dataView.byteLength) {
      metrics.metabolicEquivalent = dataView.getUint8(offset) / 10;
      offset += 1;
    }
  }

  // Bit 11: Elapsed Time (uint16, seconds)
  if ((flags & 0x800) !== 0) {
    if (offset + 2 <= dataView.byteLength) {
      metrics.elapsedTime = dataView.getUint16(offset, true);
      offset += 2;
    }
  }

  // Bit 12: Remaining Time (uint16)
  if ((flags & 0x1000) !== 0) {
    if (offset + 2 <= dataView.byteLength) {
      metrics.remainingTime = dataView.getUint16(offset, true);
      offset += 2;
    }
  }

  return metrics;
}
