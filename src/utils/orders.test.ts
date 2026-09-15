import { describe, expect, it } from 'vitest'
import type { OrdenTrabajo } from '../types'
import { filtrarOrdenes, paginar } from './orders'

const ordenes: OrdenTrabajo[] = [
  {
    id: 2401,
    sourceRequestId: 'ticket-7781',
    origin: 'ATENCION_CIUDADANA',
    description: 'Reparar bache frente a escuela',
    interventionType: 'Calzada',
    location: 'Av. Lima 717',
    priority: 'ALTA',
    status: 'ASIGNADA',
    crew: 'Cuadrilla Norte',
    scheduledDate: '2026-08-19',
    estimatedDurationHours: 6,
    hasEvidence: false,
  },
  {
    id: 2402,
    sourceRequestId: 'ticket-7810',
    origin: 'INSPECCION',
    description: 'Cambiar luminaria quemada',
    interventionType: 'Alumbrado',
    location: 'Defensa 1200',
    priority: 'MEDIA',
    status: 'PROGRAMADA',
    crew: 'Electrica 2',
    scheduledDate: '2026-08-18',
    estimatedDurationHours: 3,
    hasEvidence: false,
  },
]

describe('filtrarOrdenes', () => {
  it('filtra por sourceRequestId y mantiene el contrato con el modulo origen', () => {
    const resultado = filtrarOrdenes(ordenes, 'ticket-7810', 'TODOS')

    expect(resultado).toHaveLength(1)
    expect(resultado[0].sourceRequestId).toBe('ticket-7810')
    expect(resultado[0].origin).toBe('INSPECCION')
  })

  it('combina busqueda libre con estado de orden', () => {
    const resultado = filtrarOrdenes(ordenes, 'alumbrado', 'PROGRAMADA')

    expect(resultado).toHaveLength(1)
    expect(resultado[0].status).toBe('PROGRAMADA')
    expect(resultado[0].origin).toBe('INSPECCION')
  })
})

describe('paginar', () => {
  it('devuelve la pagina solicitada sin mutar la lista original', () => {
    const items = [1, 2, 3, 4, 5]

    expect(paginar(items, 2, 2)).toEqual([3, 4])
    expect(items).toEqual([1, 2, 3, 4, 5])
  })
})
