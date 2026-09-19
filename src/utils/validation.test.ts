import { describe, expect, it } from 'vitest'
import { hasErrors, validateProject, validateStreetClosure, validateWorkOrder } from './validation'

describe('validaciones de formularios', () => {
  it('requiere los datos mínimos de un proyecto', () => {
    expect(validateProject({ name: '', scope: '', location: '', estimatedBudget: '0', estimatedStartDate: '', estimatedDurationDays: '0', technicalManager: '' })).toMatchObject({
      name: expect.any(String), scope: expect.any(String), location: expect.any(String), estimatedBudget: expect.any(String), estimatedStartDate: expect.any(String), estimatedDurationDays: expect.any(String), technicalManager: expect.any(String),
    })
  })

  it('exige cuadrilla y correlación para una orden externa', () => {
    const errors = validateWorkOrder({ origin: 'ATENCION_CIUDADANA', sourceRequestId: '', description: 'Bache', interventionType: 'Reparación', location: 'Lima 100', estimatedDurationHours: '2', crew: '' })
    expect(errors).toMatchObject({ sourceRequestId: expect.any(String), crew: expect.any(String) })
  })

  it('valida el rango temporal de un corte', () => {
    const errors = validateStreetClosure({ workOrderId: '1', location: 'Lima 100', affectedSections: 'Lima 100-200', requestedFrom: '2026-09-22', requestedTo: '2026-09-21', reason: 'Reparación' })
    expect(errors.requestedTo).toBeTruthy()
    expect(hasErrors(errors)).toBe(true)
  })

  it('acepta valores válidos y no exige correlación en una orden manual', () => {
    expect(hasErrors(validateProject({
      name: 'Repavimentación', scope: 'Tramo completo', location: 'Av. Lima', estimatedBudget: '1000', estimatedStartDate: '2026-09-22', estimatedDurationDays: '12', technicalManager: 'Ana Pérez',
    }))).toBe(false)
    expect(hasErrors(validateWorkOrder({
      origin: 'MANUAL', sourceRequestId: '', description: 'Reparar bache', interventionType: 'Bacheo', location: 'Av. Lima 100', estimatedDurationHours: '4', crew: 'Cuadrilla Norte',
    }))).toBe(false)
    expect(hasErrors(validateStreetClosure({
      workOrderId: '1', location: 'Av. Lima', affectedSections: '100-200', requestedFrom: '2026-09-22', requestedTo: '2026-09-22', reason: 'Obra',
    }))).toBe(false)
  })
})
