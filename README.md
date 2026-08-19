# DesarrolloAppsII Front

Frontend web del modulo 3 del TPO: Obras publicas, infraestructura y mantenimiento urbano.

## Stack y versiones

- React 19
- TypeScript 6
- Vite 8
- Vitest 4
- Nginx 1.29 para la imagen Docker
- Node 24 para build de Docker

## Como correrlo localmente

```bash
npm install
npm run dev
```

La app queda disponible en:

```text
http://127.0.0.1:5173/
```

## Configuracion local

Copiar el archivo de ejemplo y ajustar valores locales si hace falta:

```bash
cp .env.example .env
```

Variables:

```text
VITE_API_BASE_URL=http://localhost:8080/api
VITE_APP_ENV=local
```

No subir `.env` ni valores reales de secretos.

## Comandos reproducibles

```bash
npm install
npm run lint
npm run test
npm run test:coverage
npm run build
npm run preview
```

## Docker

Contexto de build: raiz del repositorio.

Dockerfile:

```text
Dockerfile
```

Build local:

```bash
docker build -t desarrolloappsii-front .
```

Ejecucion local:

```bash
docker run --rm -p 8080:8080 desarrolloappsii-front
```

Puerto interno del contenedor:

```text
8080
```

Health check:

```text
GET /health
```

Respuesta esperada:

```json
{"status":"ok","service":"desarrolloappsii-front"}
```

## Alcance funcional actual

La app arranca con datos mockeados para permitir avanzar antes de que el backend este terminado.

Incluye:

- Dashboard con indicadores de obras, ordenes, alertas externas y demoras.
- Navegacion por Proyectos, Ordenes, Recursos, Cortes de calle e Integraciones.
- Busqueda, filtro por estado y paginacion simulada en Ordenes.
- Acciones visibles o bloqueadas segun rol autenticado simulado.
- Roles alineados al backlog: Personal de Obras Publicas, Ingeniero o Arquitecto, Responsable autorizado, Jefe de Cuadrilla, Operario o Contratista e Inspector de Obra.
- Eventos de integracion con direccion, modulos y payloads.
- Ciclo de vida de obra: Borrador, Pendiente de aprobacion, Aprobada, Rechazada, En ejecucion, Suspendida y Finalizada.

## Estructura

```text
src/
  App.tsx
  config/
    env.ts
  contracts/
    integrations.ts
  data/
    mockData.ts
  types.ts
  utils/
    formatters.ts
    orders.ts
```

## Eventos publicados

- `publicWorksProjectCreated`
- `publicWorksProjectSubmittedForApproval`
- `publicWorksProjectApproved`
- `publicWorksProjectRejected`
- `publicWorksProjectStarted`
- `publicWorksProgressRegistered`
- `publicWorksExtensionRequested`
- `publicWorksExtensionApproved`
- `publicWorksExtensionRejected`
- `publicWorksProjectSuspended`
- `publicWorksProjectResumed`
- `publicWorksProjectCompleted`
- `workOrderCreated`
- `workOrderScheduled`
- `workOrderAssigned`
- `workOrderStarted`
- `workOrderPaused`
- `workOrderDelayed`
- `workOrderRescheduled`
- `workOrderCompleted`
- `workOrderValidated`
- `workOrderReopened`
- `streetClosureRequested`

## Eventos consumidos

- `caseFileResolved`
- `complaintRouted`
- `complaintEscalated`
- `infrastructureRepairRequested`
- `containerDamaged`
- `treeRiskDetected`
- `trafficIncidentRegistered`
- `streetClosureAuthorized`
- `streetClosureRejected`

## Pendientes de contrato

- Confirmar URL base de la API del backend.
- Confirmar JSON exacto de `ProyectoObra`, `OrdenTrabajo`, cuadrillas, maquinaria, materiales y cortes.
- Confirmar nombres definitivos de enums de estado y prioridad.
- Confirmar formato de paginacion y filtros, por ejemplo `?estado=...&page=0&size=20`.
- Confirmar formato comun de errores.
- Confirmar autenticacion, JWT y roles.
- Confirmar si el frontend debe publicar evidencias fotograficas contra backend o si backend devuelve URL firmada de almacenamiento.
- Confirmar convenciones comunes de Core para campos comunes de eventos: id unico, tipo, fecha, modulo emisor, version y correlacion.
- Confirmar con M6 si `workOrderCompleted` cierra definitivamente la solicitud o si debe esperar `workOrderValidated`.
- Confirmar mapeo entre `outcome` y `result`, y entre `attachments[]` y `evidence`.
