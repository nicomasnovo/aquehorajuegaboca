# Plan de Refactorización — ¿A qué hora juega Boca?

**Fecha:** 2026-11-16
**Estado:** Pendiente de aprobación
**Alcance:** Escalabilidad, mantenibilidad, seguridad

---

## Resumen Ejecutivo

El proyecto funciona correctamente pero presenta **deuda técnica significativa**:

1. **Componente monolítico:** `BocaApp.tsx` tiene ~180 líneas comprimidas en una sola línea (minificado), con toda la lógica embebida
2. **Lógica acoplada:** Tipos, constantes, helpers y componentes están mezclados en un solo archivo
3. **UI no utilizada:** ~60 componentes shadcn que no se usan
4. **Archivos de template:** Restos del framework Vinext/Sites que podrían limpiarse
5. **Seguridad:** Sin validación de esquema JSON, sin CSP, fetch sin timeout

---

## Fase 1: Limpieza Inicial (1-2 horas)

### 1.1 Eliminar directorios ya removidos ✅
- [x] `drizzle/` — eliminado
- [x] `examples/d1/` — eliminado

### 1.2 Eliminar componentes UI no utilizados
Los únicos componentes usados de `components/ui/` son:
- `Button` (importado en `connector-error.tsx`)

**Acción:** Eliminar los 59 componentes no utilizados o moverlos a un directorio `components/ui-legacy/` para referencia futura.

```bash
# Mantener solo lo necesario
components/ui/button.tsx
components/ui/button-group.tsx  # depende de separator
components/ui/separator.tsx
components/ui/input.tsx
components/ui/textarea.tsx
components/ui/label.tsx
```

### 1.3 Evaluar archivos de template
| Archivo | Uso | Decisión |
|---------|-----|----------|
| `cloudflare-env.d.ts` | Tipos D1/R2 no usados | Eliminar o reducir |
| `app/chatgpt-auth.ts` | Auth de Sites framework | Mantener si el framework lo requiere |
| `lib/connector-*` | Runtime de Sites | Mantener (requerido por vite.config.ts) |
| `components/connector-error.tsx` | UI de error de connectors | Mantener |
| `worker/index.ts` | Worker entry point | Mantener |

### 1.4 Archivos de configuración
- [ ] Revisar si `pnpm-workspace.yaml` es necesario (proyecto no es monorepo)
- [ ] Verificar `components.json` (shadcn config) - puede reducirse

---

## Fase 2: Desacoplar BocaApp.tsx (3-4 horas)

### Problema actual
```tsx
// BocaApp.tsx: 184 líneas en una sola línea, conteniendo:
// - 15+ tipos TypeScript
// - 10+ constantes
// - 8 funciones helper
// - 4 componentesinline
// - 1 componente principal con 3 vistas
```

### Estructura propuesta

```
app/
├── BocaApp.tsx           # Componente principal (~60 líneas)
├── types/
│   └── index.ts          # Fixture, Competition, Snapshot, Status
├── constants/
│   ├── competitions.ts   # verified2026, LEAGUES config
│   ├── statuses.ts       # finished, excluded, liveStatuses
│   └── mood-lines.ts     # MOOD_LINES
├── hooks/
│   ├── useBocaData.ts    # Fetch y cache de datos
│   ├── useMatchState.ts  # Lógica de estado de partidos
│   ├── useInstallPrompt.ts # PWA install
│   └── useTimezone.ts    # Zona horaria
├── utils/
│   ├── date.ts           # format, fullDate, daysUntil
│   ├── match.ts          # getMatchViewState, roundLabel
│   └── calendar.ts       # ICS generation, Google Calendar
├── components/
│   ├── Badge.tsx
│   ├── TeamCrest.tsx
│   ├── MatchCountdown.tsx
│   ├── SiteNavigation.tsx
│   ├── FixtureCard.tsx
│   └── modals/
│       ├── CalendarModal.tsx
│       └── CompetitionSheet.tsx
└── pages/
    ├── HomePage.tsx
    ├── CalendarPage.tsx
    └── CompetitionsPage.tsx
```

### Beneficios
- **Testeabilidad:** Cada utilidad y hook testeable independientemente
- **Reutilización:** Componentes pueden usarse en otros contextos
- **Mantenibilidad:** Cambios localizados, no en un archivo monolítico
- **Legibilidad:** Código formateado correctamente

---

## Fase 3: Seguridad y Robustez (2-3 horas)

### 3.1 Validación de esquema JSON
**Problema:** El fetch de `boca.json` valida manualmente con ifs.

**Solución:** Implementar Zod (ya en dependencias):

```typescript
// app/schemas/boca.ts
import { z } from 'zod';

export const FixtureSchema = z.object({
  id: z.union([z.number(), z.string()]),
  date: z.string(),
  status: z.string(),
  // ...
});

export const SnapshotSchema = z.object({
  schemaVersion: z.literal(1),
  source: z.enum(['API-Football', 'ESPN (API no oficial)']),
  teamId: z.union([z.literal(5), z.literal(451)]),
  season: z.number().int(),
  fixtures: z.array(FixtureSchema),
  competitions: z.array(CompetitionSchema),
});
```

