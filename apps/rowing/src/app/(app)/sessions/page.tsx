import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSessionHistory } from "@repo/database";
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

export default async function SessionsPage() {
  const supabase = await createClient();
  const { data: sessions } = await getSessionHistory(supabase);

  if (!sessions || sessions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-slate-400 mb-4">No sessions yet — hop on the rower!</p>
          <Link
            href="/row"
            className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-5 py-2.5 text-sm font-medium transition-colors"
          >
            Start rowing
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6">
      <h1 className="text-white font-semibold text-xl mb-6">Sessions</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sessions.map((session) => (
          <Link
            key={session.id}
            href={`/sessions/${session.id}`}
            className="bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-2xl p-5 transition-colors block"
          >
            <p className="text-slate-400 text-xs mb-3">{formatDate(session.started_at)}</p>

            <p className="text-white text-3xl font-bold mb-4">
              {formatDistance(session.total_distance_m)}
            </p>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-slate-500 text-xs mb-0.5">Duration</p>
                <p className="text-white text-sm font-medium">
                  {formatTime(session.duration_seconds)}
                </p>
              </div>
              <div>
                <p className="text-slate-500 text-xs mb-0.5">Avg pace</p>
                <p className="text-white text-sm font-medium">
                  {session.avg_pace_s500m ? formatPace(session.avg_pace_s500m) : "—"}
                  <span className="text-slate-500 text-xs">/500m</span>
                </p>
              </div>
              <div>
                <p className="text-slate-500 text-xs mb-0.5">Avg power</p>
                <p className="text-white text-sm font-medium">
                  {session.avg_power_watts ?? "—"}
                  <span className="text-slate-500 text-xs">W</span>
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
