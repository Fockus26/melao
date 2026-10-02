import {
  CALIBRATION_CLICKS,
  CALIBRATION_MAX_SD_MS,
  CALIBRATION_MEASURED_TAPS,
  CALIBRATION_PRACTICE_TAPS,
  formatOffset,
} from "@/lib/calibration/calibration";

// Copy provisional de Calibrar audífonos (CONTENT_CHECKLIST fila 80; los consejos de toques
// irregulares, fila 81).
export const calibrationCopy = {
  close: "Cerrar y volver al perfil",
  stepOf: (n: number, total: number) => `${n} de ${total}`,
  stepOfLabel: (n: number, total: number) => `Paso ${n} de ${total}`,

  // 1 · Antes de empezar
  eyebrow: "Coach",
  title: "Calibrar audífonos",
  intro:
    "Los audífonos Bluetooth tardan un poco en sonar. Medimos cuánto, para que la cuenta en pantalla aparezca justo cuando la oyes.",
  outputQuestion: "¿Con qué vas a escuchar?",
  outputBluetoothHelp: "Los que más retraso tienen: conviene calibrarlos.",
  outputSpeakerHelp: "Suenan casi sin retraso.",
  volumeTitle: "Sube el volumen",
  volumeText: "Tienes que oír cada clic con claridad.",
  earTitle: "Toca por oído",
  earText: "Toca cuando oigas el clic, sin mirar la pantalla.",
  duration: "Tarda unos 20 segundos.",
  start: "Empezar",
  audioError:
    "No pudimos encender el audio de este navegador. Revisa que no esté silenciado e inténtalo de nuevo.",

  // 2 · Escucha y toca
  listenTitle: "Escucha y toca",
  listenText: `Toca el círculo cada vez que oigas un clic. Vas a oír ${CALIBRATION_CLICKS}.`,
  tapHere: "Toca aquí",
  tapsLabel: "Toques",
  tapValue: (n: number) => `Toque ${n} de ${CALIBRATION_CLICKS}`,
  tapPractice: `los ${CALIBRATION_PRACTICE_TAPS} primeros son de práctica`,
  restart: "Empezar de nuevo",

  // 3 · Resultado
  resultEyebrow: "Tu latencia",
  resultText: (ms: number) =>
    ms > 0
      ? `Con estos audífonos el sonido te llega ${ms} ms tarde. La cuenta en pantalla va a esperar ese tiempo.`
      : "Con esta salida el sonido llega a tiempo: la cuenta en pantalla no necesita esperar.",
  steady: (sd: number) => `Toques parejos · desvío ${sd} ms`,
  chartLabel: (min: number, max: number, mean: number) =>
    `Tus ${CALIBRATION_MEASURED_TAPS} toques medidos llegaron entre ${formatOffset(min)} y ${formatOffset(max)} del clic; el promedio es ${formatOffset(mean)}.`,
  chartLegend:
    "Línea fina: el clic · puntos: tus toques · línea gruesa: el promedio",
  save: "Guardar ajuste",
  repeat: "Repetir",
  fine: "Ajuste fino",

  // Prueba con la cuenta
  test: "Probar con la cuenta",
  testStop: "Detener la prueba",
  testHelp:
    "Suenan 8 clics: el número tiene que cambiar justo cuando oyes cada uno.",

  // 4 · Ajuste fino
  fineTitle: "Ajuste fino",
  fineText:
    "Si el número cambia antes del clic, sube el valor; si cambia después, bájalo.",
  fineLabel: "Latencia",
  fineValueText: (ms: number) => `${formatOffset(ms)}`,
  fineDown: "Bajar 10 ms",
  fineUp: "Subir 10 ms",
  fineSave: (ms: number) => `Guardar ${formatOffset(ms)}`,
  fineBack: "Volver a medir",

  // 5 · Toques irregulares
  irregularTitle: "Toques irregulares",
  irregularBanner: {
    irregular: (sd: number) =>
      `Tus toques variaron demasiado: desvío de ${sd} ms (para medir bien, hasta ${CALIBRATION_MAX_SD_MS}).`,
    out_of_range: (ms: number) =>
      `El resultado (${formatOffset(ms)}) está fuera de lo posible. Puede que hayas empezado un clic tarde o temprano.`,
    incomplete: (taps: number) =>
      `Contamos ${taps} de ${CALIBRATION_CLICKS} toques. Toca una vez por cada clic, hasta el último.`,
  },
  tipsTitle: "Para la próxima",
  tips: [
    "Busca un lugar sin ruido y sube el volumen.",
    "Toca con un solo dedo, siempre de la misma forma.",
    "Empieza con el primer clic y no te adelantes: lo que se mide es lo que oyes.",
  ],
  manual: "Ajustar a mano",

  // 6 · Sin audífonos
  speakerTitle: "Con el altavoz no hace falta",
  speakerText:
    "El altavoz y los audífonos con cable suenan casi sin retraso, y el navegador ya lo compensa. Calibra solo si sientes la cuenta desfasada.",
  savedTitle: "Ajustes guardados",
  savedEmpty: "Todavía no guardaste ningún ajuste.",
  savedInUse: "En uso",
  done: "Listo",
  calibrateAnyway: "Calibrar igual",

  // Guardar
  saving: "Guardando…",
  saved: "Guardado.",
  saveError: "No pudimos guardar el ajuste. Inténtalo de nuevo.",
} as const;