### 3.2 Timeouts en fetch
**Problema:** Fetch sin timeout, puede colgar indefinidamente.

```typescript
// app/utils/fetch-with-timeout.ts
export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = 10000, ...rest } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...rest,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(id);
  }
}
```

### 3.3 Content Security Policy
**Problema:** Sin CSP, potencial para XSS.

**Solución:** Añadir headers en producción:

```typescript
// next.config.ts o middleware
const csp = `
  default-src 'self';
  img-src 'self' data: https://a.espncdn.com;
  connect-src 'self' https://site.api.espn.com;
  style-src 'self' 'unsafe-inline';
`;
```

### 3.4 Sanitización de inputs en sync-boca.mjs
- Validar URLs antes de fetch
- Escapar caracteres especiales en ICS generation (ya parcialmente implementado)
- Limitar tamaño máximo de respuesta JSON

### 3.5 Variables de entorno sensibles
- [ ] Revisar que no haya secrets en el código (confirmado: no hay API keys)
- [ ] Documentar qué variables son necesarias en `.env.example`

---

## Fase 4: Mejoras de Arquitectura (2-3 horas)

### 4.1 Separar páginas en componentes
Actualmente `BocaApp` maneja 3 vistas con state. Mover a rutas reales o componentes separados:

```tsx
// app/layout.tsx - ya existe, mantener
// app/calendario/page.tsx - ya existe, poblar
// app/competiciones/page.tsx - ya existe, poblar
```

### 4.2 Estado global opcional
Si la navegación entre tabs se complica, considerar:
- Zustand (ligero)
- O mantener el estado en URL como está ahora (buena práctica)

### 4.3 Error boundaries
Añadir error boundaries para cada sección:

```tsx
// app/components/ErrorBoundary.tsx
export function DataErrorBoundary({ children }) {
  return (
    <ErrorBoundary
      fallback={<p>Error cargando datos. <button onClick={retry}>Reintentar</button></p>}
    >
      {children}
    </ErrorBoundary>
  );
}
```

---

## Fase 5: Tests y CI (2 horas)

### 5.1 Tests actuales
- `tests/sync-boca.test.mjs` — 28 líneas, unit tests básicos

### 5.2 Tests propuestos

```
tests/
├── sync-boca.test.mjs     # Existente, ampliar
├── utils/
│   ├── date.test.ts
│   └── match.test.ts
├── components/
│   └── FixtureCard.test.tsx
└── hooks/
    └── useBocaData.test.ts
```

### 5.3 CI improvements
- [ ] Añadir cache de pnpm en GitHub Actions
- [ ] Paralelizar tests
- [ ] Añadir linter check en CI
- [ ] Fallar build si tests fallan

---

## Fase 6: Documentación (1 hora)

### 6.1Actualizar README.md
- [ ] Eliminar referencias a API-Football
- [ ] Documentar estructura de archivos nueva
- [ ] Añadir diagrama de arquitectura

### 6.2 ADRs nuevos
- [ ] ADR-006: Separación de componentes
- [ ] ADR-007: Validación con Zod

### 6.3 JSDoc en funciones públicas
```typescript
/**
 * Determina el estado visual de un partido para renderizado.
 * @param g- Fixture aevaluar
 * @returns Estado normalizado del partido
 */
export function getMatchViewState(g: Fixture): MatchViewState {
```

---

## Estimación de Tiempo

| Fase | Tiempo | Prioridad |
|------|--------|-----------|
| 1. Limpieza inicial | 1-2h | Alta |
| 2. Desacoplar BocaApp | 3-4h | Alta |
| 3. Seguridad | 2-3h | Alta |
| 4. Arquitectura | 2-3h | Media |
| 5. Tests y CI | 2h | Media |
| 6. Documentación | 1h| Baja |
| **Total** | **11-15h** |           |

---

## Orden de Ejecución Recomendado

1. **Fase 1** → Eliminar ruido, respirar mejor
2. **Fase 2** → Desacoplar lo monolítico
3. **Fase 3** → Endurecer seguridad
4. **Fase 4** → Mejorar arquitectura
5. **Fase 5** → Aumentar cobertura de tests
6. **Fase 6** → Documentar cambios

---

## Riesgos y Mitigaciones

| Riesgo | Probabilidad | Mitigación |
|--------|--------------|------------|
| Rotura de funcionalidad al desacoplar | Media | Tests antes y después, feature flags |
| Framework Sites requiere archivos eliminados | Baja | Verificar build pasa antes de commit |
| Cambios en ESPN API durante refactor | Baja | Mantener sync-boca.mjs estable, tests |
| Performance regression | Baja | Medir bundle size, lazy loading |

---

## Métricas de Éxito

- [ ] Bundle size reducido (eliminar componentes no usados)
- [ ] Tests coverage > 70%
- [ ] Build time < 2min
- [ ] Lighthouse score > 90
- [ ] Cero vulnerabilidades en `npm audit`
- [ ] BocaApp.tsx < 100 líneas

---

## Próximos Pasos

1. Revisar y aprobar este plan
2. Ejecutar Fase 1 (limpieza)
3. Hacer PR por cada fase para code review
4. Documentar decisiones en ADRs
