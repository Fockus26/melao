import type { Metadata } from "next";
import { SpikeAudio } from "./spike-audio";

// Herramienta interna del spike 07a·1: sin enlaces hacia aquí y fuera de los buscadores.
export const metadata: Metadata = {
  title: "Spike de audio",
  robots: { index: false, follow: false },
};

export default function SpikeAudioPage() {
  return <SpikeAudio />;
}
