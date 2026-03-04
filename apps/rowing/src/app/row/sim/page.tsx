"use client";

import { useSimulatedRowingMachine } from "@/hooks/useSimulatedRowingMachine";
import { RowPageShell } from "../_components";

export default function SimPage() {
  const state = useSimulatedRowingMachine();
  return (
    <RowPageShell
      state={state}
      ctaLabel="Start Simulation"
      description="Preview the rowing session UI with simulated live data — no rower required."
    />
  );
}
