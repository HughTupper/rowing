"use client";

import { useRowingMachine } from "@/hooks/useRowingMachine";
import { RowPageShell } from "./_components";

export default function RowPage() {
  const state = useRowingMachine();
  return <RowPageShell state={state} />;
}
