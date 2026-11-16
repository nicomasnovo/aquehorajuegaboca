# ADR-007 — Validación con timeout y esquema (2026-11-16)

**Estado:** Adoptada.

**Contexto:** El fetch de datos JSON tenía dos problemas de seguridad:
1. Sin timeout: podía colgar indefinidamente si el servidor no responde
2. Validación manual con ifs: propenso a errores y difícil de mantener

**Decisión:**

### 1. Timeout en fetch
Implementar `fetchWithTimeout()` con AbortController:

```typescript
async function fetchWithTimeout(url: string, timeout = 15000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}
```

Timeout por defecto: 15 segundos.

### 2. Validación de esquema básica
Mantener validación manual mejorada (Zod está disponible pero no se usa para evitar overhead):

```typescript
// Validaciones esenciales antes de usar los datos
if (
  d.schemaVersion !== 1 ||
  !['API-Football', 'ESPN (API no oficial)'].includes(d.source) ||
  ![5, 451].includes(d.teamId) ||
  !Number.isInteger(d.season) ||
  !Array.isArray(d.fixtures) ||
  !Array.isArray(d.competitions)
) {
  throw new Error('Esquema inválido');
}
```

**Consecuencias:**
- Las peticiones colgadas no bloquean la UI indefinidamente
- Los datos corruptos no rompen la aplicación silenciosamente
- El usuario recibe mensajes de error claros

**Alternativa futura:**
Migrar a Zod si el esquema se vuelve más complejo o se necesitan mensajes de error detallados.
