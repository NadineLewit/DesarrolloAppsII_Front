# Vista de Integraciones

La vista consulta `GET /api/public-works/integration-events` con el JWT de la sesión.
Se actualiza mediante polling cada cinco segundos después de finalizar la consulta
anterior. No necesita recargar la página. Al cambiar de filtro o página se cancela
la consulta anterior; al cerrar la sesión se detiene el polling. Ante una falla se
conserva el último listado y se muestra el error hasta recuperar la conexión.

Parámetros: `page` (base cero), `size` (1–100) y `direction`
(`ALL`, `INCOMING`, `OUTGOING`). Respuesta: `content`, `page`, `size`,
`totalElements`, `totalPages`, `first`, `last`.

Cada evento incluye `id`, `direction`, `eventType`, `sourceModule`,
`sourceRequestId` (correlación), `status`, `receivedAt` (registro),
`processedAt` (procesamiento/publicación) y `error`. La API lee el inbox y
outbox persistidos, ordenados por fecha de registro descendente. Un evento saliente
`PENDING` está encolado; solo `PUBLISHED` confirma su publicación. No se exponen
payloads ni se simulan eventos.

## Backend necesario

La implementación está en la rama `codex/integration-events-live`, basada en
`origin/develop`, en `/Users/nadinelewit/Desktop/DesarrolloDeAplicacionesIIBack-integraciones`.
Incluye `IntegrationEventsController` y su prueba HTTP `IntegrationEventsApiTests`.
La rama anterior `feature/primer-parcial-aprobacion-jwt` no tiene inbox/outbox y no
es compatible con esta vista. Para usarla hay que ejecutar o desplegar el backend
de la rama nueva con su configuración habitual de base de datos y mensajería.

Verificación del endpoint: `bash mvnw -Dtest=IntegrationEventsApiTests test`.
La prueba cubre autenticación, ambos sentidos, paginación, validación y exclusión
de payloads. El transporte RabbitMQ sigue siendo responsabilidad del backend;
la vista observa sus registros, no consume directamente las colas.
