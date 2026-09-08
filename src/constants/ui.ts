import type { ProjectStatus, Rol, WorkOrderOrigin, WorkOrderStatus } from '../types'

export const permisosPorRol: Record<Rol, string[]> = {
  PERSONAL_OBRAS: ['crearProyecto', 'modificarProyecto', 'crearOrden', 'solicitarCorte', 'verIndicadores'],
  INGENIERO_ARQUITECTO: ['planificar', 'registrarAvances', 'tramitarAmpliaciones', 'verIndicadores'],
  RESPONSABLE_AUTORIZADO: ['aprobarProyecto', 'rechazarProyecto', 'suspenderObra', 'reanudarObra', 'cerrarProyecto'],
  JEFE_CUADRILLA: ['programarOrden', 'reprogramarOrden', 'iniciarOrden', 'pausarOrden'],
  OPERARIO_CONTRATISTA: ['finalizarOrden', 'cargarEvidencia'],
  INSPECTOR_OBRA: ['validarOrden', 'reabrirOrden'],
}

export const projectStatusLabels: Record<ProjectStatus, string> = {
  BORRADOR: 'Borrador',
  PENDIENTE_APROBACION: 'Pendiente aprobacion',
  APROBADO: 'Aprobado',
  RECHAZADO: 'Rechazado',
  SIN_INICIAR: 'Sin iniciar',
  EN_EJECUCION: 'En ejecucion',
  PAUSADA: 'Pausada',
  FINALIZADA: 'Finalizada',
}

export const workOrderStatusLabels: Record<WorkOrderStatus, string> = {
  PENDIENTE: 'Pendiente',
  PROGRAMADA: 'Programada',
  ASIGNADA: 'Asignada',
  EN_EJECUCION: 'En ejecucion',
  PAUSADA: 'Pausada',
  COMPLETADA: 'Completada',
  VALIDADA: 'Validada',
  REABIERTA: 'Reabierta',
}

export const originLabels: Record<WorkOrderOrigin, string> = {
  MANUAL: 'Manual',
  ATENCION_CIUDADANA: 'Atencion Ciudadana',
  INSPECCION: 'Inspeccion',
}
