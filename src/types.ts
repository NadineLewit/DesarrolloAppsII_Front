export type Rol =
  | 'PERSONAL_OBRAS'
  | 'INGENIERO_ARQUITECTO'
  | 'RESPONSABLE_AUTORIZADO'
  | 'JEFE_CUADRILLA'
  | 'OPERARIO_CONTRATISTA'
  | 'INSPECTOR_OBRA'

export type Seccion = 'dashboard' | 'obras' | 'ordenes' | 'recursos' | 'cortes' | 'integraciones'

export type ProjectStatus =
  | 'BORRADOR'
  | 'PENDIENTE_APROBACION'
  | 'APROBADO'
  | 'RECHAZADO'
  | 'SIN_INICIAR'
  | 'EN_EJECUCION'
  | 'PAUSADA'
  | 'FINALIZADA'

export type WorkOrderStatus =
  | 'PENDIENTE'
  | 'PROGRAMADA'
  | 'ASIGNADA'
  | 'EN_EJECUCION'
  | 'PAUSADA'
  | 'COMPLETADA'
  | 'VALIDADA'
  | 'REABIERTA'

export type WorkOrderPriority = 'BAJA' | 'MEDIA' | 'ALTA'
export type WorkOrderOrigin = 'MANUAL' | 'ATENCION_CIUDADANA' | 'INSPECCION' | 'PROYECTO'

export type EstadoObra = ProjectStatus
export type EstadoOrden = WorkOrderStatus
export type Prioridad = WorkOrderPriority

export type ProyectoObra = {
  id: number
  name: string
  description?: string | null
  scope?: string | null
  location?: string | null
  estimatedBudget: number
  approvedBudget?: number | null
  estimatedStartDate: string
  estimatedDurationDays: number
  approvedDeadlineDays?: number | null
  physicalProgress: number
  budgetProgress: number
  status: ProjectStatus
  technicalManager?: string | null
  contractor?: string | null
  approvedAt?: string | null
  approvalObservations?: string | null
}

export type ProjectApprovalPayload = { approvedBudget: number; approvedDeadlineDays: number; approvedAt: string; observations?: string }

export type LoginResponse = {
  accessToken: string
  username: string
  role: Rol
}

export type ProyectoObraPayload = {
  name: string
  description?: string
  scope?: string
  location?: string
  estimatedBudget: number
  approvedBudget?: number
  usedBudget?: number
  estimatedStartDate: string
  estimatedDurationDays: number
  approvedDeadlineDays?: number
  physicalProgress?: number
  technicalManager?: string
  contractor?: string
}

export type OrdenTrabajo = {
  id: number
  sourceRequestId?: string | null
  origin: WorkOrderOrigin
  projectId?: number | null
  description: string
  interventionType?: string | null
  location?: string | null
  priority: WorkOrderPriority
  status: WorkOrderStatus
  crew?: string | null
  scheduledDate?: string | null
  estimatedDurationHours?: number | null
  hasEvidence: boolean
  outcome?: string | null
}

export type OrdenTrabajoPayload = {
  sourceRequestId?: string
  origin: WorkOrderOrigin
  projectId?: number | null
  description: string
  interventionType?: string
  location?: string
  priority: WorkOrderPriority
  estimatedDurationHours?: number
  crew?: string
}

export type ScheduleOTPayload = {
  scheduledDate: string
  crew?: string
}

export type CompleteOTPayload = {
  outcome?: string
}

export type ValidateOTPayload = {
  approved: boolean
  observations?: string
}

export type Cuadrilla = {
  id: number
  nombre: string
}

export type Material = {
  id: number
  nombre: string
  unidad?: string | null
}

export type Maquinaria = {
  id: number
  nombre: string
}

export type ResourcesSummary = {
  crews: Cuadrilla[]
  materials: Material[]
  machinery: Maquinaria[]
}

export type CorteCalle = {
  id: number
  closureRequestId: string
  sourceModule: string
  workOrderId: number
  location: string
  affectedSections: string[]
  status: string
  requestedFrom: string
  requestedTo: string
  reason: string
}

export type CorteCallePayload = {
  workOrderId: number
  location: string
  affectedSections: string[]
  requestedFrom: string
  requestedTo: string
  reason: string
}

export type DashboardSummary = {
  asOfDate: string
  totalProjects: number
  activeProjects: number
  openWorkOrders: number
  externalWorkOrders: number
  delayedWorkOrders: number
  delayedProjects: number
  averagePhysicalProgress: number
  estimatedBudget: number
  approvedBudget: number
  usedBudget: number
  budgetProgress: number
  crewLoads: Array<{
    crewId: number
    name: string
    openWorkOrders: number
  }>
}

export type PageResponse<T> = {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}
