import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/row");

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-8">
      <div className="w-full max-w-md text-center">
        <h1 className="text-3xl font-semibold text-white mb-3">Rowing</h1>
        <p className="text-slate-400 mb-8">
          Track your rowing sessions, chase personal bests, and race your past self.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/signup"
            className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-5 py-2.5 text-sm font-medium transition-colors"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-lg px-5 py-2.5 text-sm font-medium transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
