# ¿A qué hora juega Boca?

Web para consultar próximos partidos, resultados e historial acumulativo de Boca Juniors en la Liga Argentina, Copa Argentina y Copa Libertadores.

## Cómo funciona

- **Proveedor actual:** endpoints JSON públicos **no oficiales** de ESPN (`site.api.espn.com`). No requieren API key ni registro. **No son una API oficial para desarrolladores:** pueden cambiar, bloquear consultas, omitir torneos o dejar de funcionar sin aviso.
- **Actualización:** GitHub Actions ejecuta `.github/workflows/update-boca.yml` cada 6 horas o manualmente.
- **Sincronización:** `scripts/sync-boca.mjs` consulta tres competiciones en ventanas de fechas, filtra encuentros de Boca y normaliza horarios, estado y goles.
- **Persistencia:** combina los eventos nuevos por ID con `public/data/boca.json` y realiza un commit. El JSON es el **historial acumulativo del proyecto**, no una base histórica completa garantizada.
- **Publicación:** el Action publica `boca.json` y `sync-status.json` mediante GitHub Pages. La interfaz consume JSON, no consulta ESPN directamente.
- **Fallos:** ante respuestas inválidas, ausencia de encuentros o errores HTTP, se conserva el último `boca.json` válido y se registra el fallo en `sync-status.json`. El Action puede quedar rojo aun cuando publique el último snapshot.

## Dependencias externas y riesgos

| Componente | Dependencia | Riesgo |
|---|---|---|
| ESPN | API pública **no oficial** sin SLA ni contrato de estabilidad | Cambios de URL, formato, cobertura, límites o bloqueo |
| GitHub Actions | Ejecución programada cada 6 h | Retrasos, fallos o suspensión |
| GitHub Pages | Hosting de JSON | Requiere configuración de Pages; los datos publicados pueden ser públicos |
| Repositorio GitHub | Historial `public/data/boca.json` | La retención depende de conservar el repositorio y sus commits |

**Cobertura no verificada en producción:** los slugs `arg.1`, `arg.copa` y `conmebol.libertadores` están configurados, pero no se garantiza que ESPN devuelva todos los partidos. El sincronizador busca desde 21 días atrás hasta aproximadamente 99 días adelante, en ventanas de 30 días. Un partido no descubierto dentro de esa ventana o una competición sin cobertura no entrará al historial. Los resultados se actualizan si ESPN vuelve a incluir ese partido dentro de las ventanas consultadas. **Las tablas de posiciones no se sincronizan todavía**; se conservan las existentes si las hubiera.

## Puesta en marcha

1. En **Settings → Pages**, configurar **Source: GitHub Actions** y permisos para el entorno `github-pages`. Revisar compatibilidad de Pages con el plan y la visibilidad del repositorio.
2. Ir a **Actions → Actualizar datos de Boca → Run workflow**.
3. Verificar el log de pruebas y el paso de consulta ESPN. Revisar `public/data/sync-status.json`: `ok`, `checkedAt`, `requests`, `received` y `message`.
4. Comprobar `public/data/boca.json` y la URL publicada por Pages.
5. Configurar `public/data-config.json` para que la interfaz consuma la URL de los JSON y desplegar la aplicación. **Modificar este repositorio no redespliega automáticamente la web original creada en Sites.**

**No se requiere `API_FOOTBALL_KEY` ni `BOCA_SYNC_ENABLED`.** Si quedaron configurados de la integración anterior, ya no se usan; pueden eliminarse manualmente de GitHub Settings.

## Pruebas

```sh
node --test tests/sync-boca.test.mjs
```

Las pruebas usan respuestas simuladas. **Que pasen no confirma la cobertura real de ESPN**: comprobar el Action y el JSON después de ejecutarlo.

## Desarrollo local

Proyecto React/TypeScript con Vinext y Vite. Requiere Node 22.13+ y pnpm.

```sh
corepack enable
pnpm install
pnpm dev
```

## Documentación

- [Decisiones de arquitectura (ADR)](docs/decisions/README.md)
- [Configuración de datos](DATA_SETUP.md)

## Aviso sobre datos

Proyecto independiente, no afiliado a ESPN ni a Boca Juniors. Los horarios, resultados y competiciones dependen de fuentes externas y deben contrastarse con canales oficiales antes de tomar decisiones.
