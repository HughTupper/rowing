"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Returns a Supabase client for use in Client Components and hooks.
 * Call this inside the component/hook body, not at module scope.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
