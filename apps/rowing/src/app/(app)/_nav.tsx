"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  function navLink(href: string, label: string) {
    const active = pathname === href || pathname.startsWith(href + "/");
    return (
      <Link
        href={href}
        className={
          active
            ? "text-white text-sm font-medium"
            : "text-slate-400 hover:text-white text-sm transition-colors"
        }
      >
        {label}
      </Link>
    );
  }

  return (
    <nav className="bg-slate-900 border-b border-slate-800 px-6 h-12 flex items-center gap-6 shrink-0">
      <span className="text-white font-semibold text-sm mr-4">Rowing</span>
      {navLink("/row", "Row")}
      {navLink("/sessions", "Sessions")}
      <button
        onClick={signOut}
        className="ml-auto text-slate-400 hover:text-white text-sm transition-colors"
      >
        Sign out
      </button>
    </nav>
  );
}
