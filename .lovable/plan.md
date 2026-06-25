## Qué ya existe (no se toca)

- IndexedDB con outbox FIFO persistente (`src/lib/liveOffline.ts`) — los eventos pendientes ya sobreviven cierres de pestaña.
- Cola con `client_id` (anti-duplicados), reintentos con backoff, drenado al volver online.
- `LiveSyncBadge` con 4 estados (online / offline / syncing / error) + pendientes + última sync.
- `real_seconds` / `effective_seconds` en `live_events` y `goals` + `normalizePeriod()` al cerrar periodo.
- `real_duration_pN` en `live_matches` para conversión por periodo.

Es decir, los puntos 2 y 4 del brief ya están cubiertos; del punto 1 falta solo la **recuperación visible al reabrir** y el **snapshot completo del partido en curso**; del punto 3 falta la **arquitectura preparatoria** (no la IA).

## Cambios a implementar

### 1. Snapshot completo del partido activo en IndexedDB
Ya existe `saveSnapshot(liveMatchId, data)` pero no se llama. En `partidos.live.$liveId.tsx`:
- Tras cada `load()` y tras cada cambio relevante (`match`, `pt`, `now`, `running`, tarjetas) hacer `saveSnapshot(liveId, { match, players, pt, ownYellows, ownReds, rivalCards, now, running, savedAt })` con debounce 500 ms.
- Marcar también `mem://live/activeMatchId` (vía `setMeta`) con el liveId activo cuando `status === 'live'`; limpiarlo al finalizar.
- Al montar, si hay snapshot local más reciente que el server y el server falla por offline → hidratar desde snapshot.

### 2. Diálogo "Continuar partido pendiente" en `partidos.live.index.tsx`
- Al montar: leer `getMeta('activeMatchId')` + outbox pendiente.
- Si existe un partido con `status='live'` o con eventos pendientes en la cola, mostrar `AlertDialog`:
  - **Continuar** → navegar a `/partidos/live/$liveId`.
  - **Finalizar** → marcar `status='finished'`, `finished_at=now`, drenar cola.
  - **Descartar** → eliminar de outbox + snapshot local (no toca server).
- Mismo diálogo al entrar a `/partidos/live/nuevo` para evitar abrir otro encima.

### 3. Arquitectura de interrupciones (preparación, sin IA)
- Añadir a `live_events.kind` los valores semánticos: `interruption_start` / `interruption_end` (texto libre, no requiere migración — la columna es `text`).
- En `src/lib/liveNormalize.ts`: nueva función `computeEffectiveByInterruptions(events, realDuration, period)` que, si hay pares start/end, descuenta esos segundos al calcular el factor. Si no hay interrupciones, fallback al proporcional actual (comportamiento idéntico hoy).
- `closePeriod()` usará la nueva función → mismo resultado para partidos sin interrupciones registradas, mejor precisión cuando existan.
- Sin UI nueva todavía para registrarlas (futura iteración); los eventos ya existentes (faltas, tiempos muertos, goles) seguirán contando como hoy.

### 4. Indicadores adicionales en `LiveSyncBadge`
- Tooltip extendido con: pendientes, última sync, "snapshot guardado hace Xs".

## Archivos tocados

- `src/routes/partidos.live.$liveId.tsx` — snapshot + hidratación.
- `src/routes/partidos.live.index.tsx` — diálogo de recuperación.
- `src/routes/partidos.live.nuevo.tsx` — chequeo de partido pendiente.
- `src/lib/liveNormalize.ts` — `computeEffectiveByInterruptions`.
- `src/lib/liveSync.ts` — exportar helper `getActiveMatchId()` / `setActiveMatchId()`.

## Lo que NO se hace (confirmar si quieres incluirlo)

- IA real de detección de patrones de interrupción (queda como hueco arquitectónico, no implementado).
- UI para marcar manualmente interrupciones (botón "Parar/Reanudar juego efectivo"). Si lo quieres, lo añado.
- Cambios en datos históricos.

¿Procedo así, o quieres también el botón manual de interrupciones en la UI del LIVE?
