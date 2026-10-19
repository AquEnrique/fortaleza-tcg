# YGO Tournament Manager

Gestor de torneos suizos de Yu-Gi-Oh!: registro de jugadores, emparejamientos automáticos o manuales, carga de resultados, tabla de clasificaciones con desempates (OTP, GW%, OGW%), vista de juez para administrar rondas, reloj de ronda con notificaciones, consulta de la lista de puntos de Genesys, y dos utilidades independientes (contador de life points y "Angelechy").

Construido con **Angular 19** (standalone components, signals, SSR) y **Tailwind CSS**.

## Desarrollo

```bash
npm install
npm start        # http://localhost:4200
```

## Lista de cartas de Genesys

```bash
npm run data:genesys   # regenera public/genesys-cards.json
```

Descarga de la API de YGOPRODeck las cartas que cuestan puntos en Genesys (unas 750) y las
normaliza a los campos que usa la vista. Hay que volver a correrlo cuando Konami actualice
la lista de puntos; el JSON guarda la fecha de generación y la vista la muestra al pie.

## Build de producción

```bash
npm run build
```

Genera `dist/angular-app/browser` (sitio estático prerenderizado, una página por ruta) y `dist/angular-app/server` (servidor Node opcional para SSR bajo demanda).

## Estructura

- `src/app/core/` — modelos, lógica de dominio (emparejamiento suizo, clasificaciones) y servicios (`TournamentService`, `ClockService`, etc.), independientes de la UI.
- `src/app/ui/` — librería de componentes/directivas de UI reutilizables (botón, card, diálogos, tabs, tabla, etc.).
- `src/app/features/tournament/` — componentes propios del torneo (registro, emparejamientos, tabla de posiciones, controles).
- `src/app/pages/` — las 5 páginas enrutadas: torneo (`/`), juez (`/judge`), lista Genesys (`/genesys-list`), life points (`/life-points`) y Angelechy (`/angelechy`).
- `src/app/layout/` — cabecera, menú de navegación y reloj de ronda, compartidos por toda la app.

La persistencia del torneo y del reloj de ronda se hace contra Firebase Realtime Database (nodos `torneo` y `reloj`, vía REST) (no hay backend propio); los contadores de life points/Angelechy usan `localStorage`.

La lista de Genesys es un dataset estático (`public/genesys-cards.json`) que se descarga una
vez por sesión desde el navegador. El filtrado, ordenamiento y agrupado viven en
`src/app/core/lib/genesys-filter.ts`, independientes de la UI.
