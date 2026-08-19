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
  {
    id: 'M1',
    nombre: 'Ciudadanos',
    descripcion: 'Ciudadanos, Organizaciones y Expedientes',
  },
  {
    id: 'M2',
    nombre: 'At. Ciudadana',
    descripcion: 'Atencion Ciudadana, Reclamos y Solicitudes',
  },
  {
    id: 'M6',
    nombre: 'Ambiente',
    descripcion: 'Ambiente, Higiene y Servicios Urbanos',
  },
  {
    id: 'M7',
    nombre: 'Transito',
    descripcion: 'Transito, Estacionamiento y Seguridad Vial',
  },
]

export const eventosIntegracion: EventoIntegracion[] = [
  {
    nombre: 'publicWorksProjectApproved',
    direccion: 'Enviado',
    modulos: ['M1'],
    gatillo: 'El responsable autorizado aprueba formalmente un proyecto de obra en el portal web.',
    descripcion: 'Notifica que el proyecto fue validado tecnica y financieramente y queda listo para logistica.',
    payload: ['projectId', 'approvedBudget', 'approvedDeadLine', 'approvedAt', 'approvedBy'],
    estadoContrato: 'PROPOSED',
  },
  {
    nombre: 'publicWorksProjectCompleted',
    direccion: 'Enviado',
    modulos: ['M1'],
    gatillo: 'Se cierran las ordenes de trabajo, se cargan notificaciones finales y se da por terminada la obra.',
    descripcion: 'Informa la conclusion definitiva del proyecto para cerrar expedientes y habilitar auditorias.',
    payload: ['projectId', 'completionDate', 'finalCost', 'completedBy'],
    estadoContrato: 'PROPOSED',
  },
  {
    nombre: 'caseFileResolved',
    direccion: 'Recibido',
    modulos: ['M1'],
    gatillo: 'Expedientes resuelve la documentacion asociada a una obra.',
    descripcion: 'Actualiza el estado documental del proyecto y destraba instancias con dictamen legal.',
    payload: ['caseFileId', 'publicWorksProjectId', 'result', 'documentation'],
    estadoContrato: 'PROPOSED',
  },
  {
    nombre: 'workOrderScheduled',
    direccion: 'Enviado',
    modulos: ['M2', 'M6', 'M7'],
    gatillo: 'El jefe de cuadrilla o planificador asigna fecha, hora y equipo a una orden de trabajo.',
    descripcion: 'Avisa al modulo origen cuando se llevara a cabo la reparacion solicitada.',
    payload: ['workOrderId', 'sourceRequestId', 'scheduledDate', 'estimatedDuration'],
    estadoContrato: 'PROPOSED',
  },
  {
    nombre: 'workOrderCompleted',
    direccion: 'Enviado',
    modulos: ['M2', 'M6', 'M7'],
    gatillo: 'El operario termina la tarea y/o el inspector valida el resultado.',
    descripcion: 'Notifica el cierre operativo para que el modulo origen cierre la solicitud.',
    payload: ['workOrderId', 'sourceRequestId', 'completedAt', 'outcome', 'consumedMaterials', 'evidence'],
    estadoContrato: 'PROPOSED',
  },
  {
    nombre: 'workOrderUpdated',
    direccion: 'Enviado',
    modulos: ['M2'],
    gatillo: 'La orden cambia a un estado intermedio en el terreno.',
    descripcion: 'Unifica notificaciones operativas menores, por ejemplo iniciada, pausada, demorada o reprogramada.',
    payload: ['workOrderId', 'sourceRequestId', 'status', 'updatedAt', 'notes'],
    estadoContrato: 'PROPOSED',
  },
  {
    nombre: 'ticketRouted',
    direccion: 'Recibido',
    modulos: ['M2'],
    gatillo: 'Atencion Ciudadana deriva un reclamo de infraestructura.',
    descripcion: 'Ingresa al portal web como nueva solicitud de evaluacion.',
    payload: ['ticketId', 'category', 'location', 'priority', 'description'],
    estadoContrato: 'PROPOSED',
  },
  {
    nombre: 'ticketEscalated',
    direccion: 'Recibido',
    modulos: ['M2'],
    gatillo: 'Atencion Ciudadana escala un reclamo por criticidad o SLA.',
    descripcion: 'Ingresa al portal web como nueva solicitud prioritaria de evaluacion.',
    payload: ['ticketId', 'category', 'location', 'priority', 'description'],
    estadoContrato: 'PROPOSED',
  },
  {
    nombre: 'infrastructureRepairRequested',
    direccion: 'Recibido',
    modulos: ['M6'],
    gatillo: 'Ambiente detecta un dano que requiere obra civil.',
    descripcion: 'Crea un requerimiento interno para generar una orden de trabajo y priorizar segun riesgo.',
    payload: ['requestId', 'damageType', 'location', 'severity', 'requiresPublicWorks'],
    estadoContrato: 'PROPOSED',
    nota: 'El backlog PDF tambien lo menciona como InfrastructureRepairRequested; falta confirmar casing.',
  },
  {
    nombre: 'containerDamaged',
    direccion: 'Recibido',
    modulos: ['M6'],
    gatillo: 'Ambiente detecta un contenedor danado que requiere reparacion de infraestructura.',
    descripcion: 'Crea un requerimiento interno para evaluar reparacion o reposicion.',
    payload: ['requestId', 'damageType', 'location', 'severity', 'requiresPublicWorks'],
    estadoContrato: 'PROPOSED',
  },
  {
    nombre: 'treeRiskDetected',
    direccion: 'Recibido',
    modulos: ['M6'],
    gatillo: 'Ambiente detecta riesgo de arbolado con impacto en via publica.',
    descripcion: 'Crea un requerimiento interno para intervenir, senalizar o reparar infraestructura afectada.',
    payload: ['requestId', 'damageType', 'location', 'severity', 'requiresPublicWorks'],
    estadoContrato: 'PROPOSED',
  },
  {
    nombre: 'streetClosureRequested',
    direccion: 'Enviado',
    modulos: ['M7'],
    gatillo: 'Una orden de trabajo requiere interrumpir el paso vehicular.',
    descripcion: 'Solicita autorizacion formal al modulo de Transito para cortar una calle.',
    payload: ['closureRequestId', 'sourceModule', 'workOrderId', 'affectedSections', 'requestedFrom', 'requestedTo'],
    estadoContrato: 'PROPOSED',
  },
  {
    nombre: 'streetClosureApproved',
    direccion: 'Recibido',
    modulos: ['M7'],
    gatillo: 'Transito autoriza un corte solicitado por Obras.',
    descripcion: 'Desbloquea la orden para que pueda ejecutarse por la cuadrilla.',
    payload: ['closureRequestId', 'authorizedSections', 'conditions', 'reason'],
    estadoContrato: 'PROPOSED',
  },
  {
    nombre: 'streetClosureRejected',
    direccion: 'Recibido',
    modulos: ['M7'],
    gatillo: 'Transito rechaza un corte solicitado por Obras.',
    descripcion: 'Fuerza una reprogramacion de la orden o un cambio de plan operativo.',
    payload: ['closureRequestId', 'authorizedSections', 'conditions', 'reason'],
    estadoContrato: 'PROPOSED',
  },
  {
    nombre: 'streetClosureEnded',
    direccion: 'Recibido',
    modulos: ['M7'],
    gatillo: 'Transito informa que finalizo el corte.',
    descripcion: 'Permite cerrar el seguimiento de seguridad vial asociado a la orden.',
    payload: ['closureRequestId', 'authorizedSections', 'conditions', 'reason'],
    estadoContrato: 'PROPOSED',
  },
  {
    nombre: 'roadAccidentRegistered',
    direccion: 'Recibido',
    modulos: ['M7'],
    gatillo: 'Transito registra un accidente con danos de infraestructura.',
    descripcion: 'Genera una alerta preventiva para enviar inspeccion o cuadrilla.',
    payload: ['incidentId', 'location', 'reportedDamage', 'severity'],
    estadoContrato: 'PROPOSED',
  },
]
