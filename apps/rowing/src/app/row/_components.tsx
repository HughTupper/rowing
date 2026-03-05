"use client";

import { CSSProperties } from "react";
import {
  DISTANCE_MARKERS,
  RowingMetrics,
  SimSpeed,
  Split500m,
  ZONE_COLORS,
  ZONE_FILL_COLORS,
  computeDistanceZone,
  formatPace,
  formatTime,
} from "@/lib/rowing";
import { RowingMachineState } from "@/hooks/useRowingMachine";
import { Button } from "@repo/ui/button";

// ─── Sim controls ─────────────────────────────────────────────────────────────

export interface SimControls {
  speed: SimSpeed;
  setSpeed: (s: SimSpeed) => void;
}

const SIM_SPEEDS: SimSpeed[] = [1, 5, 10, 50];

function SimSpeedControl({ speed, setSpeed }: SimControls) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-slate-800/70 p-1">
      {SIM_SPEEDS.map((s) => (
        <button
          key={s}
          onClick={() => setSpeed(s)}
          className={`px-2 py-0.5 rounded text-xs font-mono font-semibold transition-colors ${
            speed === s
              ? "bg-slate-500 text-white"
              : "text-slate-400 hover:text-white"
          }`}
        >
          {s}x
        </button>
      ))}
    </div>
  );
}

// ─── Sparkline ────────────────────────────────────────────────────────────────

