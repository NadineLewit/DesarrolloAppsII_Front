import { describe, expect, it } from 'vitest'
import { hasErrors, validateProject, validateProjectApproval, validateStreetClosure, validateWorkOrder } from './validation'

describe('validaciones de formularios', () => {
  it('requiere los datos mínimos de un proyecto', () => {
    expect(validateProject({ name: '', scope: '', location: '', estimatedBudget: '0', estimatedStartDate: '', estimatedDurationDays: '0', technicalManager: '' })).toMatchObject({
      name: expect.any(String), scope: expect.any(String), location: expect.any(String), estimatedBudget: expect.any(String), estimatedStartDate: expect.any(String), estimatedDurationDays: expect.any(String), technicalManager: expect.any(String),
    })
  })

  it('rechaza descripciones de proyecto con más de 1000 caracteres', () => {
    const errors = validateProject({
      name: 'Proyecto', scope: 'Alcance', location: 'Centro', estimatedBudget: '1',
      estimatedStartDate: '2026-11-19', estimatedDurationDays: '10', technicalManager: 'Responsable',
      description: 'x'.repeat(1001),
    })
    expect(errors.description).toBe('La descripción no puede superar 1000 caracteres.')
  })

  it('exige cuadrilla y correlación para una orden externa', () => {
    const errors = validateWorkOrder({ origin: 'ATENCION_CIUDADANA', projectId: '', sourceRequestId: '', description: 'Bache', interventionType: 'Reparación', location: 'Lima 100', estimatedDurationHours: '2', crew: '' })
    expect(errors).toMatchObject({ sourceRequestId: expect.any(String), crew: expect.any(String) })
  })

  it('valida el rango temporal de un corte', () => {
    const errors = validateStreetClosure({ workOrderId: '1', location: 'Lima 100', affectedSections: 'Lima 100-200', requestedFrom: '2026-09-22', requestedTo: '2026-09-21', reason: 'Reparación' })
    expect(errors.requestedTo).toBeTruthy()
    expect(hasErrors(errors)).toBe(true)
  })

  it('rechaza una fecha de inicio pasada con un mensaje específico', () => {
    const errors = validateStreetClosure({ workOrderId: '1', location: 'Lima 100', affectedSections: 'Lima 100-200', requestedFrom: '2020-01-01', requestedTo: '2020-01-02', reason: 'Reparación' })
    expect(errors.requestedFrom).toBe('La fecha de inicio no puede estar en el pasado.')
  })

  it('acepta valores válidos y no exige correlación en una orden manual', () => {
    expect(hasErrors(validateProject({
      name: 'Repavimentación', scope: 'Tramo completo', location: 'Av. Lima', estimatedBudget: '1000', estimatedStartDate: '2026-09-22', estimatedDurationDays: '12', technicalManager: 'Ana Pérez',
    }))).toBe(false)
    expect(hasErrors(validateWorkOrder({
      origin: 'MANUAL', sourceRequestId: '', description: 'Reparar bache', interventionType: 'Bacheo', location: 'Av. Lima 100', estimatedDurationHours: '4', crew: 'Cuadrilla Norte',
      projectId: '',
    }))).toBe(false)
    expect(hasErrors(validateStreetClosure({
      workOrderId: '1', location: 'Av. Lima', affectedSections: '100-200', requestedFrom: '2099-09-22', requestedTo: '2099-09-22', reason: 'Obra',
    }))).toBe(false)
  })

  it('requiere proyecto solo para órdenes con origen PROYECTO', () => {
    expect(validateWorkOrder({ origin: 'PROYECTO', projectId: '', sourceRequestId: '', description: 'Reparación', interventionType: '', location: '', estimatedDurationHours: '6', crew: '' }).projectId).toBeTruthy()
    expect(hasErrors(validateWorkOrder({ origin: 'PROYECTO', projectId: '1', sourceRequestId: '', description: 'Reparación', interventionType: '', location: '', estimatedDurationHours: '6', crew: '' }))).toBe(false)
  })

  it('valida los límites de una aprobación', () => {
    expect(hasErrors(validateProjectApproval({ approvedBudget: '100000.50', approvedDeadlineDays: '90', approvedAt: '2026-09-22', observations: '' }))).toBe(false)
    expect(validateProjectApproval({ approvedBudget: '0', approvedDeadlineDays: '2.5', approvedAt: '22/09/2026', observations: 'x'.repeat(1001) })).toMatchObject({
      approvedBudget: expect.any(String), approvedDeadlineDays: expect.any(String), approvedAt: expect.any(String), observations: expect.any(String),
    })
  })
})
