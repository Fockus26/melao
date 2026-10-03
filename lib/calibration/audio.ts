import { hit } from "@/lib/audio/synth";

/**
 * Audio de Calibrar (D030, D142): clics programados con `start(when)` en el reloj de Web Audio,
 * nunca con temporizadores de UI, y los toques pasados a ese mismo reloj. Un solo
 * `AudioContext` por pantalla, creado o reanudado dentro del toque que empieza (D122).
 *
 * El instante del toque es el del reloj de programación (`currentTime`), como el spike
 * (`lib/audio/engine.ts` › `tap`): así el desfase medido es la latencia total que la sesión
 * suma a la posición del reloj (motor-de-ritmo §6). Pendiente de unificar con `lib/player/`
 * cuando la práctica tenga su propio botón de toque.
 */

/** Clic agudo y corto; el acento, más agudo. */
const CLICK_HZ = 1000;
const ACCENT_HZ = 1500;
const CLICK_PEAK = 0.7;
const CLICK_DECAY_S = 0.05;

export class CalibrationAudio {
  private ctx: AudioContext | null = null;
  private nodes: AudioScheduledSourceNode[] = [];

  /** Crea o reanuda el contexto. Llamar dentro del gesto del usuario (D122). */
  async wake(): Promise<AudioContext> {
    if (!this.ctx || this.ctx.state === "closed") {
      this.ctx = new AudioContext({ latencyHint: "interactive" });
    }
    if (this.ctx.state !== "running") await this.ctx.resume();
    return this.ctx;
  }

  /** Posición del reloj de audio (s); `null` sin contexto. */
  now(): number | null {
    return this.ctx ? this.ctx.currentTime : null;
  }

  /**
   * Programa `count` clics separados `intervalS`, el primero a `leadS` de ahora. Acento en el
   * primero de cada `accentEvery` (0 = sin acento). Devuelve el instante de cada clic (s).
   */
  scheduleClicks(
    count: number,
    intervalS: number,
    leadS: number,
    accentEvery = 0,
  ): number[] {
    const ctx = this.ctx;
    if (!ctx) return [];
    this.stop();
    const first = ctx.currentTime + leadS;
    const times: number[] = [];
    for (let i = 0; i < count; i++) {
      const when = first + i * intervalS;
      const accent = accentEvery > 0 && i % accentEvery === 0;
      const osc = ctx.createOscillator();
      osc.frequency.value = accent ? ACCENT_HZ : CLICK_HZ;
      hit(ctx, ctx.destination, osc, when, CLICK_PEAK, CLICK_DECAY_S);
      this.nodes.push(osc);
      times.push(when);
    }
    return times;
  }

  /**
   * Instante de un toque en el reloj de audio: `event.timeStamp` está en el reloj de
   * `performance.now()`; se resta lo que tardó el evento en llegar.
   */
  tapTime(eventTimeStamp: number): number | null {
    const ctx = this.ctx;
    if (!ctx) return null;
    const ageS = Math.max(0, performance.now() - eventTimeStamp) / 1000;
    return ctx.currentTime - ageS;
  }

  /** Corta los clics programados que no sonaron. */
  stop(): void {
    for (const node of this.nodes) {
      try {
        node.stop();
      } catch {
        // Ya había terminado.
      }
    }
    this.nodes = [];
  }

  close(): void {
    this.stop();
    void this.ctx?.close();
    this.ctx = null;
  }
}
