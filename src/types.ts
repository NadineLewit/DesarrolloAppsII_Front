export type Rol =
  | 'PERSONAL_OBRAS'
  | 'INGENIERO_ARQUITECTO'
  | 'RESPONSABLE_AUTORIZADO'
  | 'JEFE_CUADRILLA'
  | 'OPERARIO_CONTRATISTA'
  | 'INSPECTOR_OBRA'
export type Seccion = 'dashboard' | 'obras' | 'ordenes' | 'recursos' | 'cortes' | 'integraciones'
export type EstadoObra =
  | 'BORRADOR'
  | 'PENDIENTE_APROBACION'
  | 'APROBADA'
  | 'RECHAZADA'
  | 'EN_EJECUCION'
  | 'SUSPENDIDA'
  | 'FINALIZADA'
export type EstadoOrden =
  | 'CREADA'
  | 'PROGRAMADA'
  | 'ASIGNADA'
  | 'INICIADA'
  | 'PAUSADA'
  | 'DEMORADA'
  | 'REPROGRAMADA'
  | 'FINALIZADA'
  | 'VALIDADA'
  | 'REABIERTA'
export type Prioridad = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA'

export type ProyectoObra = {
  id: number
  nombre: string
  descripcion: string
  alcance: string
  ubicacion: string
  presupuesto: number
  presupuestoAprobado?: number
  fechaEstimadaInicio: string
  duracionEstimadaDias: number
  plazoAprobadoDias?: number
  fechaAprobacion?: string
  avanceFisico: number
  avancePresupuestario: number
  estado: EstadoObra
  responsableTecnico: string
  contratista?: string
  demoraDias: number
  motivoRechazo?: string
}

export type OrdenTrabajo = {
  id: number
  sourceRequestId: string
  origen: 'Atencion Ciudadana' | 'Ambiente' | 'Transito' | 'Manual'
  descripcion: string
  tipo: string
  ubicacion: string
  prioridad: Prioridad
  estado: EstadoOrden
  cuadrilla: string
  fechaProgramada: string
  duracionEstimadaHoras: number
  evidencia: boolean
  outcome?: 'SUCCESS' | 'REQUIRES_REVISION'
}

export type Recurso = {
  nombre: string
  tipo: 'Cuadrilla' | 'Maquinaria' | 'Material'
  disponibilidad: string
  carga: number
}

export type CorteCalle = {
  id: number
  closureRequestId: string
  sourceModule: 'public-works'
  workOrderId: number
  ubicacion: string
  tramosAfectados: string[]
  estado: 'Autorizado' | 'Pendiente' | 'Rechazado'
  desde: string
  hasta: string
  condiciones?: string
  motivoRechazo?: string
}
