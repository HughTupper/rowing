"use client";

import { useRowingMachine } from "@/hooks/useRowingMachine";
import { RowingMetrics, formatPace, formatTime } from "@/lib/rowing";
import { Button } from "@repo/ui/button";

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({
  data,
  color = "#60a5fa",
  height = 48,
  width = 160,
}: {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
}) {
  if (data.length < 2) {
    return (
      <svg width={width} height={height} className="opacity-30">
        <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke={color} strokeWidth={1} strokeDasharray="2 2" />
      </svg>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 4;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * (width - pad * 2) + pad;
    const y = height - pad - ((v - min) / range) * (height - pad * 2);
    return `${x},${y}`;
  });

  const lastX = parseFloat(points[points.length - 1]!.split(",")[0]!);
  const lastY = parseFloat(points[points.length - 1]!.split(",")[1]!);

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.7}
      />
      <circle cx={lastX} cy={lastY} r={3} fill={color} />
    </svg>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function HeroMetric({
  label,
  value,
  unit,
  subtext,
}: {
  label: string;
  value: string;
  unit?: string;
  subtext?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 px-4">
      <span className="text-xs uppercase tracking-widest text-slate-400 font-medium">
        {label}
      </span>
      <div className="flex items-baseline gap-1">
        <span className="text-5xl font-mono font-bold text-white tabular-nums leading-none">
          {value}
        </span>
        {unit && (
          <span className="text-base text-slate-400 mb-0.5">{unit}</span>
        )}
      </div>
      {subtext && <span className="text-xs text-slate-500">{subtext}</span>}
    </div>
  );
}

function SecondaryMetric({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-xs uppercase tracking-widest text-slate-500 font-medium">
        {label}
      </span>
      <span className="text-2xl font-mono font-semibold text-slate-200 tabular-nums">
        {value}
        {unit && <span className="text-sm text-slate-500 ml-1">{unit}</span>}
      </span>
    </div>
  );
}

function SparklinePanel({
  label,
  data,
  formatted,
  color,
}: {
  label: string;
  data: number[];
  formatted: string;
  color: string;
}) {
  return (
    <div className="flex flex-col gap-1 bg-slate-800/50 rounded-xl p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-slate-500">
          {label}
        </span>
        <span className="text-sm font-mono text-slate-300">{formatted}</span>
      </div>
      <Sparkline data={data} color={color} width={160} height={40} />
    </div>
  );
}

// ─── Connect Screen ───────────────────────────────────────────────────────────

function ConnectScreen({
  onConnect,
  connecting,
  error,
}: {
  onConnect: () => void;
  connecting: boolean;
  error: boolean;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-8 gap-6">
      {/* Icon */}
      <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center text-4xl">
        🚣
      </div>

      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-white">Ready to Row</h1>
        <p className="text-slate-400 max-w-xs">
          Connect your Xterra ERG780 to start tracking your session in real time.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-900/40 border border-red-700 text-red-300 px-4 py-2.5 text-sm max-w-xs text-center">
          Connection failed. Make sure your rower is on and nearby.
        </div>
      )}

      {typeof navigator !== "undefined" && !navigator.bluetooth && (
        <div className="rounded-lg bg-yellow-900/40 border border-yellow-700 text-yellow-300 px-4 py-2.5 text-sm max-w-xs text-center">
          Web Bluetooth requires Chrome or Edge on desktop.
        </div>
      )}

      <Button
        onClick={onConnect}
        disabled={connecting}
        className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 text-base h-auto"
      >
        {connecting ? "Connecting…" : "Connect Rower"}
      </Button>

      <a
        href="/debug"
        className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
      >
        Open debug page
      </a>
    </div>
  );
}

// ─── Session Screen ───────────────────────────────────────────────────────────

