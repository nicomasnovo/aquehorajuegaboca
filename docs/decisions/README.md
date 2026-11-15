# Architecture Decision Records (ADR)

Decisiones vigentes del proyecto «¿A qué hora juega Boca?». Revisar estos registros antes de cambiar el proveedor, el Action o el esquema JSON.

## ADR-001 — ESPN como proveedor principal (2026-11-15)

**Estado:** Adoptada, pendiente de validación de cobertura en una ejecución real.

**Contexto:** API-Football Free respondió `PLAN_RESTRICTED` al solicitar partidos actuales, incluso usando `fixtures?team=451&next=20`. La aplicación necesita partidos futuros y resultados de Boca en múltiples competiciones.

**Decisión:** consultar los endpoints públicos no oficiales de ESPN:
- `https://site.api.espn.com/apis/site/v2/sports/soccer/arg.1/scoreboard`
- `https://site.api.espn.com/apis/site/v2/sports/soccer/arg.copa/scoreboard`
- `https://site.api.espn.com/apis/site/v2/sports/soccer/conmebol.libertadores/scoreboard`

Usar `dates=YYYYMMDD-YYYYMMDD`, cuatro ventanas de 30 días por competición, filtrar por Boca Juniors y convertir a esquema local. No se necesita API key.

**Consecuencias:** no se pagan consultas y se elimina el secret operativo; a cambio, ESPN no ofrece API pública oficial, SLA ni garantía de disponibilidad o cobertura. Es posible recibir errores HTTP, esquemas distintos, datos incompletos o cambios de slug. No confundir disponibilidad pública con autorización contractual o permanencia. Revisar términos de uso antes de ampliar el proyecto.

**Validación pendiente:** ejecutar GitHub Actions y confirmar que las tres competiciones y sus partidos realmente aparecen. Las pruebas automáticas usan mocks.

## ADR-002 — GitHub JSON como historial acumulativo (2026-11-15)

**Estado:** Adoptada.

**Contexto:** los endpoints de calendarios muestran una ventana móvil, por lo que los encuentros anteriores pueden desaparecer.

**Decisión:** conservar `public/data/boca.json`, unir partidos nuevos por identificador estable `espn:<slug>:<eventId>` y actualizar resultados/horarios cuando reaparecen. Mantener los registros anteriores; no borrar todo el archivo en cada sincronización.

**Consecuencias:** el historial crece desde la primera captura exitosa, pero no recupera automáticamente partidos nunca observados. Los identificadores heredados de API-Football se conservan y pueden coexistir con los de ESPN. Un mismo partido obtenido de proveedores distintos podría duplicarse y requerir migración/deduplicación futura. No usar este JSON como fuente histórica exhaustiva.

## ADR-003 — GitHub Actions + Pages y estrategia de fallos (2026-11-15)

**Estado:** Adoptada.

**Decisión:** ejecutar el sincronizador cada seis horas y manualmente; guardar JSON y estado mediante commits; publicar ambos en GitHub Pages con un nombre único de artefacto por ejecución. La interfaz lee JSON publicado, sin depender de ESPN en cada visita.

**Consecuencias:** si la API falla se mantiene el último snapshot válido, se registra el error y el Action informa fallo. Los datos pueden quedar desactualizados. El workflow requiere permisos de escritura y Pages correctamente configurado. GitHub Pages puede publicar datos públicamente incluso desde un repositorio privado.

## ADR-004 — Posiciones y alcance de cobertura (2026-11-15)

**Estado:** Pendiente.

**Decisión provisional:** no inventar tablas de posiciones. Se mantienen las existentes en el JSON si las hubiera, pero no se actualizan desde ESPN. Se consultan solamente tres competiciones; la cobertura y el calendario real deben validarse.

**Siguiente paso:** probar `/apis/v2/sports/soccer/{league}/standings`, normalizar grupos y posiciones, y añadir tests antes de habilitarlo. Documentar también otras competiciones si Boca participa.

## ADR-005 — Retiro de API-Football (2026-11-15)

**Estado:** Adoptada.

**Contexto:** el plan Free restringió las consultas actuales.

**Decisión:** el Action ya no usa `API_FOOTBALL_KEY`. No almacenar claves en código ni en JSON. Mantener el historial generado previamente y el esquema de salida para la web.

**Consecuencias:** la clave puede eliminarse manualmente de GitHub Secrets. Si se vuelve a un proveedor autenticado, crear un nuevo ADR que incluya cuotas, límites, credenciales y política de fallos.
