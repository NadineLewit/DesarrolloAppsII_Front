export type DireccionEvento = 'Enviado' | 'Recibido'
export type EstadoContrato = 'PROPOSED' | 'RECEIVED' | 'AGREED' | 'CORE_PENDING' | 'CONFIRMED'

export type ModuloIntegracion = {
  id: string
  nombre: string
  descripcion: string
}

export type EventoIntegracion = {
  nombre: string
  direccion: DireccionEvento
  modulos: string[]
  gatillo: string
  descripcion: string
  payload: string[]
  estadoContrato: EstadoContrato
  nota?: string
}

export const modulosIntegracion: ModuloIntegracion[] = [
  { id: 'M1', nombre: 'Ciudadanos y Expedientes', descripcion: 'Resoluciones administrativas y ciclo de vida de obras.' },
  { id: 'M2', nombre: 'Atención Ciudadana', descripcion: 'Actualizaciones de tickets vinculados con Obras Públicas.' },
  { id: 'M6', nombre: 'Ambiente y Servicios Urbanos', descripcion: 'Alertas urbanas y seguimiento de intervenciones.' },
  { id: 'M7', nombre: 'Tránsito', descripcion: 'Cortes de calle e incidentes viales.' },
]

export const eventosIntegracion: EventoIntegracion[] = [
  {
    nombre: 'ticketUpdated', direccion: 'Recibido', modulos: ['M2'],
    gatillo: 'Atención Ciudadana actualiza un ticket vinculado a una intervención.',
    descripcion: 'Actualiza la información disponible del ticket en Obras Públicas.',
    payload: ['ticketId', 'status', 'priority', 'description', 'location', 'updatedAt'], estadoContrato: 'AGREED',
  },
  {
    nombre: 'updateTicketStatus', direccion: 'Enviado', modulos: ['M2'],
    gatillo: 'Cambia el estado de la orden o intervención asociada a un ticket.',
    descripcion: 'Informa a Atención Ciudadana el estado actualizado del ticket.',
    payload: ['ticketId', 'status', 'updatedAt', 'notes'], estadoContrato: 'AGREED',
  },
  {
    nombre: 'infrastructureRepairRequested', direccion: 'Recibido', modulos: ['M6'],
    gatillo: 'Ambiente informa un daño de infraestructura que requiere intervención.',
    descripcion: 'Permite evaluar la solicitud y crear una orden de trabajo relacionada.',
    payload: ['requestId', 'damageType', 'location', 'severity', 'requiresPublicWorks'], estadoContrato: 'AGREED',
  },
  {
    nombre: 'containerDamaged', direccion: 'Recibido', modulos: ['M6'],
    gatillo: 'Ambiente detecta un contenedor dañado que requiere intervención.',
    descripcion: 'Crea un requerimiento para evaluar su reparación o reposición.',
    payload: ['requestId', 'damageType', 'location', 'severity', 'requiresPublicWorks'], estadoContrato: 'AGREED',
  },
  {
    nombre: 'treeRiskDetected', direccion: 'Recibido', modulos: ['M6'],
    gatillo: 'Ambiente detecta riesgo de arbolado con impacto en la vía pública.',
    descripcion: 'Crea un requerimiento para intervenir o reparar infraestructura afectada.',
    payload: ['requestId', 'damageType', 'location', 'severity', 'requiresPublicWorks'], estadoContrato: 'AGREED',
  },
  {
    nombre: 'workOrderScheduled', direccion: 'Enviado', modulos: ['M6'],
    gatillo: 'Se programa una orden de trabajo originada en Ambiente.',
    descripcion: 'Informa cuándo se realizará la reparación solicitada.',
    payload: ['workOrderId', 'sourceRequestId', 'scheduledDate', 'estimatedDuration'], estadoContrato: 'AGREED',
  },
  {
    nombre: 'workOrderCompleted', direccion: 'Enviado', modulos: ['M6'],
    gatillo: 'Finaliza una orden de trabajo originada en Ambiente.',
    descripcion: 'Notifica el cierre operativo de la solicitud.',
    payload: ['workOrderId', 'sourceRequestId', 'completedAt', 'outcome', 'consumedMaterials', 'evidence'], estadoContrato: 'AGREED',
  },
  {
    nombre: 'streetClosureRequested', direccion: 'Enviado', modulos: ['M7'],
    gatillo: 'Una orden de trabajo requiere interrumpir el tránsito.',
    descripcion: 'Solicita a Tránsito la autorización formal para un corte de calle.',
    payload: ['closureRequestId', 'sourceModule', 'sourceRef', 'reason', 'affectedSections', 'requestedFrom', 'requestedTo', 'closureType', 'requestedAt'], estadoContrato: 'CONFIRMED',
    nota: 'Solicitud normal validada de punta a punta con M7 y Core el 15/11/2026.',
  },
  {
    nombre: 'streetClosureApproved', direccion: 'Recibido', modulos: ['M7'],
    gatillo: 'Tránsito aprueba un corte solicitado por Obras Públicas.',
    descripcion: 'Habilita la ejecución de la orden bajo las condiciones autorizadas.',
    payload: ['streetClosureId', 'closureRequestId', 'requestingModule', 'startDate', 'endDate', 'affectedSections', 'detours', 'conditions'], estadoContrato: 'CONFIRMED',
    nota: 'Entrega y procesamiento confirmados por M3, M7 y Core.',
  },
  {
    nombre: 'streetClosureRejected', direccion: 'Recibido', modulos: ['M7'],
    gatillo: 'Tránsito rechaza un corte solicitado por Obras Públicas.',
    descripcion: 'Requiere reprogramar la orden o modificar el plan operativo.',
    payload: ['closureRequestId', 'rejectionReason', 'requestingModule'], estadoContrato: 'AGREED',
    nota: 'Contrato acordado; el camino rechazado todavía no fue probado de punta a punta.',
  },
  {
    nombre: 'streetClosureEnded', direccion: 'Recibido', modulos: ['M7'],
    gatillo: 'Tránsito informa la finalización de un corte de calle.',
    descripcion: 'Permite cerrar el seguimiento vial asociado a la orden.',
    payload: ['streetClosureId', 'closureRequestId', 'completionDateTime', 'notes'], estadoContrato: 'CONFIRMED',
    nota: 'Entrega y procesamiento confirmados por M3, M7 y Core.',
  },
  {
    nombre: 'roadAccidentRegistered', direccion: 'Recibido', modulos: ['M7'],
    gatillo: 'Tránsito registra un accidente con daños de infraestructura.',
    descripcion: 'Genera una alerta para evaluar una inspección o intervención.',
    payload: ['accidentId', 'accidentDateTime', 'location', 'involvesInfrastructureDamage', 'damageDescription', 'vehicles', 'persons', 'inspectorId'], estadoContrato: 'AGREED',
    nota: 'El consumidor fue corregido para el payload v1.0; falta repetir la prueba E2E antes de confirmarlo.',
  },
  {
    nombre: 'publicWorksProjectApproved', direccion: 'Enviado', modulos: ['M1'],
    gatillo: 'Se aprueba formalmente un proyecto de obra.',
    descripcion: 'Notifica que el proyecto fue validado técnica y financieramente.',
    payload: ['projectId', 'approvedBudget', 'approvedDeadline', 'approvedAt', 'approvedBy'], estadoContrato: 'AGREED',
  },
  {
    nombre: 'publicWorksProjectCompleted', direccion: 'Enviado', modulos: ['M1'],
    gatillo: 'Se da por terminado un proyecto de obra.',
    descripcion: 'Informa la conclusión definitiva del proyecto.',
    payload: ['projectId', 'completionDate', 'finalCost', 'completedBy'], estadoContrato: 'AGREED',
  },
  {
    nombre: 'caseFileResolved', direccion: 'Recibido', modulos: ['M1'],
    gatillo: 'Expedientes resuelve la documentación asociada a una obra.',
    descripcion: 'Actualiza el estado documental del proyecto.',
    payload: ['caseFileId', 'publicWorksProjectId', 'result', 'documentation'], estadoContrato: 'AGREED',
  },
]
