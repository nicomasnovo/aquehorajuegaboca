// Modal de instalación de PWA

import { X } from 'lucide-react';

interface InstallModalProps {
  onClose: () => void;
}

export function InstallModal({ onClose }: InstallModalProps) {
  return (
    <div className="overlay" onClick={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Instalar app"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="close iconButton" aria-label="Cerrar" autoFocus onClick={onClose}>
          <X />
        </button>

        <h2>Boca, a un toque.</h2>

        <p>
          En Android, abrí este sitio en Chrome, tocá ⋮ y elegí "Agregar a la pantalla
          principal" o "Instalar aplicación".
        </p>

        <p>En iPhone, usá Safari → Compartir → Agregar a inicio.</p>

        <p className="fineprint">Necesita conexión para actualizar los partidos.</p>
      </section>
    </div>
  );
}