function SessionScreen({
  deviceName,
  metrics,
  history,
  onDisconnect,
}: {
  deviceName: string | null;
  metrics: RowingMetrics;
  history: RowingMetrics[];
  onDisconnect: () => void;
}) {
  const paceHistory = history
    .map((m) => m.instantPace ?? 0)
    .filter((v) => v > 0 && v < 65535);

  const powerHistory = history
    .map((m) => m.instantPower ?? 0)
    .filter((v) => v > 0);

  const pace = metrics.instantPace
    ? formatPace(metrics.instantPace)
    : "—";

  const elapsed = metrics.elapsedTime !== undefined
    ? formatTime(metrics.elapsedTime)
    : "00:00";

  const showRemaining =
    metrics.remainingTime !== undefined &&
    metrics.remainingTime !== 65535 &&
    metrics.remainingTime > 0;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="font-medium text-slate-200">
            {deviceName ?? "ERG780"}
          </span>
        </div>
        <Button
          variant="outline"
          onClick={onDisconnect}
          className="text-sm h-8 border-slate-700 text-slate-300 hover:text-white hover:border-slate-500"
        >
          End Session
        </Button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6 py-8 max-w-2xl mx-auto w-full">
        {/* Elapsed time */}
        <div className="text-center">
          <div className="text-xs uppercase tracking-widest text-slate-500 mb-1">
            Elapsed
          </div>
          <div className="text-7xl font-mono font-bold tabular-nums text-white">
            {elapsed}
          </div>
          {showRemaining && (
            <div className="text-sm text-slate-500 mt-1">
              {formatTime(metrics.remainingTime!)} remaining
            </div>
          )}
        </div>

        {/* Hero metrics */}
        <div className="flex items-start justify-center gap-0 w-full divide-x divide-slate-800">
          <HeroMetric
            label="Pace"
            value={pace}
            unit="/500m"
          />
          <HeroMetric
            label="Power"
            value={metrics.instantPower !== undefined ? String(metrics.instantPower) : "—"}
            unit="W"
          />
          <HeroMetric
            label="Rate"
            value={metrics.strokeRate !== undefined ? String(metrics.strokeRate) : "—"}
            unit="SPM"
          />
        </div>

        {/* Sparklines */}
        <div className="grid grid-cols-2 gap-4 w-full">
          <SparklinePanel
            label="Pace trend"
            data={paceHistory}
            formatted={pace === "—" ? "—" : `${pace} /500m`}
            color="#60a5fa"
          />
          <SparklinePanel
            label="Power trend"
            data={powerHistory}
            formatted={
              metrics.instantPower !== undefined
                ? `${metrics.instantPower} W`
                : "—"
            }
            color="#34d399"
          />
        </div>

        {/* Secondary metrics */}
        <div className="grid grid-cols-4 gap-4 w-full border-t border-slate-800 pt-6">
          <SecondaryMetric
            label="Distance"
            value={
              metrics.totalDistance !== undefined
                ? String(metrics.totalDistance)
                : "—"
            }
            unit="m"
          />
          <SecondaryMetric
            label="Strokes"
            value={
              metrics.strokeCount !== undefined
                ? String(metrics.strokeCount)
                : "—"
            }
          />
          <SecondaryMetric
            label="Calories"
            value={
              metrics.totalEnergy !== undefined
                ? String(metrics.totalEnergy)
                : "—"
            }
            unit="kcal"
          />
          <SecondaryMetric
            label="Resistance"
            value={
              metrics.resistanceLevel !== undefined
                ? String(metrics.resistanceLevel)
                : "—"
            }
          />
        </div>

        {/* Heart rate (only show when sensor is active) */}
        {metrics.heartRate !== undefined && metrics.heartRate > 0 && (
          <div className="flex items-center gap-2 text-red-400">
            <span className="text-lg">♥</span>
            <span className="font-mono font-semibold">{metrics.heartRate}</span>
            <span className="text-sm text-slate-500">bpm</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RowPage() {
  const { status, deviceName, metrics, history, connect, disconnect } =
    useRowingMachine();

  if (status === "connected") {
    return (
      <SessionScreen
        deviceName={deviceName}
        metrics={metrics}
        history={history}
        onDisconnect={disconnect}
      />
    );
  }

  return (
    <ConnectScreen
      onConnect={connect}
      connecting={status === "connecting"}
      error={status === "error"}
    />
  );
}
