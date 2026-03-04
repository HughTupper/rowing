"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";

// ─── Types ────────────────────────────────────────────────────────────────────

type ConnectionStatus = "idle" | "connecting" | "connected" | "disconnected" | "error";
type LogLevel = "info" | "data" | "error" | "warn";

interface LogEntry {
  id: number;
  timestamp: Date;
  level: LogLevel;
  message: string;
  raw?: string;
}

interface ServiceInfo {
  uuid: string;
  characteristics: { uuid: string; properties: string[] }[];
}

interface RowingMetrics {
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

// ─── Constants ────────────────────────────────────────────────────────────────

const FTMS_SERVICE = "fitness_machine"; // 0x1826
const ROWER_DATA_UUID = "00002ad1-0000-1000-8000-00805f9b34fb"; // 0x2AD1
const FITNESS_MACHINE_STATUS_UUID = "00002ada-0000-1000-8000-00805f9b34fb"; // 0x2ADA
const FITNESS_MACHINE_FEATURE_UUID = "00002acc-0000-1000-8000-00805f9b34fb"; // 0x2ACC

// ─── Parsers ─────────────────────────────────────────────────────────────────

function toHex(dataView: DataView): string {
  const bytes: string[] = [];
  for (let i = 0; i < dataView.byteLength; i++) {
    bytes.push(dataView.getUint8(i).toString(16).padStart(2, "0"));
  }
  return bytes.join(" ");
}

function formatPace(secondsPer500m: number): string {
  if (!secondsPer500m || secondsPer500m === 65535) return "—";
  const mins = Math.floor(secondsPer500m / 60);
  const secs = secondsPer500m % 60;
  return `${mins}:${secs.toString().padStart(2, "0")} /500m`;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function parseFTMSRowerData(dataView: DataView): { metrics: Partial<RowingMetrics>; description: string } {
  const parts: string[] = [];
  const metrics: Partial<RowingMetrics> = {};

  if (dataView.byteLength < 2) {
    return { metrics, description: "Data too short" };
  }

  const flags = dataView.getUint16(0, true); // little-endian
  let offset = 2;

  // Bit 0: More Data (0 = Stroke Rate + Stroke Count present)
  if ((flags & 0x01) === 0) {
    if (offset + 1 <= dataView.byteLength) {
      const strokeRate = dataView.getUint8(offset) / 2;
      metrics.strokeRate = strokeRate;
      parts.push(`StrokeRate: ${strokeRate} SPM`);
      offset += 1;
    }
    if (offset + 2 <= dataView.byteLength) {
      const strokeCount = dataView.getUint16(offset, true);
      metrics.strokeCount = strokeCount;
      parts.push(`StrokeCount: ${strokeCount}`);
      offset += 2;
    }
  }

  // Bit 1: Average Stroke Rate
  if ((flags & 0x02) !== 0) {
    if (offset + 1 <= dataView.byteLength) {
      const avgStrokeRate = dataView.getUint8(offset) / 2;
      metrics.avgStrokeRate = avgStrokeRate;
      parts.push(`AvgStrokeRate: ${avgStrokeRate} SPM`);
      offset += 1;
    }
  }

  // Bit 2: Total Distance (uint24)
  if ((flags & 0x04) !== 0) {
    if (offset + 3 <= dataView.byteLength) {
      const distance =
        dataView.getUint8(offset) |
        (dataView.getUint8(offset + 1) << 8) |
        (dataView.getUint8(offset + 2) << 16);
      metrics.totalDistance = distance;
      parts.push(`Distance: ${distance} m`);
      offset += 3;
    }
  }

  // Bit 3: Instantaneous Pace (uint16)
  if ((flags & 0x08) !== 0) {
    if (offset + 2 <= dataView.byteLength) {
      const pace = dataView.getUint16(offset, true);
      metrics.instantPace = pace;
      parts.push(`Pace: ${formatPace(pace)}`);
      offset += 2;
    }
  }

  // Bit 4: Average Pace (uint16)
  if ((flags & 0x10) !== 0) {
    if (offset + 2 <= dataView.byteLength) {
      const avgPace = dataView.getUint16(offset, true);
      metrics.avgPace = avgPace;
      parts.push(`AvgPace: ${formatPace(avgPace)}`);
      offset += 2;
    }
  }

  // Bit 5: Instantaneous Power (int16)
  if ((flags & 0x20) !== 0) {
    if (offset + 2 <= dataView.byteLength) {
      const power = dataView.getInt16(offset, true);
      metrics.instantPower = power;
      parts.push(`Power: ${power} W`);
      offset += 2;
    }
  }

  // Bit 6: Average Power (int16)
  if ((flags & 0x40) !== 0) {
    if (offset + 2 <= dataView.byteLength) {
      const avgPower = dataView.getInt16(offset, true);
      metrics.avgPower = avgPower;
      parts.push(`AvgPower: ${avgPower} W`);
      offset += 2;
    }
  }

  // Bit 7: Resistance Level (int16)
  if ((flags & 0x80) !== 0) {
    if (offset + 2 <= dataView.byteLength) {
      const resistance = dataView.getInt16(offset, true);
      metrics.resistanceLevel = resistance;
      parts.push(`Resistance: ${resistance}`);
      offset += 2;
    }
  }

  // Bit 8: Expended Energy (uint16 total + uint16/hr + uint8/min)
  if ((flags & 0x100) !== 0) {
    if (offset + 5 <= dataView.byteLength) {
      const totalEnergy = dataView.getUint16(offset, true);
      metrics.totalEnergy = totalEnergy;
      parts.push(`Energy: ${totalEnergy} kcal`);
      offset += 5;
    }
  }

  // Bit 9: Heart Rate (uint8)
  if ((flags & 0x200) !== 0) {
    if (offset + 1 <= dataView.byteLength) {
      const hr = dataView.getUint8(offset);
      metrics.heartRate = hr;
      parts.push(`HR: ${hr} bpm`);
      offset += 1;
    }
  }

  // Bit 10: Metabolic Equivalent (uint8, /10)
  if ((flags & 0x400) !== 0) {
    if (offset + 1 <= dataView.byteLength) {
      const met = dataView.getUint8(offset) / 10;
      metrics.metabolicEquivalent = met;
      parts.push(`MET: ${met}`);
      offset += 1;
    }
  }

  // Bit 11: Elapsed Time (uint16, seconds)
  if ((flags & 0x800) !== 0) {
    if (offset + 2 <= dataView.byteLength) {
      const elapsed = dataView.getUint16(offset, true);
      metrics.elapsedTime = elapsed;
      parts.push(`Elapsed: ${formatTime(elapsed)}`);
      offset += 2;
    }
  }

  // Bit 12: Remaining Time (uint16)
  if ((flags & 0x1000) !== 0) {
    if (offset + 2 <= dataView.byteLength) {
      const remaining = dataView.getUint16(offset, true);
      metrics.remainingTime = remaining;
      parts.push(`Remaining: ${formatTime(remaining)}`);
      offset += 2;
    }
  }

  return {
    metrics,
    description: parts.length > 0 ? parts.join(" | ") : `Flags: 0x${flags.toString(16)}`,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ConnectionStatus }) {
  const styles: Record<ConnectionStatus, string> = {
    idle: "bg-muted text-muted-foreground",
    connecting: "bg-yellow-100 text-yellow-800",
    connected: "bg-green-100 text-green-800",
    disconnected: "bg-orange-100 text-orange-800",
    error: "bg-red-100 text-red-800",
  };
  const labels: Record<ConnectionStatus, string> = {
    idle: "Idle",
    connecting: "Connecting…",
    connected: "Connected",
    disconnected: "Disconnected",
    error: "Error",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${styles[status]}`}>
      <span className={`w-2 h-2 rounded-full mr-1.5 ${status === "connected" ? "bg-green-500 animate-pulse" : "bg-current opacity-50"}`} />
      {labels[status]}
    </span>
  );
}

function MetricCard({ label, value, unit }: { label: string; value?: number | string; unit?: string }) {
  const display = value !== undefined ? String(value) : "—";
  return (
    <div className="bg-muted/40 rounded-lg p-3 flex flex-col gap-1">
      <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className="text-2xl font-mono font-semibold">
        {display}
        {value !== undefined && unit ? (
          <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>
        ) : null}
      </span>
    </div>
  );
}

function LogLine({ entry }: { entry: LogEntry }) {
  const levelColors: Record<LogLevel, string> = {
    info: "text-muted-foreground",
    data: "text-blue-600",
    error: "text-red-600",
    warn: "text-yellow-600",
  };
  const time = entry.timestamp.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const ms = entry.timestamp.getMilliseconds().toString().padStart(3, "0");

  return (
    <div className="font-mono text-xs leading-5 border-b border-border/30 py-0.5">
      <span className="text-muted-foreground select-none">{time}.{ms} </span>
      <span className={`font-semibold uppercase mr-1 ${levelColors[entry.level]}`}>[{entry.level}]</span>
      <span>{entry.message}</span>
      {entry.raw ? (
        <div className="ml-24 text-muted-foreground/70 break-all">{entry.raw}</div>
      ) : null}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DebugPage() {
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [device, setDevice] = useState<BluetoothDevice | null>(null);
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [metrics, setMetrics] = useState<RowingMetrics>({});
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logIdRef = useRef(0);
  const serverRef = useRef<BluetoothRemoteGATTServer | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll log to bottom
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const addLog = (level: LogLevel, message: string, raw?: string) => {
    setLogs((prev) => [
      ...prev,
      { id: logIdRef.current++, timestamp: new Date(), level, message, raw },
    ]);
  };

  const handleCharacteristicChange = (
    event: Event,
    serviceUuid: string,
    charUuid: string
  ) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    const value = target.value;
    if (!value) return;

    const hex = toHex(value);
    const normalizedCharUuid = charUuid.toLowerCase();

    if (normalizedCharUuid === ROWER_DATA_UUID) {
      const { metrics: parsed, description } = parseFTMSRowerData(value);
      setMetrics((prev) => ({ ...prev, ...parsed }));
      addLog("data", `[Rower Data] ${description}`, `hex: ${hex}`);
    } else if (normalizedCharUuid === FITNESS_MACHINE_STATUS_UUID) {
      addLog("info", `[Machine Status] Raw data`, `hex: ${hex}`);
    } else {
      addLog("data", `[${serviceUuid.slice(4, 8)} / ${charUuid.slice(4, 8)}] Notification`, `hex: ${hex}`);
    }
  };

  const connect = async () => {
    if (!navigator.bluetooth) {
      addLog("error", "Web Bluetooth API is not available in this browser. Use Chrome or Edge.");
      setStatus("error");
      return;
    }

    setStatus("connecting");
    addLog("info", "Requesting Bluetooth device…");

    try {
      const btDevice = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [FTMS_SERVICE, "generic_access", "generic_attribute", "device_information"],
      });

      addLog("info", `Device selected: "${btDevice.name ?? "Unknown"}" (id: ${btDevice.id})`);
      setDevice(btDevice);

      btDevice.addEventListener("gattserverdisconnected", () => {
        addLog("warn", "Device disconnected");
        setStatus("disconnected");
        serverRef.current = null;
      });

      addLog("info", "Connecting to GATT server…");
      const server = await btDevice.gatt!.connect();
      serverRef.current = server;
      addLog("info", "GATT server connected. Discovering services…");

      let allServices: BluetoothRemoteGATTService[];
      try {
        allServices = await server.getPrimaryServices();
      } catch {
        addLog("warn", "getPrimaryServices() failed, trying FTMS only…");
        try {
          const ftmsService = await server.getPrimaryService(FTMS_SERVICE);
          allServices = [ftmsService];
        } catch (e2) {
          addLog("error", `Could not discover any services: ${String(e2)}`);
          setStatus("error");
          return;
        }
      }

      addLog("info", `Found ${allServices.length} service(s)`);
      const serviceInfos: ServiceInfo[] = [];

      for (const service of allServices) {
        addLog("info", `  Service: ${service.uuid}`);
        let chars: BluetoothRemoteGATTCharacteristic[] = [];

        try {
          chars = await service.getCharacteristics();
        } catch {
          addLog("warn", `  Could not read characteristics for ${service.uuid}`);
        }

        const charInfos: { uuid: string; properties: string[] }[] = [];

        for (const char of chars) {
          const props: string[] = [];
          if (char.properties.read) props.push("read");
          if (char.properties.write) props.push("write");
          if (char.properties.notify) props.push("notify");
          if (char.properties.indicate) props.push("indicate");
          if (char.properties.writeWithoutResponse) props.push("writeWithoutResponse");

          addLog("info", `    Char: ${char.uuid} [${props.join(", ")}]`);
          charInfos.push({ uuid: char.uuid, properties: props });

          // Try to read initial value
          if (char.properties.read) {
            try {
              const val = await char.readValue();
              addLog("data", `    Initial value for ${char.uuid.slice(4, 8)}`, `hex: ${toHex(val)}`);
            } catch {
              // Some chars block reads in certain states
            }
          }

          // Subscribe to notifications
          if (char.properties.notify || char.properties.indicate) {
            try {
              await char.startNotifications();
              char.addEventListener("characteristicvaluechanged", (evt) =>
                handleCharacteristicChange(evt, service.uuid, char.uuid)
              );
              addLog("info", `    Subscribed to notifications on ${char.uuid.slice(4, 8)}`);
            } catch (e) {
              addLog("warn", `    Could not subscribe to ${char.uuid.slice(4, 8)}: ${String(e)}`);
            }
          }
        }

        serviceInfos.push({ uuid: service.uuid, characteristics: charInfos });
      }

      setServices(serviceInfos);
      setStatus("connected");
      addLog("info", "Setup complete. Waiting for data…");
    } catch (e) {
      if (e instanceof Error && e.name === "NotFoundError") {
        addLog("info", "Device selection cancelled");
        setStatus("idle");
      } else {
        addLog("error", `Connection failed: ${String(e)}`);
        setStatus("error");
      }
    }
  };

  const disconnect = () => {
    if (serverRef.current?.connected) {
      serverRef.current.disconnect();
    }
    setDevice(null);
    setServices([]);
    setMetrics({});
    setStatus("idle");
    addLog("info", "Disconnected manually");
  };

  const clearLogs = () => setLogs([]);

  const isConnected = status === "connected";
  const canConnect = status === "idle" || status === "disconnected" || status === "error";

  return (
    <div className="min-h-screen bg-background p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Bluetooth Debug</h1>
          <p className="text-muted-foreground text-sm">
            {device ? `${device.name ?? "Unknown device"}` : "No device connected"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={status} />
          {isConnected ? (
            <Button variant="outline" onClick={disconnect}>Disconnect</Button>
          ) : (
            <Button onClick={connect} disabled={!canConnect}>
              {status === "connecting" ? "Connecting…" : "Connect"}
            </Button>
          )}
        </div>
      </div>

      {/* Bluetooth availability warning */}
      {typeof navigator !== "undefined" && !navigator.bluetooth && (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 text-yellow-800 px-4 py-3 text-sm">
          Web Bluetooth is not available. Open this page in Chrome or Edge on desktop.
        </div>
      )}

      {/* Live Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Live Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <MetricCard label="Stroke Rate" value={metrics.strokeRate} unit="SPM" />
            <MetricCard label="Strokes" value={metrics.strokeCount} />
            <MetricCard label="Distance" value={metrics.totalDistance} unit="m" />
            <MetricCard label="Pace" value={metrics.instantPace !== undefined ? formatPace(metrics.instantPace) : undefined} />
            <MetricCard label="Power" value={metrics.instantPower} unit="W" />
            <MetricCard label="Elapsed" value={metrics.elapsedTime !== undefined ? formatTime(metrics.elapsedTime) : undefined} />
            <MetricCard label="Resistance" value={metrics.resistanceLevel} />
            <MetricCard label="Energy" value={metrics.totalEnergy} unit="kcal" />
            <MetricCard label="Heart Rate" value={metrics.heartRate} unit="bpm" />
            <MetricCard label="Avg Pace" value={metrics.avgPace !== undefined ? formatPace(metrics.avgPace) : undefined} />
          </div>
        </CardContent>
      </Card>

      {/* Device Info */}
      {services.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Discovered Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {services.map((svc) => (
                <div key={svc.uuid} className="font-mono text-xs">
                  <div className="font-semibold text-foreground break-all">{svc.uuid}</div>
                  <div className="ml-4 space-y-0.5 mt-1">
                    {svc.characteristics.map((c) => (
                      <div key={c.uuid} className="text-muted-foreground break-all">
                        ↳ {c.uuid}
                        <span className="ml-2 text-blue-500">[{c.properties.join(", ")}]</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Event Log */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Event Log</CardTitle>
            <Button variant="ghost" onClick={clearLogs} className="text-xs h-7 px-2">
              Clear
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80 overflow-y-auto bg-muted/20 rounded-md p-3 space-y-0">
            {logs.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">
                Connect a device to start logging
              </p>
            ) : (
              logs.map((entry) => <LogLine key={entry.id} entry={entry} />)
            )}
            <div ref={logEndRef} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
