export type ProjectInput = {
  name: string
  scope: string
  location: string
  estimatedBudget: string
  estimatedStartDate: string
  estimatedDurationDays: string
  technicalManager: string
}

export type WorkOrderInput = {
  origin: string
  projectId: string
  sourceRequestId: string
  description: string
  interventionType: string
  location: string
  estimatedDurationHours: string
  crew: string
}

export type StreetClosureInput = {
  workOrderId: string
  location: string
  affectedSections: string
  requestedFrom: string
  requestedTo: string
  reason: string
}

export type FormErrors = Record<string, string>

const required = (value: string, message: string) => value.trim() ? undefined : message

export function validateProject(input: ProjectInput): FormErrors {
  const errors: FormErrors = {}
  const fields: Array<[keyof ProjectInput, string]> = [
    ['name', 'El nombre es obligatorio.'],
    ['scope', 'El alcance es obligatorio.'],
    ['location', 'La ubicación es obligatoria.'],
    ['estimatedBudget', 'El presupuesto estimado es obligatorio.'],
    ['estimatedStartDate', 'La fecha estimada de inicio es obligatoria.'],
    ['estimatedDurationDays', 'La duración estimada es obligatoria.'],
    ['technicalManager', 'El responsable técnico es obligatorio.'],
  ]

  fields.forEach(([field, message]) => {
    const error = required(input[field], message)
    if (error) errors[field] = error
  })

  if (input.estimatedBudget && Number(input.estimatedBudget) <= 0) errors.estimatedBudget = 'El presupuesto debe ser mayor a 0.'
  if (input.estimatedDurationDays && Number(input.estimatedDurationDays) <= 0) errors.estimatedDurationDays = 'La duración debe ser mayor a 0.'
  return errors
}

export function validateWorkOrder(input: WorkOrderInput): FormErrors {
  const errors: FormErrors = {}
  const fields: Array<[keyof WorkOrderInput, string]> = [
    ['description', 'La descripción es obligatoria.'],
    ['estimatedDurationHours', 'La duración estimada es obligatoria.'],
  ]
  if (input.origin !== 'PROYECTO') {
    fields.push(
      ['interventionType', 'El tipo de intervención es obligatorio.'],
      ['location', 'La ubicación es obligatoria.'],
      ['crew', 'La cuadrilla es obligatoria para programar e iniciar la orden.'],
    )
  }
  fields.forEach(([field, message]) => {
    const error = required(input[field], message)
    if (error) errors[field] = error
  })
  if ((input.origin === 'ATENCION_CIUDADANA' || input.origin === 'INSPECCION') && !input.sourceRequestId.trim()) errors.sourceRequestId = 'El identificador de la solicitud de origen es obligatorio.'
  if (input.origin === 'PROYECTO' && (!Number.isInteger(Number(input.projectId)) || Number(input.projectId) <= 0)) errors.projectId = 'Seleccioná un proyecto válido.'
  if (input.estimatedDurationHours && Number(input.estimatedDurationHours) <= 0) errors.estimatedDurationHours = 'La duración debe ser mayor a 0.'
  return errors
}

export function validateProjectApproval(input: { approvedBudget: string; approvedDeadlineDays: string; approvedAt: string; observations: string }): FormErrors {
  const errors: FormErrors = {}
  const budget = Number(input.approvedBudget)
  const deadline = Number(input.approvedDeadlineDays)
  if (!Number.isFinite(budget) || budget <= 0 || !/^\d{1,13}(\.\d{1,2})?$/.test(input.approvedBudget.trim())) {
    errors.approvedBudget = 'Ingresá un presupuesto positivo de hasta 13 enteros y 2 decimales.'
  }
  if (!Number.isInteger(deadline) || deadline <= 0) errors.approvedDeadlineDays = 'El plazo debe ser un número entero mayor a 0.'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.approvedAt) || Number.isNaN(Date.parse(`${input.approvedAt}T00:00:00`))) errors.approvedAt = 'Ingresá una fecha válida.'
  if (input.observations.length > 1000) errors.observations = 'Las observaciones no pueden superar 1000 caracteres.'
  return errors
}

export function validateStreetClosure(input: StreetClosureInput): FormErrors {
  const errors: FormErrors = {}
  const fields: Array<[keyof StreetClosureInput, string]> = [
    ['workOrderId', 'La orden de trabajo es obligatoria.'],
    ['location', 'La ubicación es obligatoria.'],
    ['affectedSections', 'Indicá al menos un tramo afectado.'],
    ['requestedFrom', 'La fecha de inicio es obligatoria.'],
    ['requestedTo', 'La fecha de fin es obligatoria.'],
    ['reason', 'El motivo es obligatorio.'],
  ]
  fields.forEach(([field, message]) => {
    const error = required(input[field], message)
    if (error) errors[field] = error
  })
  if (input.requestedFrom && input.requestedTo && input.requestedTo < input.requestedFrom) errors.requestedTo = 'La fecha de fin debe ser posterior a la de inicio.'
  return errors
}

export function hasErrors(errors: FormErrors) {
  return Object.keys(errors).length > 0
}
