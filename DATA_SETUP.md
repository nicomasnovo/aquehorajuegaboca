# Datos de Boca: API-Football + GitHub Actions

## Estado actual
La consulta real a fixtures?team=451&season=2026 fue rechazada por el plan gratuito (solo permite 2022–2024). No se cargaron temporadas históricas. La web lee JSON y muestra claramente el bloqueo; todavía no existe una carga válida de API-Football.

## Activación en GitHub
1. Copiar este proyecto (o al menos scripts/sync-boca.mjs, tests/sync-boca.test.mjs, public/data/ y .github/workflows/update-boca.yml) a un repositorio GitHub. El repositorio de Sites no ejecuta GitHub Actions.
2. En Settings > Secrets and variables > Actions, crear el secret `API_FOOTBALL_KEY` con una clave que tenga acceso al año actual. No incluirla en archivos ni usarla como variable pública.
3. En Settings > Pages, elegir GitHub Actions como origen. El workflow publica únicamente los JSON, no la aplicación ni secretos. Usar un repositorio donde esta publicación sea posible y no reemplace otro sitio Pages existente.
4. Permitir escritura de contenido al GITHUB_TOKEN (Settings > Actions > General) y respetar las reglas de protección de la rama predeterminada. El workflow hace commit directamente de los dos archivos JSON.
5. Ejecutar Actions > Actualizar datos de Boca > Run workflow. El cron corre a los minutos 17 de las 00, 06, 12 y 18 UTC. GitHub puede demorar ejecuciones; no es tiempo real.
6. Tomar la URL de Pages devuelta por el job y colocar esa URL base en `public/data-config.json` como `baseUrl` (sin el nombre del archivo). Republicar la app una vez. Si está vacío, la web usa los JSON incluidos en Sites y esos archivos NO se actualizan automáticamente por cambios en GitHub.

## Flujo
GitHub Actions -> API-Football -> validación completa -> JSON -> GitHub Pages/CDN -> app.
Los visitantes nunca consultan API-Football. El botón de recargar solo vuelve a leer JSON.
El despliegue de Pages se realiza en el mismo workflow, ya que un commit generado por GITHUB_TOKEN no dispara un segundo workflow de push.

## Datos y fallos
- Año actual calculado en la zona horaria de Argentina; no hay fallback a años anteriores.
- Datos: public/data/boca.json. Estado: public/data/sync-status.json.
- Consulta todos los partidos de Boca (451), competencias del año y tablas donde la cobertura indica standings.
- Máximo 20 requests por ejecución (80 al día con el cron). Sin retries automáticos; las ejecuciones manuales consumen cuota adicional.
- Errores HTTP, errores dentro de una respuesta HTTP 200, resultados paginados, temporadas incorrectas y datos inválidos bloquean el reemplazo del snapshot.
- Un fallo conserva la última carga válida, publica el estado del error y deja el job fallido.
- No se emite la respuesta cruda ni la clave en logs.
- Las tablas se muestran completas según lo que devuelva el proveedor. Las copas muestran las rondas y partidos de Boca; no se inventa un cuadro completo.
- No se etiqueta la primera consulta como exitosa hasta que haya una respuesta válida. Sin acceso a la temporada actual, el cron continuará fallando.

## Verificación local
Node 22 o superior, sin instalar dependencias para el sincronizador:

    node --test tests/sync-boca.test.mjs
    node scripts/sync-boca.mjs

El segundo comando lee API_FOOTBALL_KEY del entorno; no pasar claves como argumentos ni guardarlas en el repositorio.

## Habilitar el cron
El job solo corre cuando la variable de Actions `BOCA_SYNC_ENABLED` vale `true`. Configurar primero el secret y Pages. Pages desde repositorios privados depende del plan de GitHub; no cambiar la visibilidad del repositorio para habilitarlo.
