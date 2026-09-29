"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Stage } from "@/components/stage/stage";
import { createFakeStageSource, FAKE_BPM } from "@/lib/stage/fake-source";
import { DEMO_STATES, type DemoState, type DemoStateId } from "./demo-states";

/** El Stage con el motor falso en el estado pedido. Se remonta (`key`) al cambiar de estado. */
export function StageDemo({ state }: { state: DemoStateId }) {
  const router = useRouter();
  const demo: DemoState = DEMO_STATES[state];
  const [source] = useState(() => createFakeStageSource(demo.options));
  return (
    <Stage
      source={source}
      styleLabel="Salsa casino"
      bpm={demo.options.bpm ?? FAKE_BPM}
      defaultExitOpen={demo.exitOpen}
      onExit={() => router.push("/layouts")}
    />
  );
}