export function Sparkline({
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
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke={color}
          strokeWidth={1}
          strokeDasharray="2 2"
        />
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

// ─── Metric display components ────────────────────────────────────────────────

export function HeroMetric({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
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
    </div>
  );
}

export function SecondaryMetric({
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

export function SparklinePanel({
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

// ─── Split card ───────────────────────────────────────────────────────────────

function SplitField({
  label,
  value,
  delta,
  deltaClass,
}: {
  label: string;
  value: string;
  delta: string | null;
  deltaClass: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-xs uppercase tracking-widest text-slate-500">
        {label}
      </span>
      <span className="text-lg font-mono font-semibold text-white tabular-nums">
        {value}
      </span>
      {delta !== null && (
        <span className={`text-xs font-mono ${deltaClass}`}>{delta}</span>
      )}
    </div>
  );
}

function SplitCard({
  split,
  allSplits,
}: {
  split: Split500m;
  allSplits: Split500m[];
}) {
  const pbDuration = Math.min(...allSplits.map((s) => s.durationSeconds));
  const pbPower = Math.max(...allSplits.map((s) => s.avgPower));
  const pbRate = Math.max(...allSplits.map((s) => s.avgRate));

  function deltaClass(delta: number, lowerIsBetter: boolean) {
    if (delta === 0) return "text-slate-400";
    const good = lowerIsBetter ? delta < 0 : delta > 0;
    return good ? "text-emerald-400" : "text-red-400";
  }

  function fmtDelta(
    val: number,
    pb: number,
    lowerIsBetter: boolean,
    unit = ""
  ) {
    const delta = val - pb;
    if (delta === 0) return "PB";
    const sign = delta > 0 ? "+" : "";
    const abs = Math.abs(delta);
    return `${sign}${lowerIsBetter && delta > 0 ? "+" : ""}${delta > 0 ? "" : "-"}${abs % 1 !== 0 ? abs.toFixed(1) : abs}${unit}`;
  }

  const durationDelta = split.durationSeconds - pbDuration;
  const powerDelta = split.avgPower - pbPower;
  const rateDelta = split.avgRate - pbRate;

  const startDist = ((split.splitNumber - 1) * 500).toLocaleString();
  const endDist = (split.splitNumber * 500).toLocaleString();

  return (
    <div className="w-full rounded-xl bg-slate-900/60 border border-slate-700/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase tracking-widest text-slate-500 font-medium">
          Split {split.splitNumber} — {startDist}–{endDist}m
        </span>
        <span className="text-xs text-slate-600">
          {allSplits.length} split{allSplits.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-3">
        <SplitField
          label="Time"
          value={formatTime(split.durationSeconds)}
          delta={
            durationDelta === 0
              ? "PB"
              : `${durationDelta > 0 ? "+" : ""}${durationDelta.toFixed(0)}s`
          }
          deltaClass={deltaClass(durationDelta, true)}
        />
        <SplitField
          label="Strokes"
          value={String(split.strokeCount)}
          delta={null}
          deltaClass="text-slate-400"
        />
        <SplitField
          label="Avg W"
          value={String(split.avgPower)}
          delta={fmtDelta(split.avgPower, pbPower, false, "W")}
          deltaClass={deltaClass(powerDelta, false)}
        />
        <SplitField
          label="Avg SPM"
          value={String(split.avgRate)}
          delta={fmtDelta(split.avgRate, pbRate, false)}
          deltaClass={deltaClass(rateDelta, false)}
        />
      </div>
    </div>
  );
}

// ─── Distance progress bar ────────────────────────────────────────────────────

function formatMarkerLabel(m: number): string {
  if (m === 21097) return "HM";
  if (m === 42195) return "M";
  if (m >= 1000) return `${m / 1000}k`;
  return `${m}m`;
}

function DistanceProgressBar({ totalDistance }: { totalDistance: number }) {
  const zone = computeDistanceZone(totalDistance);
  const maxMarker = DISTANCE_MARKERS[DISTANCE_MARKERS.length - 1]!; // 42195
  const clampedDist = Math.min(totalDistance, maxMarker);
  const overallPct = (clampedDist / maxMarker) * 100;

  return (
    <div className="px-6 pb-5 pt-3 flex flex-col gap-2 border-t border-slate-800/60">
      {/* Distance label */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-mono tabular-nums text-slate-300">
          {totalDistance.toLocaleString()}m
        </span>
        {zone.nextMarker && (
          <span className="text-slate-500">
            {(zone.nextMarker - totalDistance).toLocaleString()}m to{" "}
            {formatMarkerLabel(zone.nextMarker)}
          </span>
        )}
        {!zone.nextMarker && (
          <span className="text-rose-400 font-medium">Marathon complete!</span>
        )}
      </div>

      {/* Track */}
      <div className="relative h-1.5 bg-slate-800 rounded-full">
        {/* Filled progress */}
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-slate-400 transition-all duration-500"
          style={{ width: `${overallPct}%` }}
        />

        {/* Tick marks for each named marker */}
        {DISTANCE_MARKERS.map((m) => {
          const pct = (m / maxMarker) * 100;
          const isPast = totalDistance >= m;
          return (
            <div
              key={m}
              className="absolute top-1/2 -translate-y-1/2"
              style={{ left: `${pct}%` }}
            >
              <div
                className={`w-px h-3 ${isPast ? "bg-slate-300" : "bg-slate-600"}`}
              />
            </div>
          );
        })}

        {/* Current position dot */}
        <div
          className="absolute top-1/2 w-2.5 h-2.5 rounded-full bg-white border-2 border-slate-900 shadow transition-all duration-500"
          style={{
            left: `${overallPct}%`,
            transform: "translate(-50%, -50%)",
          }}
        />
      </div>

      {/* Marker labels */}
      <div className="relative h-3.5">
        {DISTANCE_MARKERS.map((m) => {
          const pct = (m / maxMarker) * 100;
          const isPast = totalDistance >= m;
          return (
            <span
              key={m}
              className={`absolute text-[9px] font-mono -translate-x-1/2 transition-colors ${
                isPast ? "text-slate-400" : "text-slate-600"
              }`}
              style={{ left: `${pct}%` }}
            >
              {formatMarkerLabel(m)}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ─── ConnectScreen ────────────────────────────────────────────────────────────

export function ConnectScreen({
  onConnect,
  connecting,
  error,
  ctaLabel = "Connect Rower",
  description = "Connect your Xterra ERG780 to start tracking your session in real time.",
}: {
  onConnect: () => void;
  connecting: boolean;
  error: boolean;
  ctaLabel?: string;
  description?: string;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-8 gap-6">
      <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center text-4xl">
        🚣
      </div>

      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-white">Ready to Row</h1>
        <p className="text-slate-400 max-w-xs">{description}</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-900/40 border border-red-700 text-red-300 px-4 py-2.5 text-sm max-w-xs text-center">
          Connection failed. Make sure your rower is on and nearby.
        </div>
      )}

      {typeof navigator !== "undefined" &&
        !navigator.bluetooth &&
        ctaLabel === "Connect Rower" && (
          <div className="rounded-lg bg-yellow-900/40 border border-yellow-700 text-yellow-300 px-4 py-2.5 text-sm max-w-xs text-center">
            Web Bluetooth requires Chrome or Edge on desktop.
          </div>
        )}

      <Button
        onClick={onConnect}
        disabled={connecting}
        className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 text-base h-auto"
      >
        {connecting ? "Connecting…" : ctaLabel}
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

// ─── SessionScreen ────────────────────────────────────────────────────────────

export function SessionScreen({
  deviceName,
  metrics,
  history,
  splits,
  onDisconnect,
  simControls,
}: {
  deviceName: string | null;
  metrics: RowingMetrics;
  history: RowingMetrics[];
  splits: Split500m[];
  onDisconnect: () => void;
  simControls?: SimControls;
}) {
  const paceHistory = history
    .map((m) => m.instantPace ?? 0)
    .filter((v) => v > 0 && v < 65535);

  const powerHistory = history
    .map((m) => m.instantPower ?? 0)
    .filter((v) => v > 0);

  const pace = metrics.instantPace ? formatPace(metrics.instantPace) : "—";

  const elapsed =
    metrics.elapsedTime !== undefined
      ? formatTime(metrics.elapsedTime)
      : "00:00";

  const showRemaining =
    metrics.remainingTime !== undefined &&
    metrics.remainingTime !== 65535 &&
    metrics.remainingTime > 0;

  const totalDistance = metrics.totalDistance ?? 0;
  const zone = computeDistanceZone(totalDistance);
  const fillPct = zone.progressFraction * 100;
  const baseColor = ZONE_COLORS[zone.zoneIndex]!;
  const fillColor = ZONE_FILL_COLORS[zone.zoneIndex]!;

  const bgStyle: CSSProperties =
    zone.zoneIndex === 7
      ? { backgroundColor: baseColor }
      : {
          background: `linear-gradient(to right, ${fillColor} 0%, ${fillColor} ${fillPct}%, ${baseColor} ${fillPct}%, ${baseColor} 100%)`,
        };

  const latestSplit = splits.length > 0 ? splits[splits.length - 1]! : null;

  return (
    <div
      className="min-h-screen text-white flex flex-col"
      style={bgStyle}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="font-medium text-slate-200">
            {deviceName ?? "ERG780"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {simControls && <SimSpeedControl {...simControls} />}
          <Button
            variant="outline"
            onClick={onDisconnect}
            className="text-sm h-8 border-white/20 text-slate-300 hover:text-white hover:border-white/40 bg-transparent"
          >
            End Session
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6 py-8 max-w-2xl mx-auto w-full">
        {/* Elapsed time */}
        <div className="text-center">
          <div className="text-xs uppercase tracking-widest text-white/40 mb-1">
            Elapsed
          </div>
          <div className="text-7xl font-mono font-bold tabular-nums text-white">
            {elapsed}
          </div>
          {showRemaining && (
            <div className="text-sm text-white/40 mt-1">
              {formatTime(metrics.remainingTime!)} remaining
            </div>
          )}
        </div>

        {/* Hero metrics */}
        <div className="flex items-start justify-center gap-0 w-full divide-x divide-white/10">
          <HeroMetric label="Pace" value={pace} unit="/500m" />
          <HeroMetric
            label="Power"
            value={
              metrics.instantPower !== undefined
                ? String(metrics.instantPower)
                : "—"
            }
            unit="W"
          />
          <HeroMetric
            label="Rate"
            value={
              metrics.strokeRate !== undefined
                ? String(metrics.strokeRate)
                : "—"
            }
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
        <div className="grid grid-cols-4 gap-4 w-full border-t border-white/10 pt-6">
          <SecondaryMetric
            label="Distance"
            value={totalDistance > 0 ? String(totalDistance) : "—"}
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

        {/* Heart rate (only when sensor is active) */}
        {metrics.heartRate !== undefined && metrics.heartRate > 0 && (
          <div className="flex items-center gap-2 text-red-400">
            <span className="text-lg">♥</span>
            <span className="font-mono font-semibold">{metrics.heartRate}</span>
            <span className="text-sm text-white/40">bpm</span>
          </div>
        )}

        {/* Latest 500m split card */}
        {latestSplit && (
          <SplitCard split={latestSplit} allSplits={splits} />
        )}
      </div>

      {/* Distance progress bar — pinned to bottom */}
      <DistanceProgressBar totalDistance={totalDistance} />
    </div>
  );
}

// ─── Page shell ───────────────────────────────────────────────────────────────

export function RowPageShell({
  state,
  ctaLabel,
  description,
  simControls,
}: {
  state: RowingMachineState;
  ctaLabel?: string;
  description?: string;
  simControls?: SimControls;
}) {
  if (state.status === "connected") {
    return (
      <SessionScreen
        deviceName={state.deviceName}
        metrics={state.metrics}
        history={state.history}
        splits={state.splits}
        onDisconnect={state.disconnect}
        simControls={simControls}
      />
    );
  }

  return (
    <ConnectScreen
      onConnect={state.connect}
      connecting={state.status === "connecting"}
      error={state.status === "error"}
      ctaLabel={ctaLabel}
      description={description}
    />
  );
}
