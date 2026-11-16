// Utilidades de formateo de fechas y horarios

/**
 * Formatea una fecha según las opciones dadas en la zona horaria del usuario.
 */
export function formatDate(
  dateStr: string,
  options: Intl.DateTimeFormatOptions,
  timeZone: string = 'UTC'
): string {
  return new Intl.DateTimeFormat('es-AR', { ...options, timeZone }).format(
    new Date(dateStr)
  );
}

/**
 * Devuelve la fecha corta (ej: "15 nov.")
 */
export function shortDate(fixture: { date: string; status?: string }, timeZone: string): string {
  return formatDate(fixture.date, { day: 'numeric', month: 'short' }, timeZone);
}

/**
 * Devuelve la hora del partido (ej: "21:30")
 */
export function matchTime(
  fixture: { date: string; status: string },
  timeZone: string
): string {
  if (!hasConfirmedKickoff(fixture)) {
    return 'Horario por confirmar';
  }
  return formatDate(fixture.date, { hour: '2-digit', minute: '2-digit', hour12: false }, timeZone);
}

/**
 * Devuelve la fecha completa (ej: "sábado 15 de noviembre")
 */
export function fullDate(fixture: { date: string; status?: string }, timeZone: string): string {
  if (fixture.status && !hasConfirmedKickoff(fixture as { date: string; status: string })) {
    return 'Fecha por confirmar';
  }
  return formatDate(fixture.date, { weekday: 'long', day: 'numeric', month: 'long' }, timeZone);
}

/**
 * Verifica si un partido tiene horario confirmado.
 */
export function hasConfirmedKickoff(fixture: { date: string; status: string }): boolean {
  return !['TBD', 'PST'].includes(fixture.status) && Number.isFinite(Date.parse(fixture.date));
}

/**
 * Calcula los días hasta el partido.
 */
export function daysUntil(fixture: { date: string; status: string }, now: Date, timeZone: string): string {
  if (!hasConfirmedKickoff(fixture)) {
    return 'Horario pendiente';
  }

  const today = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const dayKey = (d: Date): string => {
    const parts = today.formatToParts(d);
    const part = (type: string) => parts.find(p => p.type === type)?.value || '00';
    return `${part('year')}-${part('month')}-${part('day')}`;
  };

  const a = dayKey(now);
  const b = dayKey(new Date(fixture.date));

  if (a === b) return 'Hoy';

  const days = Math.round(
    (Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86400000
  );

  return days === 1 ? 'Mañana' : days > 1 ? `En ${days} días` : 'En juego';
}

/**
 * Obtiene el año actual en zona horaria de Buenos Aires.
 */
export function getCurrentYear(timeZone: string = 'America/Argentina/Buenos_Aires'): number {
  return Number(
    new Intl.DateTimeFormat('en', { year: 'numeric', timeZone }).format(new Date())
  );
}

/**
 * Formatea la fecha de actualización.
 */
export function formatUpdated(updatedAt: string | null, timeZone: string): string {
  if (!updatedAt) return 'Sin carga válida';
  return formatDate(updatedAt, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }, timeZone);
}
