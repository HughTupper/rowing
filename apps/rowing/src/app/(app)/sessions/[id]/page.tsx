import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSession, getSessionSplits } from "@repo/database";
import { formatPace, formatTime } from "@/lib/rowing";

function formatDistance(m: number): string {
  return m >= 1000 ? (m / 1000).toFixed(1) + "km" : m + "m";
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }) +
    ", " +
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  );
}

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: session }, { data: splits }] = await Promise.all([
    getSession(supabase, id),
    getSessionSplits(supabase, id),
  ]);

  if (!session || session.status !== "completed") notFound();

  return (
    <div className="flex-1 p-6 max-w-3xl mx-auto w-full">
      {/* Back link */}
      <Link
        href="/sessions"
        className="text-slate-400 hover:text-white text-sm transition-colors inline-flex items-center gap-1.5 mb-6"
      >
        ← Sessions
      </Link>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-white font-semibold text-2xl mb-1">
          {formatDistance(session.total_distance_m!)}
        </h1>
        <p className="text-slate-400 text-sm">
          {formatDate(session.started_at)}
          {session.device_name && (
            <span className="text-slate-600"> · {session.device_name}</span>
          )}
        </p>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          {
            label: "Duration",
            value: formatTime(session.duration_seconds!),
          },
          {
            label: "Avg pace",
            value: session.avg_pace_s500m
              ? formatPace(session.avg_pace_s500m) + "/500m"
              : "—",
          },
          {
            label: "Avg power",
            value: session.avg_power_watts ? `${session.avg_power_watts}W` : "—",
          },
          {
            label: "Max power",
            value: session.max_power_watts ? `${session.max_power_watts}W` : "—",
          },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="bg-slate-800 border border-slate-700 rounded-xl p-4"
          >
            <p className="text-slate-500 text-xs mb-1">{label}</p>
            <p className="text-white font-medium">{value}</p>
          </div>
        ))}
      </div>

      {/* Splits */}
      {splits && splits.length > 0 && (
        <div>
          <h2 className="text-white font-medium text-sm mb-3">500m Splits</h2>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-5 px-4 py-2 border-b border-slate-700">
              {["Split", "Time", "Strokes", "Avg W", "Avg SPM"].map((h) => (
                <p key={h} className="text-slate-500 text-xs font-medium">
                  {h}
                </p>
              ))}
            </div>
            {/* Rows */}
            {splits.map((split, i) => (
              <div
                key={split.id}
                className={`grid grid-cols-5 px-4 py-3 ${
                  i < splits.length - 1 ? "border-b border-slate-700/50" : ""
                }`}
              >
                <p className="text-slate-400 text-sm">{split.split_number}</p>
                <p className="text-white text-sm font-medium">
                  {formatTime(split.duration_seconds)}
                </p>
                <p className="text-white text-sm">{split.stroke_count}</p>
                <p className="text-white text-sm">{split.avg_power_w}W</p>
                <p className="text-white text-sm">
                  {Number(split.avg_stroke_rate_spm).toFixed(1)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
