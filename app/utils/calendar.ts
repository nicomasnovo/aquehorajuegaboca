// Utilidades para generación de calendarios (ICS y Google Calendar)

import type { Fixture } from '../types';

/**
 * Escapa caracteres especiales para formato ICS.
 */
function escapeICS(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

/**
 * Formatea fecha para ICS (YYYYMMDDTHHMMSSZ).
 */
function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace('.000', '');
}

/**
 * Genera y descarga un archivo ICS para el partido.
 */
export function downloadICS(fixture: Fixture): void {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//A que hora juega Boca//ES',
    'BEGIN:VEVENT',
    'UID:boca-' + fixture.id + '@aquehorajuegaboca',
    'DTSTAMP:' + formatICSDate(new Date()),
    'DTSTART:' + formatICSDate(new Date(fixture.date)),
    'DTEND:' + formatICSDate(new Date(Date.parse(fixture.date) + 7200000)),
    'SUMMARY:' + escapeICS(fixture.home + ' vs. ' + fixture.away + ' - ' + fixture.cup),
    'LOCATION:' + escapeICS(fixture.venue),
    'DESCRIPTION:Verificar cambios de horario antes del partido.',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  const text = lines.join('\r\n');
  const blob = new Blob([text], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'boca-' + fixture.id + '.ics';
  a.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Abre Google Calendar con el evento pre-cargado.
 */
export function openGoogleCalendar(fixture: Fixture): void {
  const start = new Date(fixture.date);
  const stamp = (d: Date): string => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: fixture.home + ' vs. ' + fixture.away + ' - ' + fixture.cup,
    dates: stamp(start) + '/' + stamp(new Date(start.getTime() + 7200000)),
    details: 'Horario sujeto a cambios. Consultar antes del partido.',
    location: fixture.venue,
  });

  window.open('https://calendar.google.com/calendar/render?' + params.toString(), '_blank', 'noopener,noreferrer');
}
