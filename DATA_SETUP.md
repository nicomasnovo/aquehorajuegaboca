# Configuración de datos — ESPN y GitHub Actions

> Documento operativo. Para motivos, alternativas y riesgos ver [ADR](docs/decisions/README.md).

## Proveedor

Se usan endpoints **no oficiales** de ESPN bajo `https://site.api.espn.com/apis/site/v2/sports/soccer/`. No requieren clave, pero **no tienen garantía de disponibilidad, estabilidad ni cobertura**. El proveedor anterior API-Football Free fue retirado porque rechazaba los partidos actuales con `PLAN_RESTRICTED`.

Competiciones configuradas: `arg.1` (Liga Argentina), `arg.copa` (Copa Argentina) y `conmebol.libertadores` (Libertadores). Se hacen 12 solicitudes por ejecución: 3 competiciones × 4 ventanas de 30 días. Se buscan partidos desde 21 días atrás hasta unos 99 días adelante. Los encuentros anteriores quedan en el archivo acumulativo.

## Configuración

1. En **Settings → Pages** elegir **GitHub Actions** como origen. Configurar el entorno `github-pages` y los permisos del repositorio.
2. En **Settings → Actions → General** permitir que el workflow escriba contenido, si la configuración del repositorio lo requiere.
3. En **Actions → Actualizar datos de Boca** ejecutar **Run workflow**.
4. Revisar `public/data/sync-status.json` y `public/data/boca.json` para confirmar datos reales.
5. Colocar la URL base de Pages en `public/data-config.json` y desplegar la aplicación creada en Sites. Los commits de GitHub no la despliegan automáticamente.

**No hacen falta secretos de API ni la variable `BOCA_SYNC_ENABLED`.** Los anteriores `API_FOOTBALL_KEY` y `BOCA_SYNC_ENABLED` se pueden retirar manualmente.

## Operación

- Workflow: `.github/workflows/update-boca.yml`.
- Frecuencia: cada 6 horas (minuto 17, UTC); puede demorarse. También admite ejecución manual.
- Tests: `node --test tests/sync-boca.test.mjs`.
- Ejecutar sincronización local: `node scripts/sync-boca.mjs`.
- Datos: `public/data/boca.json`.
- Estado: `public/data/sync-status.json`.
- Publicación: JSON en GitHub Pages. No publica la aplicación.
- Errores: preserva el último snapshot; el Action informa fallo. No asumir que `ok: true` significa cobertura completa de las tres competiciones.
- Posiciones: no se sincronizan todavía.
- Precaución: la API de ESPN es no oficial; cambios de formato, restricciones, respuestas vacías y datos faltantes requieren mantenimiento. Confirmar datos con fuentes oficiales.

## Solución de problemas

- `HTTP_ERROR`: revisar código HTTP y conectividad de ESPN desde Actions.
- `EMPTY_RESPONSE`: ESPN no devolvió partidos de Boca en las ventanas; se conserva el archivo.
- `INVALID_RESPONSE`: cambió o falló el formato esperado.
- Error de Pages: revisar Settings → Pages, entorno `github-pages` y los artefactos de despliegue.
- Archivo sin actualizar: comprobar permisos de `GITHUB_TOKEN`, protección de rama y logs del paso de commit.
