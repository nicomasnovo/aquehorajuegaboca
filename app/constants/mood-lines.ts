// Frases para el estado de ánimo según el contexto del partido

export const MOOD_LINES = {
  superclasico: [
    'Hoy no es un día cualquiera.',
    'Se suspenden todos los demás compromisos.',
    'Hay partidos y hay superclásicos.',
  ],
  live: [
    'No se habla. Está jugando Boca.',
    'Noventa minutos de prioridades claras.',
    'El corazón no mira el reloj.',
  ],
  soon: [
    'Andá preparando la camiseta.',
    'Falta poco. ¿Ya está todo listo?',
    'La previa también se juega.',
  ],
  today: [
    'Hoy juega Boca. Lo demás puede esperar.',
    'La agenda de hoy tiene un solo protagonista.',
    'Hoy se alienta.',
  ],
  upcoming: [
    'La semana se organiza alrededor de Boca.',
    'Todo bien con los planes, pero ¿cuándo juega Boca?',
    'El calendario tiene una fecha importante.',
  ],
  winning: [
    'Sonríe la mitad más uno.',
    'Tres puntos y una sonrisa azul y oro.',
    'Así da gusto arrancar la semana.',
  ],
  losing: [
    'El lunes hablamos.',
    'Se alienta igual, aunque cueste.',
    'Mañana será otro partido.',
  ],
  draw: [
    'Un punto y varias discusiones.',
    'Hay cosas para charlar después del partido.',
    'El próximo se vuelve a alentar.',
  ],
  empty: [
    '¿Y ahora qué hacemos con tanta vida social?',
    'Se extraña hasta la previa.',
    'A esperar el próximo partido.',
  ],
} as const;

export type MoodCategory = keyof typeof MOOD_LINES;
