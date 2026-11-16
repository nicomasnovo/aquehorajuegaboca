// Modal para agregar partido al calendario

import { X, ArrowUpRight, Download, CalendarDays } from 'lucide-react';
import type { Fixture } from '../../types';

interface CalendarModalProps {
  fixture: Fixture;
  onClose: () => void;
}

export function CalendarModal({ fixture, onClose }: CalendarModalProps) {
  return (
    <div className="overlay" onClick={onClose}>
      <section
        className="modal calendarModal"
        role="dialog"
        aria-modal="true"
        aria-label="Agregar partido al calendario"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="close iconButton" aria-label="Cerrar" onClick={onClose}>
          <X />
        </button>

        <h2>Agregar al calendario</h2>
        <p>{fixture.home} vs. {fixture.away}</p>

        <button
          className="calendarOption"
          onClick={() => {
            window.open(
              `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(fixture.home + ' vs. ' + fixture.away + ' - ' + fixture.cup)}&dates=${new Date(fixture.date).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')}/${new Date(Date.parse(fixture.date) + 7200000).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')}&details=${encodeURIComponent('Horario sujeto a cambios.')}&location=${encodeURIComponent(fixture.venue)}`,
              '_blank',
              'noopener,noreferrer'
            );
            onClose();
          }}
        >
          Google Calendar <ArrowUpRight size={17} />
        </button>

        <button
          className="calendarOption"
          onClick={() => {
            downloadICS(fixture);
            onClose();
          }}
        >
          Apple Calendar (.ics) <Download size={17} />
        </button>

        <button
          className="calendarOption"
          onClick={() => {
            downloadICS(fixture);
            onClose();
          }}
        >
          Descargar archivo .ics <Download size={17} />
        </button>

        <p className="fineprint">
          Google Calendar abre el evento para confirmar. En Apple, el archivo .ics se puede
          importar al calendario; la apertura depende del navegador.
        </p>
      </section>
    </div>
  );
}

function downloadICS(fixture: Fixture): void {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//A que hora juega Boca//ES',
    'BEGIN:VEVENT',
    'UID:boca-' + fixture.id + '@aquehorajuegaboca',
    'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').replace('.000', ''),
    'DTSTART:' + new Date(fixture.date).toISOString().replace(/[-:]/g, '').replace('.000', ''),
    'DTEND:' + new Date(Date.parse(fixture.date) + 7200000).toISOString().replace(/[-:]/g, '').replace('.000', ''),
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

function escapeICS(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}
