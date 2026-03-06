"use client";

import { useSimulatedRowingMachine } from "@/hooks/useSimulatedRowingMachine";
import { RowPageShell } from "../_components";
import { useRowingSession } from "@/hooks/useRowingSession";

export default function SimPage() {
  const machine = useSimulatedRowingMachine();
  const session = useRowingSession(machine);

  return (
    <RowPageShell
      state={session}
      ctaLabel="Start Simulation"
      description="Preview the rowing session UI with simulated live data — no rower required."
      simControls={{ speed: machine.simSpeed, setSpeed: machine.setSimSpeed }}
    />
  );
}
