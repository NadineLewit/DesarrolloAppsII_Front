import { describe, expect, it } from 'vitest'
import { ordenes } from '../data/mockData'
import { filtrarOrdenes, paginar } from './orders'

describe('filtrarOrdenes', () => {
  it('filtra por sourceRequestId y mantiene el contrato con el modulo origen', () => {
    const resultado = filtrarOrdenes(ordenes, 'ticket-7810', 'TODOS')

    expect(resultado).toHaveLength(1)
    expect(resultado[0].sourceRequestId).toBe('ticket-7810')
    expect(resultado[0].origen).toBe('Atencion Ciudadana')
  })

  it('combina busqueda libre con estado de orden', () => {
    const resultado = filtrarOrdenes(ordenes, 'ambiente', 'PROGRAMADA')

    expect(resultado).toHaveLength(1)
    expect(resultado[0].estado).toBe('PROGRAMADA')
    expect(resultado[0].origen).toBe('Ambiente')
  })
})

describe('paginar', () => {
  it('devuelve la pagina solicitada sin mutar la lista original', () => {
    const items = [1, 2, 3, 4, 5]

    expect(paginar(items, 2, 2)).toEqual([3, 4])
    expect(items).toEqual([1, 2, 3, 4, 5])
  })
})
