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
VITE_APP_ENV=local
VITE_DEV_API_PROXY_TARGET=
```

La aplicacion consume siempre el backend con rutas relativas bajo `/api/...`.
No configurar ni hardcodear URLs publicas del backend, direcciones locales, tokens ni secretos en el codigo del frontend.

Para conectar el frontend local con un backend local, configurar `VITE_DEV_API_PROXY_TARGET` en un archivo `.env.local` no versionado. Ese valor lo usa solo el proxy de desarrollo de Vite; el codigo de la aplicacion sigue llamando a `/api/...`.

Ejemplo para el backend del equipo ejecutándose localmente:

```text
VITE_DEV_API_PROXY_TARGET=http://localhost:8080
```

## Acceso y roles

La aplicación solicita usuario y contraseña mediante `POST /api/auth/login`. El backend devuelve un JWT con el rol asignado; el token se conserva solo durante la pestaña y se envía como `Authorization: Bearer ...` en las rutas protegidas bajo `/api`.

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

La app consume la API real del backend de Obras Publicas.

Incluye:

- Dashboard con indicadores de obras, ordenes externas y demoras.
- Navegacion por Proyectos, Ordenes, Recursos, Cortes de calle e Integraciones.
- Busqueda, filtro por estado y paginacion real en Ordenes.
- Acciones visibles o bloqueadas segun el rol autenticado por JWT.
- Roles alineados al backlog: Personal de Obras Publicas, Ingeniero o Arquitecto, Responsable autorizado, Jefe de Cuadrilla, Operario o Contratista e Inspector de Obra.
- Formulario de nuevo proyecto con validaciones de nombre, alcance, ubicación, presupuesto, duración y responsable técnico; mantiene el formulario abierto si falla la API.
- Modal de aprobación para Responsable Autorizado con presupuesto, plazo, fecha y observaciones, conectado al `PATCH /api/public-works/projects/{id}/approve`.
- Bloqueo de inicio de orden sin cuadrilla y bloqueo visual cuando existe un corte de calle pendiente de autorizacion.
- Eventos de integracion con direccion, modulos y payloads.
- Ciclo de vida de obra alineado al backend: Borrador, Pendiente de aprobacion, Sin iniciar, En ejecucion, Pausada y Finalizada.

## Estructura

```text
src/
  App.tsx
  api/
    obrasApi.ts
  config/
    env.ts
  constants/
    ui.ts
  contracts/
    integrations.ts
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

- Confirmar JSON exacto de `ProyectoObra`, `OrdenTrabajo`, cuadrillas, maquinaria, materiales y cortes.
- Confirmar nombres definitivos de enums de estado y prioridad.
- Confirmar formato de paginacion y filtros, por ejemplo `?estado=...&page=0&size=20`.
- Confirmar formato comun de errores.
- Confirmar si el frontend debe publicar evidencias fotograficas contra backend o si backend devuelve URL firmada de almacenamiento.
- Confirmar convenciones comunes de Core para campos comunes de eventos: id unico, tipo, fecha, modulo emisor, version y correlacion.
- Confirmar con M6 si `workOrderCompleted` cierra definitivamente la solicitud o si debe esperar `workOrderValidated`.
- Confirmar mapeo entre `outcome` y `result`, y entre `attachments[]` y `evidence`.
