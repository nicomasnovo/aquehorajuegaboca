# ¿A qué hora juega Boca?

Web de Boca Juniors con calendario, competencias nacionales e internacionales y tablas de API-Football.

## Estado
- Código de la app y sincronizador incluidos.
- Datos actuales pendientes: la clave probada no permite la temporada 2026.
- No se incluyen claves ni credenciales.
- GitHub Actions queda desactivado hasta configurar `BOCA_SYNC_ENABLED=true`.
- El sitio existente en Sites no se redespliega automáticamente al modificar este repositorio.

## Configuración de datos
1. En Settings > Secrets and variables > Actions crear el secret `API_FOOTBALL_KEY`.
2. Configurar GitHub Pages con origen GitHub Actions (requiere un plan que admita Pages desde repositorios privados). Los JSON publicados en Pages pueden ser públicos aunque este código sea privado.
3. Crear la variable de Actions `BOCA_SYNC_ENABLED` con valor `true` cuando la API permita consultar la temporada actual y Pages esté configurado.
4. Ejecutar el workflow **Actualizar datos de Boca** manualmente para comprobarlo.
5. Configurar la URL de los JSON en `public/data-config.json` y desplegar la app.

Ver [DATA_SETUP.md](DATA_SETUP.md) para detalles y límites.

## Pruebas del sincronizador

```sh
node --test tests/sync-boca.test.mjs
```

## Desarrollo web

Proyecto React/TypeScript con Vinext y Vite, originalmente generado en Sites. Requiere Node 22.13 o superior y pnpm según package.json.

```sh
corepack enable
pnpm install
pnpm dev
```

La API solo se consulta desde el sincronizador. La interfaz consume JSON; el botón de recarga no gasta cuota del proveedor.
